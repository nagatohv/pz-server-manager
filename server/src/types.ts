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
  Command = 'command'
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
  expiresAt: number | null;
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
