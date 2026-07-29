import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import IPzBackupService, { RestoreBackupResult } from '../../domain/ports/IPzBackupService.js';
import IPzInstanceRepository from '../../domain/ports/IPzInstanceRepository.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import type { PzBackup } from '../../types.js';

export type LogFn = (line: string) => void;

export interface PzBackupServiceOptions {
  dataDir: string;
  repository: IPzInstanceRepository;
  onLog?: LogFn;
}

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

export class PzBackupService implements IPzBackupService {
  private dataDir: string;
  private repository: IPzInstanceRepository;
  private log: LogFn;

  constructor(options: PzBackupServiceOptions) {
    this.dataDir = options.dataDir;
    this.repository = options.repository;
    this.log = options.onLog ?? (() => {});
  }

  private getBackupsDir(instanceId: string): string {
    return path.join(this.dataDir, SERVER_CONSTANTS.INSTANCES_DIR_NAME, instanceId, 'backups');
  }

  async listBackups(instanceId: string): Promise<PzBackup[]> {
    const instance = await this.repository.findById(instanceId);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', instanceId));
    }

    const backupsDir = this.getBackupsDir(instanceId);
    if (!fs.existsSync(backupsDir)) {
      return [];
    }

    const entries = await fsp.readdir(backupsDir, { withFileTypes: true });
    const backups: PzBackup[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const metaPath = path.join(backupsDir, entry.name, 'backup.json');
        if (fs.existsSync(metaPath)) {
          try {
            const raw = await fsp.readFile(metaPath, 'utf8');
            const data = JSON.parse(raw) as PzBackup;
            backups.push(data);
          } catch (_) { /* ignore corrupted metadata */ }
        }
      }
    }

    return backups.sort((a, b) => b.createdAt - a.createdAt);
  }

  async createBackup(instanceId: string, note?: string): Promise<PzBackup> {
    const instance = await this.repository.findById(instanceId);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', instanceId));
    }

    const now = Date.now();
    const backupId = `backup_${now}`;
    const backupDir = path.join(this.getBackupsDir(instanceId), backupId);
    const backupDataDir = path.join(backupDir, 'data');

    try {
      await fsp.mkdir(backupDataDir, { recursive: true });

      let bytesCopied = 0;
      if (fs.existsSync(instance.dataPath)) {
        const { bytes } = await copyDirRecursive(instance.dataPath, backupDataDir);
        bytesCopied = bytes;
      }

      const backup: PzBackup = {
        id: backupId,
        instanceId,
        name: backupId,
        sizeBytes: bytesCopied,
        createdAt: now,
        note: note ? note.trim() : null
      };

      await fsp.writeFile(
        path.join(backupDir, 'backup.json'),
        JSON.stringify(backup, null, 2),
        'utf8'
      );

      this.log(
        SERVER_STRINGS.MSG_BACKUP_CREATED
          .replace('{name}', backup.name)
          .replace('{instance}', instance.name)
      );

      return backup;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try { await fsp.rm(backupDir, { recursive: true, force: true }); } catch (_) { /* ignore */ }
      throw new Error(SERVER_STRINGS.ERR_BACKUP_CREATE_FAILED.replace('{message}', message));
    }
  }

  async restoreBackup(instanceId: string, backupId: string): Promise<RestoreBackupResult> {
    const instance = await this.repository.findById(instanceId);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', instanceId));
    }

    if (instance.status !== 'STOPPED' && instance.status !== 'CRASHED') {
      throw new Error(SERVER_STRINGS.ERR_BACKUP_RESTORE_RUNNING);
    }

    const backupDir = path.join(this.getBackupsDir(instanceId), backupId);
    const backupDataDir = path.join(backupDir, 'data');

    if (!fs.existsSync(backupDataDir)) {
      throw new Error(SERVER_STRINGS.ERR_BACKUP_NOT_FOUND.replace('{id}', backupId));
    }

    try {
      // Clear current data path before restoring
      await fsp.rm(instance.dataPath, { recursive: true, force: true });
      const { files } = await copyDirRecursive(backupDataDir, instance.dataPath);

      const now = Date.now();
      this.log(
        SERVER_STRINGS.MSG_BACKUP_RESTORED
          .replace('{name}', backupId)
          .replace('{instance}', instance.name)
      );

      return { restoredAt: now, filesRestored: files };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_BACKUP_RESTORE_FAILED.replace('{message}', message));
    }
  }

  async deleteBackup(instanceId: string, backupId: string): Promise<void> {
    const instance = await this.repository.findById(instanceId);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', instanceId));
    }

    const backupDir = path.join(this.getBackupsDir(instanceId), backupId);
    if (!fs.existsSync(backupDir)) {
      throw new Error(SERVER_STRINGS.ERR_BACKUP_NOT_FOUND.replace('{id}', backupId));
    }

    try {
      await fsp.rm(backupDir, { recursive: true, force: true });
      this.log(SERVER_STRINGS.MSG_BACKUP_DELETED.replace('{name}', backupId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_BACKUP_DELETE_FAILED.replace('{message}', message));
    }
  }
}
