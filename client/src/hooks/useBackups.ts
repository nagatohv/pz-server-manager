import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService.js';
import { translate } from '../utils/i18n.js';
import type { PzBackup } from '../types.js';

export interface UseBackupsParams {
  token: string | null;
  instanceId: string | null;
}

export const useBackups = ({ token, instanceId }: UseBackupsParams) => {
  const [backups, setBackups] = useState<PzBackup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    if (!token || !instanceId) {
      setBackups([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ApiService.getBackups(token, instanceId);
      setBackups(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : translate('backups.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [token, instanceId]);

  useEffect(() => {
    void fetchBackups();
  }, [fetchBackups]);

  const createBackup = useCallback(async (note?: string): Promise<PzBackup> => {
    if (!token || !instanceId) throw new Error(translate('backups.noSessionOrInstance'));
    setLoading(true);
    try {
      const backup = await ApiService.createBackup(token, instanceId, note);
      await fetchBackups();
      return backup;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate('backups.errorCreate');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, instanceId, fetchBackups]);

  const restoreBackup = useCallback(async (backupId: string): Promise<void> => {
    if (!token || !instanceId) throw new Error(translate('backups.noSessionOrInstance'));
    setLoading(true);
    try {
      await ApiService.restoreBackup(token, instanceId, backupId);
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate('backups.errorRestore');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, instanceId, fetchBackups]);

  const deleteBackup = useCallback(async (backupId: string): Promise<void> => {
    if (!token || !instanceId) throw new Error(translate('backups.noSessionOrInstance'));
    setLoading(true);
    try {
      await ApiService.deleteBackup(token, instanceId, backupId);
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : translate('backups.errorDelete');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, instanceId, fetchBackups]);

  return {
    backups,
    loading,
    error,
    refreshBackups: fetchBackups,
    createBackup,
    restoreBackup,
    deleteBackup
  };
};
