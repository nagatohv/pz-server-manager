import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PzInstanceService } from '../adapters/services/PzInstanceService.js';
import { PzInstanceRepository } from '../adapters/repositories/PzInstanceRepository.js';
import { SERVER_CONSTANTS } from '../config/constants.js';
import { SERVER_STRINGS } from '../config/strings.js';
import type { ChildProcess } from 'child_process';
import type { SpawnFn } from '../adapters/services/SteamBranchCatalogService.js';
import type { PzInstance } from '../types.js';

interface FakeChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (signal?: string) => boolean;
}

const buildFakeChild = (): FakeChildProcess => {
  const child = new EventEmitter() as FakeChildProcess;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn().mockReturnValue(true);
  return child;
};

describe('PzInstanceService', () => {
  let tmpDir: string;
  let service: PzInstanceService;
  let repo: PzInstanceRepository;
  let spawnMock: ReturnType<typeof vi.fn> & SpawnFn;
  let fakeChild: FakeChildProcess;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-inst-svc-'));
    fs.writeFileSync(path.join(tmpDir, 'steamcmd.sh'), '#!/bin/bash\n', 'utf8');
    repo = new PzInstanceRepository(tmpDir);
    fakeChild = buildFakeChild();
    spawnMock = vi.fn().mockReturnValue(fakeChild as unknown as ChildProcess) as unknown as ReturnType<typeof vi.fn> & SpawnFn;
    service = new PzInstanceService({
      dataDir: tmpDir,
      repository: repo,
      spawnFn: spawnMock,
      steamCmdDir: tmpDir,
      onLog: () => {}
    });
  });

  it('starts with an empty registry', async () => {
    const registry = await service.listInstances();
    expect(registry.instances).toEqual([]);
    expect(registry.activeInstanceId).toBeNull();
  });

  it('rejects invalid names (too short, with spaces, with special chars)', async () => {
    for (const bad of ['', 'ab', 'has space', 'punto!', 'a'.repeat(33)]) {
      await expect(service.createInstance({
        name: bad,
        branch: '',
        gamePort: 16261,
        rconPort: 27015,
        maxPlayers: 16
      })).rejects.toThrow();
    }
  });

  it('rejects duplicate names', async () => {
    await service.createInstance({
      name: 'servertest', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });
    await expect(service.createInstance({
      name: 'servertest', branch: '', gamePort: 16262, rconPort: 27016, maxPlayers: 8
    })).rejects.toThrow(/ya existe una instancia/i);
  });

  it('rejects when game port and rcon port are equal', async () => {
    await expect(service.createInstance({
      name: 'servertest', branch: '', gamePort: 16261, rconPort: 16261, maxPlayers: 16
    })).rejects.toThrow(/puertos/i);
  });

  it('rejects out-of-range ports', async () => {
    await expect(service.createInstance({
      name: 'servertest', branch: '', gamePort: 100, rconPort: 27015, maxPlayers: 16
    })).rejects.toThrow();
  });

  it('creates an instance with the correct on-disk layout', async () => {
    const { instance } = await service.createInstance({
      name: 'servertest', branch: 'b42stable', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    expect(instance.id).toBeTruthy();
    expect(instance.name).toBe('servertest');
    expect(instance.branch).toBe('b42stable');
    expect(instance.installed).toBe(false);
    expect(instance.status).toBe('STOPPED');
    expect(instance.gamePort).toBe(16261);
    expect(instance.rconPort).toBe(27015);
    expect(instance.maxPlayers).toBe(16);

    const instanceDir = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, instance.id);
    expect(fs.existsSync(path.join(instanceDir, SERVER_CONSTANTS.INSTANCE_METADATA_FILE))).toBe(true);
    expect(fs.existsSync(path.join(instanceDir, SERVER_CONSTANTS.INSTANCE_INSTALL_DIR_NAME))).toBe(true);
    expect(fs.existsSync(path.join(instanceDir, SERVER_CONSTANTS.INSTANCE_USERDATA_DIR_NAME))).toBe(true);
  });

  it('first created instance becomes active automatically', async () => {
    const { instance } = await service.createInstance({
      name: 'servertest', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });
    const registry = await service.listInstances();
    expect(registry.activeInstanceId).toBe(instance.id);
  });

  it('selectInstance updates the active id and rejects unknown ids', async () => {
    await expect(service.selectInstance('does-not-exist')).rejects.toThrow(/no se encontr/i);
  });

  it('deleteInstance removes the directory and the registry entry', async () => {
    const { instance } = await service.createInstance({
      name: 'servertest', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });
    const dir = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, instance.id);
    expect(fs.existsSync(dir)).toBe(true);

    await service.deleteInstance(instance.id);
    expect(fs.existsSync(dir)).toBe(false);
    expect((await service.listInstances()).instances).toEqual([]);
  });

  it('migrateUserData copies the source Zomboid tree to the target', async () => {
    const { instance: source } = await service.createInstance({
      name: 'source-srv', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });
    const { instance: target } = await service.createInstance({
      name: 'target-srv', branch: 'b42stable', gamePort: 16262, rconPort: 27016, maxPlayers: 8
    });

    const sourceZomboid = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, source.id, SERVER_CONSTANTS.INSTANCE_USERDATA_DIR_NAME);
    fs.mkdirSync(path.join(sourceZomboid, 'Saves'), { recursive: true });
    fs.writeFileSync(path.join(sourceZomboid, 'Saves', 'player.dat'), 'save-data', 'utf8');

    const result = await service.migrateUserData(source.id, target.id);
    expect(result.sourceId).toBe(source.id);
    expect(result.targetId).toBe(target.id);
    expect(result.filesCopied).toBeGreaterThan(0);

    const targetZomboid = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, target.id, SERVER_CONSTANTS.INSTANCE_USERDATA_DIR_NAME);
    const migrated = fs.readFileSync(path.join(targetZomboid, 'Saves', 'player.dat'), 'utf8');
    expect(migrated).toBe('save-data');
  });

  it('migrateUserData rejects self-migration', async () => {
    const { instance } = await service.createInstance({
      name: 'servertest', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });
    await expect(service.migrateUserData(instance.id, instance.id)).rejects.toThrow(/misma/i);
  });

  it('migrateUserData rejects when source has no Zomboid dir', async () => {
    const { instance: source } = await service.createInstance({
      name: 'source-srv', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });
    const { instance: target } = await service.createInstance({
      name: 'target-srv', branch: 'b42stable', gamePort: 16262, rconPort: 27016, maxPlayers: 8
    });
    fs.rmSync(path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, source.id, SERVER_CONSTANTS.INSTANCE_USERDATA_DIR_NAME), { recursive: true, force: true });
    await expect(service.migrateUserData(source.id, target.id)).rejects.toThrow(/datos/i);
  });

  it('installInstance launches SteamCMD with the instance branch and records success', async () => {
    const { instance } = await service.createInstance({
      name: 'servertest', branch: 'b42stable', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    const installPromise = service.installInstance(instance.id);

    // Wait until the service has actually called spawn (i.e. set up the listeners)
    while (!spawnMock.mock.calls.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
    }

    const startScript = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, instance.id, SERVER_CONSTANTS.INSTANCE_INSTALL_DIR_NAME, SERVER_CONSTANTS.PATH_START_SCRIPT);
    fs.mkdirSync(path.dirname(startScript), { recursive: true });
    fs.writeFileSync(startScript, '#!/bin/bash\n', 'utf8');
    fakeChild.emit('exit', 0);

    const result = await installPromise;
    expect(spawnMock).toHaveBeenCalled();
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args).toContain('-beta');
    expect(args).toContain('b42stable');
    expect(result.success).toBe(true);

    const reloaded = await service.listInstances();
    const updated = reloaded.instances.find((i) => i.id === instance.id) as PzInstance;
    expect(updated.installed).toBe(true);
    expect(updated.lastInstalledAt).not.toBeNull();
  });

  it('installInstance reports failure when SteamCMD exits non-zero', async () => {
    const { instance } = await service.createInstance({
      name: 'servertest', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    const installPromise = service.installInstance(instance.id);
    while (!spawnMock.mock.calls.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
    }
    fakeChild.stderr.emit('data', Buffer.from('Login failure'));
    fakeChild.emit('exit', 7);

    const result = await installPromise;
    expect(result.success).toBe(false);
    const reloaded = await service.listInstances();
    const updated = reloaded.instances.find((i) => i.id === instance.id) as PzInstance;
    expect(updated.installed).toBe(false);
    expect(updated.lastError).toMatch(/Login failure/);
  });

  it('cancels active installation child process when deleteInstance is called during install', async () => {
    const { instance } = await service.createInstance({
      name: 'cancelserv', branch: '42.19', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    void service.installInstance(instance.id);
    while (!spawnMock.mock.calls.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
    }

    const killSpy = vi.spyOn(fakeChild, 'kill');
    await service.deleteInstance(instance.id);
    expect(killSpy).toHaveBeenCalledWith('SIGKILL');
  });

  it('reuses existing branch installation files when installing a new instance with the same branch', async () => {
    const { instance: inst1 } = await service.createInstance({
      name: 'source-inst', branch: 'b42stable', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    const startScript = path.join(inst1.installPath, SERVER_CONSTANTS.PATH_START_SCRIPT);
    fs.mkdirSync(path.dirname(startScript), { recursive: true });
    fs.writeFileSync(startScript, '#!/bin/bash\necho "source game binary"\n', 'utf8');

    await repo.update((reg) => ({
      ...reg,
      instances: reg.instances.map((i) => i.id === inst1.id ? { ...i, installed: true } : i)
    }));

    const { instance: inst2 } = await service.createInstance({
      name: 'target-inst', branch: 'b42stable', gamePort: 16263, rconPort: 27017, maxPlayers: 16
    });

    const installPromise = service.installInstance(inst2.id);
    while (!spawnMock.mock.calls.length) {
      await new Promise<void>((resolve) => setTimeout(resolve, 1));
    }

    const targetStartScript = path.join(inst2.installPath, SERVER_CONSTANTS.PATH_START_SCRIPT);
    expect(fs.existsSync(targetStartScript)).toBe(true);

    fakeChild.emit('exit', 0);
    await installPromise;
  });

  it('removes all associated files and directories when deleteInstance is called', async () => {
    const { instance } = await service.createInstance({
      name: 'purge-server', branch: 'public', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    const fileInInstall = path.join(instance.installPath, 'ProjectZomboid64.json');
    const fileInData = path.join(instance.dataPath, 'Server', 'purge-server.ini');
    fs.writeFileSync(fileInInstall, '{}', 'utf8');
    fs.mkdirSync(path.dirname(fileInData), { recursive: true });
    fs.writeFileSync(fileInData, 'Option=1', 'utf8');

    expect(fs.existsSync(fileInInstall)).toBe(true);
    expect(fs.existsSync(fileInData)).toBe(true);

    await service.deleteInstance(instance.id);

    expect(fs.existsSync(fileInInstall)).toBe(false);
    expect(fs.existsSync(fileInData)).toBe(false);
    expect(fs.existsSync(instance.installPath)).toBe(false);
    expect(fs.existsSync(instance.dataPath)).toBe(false);
  });
});

void SERVER_STRINGS;
