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
});
