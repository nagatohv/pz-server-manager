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
    const wss = initWebSocketServer(
      httpServer,
      createMockAuthUseCase(),
      createMockControlUseCase()
    );

    expect(wss).toBeDefined();
    expect(typeof wss.on).toBe('function');
  });
});
