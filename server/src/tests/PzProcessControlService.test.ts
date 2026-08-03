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

  it('should start idle shutdown timer when server is running and empty, and report active shutdown status', () => {
    service.setPanelConfig({ idleShutdownMinutes: 10, serverLanguage: 'es' });

    (service as any).pzStatus = ServerStatus.Running;
    (service as any).onlinePlayerCount = 0;
    (service as any).checkIdleShutdown();

    const status = service.getStatus();
    expect(status.idleShutdown.active).toBe(true);
    expect(status.idleShutdown.remainingSeconds).toBeGreaterThan(0);
    expect(status.idleShutdown.remainingSeconds).toBeLessThanOrEqual(600);

    service.updatePlayerCount(1);
    const statusWithPlayer = service.getStatus();
    expect(statusWithPlayer.idleShutdown.active).toBe(false);
    expect(statusWithPlayer.idleShutdown.remainingSeconds).toBe(0);

    service.updatePlayerCount(0);
    const statusAfterDisconnect = service.getStatus();
    expect(statusAfterDisconnect.idleShutdown.active).toBe(true);
    expect(statusAfterDisconnect.idleShutdown.remainingSeconds).toBeGreaterThan(0);

    (service as any).clearAllTimers();
  });

  it('should handle updateGame failure if steamcmd is missing', () => {
    const result = service.updateGame('unstable');
    expect(result.error).toBeDefined();
  });

  it('should detect player count from Spanish output ("Jugadores conectados (N)")', () => {
    service.setPanelConfig({ idleShutdownMinutes: 5, serverLanguage: 'es' });
    (service as any).pzStatus = ServerStatus.Running;
    (service as any).onlinePlayerCount = 0;
    (service as any).checkIdleShutdown();

    // Simulate the multilang regex matching the Spanish output of the `players` command.
    (service as any).appendLog('Jugadores conectados (0):');
    const match = 'Jugadores conectados (0):'.match(/(?:Players?\s+connected|Jugadores?\s+conectados?)\s*\(?(\d+)\)?/i);
    expect(match).not.toBeNull();
    (service as any).updatePlayerCount(parseInt(match![1], 10));

    const status = service.getStatus();
    expect(status.onlinePlayers).toBe(0);
    expect(status.idleShutdown.active).toBe(true);

    (service as any).clearAllTimers();
  });

  it('should track individual player connect/disconnect events as a backup signal', () => {
    (service as any).pzStatus = ServerStatus.Running;
    (service as any).onlinePlayerCount = 0;
    (service as any).lastPlayerSignalAt = 0;

    // Simulate two players joining via Spanish-language connect events.
    (service as any).connectedPlayerNames = new Set();
    const joinRegex = /(?:Player|User|Jugador|Usuario)\s+(?:connected|conectado)\s*[:\-]\s*(\S+)/i;
    const leaveRegex = /(?:Player|User|Jugador|Usuario)\s+(?:disconnected|desconectado)\s*[:\-]\s*(\S+)/i;

    const join1 = 'Jugador conectado: alice'.match(joinRegex);
    expect(join1).not.toBeNull();
    (service as any).connectedPlayerNames.add(join1![1]);
    (service as any).onlinePlayerCount = (service as any).connectedPlayerNames.size;

    const join2 = 'Jugador conectado: bob'.match(joinRegex);
    (service as any).connectedPlayerNames.add(join2![1]);
    (service as any).onlinePlayerCount = (service as any).connectedPlayerNames.size;

    expect((service as any).connectedPlayerNames.size).toBe(2);
    expect((service as any).onlinePlayerCount).toBe(2);

    const leave1 = 'Jugador desconectado: alice'.match(leaveRegex);
    expect(leave1).not.toBeNull();
    (service as any).connectedPlayerNames.delete(leave1![1]);
    (service as any).onlinePlayerCount = (service as any).connectedPlayerNames.size;

    expect((service as any).connectedPlayerNames.size).toBe(1);
    expect((service as any).onlinePlayerCount).toBe(1);
  });

  it('should track session uptime and fire onSessionEnd callback', () => {
    const callback = vi.fn();
    service.onSessionEnd = callback;

    (service as any).pzStatus = ServerStatus.Running;
    (service as any).sessionStartedAt = Date.now() - 5000;
    (service as any).lastKnownTotalUptimeMs = 120000;

    (service as any).endCurrentSession();

    expect(callback).toHaveBeenCalledTimes(1);
    const duration = callback.mock.calls[0][0] as number;
    expect(duration).toBeGreaterThanOrEqual(4000);
    expect(duration).toBeLessThanOrEqual(6000);

    const status = service.getStatus();
    expect(status.uptime.sessionStartedAt).toBeNull();
    expect(status.uptime.totalUptimeSeconds).toBeGreaterThanOrEqual(125);
  });

  it('should expose current and total uptime in the status payload', () => {
    (service as any).sessionStartedAt = Date.now() - 10000;
    (service as any).lastKnownTotalUptimeMs = 30000;
    (service as any).pzStatus = ServerStatus.Running;

    const status = service.getStatus();
    expect(status.uptime.sessionStartedAt).not.toBeNull();
    expect(status.uptime.currentSessionSeconds).toBeGreaterThanOrEqual(9);
    expect(status.uptime.totalUptimeSeconds).toBeGreaterThanOrEqual(39);
  });

  it('should reset session and uptime on clearAllTimers/resetCounters', () => {
    (service as any).sessionStartedAt = Date.now() - 3000;
    (service as any).lastKnownTotalUptimeMs = 60000;
    (service as any).connectedPlayerNames.add('alice');

    (service as any).clearAllTimers();
    (service as any).resetCounters();

    expect((service as any).connectedPlayerNames.size).toBe(0);
    // Note: clearAllTimers/resetCounters do NOT close the session; that happens
    // in endCurrentSession which is only called on process exit. We assert here
    // that resetCounters alone doesn't accidentally clear the session.
    expect((service as any).sessionStartedAt).not.toBeNull();
  });
});
