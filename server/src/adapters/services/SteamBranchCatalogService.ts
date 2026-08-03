import { spawn as defaultSpawn, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import IBranchCatalogService, {
  BranchCatalogSnapshot,
  BranchCatalogSubscriber
} from '../../domain/ports/IBranchCatalogService.js';
import { AppError } from '../../domain/AppError.js';
import { ERROR_CODES } from '../../config/errorCodes.js';
import { SERVER_CONSTANTS } from '../../config/constants.js';
import { SERVER_STRINGS } from '../../config/strings.js';
import type { BranchInfo, ISystemConfig } from '../../types.js';
import { parseVdf, VdfParseError, VdfObject } from '../parsers/VdfParser.js';
import { BranchClassifier } from '../parsers/BranchClassifier.js';

const isPlainObject = (value: unknown): value is VdfObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readStringField = (source: VdfObject, key: string): string => {
  const value = source[key];
  return typeof value === 'string' ? value : '';
};

export const extractRawBranches = (vdf: VdfObject): Omit<BranchInfo, 'isDefault' | 'isUnstable'>[] => {
  const branchesNode = vdf['branches'];
  if (!isPlainObject(branchesNode)) {
    return [];
  }
  return Object.entries(branchesNode)
    .filter(([, value]) => isPlainObject(value))
    .map(([name, value]) => {
      const node = value as VdfObject;
      return {
        name,
        buildId: readStringField(node, 'buildid'),
        timeUpdated: readStringField(node, 'timeupdated'),
        description: readStringField(node, 'description')
      };
    });
};

export type SpawnFn = (command: string, args: readonly string[]) => ChildProcess;
export type LogFn = (line: string) => void;

/** Branch entry the operator can pre-configure as a fallback. */
export interface FallbackBranch {
  name: string;
  buildId?: string;
  description?: string;
  isDefault?: boolean;
  isUnstable?: boolean;
}

export interface SteamBranchCatalogOptions {
  fallbackBranches: readonly FallbackBranch[];
  log: LogFn;
}

const EMPTY_SNAPSHOT: BranchCatalogSnapshot = {
  branches: [],
  isLoading: false,
  error: null,
  fetchedAt: null,
  source: 'steam'
};

const buildSnapshot = (
  overrides: Partial<BranchCatalogSnapshot>
): BranchCatalogSnapshot => ({ ...EMPTY_SNAPSHOT, ...overrides });

const splitLines = (buffer: string, flush: boolean): { lines: string[]; rest: string } => {
  const segments = buffer.split('\n');
  const rest = flush ? '' : (segments.pop() ?? '');
  return { lines: segments, rest };
};

/**
 * Adapter that lists Steam branches for the configured AppID by invoking
 * `steamcmd +app_info_print <appId> +quit` in a background process and
 * parsing its VDF output. The HTTP layer is non-blocking: callers fetch the
 * current snapshot via {@link getSnapshot} and subscribe to updates with
 * {@link subscribe}. The service is responsible for caching, deduplicating
 * concurrent refreshes, classifying branches via the injected
 * {@link BranchClassifier} strategy, streaming SteamCMD output to the
 * operator's log buffer, and falling back to a curated branch list when
 * Steam does not return any branches.
 */
class SteamBranchCatalogService implements IBranchCatalogService {
  private systemConfig: ISystemConfig;
  private classifier: BranchClassifier;
  private spawnFn: SpawnFn;
  private steamCmdDir: string;
  private fallbackBranches: readonly FallbackBranch[];
  private log: LogFn;
  private snapshot: BranchCatalogSnapshot = EMPTY_SNAPSHOT;
  private inflight: Promise<void> | null = null;
  private readonly subscribers: Set<BranchCatalogSubscriber> = new Set();

  constructor(
    systemConfig: ISystemConfig,
    classifier: BranchClassifier,
    spawnFn: SpawnFn = defaultSpawn,
    steamCmdDir: string = SERVER_CONSTANTS.STEAM_CMD_DIR,
    options?: Partial<SteamBranchCatalogOptions>
  ) {
    this.systemConfig = systemConfig;
    this.classifier = classifier;
    this.spawnFn = spawnFn;
    this.steamCmdDir = steamCmdDir;
    this.fallbackBranches = options?.fallbackBranches ?? [];
    this.log = options?.log ?? (() => {});
  }

  getSnapshot(): BranchCatalogSnapshot {
    return this.snapshot;
  }

  subscribe(subscriber: BranchCatalogSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.snapshot);
    return () => { this.subscribers.delete(subscriber); };
  }

  async listAvailableBranches(): Promise<BranchInfo[]> {
    if (this.snapshot.branches.length > 0) return this.snapshot.branches;
    this.refresh();
    if (this.inflight) await this.inflight;
    return this.snapshot.branches;
  }

  /** Returns a Promise that settles when the current fetch cycle ends. Safe to call repeatedly. */
  refresh(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.updateSnapshot(buildSnapshot({ isLoading: true, error: null }));
    this.inflight = this.runFetch()
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        const fallback = this.tryFallback();
        if (fallback) {
          this.updateSnapshot(buildSnapshot({
            branches: fallback,
            isLoading: false,
            error: null,
            fetchedAt: Date.now(),
            source: 'fallback'
          }));
          this.log(SERVER_STRINGS.MSG_BRANCHES_FALLBACK_USED.replace('{message}', message));
          return;
        }
        this.updateSnapshot(buildSnapshot({
          branches: [],
          isLoading: false,
          error: message,
          fetchedAt: Date.now(),
          source: 'steam'
        }));
      })
      .finally(() => {
        this.inflight = null;
      });
    return this.inflight;
  }

  private tryFallback(): BranchInfo[] | null {
    if (!this.fallbackBranches || this.fallbackBranches.length === 0) return null;
    const rawBranches: Omit<BranchInfo, 'isDefault' | 'isUnstable'>[] = this.fallbackBranches.map((entry) => ({
      name: entry.name,
      buildId: entry.buildId ?? '',
      timeUpdated: '',
      description: entry.description ?? ''
    }));
    const classified = this.classifier.classifyAll(rawBranches);
    const withFlags = classified.map((branch, index) => ({
      ...branch,
      isDefault: branch.isDefault || this.fallbackBranches[index]?.isDefault === true,
      isUnstable: branch.isUnstable || this.fallbackBranches[index]?.isUnstable === true
    }));
    return this.classifier.sort(withFlags);
  }

  private async runFetch(): Promise<void> {
    const steamCmdPath = path.join(this.steamCmdDir, 'steamcmd.sh');
    if (!fs.existsSync(steamCmdPath)) {
      throw new AppError(
        ERROR_CODES.ERR_STEAMCMD_NOT_FOUND,
        SERVER_STRINGS.ERR_STEAMCMD_NOT_FOUND.replace('{path}', steamCmdPath),
        { path: steamCmdPath }
      );
    }
    this.log(SERVER_STRINGS.MSG_BRANCHES_DISCOVERY_STARTED.replace('{appId}', SERVER_CONSTANTS.STEAM_APP_ID));
    const stdout = await this.runSteamCmd(steamCmdPath);
    this.log(SERVER_STRINGS.MSG_BRANCHES_DISCOVERY_STDOUT.replace('{bytes}', String(stdout.length)));
    const parsed = this.safeParse(stdout);
    const topLevelKeys = Object.keys(parsed);
    this.log(`[Manager] VDF parseado OK. Claves top-level (${topLevelKeys.length}): [${topLevelKeys.join(', ')}]`);

    let rawBranches = extractRawBranches(parsed);
    if (rawBranches.length === 0) {
      // SteamCMD sometimes omits the closing brace of the last depot entry,
      // causing the parser to nest "branches" inside "depots" at various
      // depths. Look recursively for a "branches" key inside the parsed tree.
      rawBranches = findBranchesDeep(parsed);
      if (rawBranches.length > 0) {
        this.log(`[Manager] Ramas encontradas anidadas en el VDF (no al nivel top). ${rawBranches.length} rama(s) extraídas.`);
      }
    }

    if (rawBranches.length === 0) {
      const errorMsg = `${SERVER_STRINGS.ERR_STEAMCMD_BRANCH_DISCOVERY_EMPTY
        .replace('{appId}', SERVER_CONSTANTS.STEAM_APP_ID)} (topLevelKeys=[${topLevelKeys.join(',')}])`;
      this.log(`[Manager] Diagnóstico: ${errorMsg}`);
      throw new AppError(
        ERROR_CODES.ERR_STEAMCMD_BRANCH_DISCOVERY_EMPTY,
        errorMsg,
        { appId: SERVER_CONSTANTS.STEAM_APP_ID }
      );
    }
    const classified = this.classifier.classifyAll(rawBranches);
    const ordered = this.classifier.sort(classified);
    this.log(`[Manager] Catálogo actualizado con ${ordered.length} rama(s): [${ordered.map((b) => b.name || '(default)').join(', ')}]`);
    this.updateSnapshot(buildSnapshot({ branches: ordered, isLoading: false, error: null, fetchedAt: Date.now(), source: 'steam' }));
  }

  private safeParse(stdout: string): VdfObject {
    try {
      return parseVdf(stdout);
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      const message = err instanceof VdfParseError
        ? err.message
        : err instanceof Error ? err.message : String(err);
      throw new AppError(
        ERROR_CODES.ERR_VDF_PARSE_FAILED,
        SERVER_STRINGS.ERR_VDF_PARSE_FAILED.replace('{message}', message),
        { message }
      );
    }
  }

  private updateSnapshot(next: BranchCatalogSnapshot): void {
    this.snapshot = next;
    for (const sub of this.subscribers) {
      try { sub(this.snapshot); } catch (_) { /* observer errors are non-fatal */ }
    }
  }

  private runSteamCmd(steamCmdPath: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const child = this.spawnFn('bash', [
        steamCmdPath,
        '+login', 'anonymous',
        '+app_info_print', SERVER_CONSTANTS.STEAM_APP_ID,
        '+quit'
      ]);

      let stdout = '';
      let stderr = '';
      let stdoutTail = '';
      let stderrTail = '';
      const emit = (source: 'stdout' | 'stderr', chunk: string): void => {
        const buffer = source === 'stdout' ? (stdoutTail + chunk) : (stderrTail + chunk);
        const { lines, rest } = splitLines(buffer, false);
        if (source === 'stdout') stdoutTail = rest; else stderrTail = rest;
        for (const line of lines) {
          if (line.trim().length === 0) continue;
          this.log(`[SteamCMD:${source}] ${line}`);
        }
      };

      const timeout = setTimeout(() => {
        child.kill('SIGKILL');
        const seconds = Math.round(SERVER_CONSTANTS.STEAMCMD_BRANCH_DISCOVERY_TIMEOUT_MS / 1000);
        reject(new AppError(
          ERROR_CODES.ERR_STEAMCMD_BRANCH_DISCOVERY_TIMEOUT,
          SERVER_STRINGS.ERR_STEAMCMD_BRANCH_DISCOVERY_TIMEOUT.replace('{seconds}', String(seconds)),
          { seconds }
        ));
      }, SERVER_CONSTANTS.STEAMCMD_BRANCH_DISCOVERY_TIMEOUT_MS);

      if (child.stdout) {
        child.stdout.on('data', (data: Buffer) => {
          const chunk = data.toString('utf8');
          stdout += chunk;
          emit('stdout', chunk);
        });
      }
      if (child.stderr) {
        child.stderr.on('data', (data: Buffer) => {
          const chunk = data.toString('utf8');
          stderr += chunk;
          emit('stderr', chunk);
        });
      }

      child.on('error', (err: Error) => {
        clearTimeout(timeout);
        reject(new AppError(
          ERROR_CODES.ERR_STEAMCMD_BRANCH_DISCOVERY_FAILED,
          SERVER_STRINGS.ERR_STEAMCMD_BRANCH_DISCOVERY_FAILED.replace('{message}', err.message),
          { message: err.message }
        ));
      });

      child.on('exit', (code: number | null) => {
        clearTimeout(timeout);
        if (stdoutTail.trim().length > 0) this.log(`[SteamCMD:stdout] ${stdoutTail}`);
        if (stderrTail.trim().length > 0) this.log(`[SteamCMD:stderr] ${stderrTail}`);
        if (code !== 0) {
          const detail = stderr.trim() || `código de salida ${code}`;
          reject(new AppError(
            ERROR_CODES.ERR_STEAMCMD_BRANCH_DISCOVERY_FAILED,
            SERVER_STRINGS.ERR_STEAMCMD_BRANCH_DISCOVERY_FAILED.replace('{message}', detail),
            { message: detail }
          ));
          return;
        }
        resolve(stdout);
      });
    });
  }
}

let catalogInstance: SteamBranchCatalogService | null = null;
export function getSteamBranchCatalogService(
  systemConfig: ISystemConfig,
  classifier: BranchClassifier,
  options: SteamBranchCatalogOptions
): SteamBranchCatalogService {
  if (!catalogInstance) {
    catalogInstance = new SteamBranchCatalogService(systemConfig, classifier, defaultSpawn, SERVER_CONSTANTS.STEAM_CMD_DIR, options);
  }
  return catalogInstance;
}

/** Test seam to reset the singleton + subscribers between unit tests. */
export function __resetSteamBranchCatalogService(): void {
  catalogInstance = null;
}

export { SteamBranchCatalogService };

/** Recursive helper: looks for a "branches" sub-object anywhere in `node`. */
function findBranchesDeep(node: unknown): Omit<BranchInfo, 'isDefault' | 'isUnstable'>[] {
  if (!node || typeof node !== 'object' || Array.isArray(node)) return [];
  const obj = node as Record<string, unknown>;
  if (obj['branches'] && isPlainObject(obj['branches'] as VdfObject)) {
    return extractRawBranches(obj as VdfObject);
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const found = findBranchesDeep(value);
      if (found.length > 0) return found;
    }
  }
  return [];
}
