import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import http from 'http';
import createExpressApp from '../frameworks/express/express-app.js';
import IniParserStrategy from '../adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../adapters/parsers/SpawnParserStrategy.js';
import type AuthenticateUseCase from '../usecases/AuthenticateUseCase.js';
import type ControlServerUseCase from '../usecases/ControlServerUseCase.js';
import type ManageConfigUseCase from '../usecases/ManageConfigUseCase.js';
import type ListBranchesUseCase from '../usecases/ListBranchesUseCase.js';
import type { BranchInfo } from '../types.js';

const createMockAuthUseCase = (): AuthenticateUseCase => ({
  execute: vi.fn().mockReturnValue({ token: 'mock-jwt-token' }),
  verify: vi.fn().mockReturnValue({ role: 'admin' })
}) as unknown as AuthenticateUseCase;

const createMockControlUseCase = (): ControlServerUseCase => ({
  getStatus: vi.fn().mockReturnValue({ status: 'STOPPED' }),
  start: vi.fn().mockReturnValue({ success: true }),
  stop: vi.fn().mockReturnValue({ success: true }),
  kill: vi.fn().mockReturnValue({ success: true }),
  restart: vi.fn().mockReturnValue({ success: true }),
  update: vi.fn().mockReturnValue({ success: true }),
  sendCommand: vi.fn().mockReturnValue({ success: true }),
  serverControlService: { setPanelConfig: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }
}) as unknown as ControlServerUseCase;

const createMockManageUseCase = (): ManageConfigUseCase => ({
  getSettings: vi.fn().mockReturnValue([]),
  saveSettings: vi.fn().mockReturnValue({ success: true }),
  getPanelConfig: vi.fn().mockReturnValue({ idleShutdownMinutes: 0, serverLanguage: 'es' }),
  savePanelConfig: vi.fn().mockReturnValue({ idleShutdownMinutes: 0, serverLanguage: 'es' }),
  getRawFile: vi.fn().mockReturnValue(''),
  saveRawFile: vi.fn().mockReturnValue({ success: true })
}) as unknown as ManageConfigUseCase;

const sampleBranches: BranchInfo[] = [
  { name: '', buildId: '100', timeUpdated: '1700000000', description: '', isDefault: true, isUnstable: false },
  { name: 'b42stable', buildId: '200', timeUpdated: '1700000999', description: 'Build 42 stable', isDefault: false, isUnstable: false },
  { name: 'unstable', buildId: '300', timeUpdated: '1700001999', description: 'Latest unstable', isDefault: false, isUnstable: true }
];

const buildApp = (useCase: ListBranchesUseCase) => {
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
    useCase,
    instanceService,
    new IniParserStrategy(),
    new SandboxParserStrategy(),
    new SpawnParserStrategy()
  );
  return http.createServer(app);
};

describe('GET /api/branches endpoint', () => {
  it('returns the current snapshot and triggers a background refresh', async () => {
    const listBranchesUseCase = {
      getSnapshot: vi.fn().mockReturnValue({ branches: sampleBranches, isLoading: false, error: null, fetchedAt: 1700000000000, source: 'steam' }),
      refresh: vi.fn()
    } as unknown as ListBranchesUseCase;
    const server = buildApp(listBranchesUseCase);

    const res = await request(server)
      .get('/api/branches')
      .set('Authorization', 'Bearer mock-jwt-token');
    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(res.status).toBe(200);
    expect(res.body.branches).toEqual(sampleBranches);
    expect(res.body.source).toBe('steam');
    expect(listBranchesUseCase.refresh).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated requests with 401 before touching the use case', async () => {
    const listBranchesUseCase = {
      getSnapshot: vi.fn(),
      refresh: vi.fn()
    } as unknown as ListBranchesUseCase;
    const server = buildApp(listBranchesUseCase);

    const res = await request(server).get('/api/branches');
    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(res.status).toBe(401);
    expect(listBranchesUseCase.getSnapshot).not.toHaveBeenCalled();
  });

  it('returns 500 with an error message when the snapshot accessor throws', async () => {
    const listBranchesUseCase = {
      getSnapshot: vi.fn().mockImplementation(() => { throw new Error('catálogo no inicializado'); }),
      refresh: vi.fn()
    } as unknown as ListBranchesUseCase;
    const server = buildApp(listBranchesUseCase);

    const res = await request(server)
      .get('/api/branches')
      .set('Authorization', 'Bearer mock-jwt-token');
    await new Promise<void>((resolve) => server.close(() => resolve()));

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'catálogo no inicializado' });
  });
});
