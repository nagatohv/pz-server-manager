import { describe, it, expect, vi } from 'vitest';
import ControlServerUseCase from '../usecases/ControlServerUseCase.js';
import type IServerControlService from '../domain/ports/IServerControlService.js';
import { ServerStatus } from '../types.js';

describe('ControlServerUseCase', () => {
  const createMockService = (): IServerControlService => ({
    getStatus: vi.fn().mockReturnValue({
      status: ServerStatus.Stopped,
      stats: { cpu: 0, memory: 0 },
      onlinePlayers: 0,
      idleShutdown: { minutes: 0, expiresAt: null, timeRemaining: 0 },
      config: { serverName: 'test', jvmMin: 4, jvmMax: 8, installedBranch: '' }
    }),
    startServer: vi.fn().mockReturnValue({ success: true }),
    stopServer: vi.fn().mockReturnValue({ success: true }),
    killServer: vi.fn().mockReturnValue({ success: true }),
    updateGame: vi.fn().mockReturnValue({ success: true }),
    sendCommand: vi.fn().mockReturnValue({ success: true }),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    setPanelConfig: vi.fn()
  });

  it('should call getStatus of serverControlService', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    const status = useCase.getStatus();
    expect(mockService.getStatus).toHaveBeenCalled();
    expect(status.status).toBe(ServerStatus.Stopped);
  });

  it('should call startServer of serverControlService', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    useCase.start();
    expect(mockService.startServer).toHaveBeenCalled();
  });

  it('should call stopServer of serverControlService', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    useCase.stop();
    expect(mockService.stopServer).toHaveBeenCalled();
  });

  it('should call killServer of serverControlService', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    useCase.kill();
    expect(mockService.killServer).toHaveBeenCalled();
  });

  it('should call updateGame of serverControlService with correct branch', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    useCase.update('unstable');
    expect(mockService.updateGame).toHaveBeenCalledWith('unstable');
  });

  it('should call sendCommand of serverControlService with clean command', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    useCase.sendCommand('/help');
    expect(mockService.sendCommand).toHaveBeenCalledWith('/help');
  });

  it('should throw error if command is missing', () => {
    const mockService = createMockService();
    const useCase = new ControlServerUseCase(mockService);
    expect(() => useCase.sendCommand('')).toThrow('Comando requerido');
  });
});
