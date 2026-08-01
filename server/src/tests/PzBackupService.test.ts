import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { PzBackupService } from '../adapters/services/PzBackupService.js';
import { PzInstanceService } from '../adapters/services/PzInstanceService.js';
import { PzInstanceRepository } from '../adapters/repositories/PzInstanceRepository.js';

// Mock child_process.spawn natively to avoid dependency on OS zip/unzip tools in Vitest
vi.mock('child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('child_process')>();
  return {
    ...original,
    spawn: vi.fn((cmd: string, args: string[], options?: any) => {
      const emitter = new EventEmitter() as any;
      emitter.stdout = new EventEmitter();
      emitter.stderr = new EventEmitter();

      setTimeout(() => {
        // Zip Compression Mock
        let destZip: string | null = null;
        if (cmd === 'zip') {
          destZip = args[1];
        } else if (cmd === 'powershell' && args.join(' ').includes('Compress-Archive')) {
          const match = args.join(' ').match(/-DestinationPath '([^']+)'/);
          if (match) destZip = match[1];
        }

        if (destZip) {
          fs.writeFileSync(destZip, 'dummy zip content', 'utf8');
        }

        // Zip Extraction Mock (Restore mock files)
        let destPath: string | null = null;
        if (cmd === 'unzip') {
          destPath = args[3];
        } else if (cmd === 'powershell' && args.join(' ').includes('Expand-Archive')) {
          const match = args.join(' ').match(/-DestinationPath '([^']+)'/);
          if (match) destPath = match[1];
        }

        if (destPath) {
          const saveFile = path.join(destPath, 'Server', 'backupserv.ini');
          fs.mkdirSync(path.dirname(saveFile), { recursive: true });
          fs.writeFileSync(saveFile, 'Option=InitialValue', 'utf8');
        }

        emitter.emit('close', 0);
      }, 5);

      return emitter;
    })
  };
});

describe('PzBackupService', () => {
  let tmpDir: string;
  let repo: PzInstanceRepository;
  let instanceService: PzInstanceService;
  let backupService: PzBackupService;

  beforeEach(async () => {
    tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'pz-backup-test-'));
    repo = new PzInstanceRepository(tmpDir);
    await repo.load();
    instanceService = new PzInstanceService({ dataDir: tmpDir, repository: repo });
    backupService = new PzBackupService({ dataDir: tmpDir, repository: repo });
  });

  afterEach(async () => {
    try { await fsp.rm(tmpDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
  });

  it('creates, lists, restores, and deletes a backup for an instance', async () => {
    const { instance } = await instanceService.createInstance({
      name: 'backupserv', branch: 'public', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    const saveFile = path.join(instance.dataPath, 'Server', 'backupserv.ini');
    await fsp.mkdir(path.dirname(saveFile), { recursive: true });
    await fsp.writeFile(saveFile, 'Option=InitialValue', 'utf8');

    // 1. List backups initially
    let list = await backupService.listBackups(instance.id);
    expect(list).toHaveLength(0);

    // 2. Create backup
    const backup = await backupService.createBackup(instance.id, 'Test Backup Pre-PvP');
    expect(backup.instanceId).toBe(instance.id);
    expect(backup.note).toBe('Test Backup Pre-PvP');
    expect(backup.sizeBytes).toBeGreaterThan(0);

    list = await backupService.listBackups(instance.id);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(backup.id);

    // 3. Mutate dataPath
    await fsp.writeFile(saveFile, 'Option=MutatedValue', 'utf8');
    expect(await fsp.readFile(saveFile, 'utf8')).toBe('Option=MutatedValue');

    // 4. Restore backup
    const restoreRes = await backupService.restoreBackup(instance.id, backup.id);
    expect(restoreRes.filesRestored).toBeGreaterThan(0);
    expect(await fsp.readFile(saveFile, 'utf8')).toBe('Option=InitialValue');

    // 5. Delete backup
    await backupService.deleteBackup(instance.id, backup.id);
    list = await backupService.listBackups(instance.id);
    expect(list).toHaveLength(0);
  });

  it('prevents backup restoration while instance is running', async () => {
    const { instance } = await instanceService.createInstance({
      name: 'runningserv', branch: 'public', gamePort: 16261, rconPort: 27015, maxPlayers: 16
    });

    const backup = await backupService.createBackup(instance.id);

    // Set instance status to RUNNING
    await repo.update((reg) => ({
      ...reg,
      instances: reg.instances.map((i) => i.id === instance.id ? { ...i, status: 'RUNNING' } : i)
    }));

    await expect(backupService.restoreBackup(instance.id, backup.id)).rejects.toThrow(/Detén la instancia/i);
  });
});
