import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '../services/apiService.js';
import type { InstanceRegistry, PzInstance } from '../types.js';

interface UseInstancesResult {
  registry: InstanceRegistry;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: { name: string; branch: string; gamePort: number; rconPort: number; maxPlayers: number }) => Promise<PzInstance>;
  select: (id: string) => Promise<PzInstance>;
  install: (id: string) => Promise<{ instance: PzInstance; success: boolean }>;
  remove: (id: string) => Promise<void>;
  migrate: (sourceId: string, targetId: string) => Promise<{ filesCopied: number; bytesCopied: number }>;
}

const emptyRegistry: InstanceRegistry = { instances: [], activeInstanceId: null, updatedAt: 0 };

export function useInstances(token: string | null, onSessionExpired: () => void): UseInstancesResult {
  const [registry, setRegistry] = useState<InstanceRegistry>(emptyRegistry);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const reg = await ApiService.listInstances(token);
      setRegistry({
        instances: Array.isArray(reg?.instances) ? reg.instances : [],
        activeInstanceId: reg?.activeInstanceId || null,
        updatedAt: reg?.updatedAt || Date.now()
      });
      setError(null);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      if (message.includes('expirada') || message.includes('autorizada')) onSessionExpired();
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token, onSessionExpired]);

  useEffect(() => {
    if (!token) return;
    refresh();
  }, [token, refresh]);

  const create = useCallback(async (input: { name: string; branch: string; gamePort: number; rconPort: number; maxPlayers: number }) => {
    if (!token) throw new Error('No autenticado');
    const { instance } = await ApiService.createInstance(token, input);
    await refresh();
    return instance;
  }, [token, refresh]);

  const select = useCallback(async (id: string) => {
    if (!token) throw new Error('No autenticado');
    const { instance } = await ApiService.selectInstance(token, id);
    await refresh();
    return instance;
  }, [token, refresh]);

  const install = useCallback(async (id: string) => {
    if (!token) throw new Error('No autenticado');
    const result = await ApiService.installInstance(token, id);
    await refresh();
    return result;
  }, [token, refresh]);

  const remove = useCallback(async (id: string) => {
    if (!token) throw new Error('No autenticado');
    await ApiService.deleteInstance(token, id);
    await refresh();
  }, [token, refresh]);

  const migrate = useCallback(async (sourceId: string, targetId: string) => {
    if (!token) throw new Error('No autenticado');
    const result = await ApiService.migrateInstance(token, targetId, sourceId);
    await refresh();
    return result;
  }, [token, refresh]);

  return { registry, loading, error, refresh, create, select, install, remove, migrate };
}
