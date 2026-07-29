import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App.js';

describe('App React Component', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/auth/login')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ token: 'mock-valid-token' })
          });
        }
        if (typeof url === 'string' && url.includes('/api/branches')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              branches: [
                { name: '', buildId: '12345', timeUpdated: '', description: '', isDefault: true, isUnstable: false }
              ]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            status: 'STOPPED',
            onlinePlayers: 0,
            stats: { cpu: 0, memory: 0, memoryTotal: 4096 },
            idleShutdown: { minutes: 0, active: false, remainingSeconds: 0 },
            config: { serverName: 'servertest', jvmMin: 4, jvmMax: 8, installedBranch: '' }
          }),
          text: async () => 'MaxPlayers=16'
        });
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

  it('should render LoginPage when not authenticated and allow login', async () => {
    localStorage.removeItem('pz_token');
    render(<App />);

    expect(screen.getByText(/PZ Server Manager/i)).toBeDefined();

    const input = screen.getByPlaceholderText(/Contraseña de administración/i);
    fireEvent.change(input, { target: { value: 'secret' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/i }));
    });

    expect(localStorage.getItem('pz_token')).toBe('mock-valid-token');
  });

  it('should render PortalPage when authenticated token is present and allow logout', async () => {
    localStorage.setItem('pz_token', 'mock-valid-token');
    render(<App />);

    // Allow the async fetches inside useServerStatus and useConfigManager to settle.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(screen.getByText(/Consola y Control/i)).toBeDefined();

    const logoutBtn = screen.getByRole('button', { name: /Salir/i });
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(localStorage.getItem('pz_token')).toBeNull();
  });
});
