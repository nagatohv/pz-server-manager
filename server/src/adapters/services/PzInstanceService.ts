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
import { AppError } from '../../domain/AppError.js';
import { ERROR_CODES } from '../../config/errorCodes.js';
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
    throw new AppError(ERROR_CODES.ERR_INSTANCE_NAME_INVALID, SERVER_STRINGS.ERR_INSTANCE_NAME_INVALID);
  }
  if (input.gamePort < SERVER_CONSTANTS.MIN_INSTANCE_PORT || input.gamePort > SERVER_CONSTANTS.MAX_INSTANCE_PORT) {
    throw new AppError(ERROR_CODES.ERR_INSTANCE_PORTS_INVALID, SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (input.rconPort < SERVER_CONSTANTS.MIN_INSTANCE_PORT || input.rconPort > SERVER_CONSTANTS.MAX_INSTANCE_PORT) {
    throw new AppError(ERROR_CODES.ERR_INSTANCE_PORTS_INVALID, SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (input.gamePort === input.rconPort) {
    throw new AppError(ERROR_CODES.ERR_INSTANCE_PORTS_INVALID, SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (input.maxPlayers < 1 || input.maxPlayers > 128) {
    throw new AppError(ERROR_CODES.ERR_INSTANCE_PORTS_INVALID, SERVER_STRINGS.ERR_INSTANCE_PORTS_INVALID);
  }
  if (typeof input.branch !== 'string') {
    throw new AppError(ERROR_CODES.ERR_INSTANCE_BRANCH_REQUIRED, SERVER_STRINGS.ERR_INSTANCE_BRANCH_REQUIRED);
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
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NAME_TAKEN,
        SERVER_STRINGS.ERR_INSTANCE_NAME_TAKEN.replace('{name}', input.name),
        { name: input.name }
      );
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const paths = buildInstancePaths(this.dataDir, id);

    try {
      await fsp.mkdir(paths.installPath, { recursive: true });
      await fsp.mkdir(paths.dataPath, { recursive: true });

      const instance: PzInstance = {
        id,
        game: input.game || 'project-zomboid',
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
        lastInstalledAt: null,
        totalUptimeSeconds: 0
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
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      try { await fsp.rm(paths.instanceDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_CREATE_FAILED,
        SERVER_STRINGS.ERR_INSTANCE_CREATE_FAILED.replace('{message}', message),
        { message }
      );
    }
  }

  async deleteInstance(id: string): Promise<void> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id),
        { id }
      );
    }
    if (instance.status !== 'STOPPED' && instance.status !== 'CRASHED') {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_HAS_RUNNING_PROCESS,
        SERVER_STRINGS.ERR_INSTANCE_HAS_RUNNING_PROCESS
      );
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
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_DELETE_FAILED,
        SERVER_STRINGS.ERR_INSTANCE_DELETE_FAILED.replace('{message}', message),
        { message }
      );
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
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id),
        { id }
      );
    }
    await this.repository.update((reg) => ({ ...reg, activeInstanceId: id }));

    systemConfig.PZ_SERVER_DIR = instance.installPath;
    systemConfig.ZO_USER_DIR = instance.dataPath;

    this.log(SERVER_STRINGS.MSG_INSTANCE_SELECTED.replace('{name}', instance.name));
    return instance;
  }

  /**
   * Accumulates a finished session's duration into the active instance's
   * persisted `totalUptimeSeconds`. Called from the process-control
   * service callback whenever the server stops, crashes, or is killed.
   */
  async recordUptime(_ignoredInstanceId: string, sessionDurationMs: number): Promise<void> {
    if (sessionDurationMs <= 0) return;
    const reg = await this.repository.load();
    if (!reg.activeInstanceId) return;
    const updated = reg.instances.map((inst) => {
      if (inst.id !== reg.activeInstanceId) return inst;
      const previous = Number.isFinite(inst.totalUptimeSeconds) ? inst.totalUptimeSeconds : 0;
      const next = previous + Math.floor(sessionDurationMs / 1000);
      return { ...inst, totalUptimeSeconds: next, updatedAt: Date.now() };
    });
    await this.repository.update((r) => ({ ...r, instances: updated, updatedAt: Date.now() }));
    this.persistMetadataFor(updated.find((i) => i.id === reg.activeInstanceId));
  }

  /**
   * Writes the instance.json file for the given instance so its uptime
   * survives even if the process is killed before the next registry flush.
   */
  private persistMetadataFor(instance: PzInstance | undefined): void {
    if (!instance) return;
    const instanceDir = path.dirname(instance.installPath);
    const metaPath = path.join(instanceDir, SERVER_CONSTANTS.INSTANCE_METADATA_FILE);
    try {
      fs.writeFileSync(metaPath, JSON.stringify(instance, null, 2), 'utf8');
    } catch (err) {
      this.log(`[Manager] No se pudo persistir metadata de ${instance.name}: ${(err as Error).message}`);
    }
  }

  async migrateUserData(sourceId: string, targetId: string): Promise<MigrateInstanceResult> {
    if (sourceId === targetId) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_CANNOT_MIGRATE_TO_SELF,
        SERVER_STRINGS.ERR_INSTANCE_CANNOT_MIGRATE_TO_SELF
      );
    }
    const source = await this.repository.findById(sourceId);
    const target = await this.repository.findById(targetId);
    if (!source) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', sourceId),
        { id: sourceId }
      );
    }
    if (!target) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', targetId),
        { id: targetId }
      );
    }
    if (target.status !== 'STOPPED' && target.status !== 'CRASHED') {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_HAS_RUNNING_PROCESS,
        SERVER_STRINGS.ERR_INSTANCE_HAS_RUNNING_PROCESS
      );
    }
    if (!fs.existsSync(source.dataPath)) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_DATA_DIR_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_DATA_DIR_NOT_FOUND
      );
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
      if (err instanceof AppError) throw err;
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_MIGRATE_FAILED,
        SERVER_STRINGS.ERR_INSTANCE_MIGRATE_FAILED.replace('{message}', message),
        { message }
      );
    }
  }

  async installInstance(id: string): Promise<InstallInstanceResult> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id),
        { id }
      );
    }

    const steamCmdPath = path.join(this.steamCmdDir, 'steamcmd.sh');
    if (!fs.existsSync(steamCmdPath)) {
      throw new AppError(
        ERROR_CODES.ERR_STEAMCMD_NOT_FOUND,
        SERVER_STRINGS.ERR_STEAMCMD_NOT_FOUND.replace('{path}', steamCmdPath),
        { path: steamCmdPath }
      );
    }

    // Diagnóstico de espacio en disco y permisos para entornos de producción (Dokploy)
    try {
      const { execSync } = await import('child_process');
      const dfOutput = execSync('df -h ' + JSON.stringify(instance.installPath), { encoding: 'utf8' });
      this.log(`[Diagnostic] Espacio en disco para el directorio de instalación:\n${dfOutput}`);
      const lsOutput = execSync('ls -la ' + JSON.stringify(instance.installPath), { encoding: 'utf8' });
      this.log(`[Diagnostic] Permisos del directorio de instalación:\n${lsOutput}`);
    } catch (diagErr: any) {
      this.log(`[Diagnostic Warning] No se pudo obtener diagnóstico detallado: ${diagErr.message}`);
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
      '+@sSteamCmdForcePlatformType linux',
      '+login', 'anonymous'
    ];
    if (instance.branch && instance.branch !== 'public') {
      args.push('+app_update', SERVER_CONSTANTS.STEAM_APP_ID, '-beta', instance.branch, 'validate', '+quit');
    } else {
      args.push('+app_update', SERVER_CONSTANTS.STEAM_APP_ID, 'validate', '+quit');
    }

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
      // En entornos Linux / Docker (Dokploy), ejecutar bash <script> evita fallos si no tiene chmod +x o hashbang directo.
      const isLinuxScript = args[0].endsWith('.sh');
      const command = isLinuxScript ? 'bash' : args[0];
      const cmdArgs = isLinuxScript ? args : args.slice(1);

      const child = this.spawnFn(command, cmdArgs);
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

        if (!success) {
          try {
            const contentLogPath = path.join(this.steamCmdDir, 'logs', 'content_log.txt');
            if (fs.existsSync(contentLogPath)) {
              const logLines = fs.readFileSync(contentLogPath, 'utf8').split('\n');
              const lastLines = logLines.slice(-30).join('\n');
              this.log(`[Diagnostic] Últimas líneas de content_log.txt:\n${lastLines}`);
            }
          } catch (logErr: any) {
            this.log(`[Diagnostic Warning] No se pudo leer content_log.txt: ${logErr.message}`);
          }
        }

        resolve({ success, errorMessage: success ? null : (stderr.trim() || `código de salida ${code}`) });
      });
      child.on('error', () => {
        this.activeInstallProcesses.delete(id);
      });
    });
  }

  async cleanupInstance(id: string): Promise<{ filesRemoved: number; bytesFreed: number }> {
    const instance = await this.repository.findById(id);
    if (!instance) {
      throw new AppError(
        ERROR_CODES.ERR_INSTANCE_NOT_FOUND,
        SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', id),
        { id }
      );
    }

    let filesRemoved = 0;
    let bytesFreed = 0;

    const scanAndDelete = async (dir: string, isLogsDir = false) => {
      if (!fs.existsSync(dir)) return;
      let entries;
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true });
      } catch (_) {
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scanAndDelete(fullPath, isLogsDir || entry.name.toLowerCase() === 'logs');
        } else if (entry.isFile()) {
          const name = entry.name.toLowerCase();
          let shouldDelete = false;

          if (name.startsWith(SERVER_CONSTANTS.CLEANUP_CORE_PREFIX)) {
            shouldDelete = true;
          }

          if (isLogsDir && (name.endsWith('.log') || name.endsWith('.txt') || name.endsWith('.html'))) {
            try {
              const stat = await fsp.stat(fullPath);
              const ageInDays = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60 * 24);
              if (ageInDays > SERVER_CONSTANTS.CLEANUP_LOG_MAX_AGE_DAYS) {
                shouldDelete = true;
              }
            } catch (_) {
            }
          }

          if (shouldDelete) {
            try {
              const stat = await fsp.stat(fullPath);
              const size = stat.size;
              await fsp.rm(fullPath, { force: true });
              filesRemoved++;
              bytesFreed += size;
            } catch (_) {
            }
          }
        }
      }
    };

    if (instance.installPath) {
      await scanAndDelete(instance.installPath);
    }
    if (instance.dataPath) {
      await scanAndDelete(instance.dataPath);
    }

    this.log(`Limpieza completada para la instancia ${instance.name}. Se eliminaron ${filesRemoved} archivos liberando ${bytesFreed} bytes.`);
    return { filesRemoved, bytesFreed };
  }
}
