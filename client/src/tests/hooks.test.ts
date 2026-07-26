import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth.js';
import { useServerStatus } from '../hooks/useServerStatus.js';
import { useConfigManager } from '../hooks/useConfigManager.js';
import { ServerAction } from '../types.js';

describe('Custom Hooks Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ token: 'mock-auth-token', status: 'STOPPED' }),
        text: async () => 'MaxPlayers=16'
      })
    );

    class MockWebSocket {
      onmessage: any;
      onclose: any;
      readyState = 1;
      send = vi.fn();
      close = vi.fn();
    }
    vi.stubGlobal('WebSocket', MockWebSocket as any);
  });

  it('should test useAuth hook login and logout', async () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.login('password123');
    });

    expect(result.current.token).toBe('mock-auth-token');
    expect(result.current.isAuthenticated).toBe(true);

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should test useServerStatus hook', async () => {
    const onExpired = vi.fn();
    const { result } = renderHook(() => useServerStatus('mock-token', onExpired));

    expect(result.current.status).toBeDefined();
    expect(result.current.logs).toEqual([]);

    await act(async () => {
      await result.current.executeAction(ServerAction.Start);
    });

    act(() => {
      result.current.sendCommand('help');
    });

    expect(result.current.status).toBeDefined();
  });

  it('should test useConfigManager hook settings, mods and sandbox updates', async () => {
    const onExpired = vi.fn();
    const { result } = renderHook(() => useConfigManager('mock-token', onExpired));

    act(() => {
      result.current.addMod('Hydrocraft', '514493422');
      result.current.updateIniSetting('MaxPlayers', '32');
      result.current.updatePanelConfigField('idleShutdownMinutes', 15);
      result.current.updateSandboxValue('ZombieConfig.Speed', 3);
      result.current.toggleSpawnRegion(0);
    });

    expect(result.current.modsList).toEqual([{ modId: 'Hydrocraft', workshopId: '514493422' }]);

    await act(async () => {
      await result.current.saveSettings();
      await result.current.saveMods();
      await result.current.saveEditor();
    });

    act(() => {
      result.current.removeMod(0);
      result.current.removeSpawnRegion(0);
    });

    expect(result.current.modsList).toEqual([]);
  });
});
