import { spawn as defaultSpawn, ChildProcess } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import IPzInstanceService, {
  CreateInstanceInput,
  CreateInstanceResult,
  InstallInstanceResult,
  MigrateInstanceResult
} from '../../domain/ports/IPzInstanceService.js';
import IPzInstanceRepository from '../../domain/ports/IPzInstanceRepository.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import systemConfig from '../../config/system-config.js';
import type { PzInstance, PzInstanceRegistry } from '../../types.js';

export type SpawnFn = (command: string, args: readonly string[]) => ChildProcess;
export type LogFn = (line: string) => void;

export interface PzInstanceServiceOptions {
  dataDir: string;
  repository: IPzInstanceRepository;
  spawnFn?: SpawnFn;
  steamCmdDir?: string;
  onLog?: LogFn;
}

const NAME_REGEX = /^[A-Za-z0-9_-]{3,32}$/;

const validateCreateInput = (input: CreateInstanceInput): void => {
  if (!NAME_REGEX.test(input.name)) {
    throw new Error(SERVER_STRINGS.ERR_INSTANCE_NAME_INVALID);
  }
  if (input.gamePort < SERVER_CONSTANTS.MIN_INSTANCE_PORT || input.gamePort > SERVER_CONSTANTS.MAX_INSTANCE_PORT) {
    throw new Error(SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (input.rconPort < SERVER_CONSTANTS.MIN_INSTANCE_PORT || input.rconPort > SERVER_CONSTANTS.MAX_INSTANCE_PORT) {
    throw new Error(SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (input.gamePort === input.rconPort) {
    throw new Error(SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (input.maxPlayers < 1 || input.maxPlayers > 128) {
    throw new Error(SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (typeof input.branch !== 'string') {
    throw new Error(SERVER_STRINGS.ERR_INSTANCE_BRANCH_REQUIRED);
  }
};

const buildInstancePaths = (dataDir: string, id: string) => {
  const instanceDir = path.join(dataDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, id);
  return {
    instanceDir,
    installPath: path.join(instanceDir, SERVER_CONSTANTS.INSTANCE_INSTALL_DIR_NAME),
    dataPath: path.join(instanceDir, SERVER_CONSTANTS.INSTANCE_USERDATA_DIR_NAME)
  };
};

const copyDirRecursive = async (src: string, dest: string): Promise<{ files: number; bytes: number }> => {
  let files = 0;
  let bytes = 0;
  await fsp.mkdir(dest, { recursive: true });
  const entries = await fsp.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      const sub = await copyDirRecursive(s, d);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      await fsp.copyFile(s, d);
      const stat = await fsp.stat(d);
      files += 1;
      bytes += stat.size;
    }
  }
  return { files, bytes };
};

/**
 * High-level orchestration for PZ server instances. Backed by an
 * {@link IPzInstanceRepository} for persistence and a `spawnFn` for
 * SteamCMD. All mutations go through the repository's `update` helper so
 * concurrent CRUD is atomic at the JSON file level.
 */
export class PzInstanceService implements IPzInstanceService {
  private dataDir: string;
  private repository: IPzInstanceRepository;
  private spawnFn: SpawnFn;
  private steamCmdDir: string;
  private log: LogFn;
  private activeInstallProcesses = new Map<string, ChildProcess>();

  constructor(options: PzInstanceServiceOptions) {
    this.dataDir = options.dataDir;
    this.repository = options.repository;
    this.spawnFn = options.spawnFn ?? defaultSpawn;
    this.steamCmdDir = options.steamCmdDir ?? SERVER_CONSTANTS.STEAM_CMD_DIR;
    this.log = options.onLog ?? (() => {});
  }

  listInstances(): Promise<PzInstanceRegistry> {
    return this.repository.load();
  }

  async createInstance(input: CreateInstanceInput): Promise<CreateInstanceResult> {
    validateCreateInput(input);
    const existing = await this.repository.findByName(input.name);
    if (existing) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NAME_TAKEN.replace('{name}', input.name));
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const paths = buildInstancePaths(this.dataDir, id);

    try {
      await fsp.mkdir(paths.installPath, { recursive: true });
      await fsp.mkdir(paths.dataPath, { recursive: true });

      const instance: PzInstance = {
        id,
        name: input.name,
        branch: input.branch,
        installed: false,
        status: 'STOPPED' as PzInstance['status'],
        installPath: paths.installPath,
        dataPath: paths.dataPath,
        gamePort: input.gamePort,
        rconPort: input.rconPort,
        maxPlayers: input.maxPlayers,
        lastError: null,
        createdAt: now,
        updatedAt: now,
        lastInstalledAt: null
      };

      await fsp.writeFile(
        path.join(paths.instanceDir, SERVER_CONSTANTS.INSTANCE_METADATA_FILE),
        JSON.stringify(instance, null, 2),
        'utf8'
      );

      const result = await this.repository.update((reg) => {
        const isFirst = reg.instances.length === 0;
        return {
          ...reg,
          instances: [...reg.instances, instance],
          activeInstanceId: isFirst ? instance.id : reg.activeInstanceId
        };
      });

      this.log(SERVER_STRINGS.MSG_INSTANCE_CREATED.replace('{name}', instance.name));
      if (result.activeInstanceId === instance.id) {
        systemConfig.PZ_SERVER_DIR = instance.installPath;
        systemConfig.ZO_USER_DIR = instance.dataPath;
        this.log(SERVER_STRINGS.MSG_INSTANCE_SELECTED.replace('{name}', instance.name));
      }
      return { instance };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Best-effort cleanup so we don't leave an orphan directory.
      try { await fsp.rm(paths.instanceDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_CREATE_FAILED.replace('{message}', message));
    }
  }

  async deleteInstance(id: string): Promise<void> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id));
    }
    if (instance.status !== 'STOPPED' && instance.status !== 'CRASHED') {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_HAS_RUNNING_PROCESS);
    }

    // Cancel active installation child process if running for this instance
    const activeInstallChild = this.activeInstallProcesses.get(id);
    if (activeInstallChild) {
      this.log(SERVER_STRINGS.MSG_CANCELING_INSTALLATION.replace('{name}', instance.name));
      try {
        activeInstallChild.kill('SIGKILL');
      } catch (_) { /* ignore */ }
      this.activeInstallProcesses.delete(id);
    }

    try {
      const paths = buildInstancePaths(this.dataDir, id);

      // Remove main instance directory (contains pzserver, Zomboid, metadata)
      if (fs.existsSync(paths.instanceDir)) {
        await fsp.rm(paths.instanceDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }

      // Remove custom install directory if external to instanceDir
      if (instance.installPath && fs.existsSync(instance.installPath) && !instance.installPath.startsWith(paths.instanceDir)) {
        await fsp.rm(instance.installPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }

      // Remove custom data directory if external to instanceDir
      if (instance.dataPath && fs.existsSync(instance.dataPath) && !instance.dataPath.startsWith(paths.instanceDir)) {
        await fsp.rm(instance.dataPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_DELETE_FAILED.replace('{message}', message));
    }
    const result = await this.repository.update((reg) => {
      const remaining = reg.instances.filter((i) => i.id !== id);
      return {
        ...reg,
        instances: remaining,
        activeInstanceId: reg.activeInstanceId === id
          ? (remaining[0]?.id ?? null)
          : reg.activeInstanceId
      };
    });

    const nextActive = result.instances.find((i) => i.id === result.activeInstanceId);
    if (nextActive) {
      systemConfig.PZ_SERVER_DIR = nextActive.installPath;
      systemConfig.ZO_USER_DIR = nextActive.dataPath;
    } else {
      systemConfig.PZ_SERVER_DIR = path.join(systemConfig.DATA_DIR, 'pzserver');
      systemConfig.ZO_USER_DIR = path.join(systemConfig.DATA_DIR, 'Zomboid');
    }

    this.log(SERVER_STRINGS.MSG_INSTANCE_DELETED.replace('{name}', instance.name));
  }

  async selectInstance(id: string): Promise<PzInstance> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id));
    }
    await this.repository.update((reg) => ({ ...reg, activeInstanceId: id }));

    systemConfig.PZ_SERVER_DIR = instance.installPath;
    systemConfig.ZO_USER_DIR = instance.dataPath;

    this.log(SERVER_STRINGS.MSG_INSTANCE_SELECTED.replace('{name}', instance.name));
    return instance;
  }

  async migrateUserData(sourceId: string, targetId: string): Promise<MigrateInstanceResult> {
    if (sourceId === targetId) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_CANNOT_MIGRATE_TO_SELF);
    }
    const source = await this.repository.findById(sourceId);
    const target = await this.repository.findById(targetId);
    if (!source) throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', sourceId));
    if (!target) throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', targetId));
    if (target.status !== 'STOPPED' && target.status !== 'CRASHED') {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_HAS_RUNNING_PROCESS);
    }
    if (!fs.existsSync(source.dataPath)) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_DATA_DIR_NOT_FOUND);
    }
    try {
      // Wipe the target's current user data so we don't leave stale files behind.
      await fsp.rm(target.dataPath, { recursive: true, force: true });
      const { files, bytes } = await copyDirRecursive(source.dataPath, target.dataPath);
      this.log(
        SERVER_STRINGS.MSG_INSTANCE_MIGRATED
          .replace('{source}', source.name)
          .replace('{target}', target.name)
      );
      return { sourceId, targetId, filesCopied: files, bytesCopied: bytes };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_MIGRATE_FAILED.replace('{message}', message));
    }
  }

  async installInstance(id: string): Promise<InstallInstanceResult> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id));
    }

    const steamCmdPath = path.join(this.steamCmdDir, 'steamcmd.sh');
    if (!fs.existsSync(steamCmdPath)) {
      throw new Error(SERVER_STRINGS.ERR_STEAMCMD_NOT_FOUND.replace('{path}', steamCmdPath));
    }

    // Fast Reuse Check: If start-server.sh is not yet present, check if another instance with the same branch is already installed.
    const startScriptPath = path.join(instance.installPath, SERVER_CONSTANTS.PATH_START_SCRIPT);
    if (!fs.existsSync(startScriptPath)) {
      const registry = await this.repository.load();
      const existingBranchInstance = registry.instances.find(
        (i) => i.id !== id &&
               i.branch === instance.branch &&
               i.installed &&
               fs.existsSync(path.join(i.installPath, SERVER_CONSTANTS.PATH_START_SCRIPT))
      );

      if (existingBranchInstance) {
        this.log(
          SERVER_STRINGS.MSG_FAST_REUSE_COPY
            .replace('{branch}', instance.branch || 'estable')
            .replace('{source}', existingBranchInstance.name)
        );
        try {
          await copyDirRecursive(existingBranchInstance.installPath, instance.installPath);
        } catch (_) {
          // Ignore copy error and proceed with SteamCMD download
        }
      }
    }

    const args = [
      steamCmdPath,
      '+force_install_dir', instance.installPath,
      '+login', 'anonymous',
      '+app_update', SERVER_CONSTANTS.STEAM_APP_ID
    ];
    if (instance.branch && instance.branch !== 'public') {
      args.push('-beta', instance.branch);
    }
    args.push('validate', '+quit');

    const { success, errorMessage } = await this.runSteamCmd(id, args);
    const now = Date.now();
    const updated = await this.repository.update((reg) => {
      const next = reg.instances.map((i) => i.id === id
        ? { ...i, installed: success, lastInstalledAt: success ? now : i.lastInstalledAt, lastError: success ? null : errorMessage, updatedAt: now }
        : i);
      return { ...reg, instances: next };
    });
    const refreshed = updated.instances.find((i) => i.id === id) as PzInstance;
    this.log(
      SERVER_STRINGS.MSG_INSTANCE_UPDATED
        .replace('{name}', instance.name)
        .replace('{branch}', instance.branch || 'estable')
    );
    return { instance: refreshed, success };
  }

  private runSteamCmd(id: string, args: readonly string[]): Promise<{ success: boolean; errorMessage: string | null }> {
    return new Promise((resolve) => {
      const child = this.spawnFn(args[0], args.slice(1));
      this.activeInstallProcesses.set(id, child);

      let stdoutTail = '';
      let stderrTail = '';
      let stderr = '';
      const emit = (source: 'stdout' | 'stderr', chunk: string): void => {
        const combined = (source === 'stdout' ? stdoutTail : stderrTail) + chunk;
        const segments = combined.split('\n');
        const rest = segments.pop() ?? '';
        if (source === 'stdout') stdoutTail = rest; else stderrTail = rest;
        for (const line of segments) {
          if (line.trim().length === 0) continue;
          this.log(`[SteamCMD:${source}] ${line}`);
        }
      };
      child.stdout?.on('data', (data: Buffer) => emit('stdout', data.toString('utf8')));
      child.stderr?.on('data', (data: Buffer) => {
        const chunk = data.toString('utf8');
        stderr += chunk;
        emit('stderr', chunk);
      });
      child.on('exit', (code: number | null) => {
        this.activeInstallProcesses.delete(id);
        if (stdoutTail.trim()) this.log(`[SteamCMD:stdout] ${stdoutTail}`);
        if (stderrTail.trim()) this.log(`[SteamCMD:stderr] ${stderrTail}`);
        const installDir = args[args.indexOf('+force_install_dir') + 1];
        const startScriptPath = path.join(installDir, SERVER_CONSTANTS.PATH_START_SCRIPT);
        const success = code === 0 && fs.existsSync(startScriptPath);
        resolve({ success, errorMessage: success ? null : (stderr.trim() || `código de salida ${code}`) });
      });
      child.on('error', () => {
        this.activeInstallProcesses.delete(id);
      });
    });
  }
}
