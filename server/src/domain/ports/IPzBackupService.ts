import type { PzBackup } from '../../types.js';

export interface RestoreBackupResult {
  restoredAt: number;
  filesRestored: number;
}

export default interface IPzBackupService {
  listBackups(instanceId: string): Promise<PzBackup[]>;
  createBackup(instanceId: string, note?: string): Promise<PzBackup>;
  restoreBackup(instanceId: string, backupId: string): Promise<RestoreBackupResult>;
  deleteBackup(instanceId: string, backupId: string): Promise<void>;
}
