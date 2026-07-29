import { describe, it, expect, vi } from 'vitest';
import http from 'http';
import initWebSocketServer from '../frameworks/websocket/websocket-server.js';

describe('websocket-server Framework Driver', () => {
  const createMockAuthUseCase = () => ({
    verify: vi.fn().mockReturnValue({ role: 'admin' })
  } as any);

  const createMockControlUseCase = () => ({
    sendCommand: vi.fn(),
    serverControlService: {
      subscribe: vi.fn(),
      unsubscribe: vi.fn()
    }
  } as any);

  it('should attach upgrade listener to HTTP server and return wss instance', () => {
    const httpServer = http.createServer();
    const listBranchesUseCase = {
      getSnapshot: vi.fn().mockReturnValue({ branches: [], isLoading: false, error: null, fetchedAt: null, source: 'steam' }),
      refresh: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {})
    } as any;
    const wss = initWebSocketServer(
      httpServer,
      createMockAuthUseCase(),
      createMockControlUseCase(),
      listBranchesUseCase
    );

    expect(wss).toBeDefined();
    expect(typeof wss.on).toBe('function');
  });

  it('subscribes once to the branch catalog and triggers an initial refresh', () => {
    const httpServer = http.createServer();
    const listBranchesUseCase = {
      getSnapshot: vi.fn().mockReturnValue({ branches: [], isLoading: false, error: null, fetchedAt: null, source: 'steam' }),
      refresh: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {})
    } as any;
    initWebSocketServer(
      httpServer,
      createMockAuthUseCase(),
      createMockControlUseCase(),
      listBranchesUseCase
    );

    expect(listBranchesUseCase.subscribe).toHaveBeenCalledTimes(1);
    expect(listBranchesUseCase.refresh).toHaveBeenCalledTimes(1);
  });
});
