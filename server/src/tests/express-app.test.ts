import { describe, it, expect, vi } from 'vitest';
import createExpressApp from '../frameworks/express/express-app.js';
import IniParserStrategy from '../adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../adapters/parsers/SpawnParserStrategy.js';
import { ServerStatus } from '../types.js';
import type AuthenticateUseCase from '../usecases/AuthenticateUseCase.js';
import type ControlServerUseCase from '../usecases/ControlServerUseCase.js';
import type ManageConfigUseCase from '../usecases/ManageConfigUseCase.js';
import type ListBranchesUseCase from '../usecases/ListBranchesUseCase.js';

describe('express-app Framework Driver', () => {
  const createMockAuthUseCase = (): AuthenticateUseCase => ({
    execute: vi.fn().mockReturnValue({ token: 'mock-jwt-token' }),
    verify: vi.fn().mockReturnValue({ role: 'admin' })
  }) as unknown as AuthenticateUseCase;

  const createMockControlUseCase = (): ControlServerUseCase => ({
    getStatus: vi.fn().mockReturnValue({
      status: ServerStatus.Stopped,
      stats: { cpu: 0, memory: 0 },
      onlinePlayers: 0,
      idleShutdown: { minutes: 0, expiresAt: null, timeRemaining: 0 },
      config: { serverName: 'test', jvmMin: 4, jvmMax: 8, installedBranch: '' }
    }),
    start: vi.fn().mockReturnValue({ success: true }),
    stop: vi.fn().mockReturnValue({ success: true }),
    kill: vi.fn().mockReturnValue({ success: true }),
    update: vi.fn().mockReturnValue({ success: true }),
    sendCommand: vi.fn().mockReturnValue({ success: true }),
    serverControlService: { setPanelConfig: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }
  }) as unknown as ControlServerUseCase;

  const createMockManageUseCase = (): ManageConfigUseCase => ({
    getSettings: vi.fn().mockReturnValue([{ key: 'PVP', value: 'true', description: '' }]),
    saveSettings: vi.fn().mockReturnValue({ success: true }),
    getPanelConfig: vi.fn().mockReturnValue({ idleShutdownMinutes: 0, serverLanguage: 'es' }),
    savePanelConfig: vi.fn().mockReturnValue({ idleShutdownMinutes: 10, serverLanguage: 'es' }),
    getRawFile: vi.fn().mockReturnValue('MaxPlayers=16'),
    saveRawFile: vi.fn().mockReturnValue({ success: true })
  }) as unknown as ManageConfigUseCase;

  const createMockListBranchesUseCase = (): ListBranchesUseCase => ({
    getSnapshot: vi.fn().mockReturnValue({
      branches: [
        { name: 'public', buildId: '1', timeUpdated: '', description: '', isDefault: true, isUnstable: false },
        { name: 'unstable', buildId: '2', timeUpdated: '', description: '', isDefault: false, isUnstable: true }
      ],
      isLoading: false,
      error: null,
      fetchedAt: 0,
      source: 'steam'
    }),
    refresh: vi.fn(),
    subscribe: vi.fn().mockReturnValue(() => {})
  }) as unknown as ListBranchesUseCase;

  it('should create express app instance correctly', () => {
    const instanceService = {
      listInstances: vi.fn().mockResolvedValue({ instances: [], activeInstanceId: null, updatedAt: 0 }),
      createInstance: vi.fn(),
      selectInstance: vi.fn(),
      installInstance: vi.fn(),
      deleteInstance: vi.fn(),
      migrateUserData: vi.fn()
    } as any;

    const app = createExpressApp(
      createMockAuthUseCase(),
      createMockControlUseCase(),
      createMockManageUseCase(),
      createMockListBranchesUseCase(),
      instanceService,
      new IniParserStrategy(),
      new SandboxParserStrategy(),
      new SpawnParserStrategy()
    );

    expect(app).toBeDefined();
    expect(typeof app.listen).toBe('function');
  });
});
