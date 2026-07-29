import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth.js';
import { useServerStatus } from '../hooks/useServerStatus.js';
import { useConfigManager } from '../hooks/useConfigManager.js';
import { ServerAction } from '../types.js';

interface MockWs {
  onmessage: ((event: { data: string }) => void) | null;
  onclose: (() => void) | null;
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

const wsInstances: MockWs[] = [];

describe('Custom Hooks Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    wsInstances.length = 0;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/branches')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            branches: [
              { name: '', buildId: '12345', timeUpdated: '', description: '', isDefault: true, isUnstable: false },
              { name: 'unstable', buildId: '67890', timeUpdated: '', description: '', isDefault: false, isUnstable: true }
            ],
            isLoading: false,
            error: null,
            fetchedAt: 1,
            source: 'steam'
          }),
          text: async () => ''
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: 'mock-auth-token', status: 'STOPPED' }),
        text: async () => 'MaxPlayers=16'
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    class MockWebSocket implements MockWs {
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      readyState = 1;
      send = vi.fn();
      close = vi.fn();
      constructor() {
        wsInstances.push(this);
      }
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

  it('should test useServerStatus hook with a successful branch fetch', async () => {
    const onExpired = vi.fn();
    const { result } = renderHook(() => useServerStatus('mock-token', onExpired));

    expect(result.current.status).toBeDefined();
    expect(result.current.logs).toEqual([]);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.availableBranches.length).toBeGreaterThan(0);
    expect(result.current.branchesError).toBeNull();

    await act(async () => {
      await result.current.executeAction(ServerAction.Start);
    });

    act(() => {
      result.current.sendCommand('help');
    });

    expect(result.current.status).toBeDefined();
  });

  it('exposes the backend error message and does not inject a fake default branch', async () => {
    const failingFetch = vi.fn().mockImplementation(async (url: string) => {
      if (typeof url === 'string' && url.includes('/api/branches')) {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: 'SteamCMD no responde' })
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ token: 'mock-auth-token', status: 'STOPPED' }),
        text: async () => 'MaxPlayers=16'
      };
    });
    vi.stubGlobal('fetch', failingFetch);

    const onExpired = vi.fn();
    const { result } = renderHook(() => useServerStatus('mock-token', onExpired));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.availableBranches).toEqual([]);
    expect(result.current.branchesError).toBe('SteamCMD no responde');

    await act(async () => {
      await result.current.refreshBranches();
    });
    expect(result.current.branchesError).toBe('SteamCMD no responde');
  });

  it('re-fetches branches when refreshBranches is called', async () => {
    const onExpired = vi.fn();
    const { result } = renderHook(() => useServerStatus('mock-token', onExpired));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const callsBefore = (fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length;

    await act(async () => {
      await result.current.refreshBranches();
    });

    const callsAfter = (fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  it('updates the catalog when the WebSocket pushes a branches_update message', async () => {
    const onExpired = vi.fn();
    const { result } = renderHook(() => useServerStatus('mock-token', onExpired));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.availableBranches.length).toBeGreaterThan(0);
    const instance = wsInstances[wsInstances.length - 1];
    const newBranches = [
      { name: 'public', buildId: '99', timeUpdated: '', description: '', isDefault: true, isUnstable: false },
      { name: 'b42stable', buildId: '100', timeUpdated: '', description: 'Build 42 stable', isDefault: false, isUnstable: false }
    ];

    await act(async () => {
      instance.onmessage?.({
        data: JSON.stringify({ type: 'branches_update', data: { branches: newBranches, isLoading: false, error: null, fetchedAt: 1, source: 'steam' } })
      });
    });

    expect(result.current.availableBranches.map((b) => b.name)).toEqual(['public', 'b42stable']);
    expect(result.current.branchesState).toBe('ready');
    expect(result.current.branchesSource).toBe('steam');
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
