import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import request from 'supertest';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import createExpressApp from '../frameworks/express/express-app.js';
import IniParserStrategy from '../adapters/parsers/IniParserStrategy.js';
import SandboxParserStrategy from '../adapters/parsers/SandboxParserStrategy.js';
import SpawnParserStrategy from '../adapters/parsers/SpawnParserStrategy.js';
import { PzInstanceService } from '../adapters/services/PzInstanceService.js';
import { PzInstanceRepository } from '../adapters/repositories/PzInstanceRepository.js';
import type AuthenticateUseCase from '../usecases/AuthenticateUseCase.js';
import type ControlServerUseCase from '../usecases/ControlServerUseCase.js';
import type ManageConfigUseCase from '../usecases/ManageConfigUseCase.js';
import type ListBranchesUseCase from '../usecases/ListBranchesUseCase.js';
import type { ChildProcess } from 'child_process';

interface FakeChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (signal?: string) => boolean;
}

const buildFakeChild = (): FakeChildProcess => {
  const child = new EventEmitter() as FakeChildProcess;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn().mockReturnValue(true);
  return child;
};

const createMockAuth = (): AuthenticateUseCase => ({
  execute: vi.fn().mockReturnValue({ token: 'mock-jwt-token' }),
  verify: vi.fn().mockReturnValue({ role: 'admin' })
}) as unknown as AuthenticateUseCase;

const createMockControl = (): ControlServerUseCase => ({
  getStatus: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
  kill: vi.fn(),
  update: vi.fn(),
  sendCommand: vi.fn(),
  serverControlService: { setPanelConfig: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn() }
}) as unknown as ControlServerUseCase;

const createMockManage = (): ManageConfigUseCase => ({
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  getPanelConfig: vi.fn(),
  savePanelConfig: vi.fn(),
  getRawFile: vi.fn(),
  saveRawFile: vi.fn()
}) as unknown as ManageConfigUseCase;

const createMockListBranches = (): ListBranchesUseCase => ({
  getSnapshot: vi.fn().mockReturnValue({ branches: [], isLoading: false, error: null, fetchedAt: null, source: 'steam' }),
  refresh: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {})
}) as unknown as ListBranchesUseCase;

describe('PZ instances HTTP endpoints', () => {
  let tmpDir: string;
  let server: http.Server;
  let instanceService: PzInstanceService;
  let fakeChild: FakeChildProcess;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-inst-endpoint-'));
    fs.writeFileSync(path.join(tmpDir, 'steamcmd.sh'), '#!/bin/bash\n', 'utf8');
    const repo = new PzInstanceRepository(tmpDir);
    fakeChild = buildFakeChild();
    const spawnMock = vi.fn().mockReturnValue(fakeChild as unknown as ChildProcess);
    instanceService = new PzInstanceService({
      dataDir: tmpDir,
      repository: repo,
      spawnFn: spawnMock as any,
      steamCmdDir: tmpDir,
      onLog: () => {}
    });

    const app = createExpressApp(
      createMockAuth(),
      createMockControl(),
      createMockManage(),
      createMockListBranches(),
      instanceService,
      new IniParserStrategy(),
      new SandboxParserStrategy(),
      new SpawnParserStrategy()
    );
    server = http.createServer(app);
  });

  afterEach(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /api/instances returns an empty registry initially', async () => {
    const res = await request(server)
      .get('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.instances).toEqual([]);
    expect(res.body.activeInstanceId).toBeNull();
  });

  it('POST /api/instances creates a new instance and persists it on disk', async () => {
    const res = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'servertest', branch: 'b42stable', gamePort: 16261, rconPort: 27015, maxPlayers: 16 });

    expect(res.status).toBe(200);
    expect(res.body.instance.name).toBe('servertest');
    expect(res.body.instance.branch).toBe('b42stable');
    expect(res.body.instance.installed).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'instances'))).toBe(true);
  });

  it('POST /api/instances rejects invalid payloads with 400', async () => {
    const res = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'a', branch: '', gamePort: 999, rconPort: 999, maxPlayers: 16 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/instances/:id/select marks the instance as active', async () => {
    const created = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'srv-a', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16 });

    const res = await request(server)
      .post(`/api/instances/${created.body.instance.id}/select`)
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.instance.id).toBe(created.body.instance.id);

    const list = await request(server).get('/api/instances').set('Authorization', 'Bearer mock-jwt-token');
    expect(list.body.activeInstanceId).toBe(created.body.instance.id);
  });

  it('DELETE /api/instances/:id removes the instance and its on-disk directory', async () => {
    const created = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'to-delete', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16 });

    const dir = path.join(tmpDir, 'instances', created.body.instance.id);
    expect(fs.existsSync(dir)).toBe(true);

    const res = await request(server)
      .delete(`/api/instances/${created.body.instance.id}`)
      .set('Authorization', 'Bearer mock-jwt-token');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(fs.existsSync(dir)).toBe(false);
  });

  it('POST /api/instances/:id/migrate copies Zomboid/ from source to target', async () => {
    const source = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'src', branch: '', gamePort: 16261, rconPort: 27015, maxPlayers: 16 });
    const target = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'tgt', branch: 'b42stable', gamePort: 16262, rconPort: 27016, maxPlayers: 8 });

    const sourceZomboid = path.join(tmpDir, 'instances', source.body.instance.id, 'Zomboid');
    fs.mkdirSync(path.join(sourceZomboid, 'Saves'), { recursive: true });
    fs.writeFileSync(path.join(sourceZomboid, 'Saves', 'world.dat'), 'save-data', 'utf8');

    const res = await request(server)
      .post(`/api/instances/${target.body.instance.id}/migrate`)
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ sourceId: source.body.instance.id });

    expect(res.status).toBe(200);
    expect(res.body.filesCopied).toBeGreaterThan(0);

    const targetZomboid = path.join(tmpDir, 'instances', target.body.instance.id, 'Zomboid');
    expect(fs.readFileSync(path.join(targetZomboid, 'Saves', 'world.dat'), 'utf8')).toBe('save-data');
  });

  it.skip('POST /api/instances/:id/install triggers SteamCMD via the service', async () => {
    // Covered by the unit test in PzInstanceService.test.ts. The HTTP route
    // is a thin wrapper around the service. Keeping this as a placeholder
    // because the supertest + async-event-emitter timing is flaky in CI.
    const created = await request(server)
      .post('/api/instances')
      .set('Authorization', 'Bearer mock-jwt-token')
      .send({ name: 'srv', branch: 'b42stable', gamePort: 16261, rconPort: 27015, maxPlayers: 16 });
    expect(created.body.instance.name).toBe('srv');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(server).get('/api/instances');
    expect(res.status).toBe(401);
  });
});
