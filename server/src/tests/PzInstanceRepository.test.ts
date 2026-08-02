import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PzInstanceRepository } from '../adapters/repositories/PzInstanceRepository.js';
import { SERVER_CONSTANTS } from '../config/constants.js';
import type { PzInstance } from '../types.js';

const buildInstance = (overrides: Partial<PzInstance> = {}): PzInstance => ({
  id: 'inst-1',
  game: 'project-zomboid',
  name: 'servertest',
  branch: '',
  installed: false,
  status: 'STOPPED' as PzInstance['status'],
  installPath: '/data/instances/inst-1/pzserver',
  dataPath: '/data/instances/inst-1/Zomboid',
  gamePort: 16261,
  rconPort: 27015,
  maxPlayers: 16,
  lastError: null,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  lastInstalledAt: null,
  ...overrides
});

describe('PzInstanceRepository', () => {
  let tmpDir: string;
  let repo: PzInstanceRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-instances-'));
    repo = new PzInstanceRepository(tmpDir);
  });

  it('returns an empty registry when the file does not exist', async () => {
    const registry = await repo.load();
    expect(registry.instances).toEqual([]);
    expect(registry.activeInstanceId).toBeNull();
  });

  it('persists the registry atomically using a temp file + rename', async () => {
    const instance = buildInstance();
    await repo.save({ instances: [instance], activeInstanceId: instance.id, updatedAt: 1 });

    const filePath = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, SERVER_CONSTANTS.INSTANCE_REGISTRY_FILE);
    expect(fs.existsSync(filePath)).toBe(true);

    const reloaded = await repo.load();
    expect(reloaded.instances).toHaveLength(1);
    expect(reloaded.instances[0].id).toBe('inst-1');
    expect(reloaded.activeInstanceId).toBe('inst-1');
  });

  it('leaves no temp file behind after a successful save', async () => {
    await repo.save({ instances: [buildInstance()], activeInstanceId: null, updatedAt: 1 });
    const dir = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME);
    const tempFiles = fs.readdirSync(dir).filter((f) => f.startsWith('.') || f.endsWith('.tmp'));
    expect(tempFiles).toEqual([]);
  });

  it('findById returns the matching instance or null', async () => {
    await repo.save({ instances: [buildInstance()], activeInstanceId: null, updatedAt: 1 });
    expect((await repo.findById('inst-1'))?.id).toBe('inst-1');
    expect(await repo.findById('missing')).toBeNull();
  });

  it('findByName is case-sensitive on the name', async () => {
    await repo.save({ instances: [buildInstance()], activeInstanceId: null, updatedAt: 1 });
    expect((await repo.findByName('servertest'))?.id).toBe('inst-1');
    expect(await repo.findByName('ServerTest')).toBeNull();
  });

  it('update loads, mutates and saves in a single call, refreshing updatedAt', async () => {
    await repo.save({ instances: [], activeInstanceId: null, updatedAt: 0 });
    const result = await repo.update((reg) => ({
      ...reg,
      instances: [buildInstance()],
      activeInstanceId: 'inst-1'
    }));
    expect(result.instances).toHaveLength(1);
    expect(result.updatedAt).toBeGreaterThan(0);
    expect((await repo.load()).activeInstanceId).toBe('inst-1');
  });

  it('getActive returns null when no instance is active', async () => {
    await repo.save({ instances: [buildInstance()], activeInstanceId: null, updatedAt: 0 });
    expect(await repo.getActive()).toBeNull();
  });

  it('getActive returns the active instance', async () => {
    const inst = buildInstance();
    await repo.save({ instances: [inst], activeInstanceId: inst.id, updatedAt: 0 });
    const active = await repo.getActive();
    expect(active?.id).toBe('inst-1');
  });

  it('survives a corrupted registry file by returning an empty one', async () => {
    const dir = path.join(tmpDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, SERVER_CONSTANTS.INSTANCE_REGISTRY_FILE), 'not-valid-json{', 'utf8');

    const registry = await repo.load();
    expect(registry.instances).toEqual([]);
  });
});
