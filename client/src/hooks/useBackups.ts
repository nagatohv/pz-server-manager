import { useState, useEffect, useCallback } from 'react';
import { ApiService } from '../services/apiService.js';
import type { PzBackup } from '../types.js';

export const useBackups = (token: string | null, instanceId: string | null) => {
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
      setError(err instanceof Error ? err.message : 'Error al cargar respaldos');
    } finally {
      setLoading(false);
    }
  }, [token, instanceId]);

  useEffect(() => {
    void fetchBackups();
  }, [fetchBackups]);

  const createBackup = useCallback(async (note?: string): Promise<PzBackup> => {
    if (!token || !instanceId) throw new Error('No hay sesión o instancia seleccionada');
    setLoading(true);
    try {
      const backup = await ApiService.createBackup(token, instanceId, note);
      await fetchBackups();
      return backup;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al crear respaldo';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, instanceId, fetchBackups]);

  const restoreBackup = useCallback(async (backupId: string): Promise<void> => {
    if (!token || !instanceId) throw new Error('No hay sesión o instancia seleccionada');
    setLoading(true);
    try {
      await ApiService.restoreBackup(token, instanceId, backupId);
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al restaurar respaldo';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [token, instanceId, fetchBackups]);

  const deleteBackup = useCallback(async (backupId: string): Promise<void> => {
    if (!token || !instanceId) throw new Error('No hay sesión o instancia seleccionada');
    setLoading(true);
    try {
      await ApiService.deleteBackup(token, instanceId, backupId);
      await fetchBackups();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar respaldo';
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
