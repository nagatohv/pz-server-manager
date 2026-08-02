/**
 * Central type definitions for the PZ Server Manager backend.
 * All enums, interfaces, and type aliases used across the server codebase.
 */

// ─── Server Process Status ───────────────────────────────────────────────────

export enum ServerStatus {
  Stopped = 'STOPPED',
  Starting = 'STARTING',
  Running = 'RUNNING',
  Stopping = 'STOPPING',
  Updating = 'UPDATING',
  Crashed = 'CRASHED'
}

// ─── Control Actions dispatched from the API ─────────────────────────────────

export enum ServerAction {
  Start = 'start',
  Stop = 'stop',
  Restart = 'restart',
  Kill = 'kill',
  Update = 'update',
  Command = 'command'
}

// ─── WebSocket Message Types ─────────────────────────────────────────────────

export enum WsMessageType {
  Log = 'log',
  LogsHistory = 'logs_history',
  StatusUpdate = 'status_update',
  Command = 'command',
  BranchesUpdate = 'branches_update'
}

// ─── Observer notification types ─────────────────────────────────────────────

export enum ObserverEventType {
  Log = 'log',
  StatusUpdate = 'status_update'
}

// ─── Configuration File Types ────────────────────────────────────────────────

export enum ConfigFileType {
  Ini = 'ini',
  Sandbox = 'sandbox',
  Spawn = 'spawn',
  Panel = 'panel'
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

/** Result returned by server control operations (start / stop / kill / update / command). */
export interface ControlResult {
  success?: boolean;
  error?: string;
}

/** Shape of a single parsed INI setting. */
export interface IniSetting {
  key: string;
  value: string;
  description: string;
}

/** Shape of the panel configuration persisted on disk. */
export interface PanelConfig {
  idleShutdownMinutes: number;
  serverLanguage: string;
}

/** Shape of the server resource statistics. */
export interface ServerStats {
  cpu: number;
  memory: number;
}

/** Shape of idle-shutdown metadata exposed through getStatus(). */
export interface IdleShutdownInfo {
  minutes: number;
  active: boolean;
  expiresAt: number | null;
  remainingSeconds: number;
  timeRemaining: number;
}

/** Shape of static server configuration exposed through getStatus(). */
export interface ServerConfigInfo {
  serverName: string;
  jvmMin: number;
  jvmMax: number;
  installedBranch: string;
}

/** Full status payload returned by IServerControlService.getStatus(). */
export interface ServerStatusPayload {
  status: ServerStatus;
  stats: ServerStats;
  onlinePlayers: number;
  idleShutdown: IdleShutdownInfo;
  config: ServerConfigInfo;
}

/** Shape of an observer that subscribes to PzProcessControlService events. */
export interface ProcessObserver {
  onLog?: (logLine: string) => void;
  onLogHistory?: (history: string[]) => void;
  onStatusUpdate?: (status: ServerStatusPayload) => void;
}

/** Shape of a parsed SandboxVars result. */
export interface SandboxParsedResult {
  values: Record<string, unknown>;
  descriptions: Record<string, string>;
  options: Record<string, Array<{ value: number; label: string }>>;
}

/** Shape of a parsed spawn region. */
export interface SpawnRegion {
  name: string;
  isCommented: boolean;
  file?: string;
  serverfile?: string;
}

/** Decoded JWT token payload. */
export interface AuthTokenPayload {
  role: string;
  iat?: number;
  exp?: number;
}

/** System configuration interface (mirrors the SystemConfig class). */
export interface ISystemConfig {
  PORT: number;
  JWT_SECRET: string;
  ADMIN_PASSWORD: string;
  DATA_DIR: string;
  PZ_SERVER_DIR: string;
  ZO_USER_DIR: string;
  SERVER_NAME: string;
  STEAM_APP_BRANCH: string;
  JVM_MIN_GB: number;
  JVM_MAX_GB: number;
}

/** Shape of a single Steam branch entry as discovered from the Steam catalog. */
export interface BranchInfo {
  /** Steam branch identifier (e.g. "public", "unstable", "b42stable"). Empty string means default public branch. */
  name: string;
  /** Build ID reported by Steam for that branch. */
  buildId: string;
  /** Unix timestamp (seconds) of the last update. May be empty if Steam omits it. */
  timeUpdated: string;
  /** Optional description provided by Steam. */
  description: string;
  /** True if the branch is the default public one (no -beta flag required). */
  isDefault: boolean;
  /** True if the branch name indicates an unstable/pre-release channel. */
  isUnstable: boolean;
}

/** One PZ dedicated server installation managed by the portal. */
export interface PzInstance {
  /** Stable opaque identifier (uuid v4). */
  id: string;
  /** Game type (e.g. 'project-zomboid'). */
  game: string;
  /** Operator-facing name (must be unique). */
  name: string;
  /** Steam branch currently installed ('' for default public, or e.g. 'b42stable', 'unstable'). */
  branch: string;
  /** Whether the Steam installation has been completed at least once. */
  installed: boolean;
  /** Current runtime status of the Java process. */
  status: ServerStatus;
  /** Absolute path to the Steam install dir (where SteamCMD writes the game files). */
  installPath: string;
  /** Absolute path to the user data dir (saves, mods, server.ini, etc.). */
  dataPath: string;
  /** UDP port the game listens on. */
  gamePort: number;
  /** TCP port for the RCON server. */
  rconPort: number;
  /** Max players allowed. */
  maxPlayers: number;
  /** Last error message produced while operating on the instance, if any. */
  lastError: string | null;
  /** Unix timestamp (ms) when the instance was created. */
  createdAt: number;
  /** Unix timestamp (ms) of the last write to this record. */
  updatedAt: number;
  /** Unix timestamp (ms) of the last successful SteamCMD install/update, or null. */
  lastInstalledAt: number | null;
}

/** Persistent registry of all PzInstances known to the portal. */
export interface PzInstanceRegistry {
  instances: PzInstance[];
  /** Id of the instance currently focused by the operator; null when none. */
  activeInstanceId: string | null;
  /** Unix timestamp (ms) of the last registry write. */
  updatedAt: number;
}

/** Shape of a server backup record. */
export interface PzBackup {
  id: string;
  instanceId: string;
  name: string;
  sizeBytes: number;
  createdAt: number;
  note: string | null;
}
