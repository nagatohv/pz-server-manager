import { describe, it, expect, vi } from 'vitest';
import { ApiService } from '../services/apiService.js';

describe('ApiService Unit Tests', () => {
  it('should call login API and return token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: 'mock-token' })
      })
    );

    const res = await ApiService.login('secret');
    expect(res.token).toBe('mock-token');
  });

  it('should get status, settings, panel config, parsed config, and raw config', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: 'STOPPED', content: 'raw-text-content', data: [{ key: 'PVP', value: 'true' }] })
      })
    );

    const status = await ApiService.getStatus('token');
    expect(status.status).toBe('STOPPED');

    const settings = await ApiService.getIniSettings('token');
    expect(settings).toBeDefined();

    const panelConfig = await ApiService.getPanelConfig('token');
    expect(panelConfig).toBeDefined();

    const parsed = await ApiService.getParsedConfig('token', 'ini');
    expect(parsed).toBeDefined();

    const raw = await ApiService.getRawConfig('token', 'ini');
    expect(raw).toBe('raw-text-content');
  });

  it('should throw error when request fails with 401/403 or server error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' })
      })
    );

    await expect(ApiService.login('wrong')).rejects.toThrow();
    await expect(ApiService.getStatus('invalid-token')).rejects.toThrow();
  });

  it('should fetch the branch catalog snapshot including source and error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          branches: [
            { name: '', buildId: '12345', timeUpdated: '', description: '', isDefault: true, isUnstable: false },
            { name: 'b42stable', buildId: '67890', timeUpdated: '', description: 'Build 42 stable', isDefault: false, isUnstable: false },
            { name: 'unstable', buildId: '67891', timeUpdated: '', description: 'Unstable', isDefault: false, isUnstable: true }
          ],
          isLoading: false,
          error: null,
          fetchedAt: 1,
          source: 'steam'
        })
      })
    );

    const snapshot = await ApiService.getBranchCatalogSnapshot('token');
    expect(snapshot.branches).toHaveLength(3);
    expect(snapshot.source).toBe('steam');
    expect(snapshot.error).toBeNull();
  });

  it('should report the fallback source when the backend indicates it', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          branches: [],
          isLoading: false,
          error: null,
          fetchedAt: 1,
          source: 'fallback'
        })
      })
    );

    const snapshot = await ApiService.getBranchCatalogSnapshot('token');
    expect(snapshot.source).toBe('fallback');
    expect(snapshot.branches).toEqual([]);
  });

  it('should return an empty snapshot when the payload is malformed', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({})
      })
    );

    const snapshot = await ApiService.getBranchCatalogSnapshot('token');
    expect(snapshot.branches).toEqual([]);
    expect(snapshot.source).toBe('steam');
    expect(snapshot.error).toBeNull();
  });
});
