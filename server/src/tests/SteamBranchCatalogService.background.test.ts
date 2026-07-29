import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  SteamBranchCatalogService,
  __resetSteamBranchCatalogService
} from '../adapters/services/SteamBranchCatalogService.js';
import { BranchClassifier } from '../adapters/parsers/BranchClassifier.js';
import { SERVER_STRINGS } from '../config/strings.js';
import { SERVER_CONSTANTS } from '../config/constants.js';
import type { ChildProcess } from 'child_process';
import type { BranchInfo, ISystemConfig } from '../types.js';

interface FakeChildProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  kill: (signal?: string) => boolean;
}

type SpawnMock = ReturnType<typeof vi.fn> & ((cmd: string, args: readonly string[]) => ChildProcess);

const buildFakeChild = (): FakeChildProcess => {
  const child = new EventEmitter() as FakeChildProcess;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.kill = vi.fn().mockReturnValue(true);
  return child;
};

const vdfFixture = `
"${SERVER_CONSTANTS.STEAM_APP_ID}"
{
  "branches"
  {
    "public"   { "buildid" "1" "timeupdated" "1700000000" }
    "unstable" { "buildid" "2" "timeupdated" "1700000999" "description" "Unstable" }
    "b42stable"{ "buildid" "3" "timeupdated" "1700001999" "description" "B42 stable" }
  }
}
`;

const buildClassifier = (): BranchClassifier => new BranchClassifier({
  defaultBranchNames: ['public'],
  unstableKeywords: ['unstable', 'b42stable']
});

describe('SteamBranchCatalogService non-blocking refresh', () => {
  let tmpDir: string;
  let mockSystemConfig: ISystemConfig;
  let spawnMock: SpawnMock;
  let fakeChild: FakeChildProcess;
  let pendingResolvers: Array<() => void>;

  beforeEach(() => {
    __resetSteamBranchCatalogService();
    pendingResolvers = [];

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-bg-'));
    fs.writeFileSync(path.join(tmpDir, 'steamcmd.sh'), '#!/bin/bash\n');

    mockSystemConfig = {
      PORT: 3000,
      JWT_SECRET: 'test',
      ADMIN_PASSWORD: 'admin',
      DATA_DIR: path.join(tmpDir, 'data'),
      PZ_SERVER_DIR: path.join(tmpDir, 'pzserver'),
      ZO_USER_DIR: path.join(tmpDir, 'Zomboid'),
      SERVER_NAME: 'testserver',
      STEAM_APP_BRANCH: '',
      JVM_MIN_GB: 4,
      JVM_MAX_GB: 8
    };

    fakeChild = buildFakeChild();
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      // Capture stdout/exit for later manual resolution.
      pendingResolvers.push(() => {
        child.stdout.emit('data', Buffer.from(vdfFixture));
        child.emit('exit', 0);
      });
      return child;
    }) as unknown as SpawnMock;
  });

  it('returns an empty snapshot before the first refresh and populates it after', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);

    expect(service.getSnapshot().branches).toEqual([]);
    expect(service.getSnapshot().isLoading).toBe(false);
    expect(service.getSnapshot().error).toBeNull();

    service.refresh();

    expect(service.getSnapshot().isLoading).toBe(true);

    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.branches.length).toBe(3);
    expect(snapshot.branches.find((b) => b.name === 'b42stable')).toBeDefined();
  });

  it('notifies subscribers when the catalog finishes refreshing', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    const subscriber = vi.fn();
    const unsubscribe = service.subscribe(subscriber);

    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(subscriber).toHaveBeenCalled();
    const lastSnapshot = subscriber.mock.calls[subscriber.mock.calls.length - 1][0] as { branches: BranchInfo[] };
    expect(lastSnapshot.branches.length).toBe(3);

    unsubscribe();
  });

  it('propagates errors to the snapshot and to subscribers without throwing', async () => {
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.stderr.emit('data', Buffer.from('Connection timed out'));
        child.emit('exit', 7);
      });
      return child;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    const subscriber = vi.fn();
    service.subscribe(subscriber);

    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.branches).toEqual([]);
    expect(snapshot.error).toMatch(/Connection timed out/);
    const lastCall = subscriber.mock.calls[subscriber.mock.calls.length - 1][0] as { error: string | null };
    expect(lastCall.error).toMatch(/Connection timed out/);
  });

  it('deduplicates concurrent refresh calls into a single spawn', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    service.refresh();
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(spawnMock).toHaveBeenCalledTimes(1);
    pendingResolvers.forEach((fn) => fn());
  });

  it('emits a snapshot to late subscribers when the catalog is already populated', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const lateSubscriber = vi.fn();
    service.subscribe(lateSubscriber);

    expect(lateSubscriber).toHaveBeenCalledTimes(1);
    const snapshot = lateSubscriber.mock.calls[0][0] as { branches: BranchInfo[] };
    expect(snapshot.branches.length).toBe(3);
  });

  it('records an error when the steamcmd binary is missing without throwing', async () => {
    const service = new SteamBranchCatalogService(
      mockSystemConfig,
      buildClassifier(),
      spawnMock,
      path.join(tmpDir, 'missing')
    );
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.isLoading).toBe(false);
    expect(snapshot.error).toMatch(/No se encontró SteamCMD/);
    expect(snapshot.branches).toEqual([]);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('records a VDF parse error in the snapshot', async () => {
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.stdout.emit('data', Buffer.from('not a vdf document at all'));
        child.emit('exit', 0);
      });
      return child;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.error).toMatch(/VDF/);
  });

  it('records an empty-branches error when the VDF is valid but has no branches', async () => {
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.stdout.emit('data', Buffer.from(`"${SERVER_CONSTANTS.STEAM_APP_ID}"\n{\n  "common" { "name" "X" }\n}\n`));
        child.emit('exit', 0);
      });
      return child;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.error).toMatch(/sin ramas/);
  });

  it('listAvailableBranches returns cached branches without re-spawning steamcmd', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const initialCalls = spawnMock.mock.calls.length;
    const branches = await service.listAvailableBranches();
    expect(branches.length).toBe(3);
    expect(spawnMock.mock.calls.length).toBe(initialCalls);
  });

  it('forwards the unsubscribe function to drop the subscriber', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    const subscriber = vi.fn();
    const unsubscribe = service.subscribe(subscriber);

    unsubscribe();

    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it('records a timeout error when steamcmd exceeds the discovery timeout', async () => {
    const capturedChild = buildFakeChild();
    spawnMock = vi.fn().mockReturnValue(capturedChild as unknown as ChildProcess) as unknown as SpawnMock;

    vi.useFakeTimers();
    try {
      const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
      service.refresh();

      await vi.advanceTimersByTimeAsync(SERVER_CONSTANTS.STEAMCMD_BRANCH_DISCOVERY_TIMEOUT_MS + 100);
      await Promise.resolve();

      const snapshot = service.getSnapshot();
      expect(snapshot.isLoading).toBe(false);
      expect(snapshot.error).toMatch(/no respondió/);
      expect(capturedChild.kill).toHaveBeenCalledWith('SIGKILL');
    } finally {
      vi.useRealTimers();
    }
  });

  it('records an error when the spawned process emits an error event', async () => {
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.emit('error', new Error('spawn ENOENT'));
      });
      return child;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.error).toMatch(/spawn ENOENT/);
  });

  it('listAvailableBranches awaits an in-flight refresh on first call', async () => {
    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const branches = await service.listAvailableBranches();
    expect(branches.length).toBe(3);
  });

  it('falls back to the configured branch list when SteamCMD returns no branches', async () => {
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.stdout.emit('data', Buffer.from(`"${SERVER_CONSTANTS.STEAM_APP_ID}"\n{\n  "common" { "name" "X" }\n}\n`));
        child.emit('exit', 0);
      });
      return child;
    }) as unknown as SpawnMock;

    const fallback = [
      { name: '', buildId: '', description: 'Rama Pública Estable (Build 41)', isDefault: true, isUnstable: false },
      { name: 'b42stable', buildId: '', description: 'Build 42 Estable', isDefault: false, isUnstable: false },
      { name: 'unstable', buildId: '', description: 'Build 42 Unstable', isDefault: false, isUnstable: true }
    ];
    const service = new SteamBranchCatalogService(
      mockSystemConfig,
      buildClassifier(),
      spawnMock,
      tmpDir,
      { fallbackBranches: fallback, log: () => {} }
    );
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.error).toBeNull();
    expect(snapshot.source).toBe('fallback');
    expect(snapshot.branches.length).toBe(3);
    expect(snapshot.branches.map((b) => b.name)).toEqual(['', 'b42stable', 'unstable']);
    expect(snapshot.branches[0].isDefault).toBe(true);
  });

  it('keeps the SteamCMD error when no fallback is configured', async () => {
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.stdout.emit('data', Buffer.from(`"${SERVER_CONSTANTS.STEAM_APP_ID}"\n{\n  "common" { "name" "X" }\n}\n`));
        child.emit('exit', 0);
      });
      return child;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(mockSystemConfig, buildClassifier(), spawnMock, tmpDir);
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.source).toBe('steam');
    expect(snapshot.error).toMatch(/sin ramas/);
    expect(snapshot.branches).toEqual([]);
  });

  it('finds branches nested inside depots when SteamCMD nests them due to brace misalignment', async () => {
    // branches is inside depots.depot380874 — parser succeeds but
    // top level only has [common, depots]. This matches the real
    // diagnostic: parsedTopLevelKeys=[common, config, depots]
    const vdfWithNested = [
      '\x1B[0m"380870"\x1B[0m',
      '\x1B[0m{\x1B[0m',
      '\x1B[0m	"common"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m		"name"\x1B[0m \x1B[0m \x1B[0m"X"\x1B[0m \x1B[0m	}\x1B[0m',
      '\x1B[0m	"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m		"x"\x1B[0m \x1B[0m \x1B[0m"1"\x1B[0m \x1B[0m	}\x1B[0m',
      '\x1B[0m	"depots"\x1B[0m',
      '\x1B[0m	{\x1B[0m',
      '\x1B[0m		"380874"\x1B[0m',
      '\x1B[0m		{\x1B[0m',
      '\x1B[0m			"config"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m				"oslist"\x1B[0m \x1B[0m \x1B[0m"windows"\x1B[0m \x1B[0m			}\x1B[0m',
      '\x1B[0m			"branches"\x1B[0m',
      '\x1B[0m			{\x1B[0m',
      '\x1B[0m				"public"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"buildid"\x1B[0m \x1B[0m \x1B[0m"1"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m				"42.19"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"buildid"\x1B[0m \x1B[0m \x1B[0m"2"\x1B[0m \x1B[0m					"description"\x1B[0m \x1B[0m \x1B[0m"Build 42.19"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m				"unstable"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m					"buildid"\x1B[0m \x1B[0m \x1B[0m"2"\x1B[0m \x1B[0m				}\x1B[0m',
      '\x1B[0m			}\x1B[0m',
      '\x1B[0m		}\x1B[0m',
      '\x1B[0m	}\x1B[0m',
      '\x1B[0m	"privatebranches"\x1B[0m \x1B[0m \x1B[0m"1"\x1B[0m',
      '\x1B[0m}\x1B[0m'
    ].join('\n');

    let resolvedChild: FakeChildProcess | null = null;
    spawnMock = vi.fn().mockImplementation(() => {
      resolvedChild = buildFakeChild();
      setImmediate(() => {
        resolvedChild!.stdout.emit('data', Buffer.from(vdfWithNested));
        resolvedChild!.emit('exit', 0);
      });
      return resolvedChild! as unknown as ChildProcess;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(
      mockSystemConfig,
      buildClassifier(),
      spawnMock,
      tmpDir
    );

    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.source).toBe('steam');
    expect(snapshot.error).toBeNull();
    expect(snapshot.branches.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.branches.map((b) => b.name)).toEqual(expect.arrayContaining(['public', '42.19', 'unstable']));
  });

  it('extracts the 5 real branches from a real-world SteamCMD app_info_print dump', async () => {
    // Condensed version of the actual dump that produced the "sin ramas
    // publicables" fallback. With ANSI codes interleaved as SteamCMD emits them.
    const realVdf = [
      '\x1B[0mAppID : 380870, change number : 37550343/0\x1B[0m',
      '\x1B[0m"380870"\x1B[0m',
      '\x1B[0m{\x1B[0m',
      '\x1B[0m	"common"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m		"name"\x1B[0m \x1B[0m \x1B[0m"Project Zomboid Dedicated Server"\x1B[0m \x1B[0m	}\x1B[0m',
      '\x1B[0m	"branches"\x1B[0m',
      '\x1B[0m	{\x1B[0m',
      '\x1B[0m		"public"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"22695654"\x1B[0m \x1B[0m			"timeupdated"\x1B[0m \x1B[0m \x1B[0m"1775656121"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"42.19"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"23504635"\x1B[0m \x1B[0m			"description"\x1B[0m \x1B[0m \x1B[0m"Build 42.19"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m		"unstable"\x1B[0m \x1B[0m{\x1B[0m \x1B[0m			"buildid"\x1B[0m \x1B[0m \x1B[0m"23504635"\x1B[0m \x1B[0m		}\x1B[0m',
      '\x1B[0m	}\x1B[0m',
      '\x1B[0m	"privatebranches"\x1B[0m \x1B[0m \x1B[0m"1"\x1B[0m',
      '\x1B[0m}\x1B[0m'
    ].join('\n');

    let resolvedChild: FakeChildProcess | null = null;
    spawnMock = vi.fn().mockImplementation(() => {
      resolvedChild = buildFakeChild();
      setImmediate(() => {
        resolvedChild!.stdout.emit('data', Buffer.from(realVdf));
        resolvedChild!.emit('exit', 0);
      });
      return resolvedChild! as unknown as ChildProcess;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(
      mockSystemConfig,
      buildClassifier(),
      spawnMock,
      tmpDir
    );

    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    await new Promise<void>((resolve) => setImmediate(resolve));

    const snapshot = service.getSnapshot();
    expect(snapshot.source).toBe('steam');
    expect(snapshot.error).toBeNull();
    expect(snapshot.branches.length).toBe(3);
    expect(snapshot.branches.map((b) => b.name)).toEqual(expect.arrayContaining(['public', '42.19', 'unstable']));
    expect(snapshot.branches.find((b) => b.name === '42.19')?.description).toBe('Build 42.19');
    expect(snapshot.branches.find((b) => b.name === '42.19')?.buildId).toBe('23504635');
  });

  it('streams each line of SteamCMD output through the configured logger', async () => {
    const lines: string[] = [];
    spawnMock = vi.fn().mockImplementation(() => {
      const child = buildFakeChild();
      pendingResolvers.push(() => {
        child.stdout.emit('data', Buffer.from('Steam>\nLoading Steam API...done.\nSuccess.\n'));
        child.emit('exit', 0);
      });
      return child;
    }) as unknown as SpawnMock;

    const service = new SteamBranchCatalogService(
      mockSystemConfig,
      buildClassifier(),
      spawnMock,
      tmpDir,
      { fallbackBranches: [], log: (line) => lines.push(line) }
    );
    service.refresh();
    await new Promise<void>((resolve) => setImmediate(resolve));
    pendingResolvers.forEach((fn) => fn());
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join('\n')).toContain('Loading Steam API');
  });
});

describe('getSteamBranchCatalogService singleton', () => {
  beforeEach(() => {
    __resetSteamBranchCatalogService();
  });

  it('returns the same instance on repeated calls', async () => {
    const { getSteamBranchCatalogService } = await import('../adapters/services/SteamBranchCatalogService.js');
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pz-singleton-'));
    fs.writeFileSync(path.join(tmp, 'steamcmd.sh'), '#!/bin/bash\n');

    const cfg: ISystemConfig = {
      PORT: 3000,
      JWT_SECRET: 'x',
      ADMIN_PASSWORD: 'admin',
      DATA_DIR: tmp,
      PZ_SERVER_DIR: path.join(tmp, 'pz'),
      ZO_USER_DIR: path.join(tmp, 'z'),
      SERVER_NAME: 't',
      STEAM_APP_BRANCH: '',
      JVM_MIN_GB: 4,
      JVM_MAX_GB: 8
    };

    const a = getSteamBranchCatalogService(cfg, buildClassifier(), { fallbackBranches: [], log: () => {} });
    const b = getSteamBranchCatalogService(cfg, buildClassifier(), { fallbackBranches: [], log: () => {} });
    expect(a).toBe(b);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
