import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getProcessControlService } from '../adapters/services/PzProcessControlService.js';
import IniParserStrategy from '../adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../adapters/parsers/SpawnParserStrategy.js';
import PzConfigRepository from '../adapters/repositories/PzConfigRepository.js';
import { ServerStatus } from '../types.js';
import type { ISystemConfig, ProcessObserver } from '../types.js';

describe('PzProcessControlService', () => {
  let tmpDir: string;
  let mockSystemConfig: ISystemConfig;
  let configRepo: PzConfigRepository;
  let service: ReturnType<typeof getProcessControlService>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-service-test-'));
    mockSystemConfig = {
      PORT: 3000,
      JWT_SECRET: 'test-secret',
      ADMIN_PASSWORD: 'admin',
      DATA_DIR: path.join(tmpDir, 'data'),
      PZ_SERVER_DIR: path.join(tmpDir, 'pzserver'),
      ZO_USER_DIR: path.join(tmpDir, 'Zomboid'),
      SERVER_NAME: 'testserver',
      STEAM_APP_BRANCH: '',
      JVM_MIN_GB: 4,
      JVM_MAX_GB: 8
    };

    configRepo = new PzConfigRepository(
      mockSystemConfig,
      new IniParserStrategy(),
      new SandboxParserStrategy(),
      new SpawnParserStrategy()
    );

    service = getProcessControlService(mockSystemConfig, configRepo);
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should return initial status STOPPED', () => {
    const status = service.getStatus();
    expect(status.status).toBe(ServerStatus.Stopped);
    expect(status.stats.cpu).toBe(0);
    expect(status.stats.memory).toBe(0);
  });

  it('should manage observer subscriptions and send notifications', () => {
    const mockObserver: ProcessObserver = {
      onLog: vi.fn(),
      onStatusUpdate: vi.fn(),
      onLogHistory: vi.fn()
    };

    service.subscribe(mockObserver);
    expect(mockObserver.onLogHistory).toHaveBeenCalled();
    expect(mockObserver.onStatusUpdate).toHaveBeenCalled();

    service.unsubscribe(mockObserver);
  });

  it('should reject starting server if start script is missing', () => {
    const result = service.startServer();
    expect(result.error).toBeDefined();
  });

  it('should reject commands when server is not running', () => {
    const result = service.sendCommand('/help');
    expect(result.error).toBeDefined();
  });

  it('should update player count and handle status changes', () => {
    service.updatePlayerCount(5);
    const status = service.getStatus();
    expect(status.onlinePlayers).toBe(5);
  });

  it('should update panel config for idle shutdown', () => {
    service.setPanelConfig({ idleShutdownMinutes: 20, serverLanguage: 'es' });
    const status = service.getStatus();
    expect(status.idleShutdown.minutes).toBe(20);
  });

  it('should fail stopServer if server is already stopped', () => {
    const result = service.stopServer();
    expect(result.error).toBeDefined();
  });

  it('should handle killServer when no process is running', () => {
    const result = service.killServer();
    expect(result.error).toBeDefined();
  });

  it('should handle updateGame failure if steamcmd is missing', () => {
    const result = service.updateGame('unstable');
    expect(result.error).toBeDefined();
  });
});
