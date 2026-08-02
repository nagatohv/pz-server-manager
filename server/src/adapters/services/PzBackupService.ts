import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import IPzBackupService, { RestoreBackupResult } from '../../domain/ports/IPzBackupService.js';
import IPzInstanceRepository from '../../domain/ports/IPzInstanceRepository.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import type { PzBackup } from '../../types.js';

export type LogFn = (line: string) => void;

export interface PzBackupServiceOptions {
  dataDir: string;
  repository: IPzInstanceRepository;
  onLog?: LogFn;
}

const extractZip = (zipPath: string, destPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let child;
    if (process.platform === 'win32') {
      child = spawn('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destPath.replace(/'/g, "''")}' -Force`
      ]);
    } else {
      child = spawn('unzip', ['-oq', zipPath, '-d', destPath]);
    }

    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Zip extraction failed with code ${code}. Error: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
};

const createZip = (zipPath: string, sourcePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    let child;
    if (process.platform === 'win32') {
      child = spawn('powershell', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Get-ChildItem -Path '${sourcePath.replace(/'/g, "''")}' -Exclude 'backups' | Compress-Archive -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`
      ]);
    } else {
      child = spawn('zip', ['-rq', zipPath, '.', '-x', 'backups/*'], {
        cwd: sourcePath
      });
    }

    let stderr = '';
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Zip compression failed with code ${code}. Error: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
};

async function wipeDataDirExceptBackups(dataPath: string): Promise<number> {
  let count = 0;
  if (!fs.existsSync(dataPath)) return count;
  const entries = await fsp.readdir(dataPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'backups') continue;
    const fullPath = path.join(dataPath, entry.name);
    await fsp.rm(fullPath, { recursive: true, force: true });
    count++;
  }
  return count;
}

export class PzBackupService implements IPzBackupService {
  private repository: IPzInstanceRepository;
  private log: LogFn;

  constructor(options: PzBackupServiceOptions) {
    this.repository = options.repository;
    this.log = options.onLog ?? (() => {});
  }

  private getBackupsDir(dataPath: string): string {
    return path.join(dataPath, 'backups', 'startup');
  }

  async listBackups(instanceId: string): Promise<PzBackup[]> {
    const instance = await this.repository.findById(instanceId);
    if (!instance) {
      throw new Error(SERVER_STRINGS.ERR_INSTANCE_NOT_FOUND.replace('{id}', instanceId));
    }

    const backupsDir = this.getBackupsDir(instance.dataPath);
    if (!fs.existsSync(backupsDir)) {
      return [];
    }

    const entries = await fsp.readdir(backupsDir, { withFileTypes: true });
    const backups: PzBackup[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.zip')) {
        const filePath = path.join(backupsDir, entry.name);
        try {
          const stat = await fsp.stat(filePath);
          let note: string | null = null;
          
          const metaPath = filePath + '.json';
          if (fs.existsSync(metaPath)) {
            try {
              const metaRaw = await fsp.readFile(metaPath, 'utf8');
              const meta = JSON.parse(metaRaw) as { note?: string };
              note = meta.note || null;
            } catch (_) {
            }
          }

          backups.push({
            id: entry.name,
            instanceId,
            name: entry.name,
            sizeBytes: stat.size,
            createdAt: stat.birthtimeMs || stat.mtimeMs || Date.now(),
            note
          });
        } catch (_) {
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

    const backupsDir = this.getBackupsDir(instance.dataPath);
    if (!fs.existsSync(backupsDir)) {
      await fsp.mkdir(backupsDir, { recursive: true });
    }

    const now = Date.now();
    const backupId = `manual_backup_${now}.zip`;
    const zipPath = path.join(backupsDir, backupId);

    try {
      this.log(`Iniciando compresión nativa para la instancia ${instance.name}...`);
      await createZip(zipPath, instance.dataPath);

      const stat = await fsp.stat(zipPath);
      const cleanNote = note ? note.trim() : null;

      if (cleanNote) {
        await fsp.writeFile(zipPath + '.json', JSON.stringify({ note: cleanNote }), 'utf8');
      }

      const backup: PzBackup = {
        id: backupId,
        instanceId,
        name: backupId,
        sizeBytes: stat.size,
        createdAt: now,
        note: cleanNote
      };

      this.log(
        SERVER_STRINGS.MSG_BACKUP_CREATED
          .replace('{name}', backup.name)
          .replace('{instance}', instance.name)
      );

      return backup;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      try { await fsp.rm(zipPath, { force: true }); } catch (_) {}
      try { await fsp.rm(zipPath + '.json', { force: true }); } catch (_) {}
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

    const backupsDir = this.getBackupsDir(instance.dataPath);
    const zipPath = path.join(backupsDir, backupId);

    if (!fs.existsSync(zipPath)) {
      throw new Error(SERVER_STRINGS.ERR_BACKUP_NOT_FOUND.replace('{id}', backupId));
    }

    try {
      this.log(`Wipando directorio de datos exceptuando backups/ para la restauración...`);
      const filesRemoved = await wipeDataDirExceptBackups(instance.dataPath);

      this.log(`Extrayendo archivo nativo ${backupId}...`);
      await extractZip(zipPath, instance.dataPath);

      const now = Date.now();
      this.log(
        SERVER_STRINGS.MSG_BACKUP_RESTORED
          .replace('{name}', backupId)
          .replace('{instance}', instance.name)
      );

      return { restoredAt: now, filesRestored: filesRemoved };
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

    const backupsDir = this.getBackupsDir(instance.dataPath);
    const zipPath = path.join(backupsDir, backupId);

    if (!fs.existsSync(zipPath)) {
      throw new Error(SERVER_STRINGS.ERR_BACKUP_NOT_FOUND.replace('{id}', backupId));
    }

    try {
      await fsp.rm(zipPath, { force: true });
      try { await fsp.rm(zipPath + '.json', { force: true }); } catch (_) {}
      this.log(SERVER_STRINGS.MSG_BACKUP_DELETED.replace('{name}', backupId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(SERVER_STRINGS.ERR_BACKUP_DELETE_FAILED.replace('{message}', message));
    }
  }
}
