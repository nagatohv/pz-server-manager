// =============================================================================
// Domain Enums
// =============================================================================

/** Estado posible del servidor de juego */
export enum ServerStatus {
  Stopped = 'STOPPED',
  Starting = 'STARTING',
  Running = 'RUNNING',
  Stopping = 'STOPPING',
  Updating = 'UPDATING',
  Crashed = 'CRASHED'
}

/** Tipo de archivo de configuración editable */
export enum EditorType {
  Ini = 'ini',
  Sandbox = 'sandbox',
  Spawn = 'spawn'
}

/** Modo de edición del archivo de configuración */
export enum EditorMode {
  Gui = 'gui',
  Raw = 'raw'
}

/** Pestaña activa del portal */
export enum PortalTab {
  Console = 'console',
  Settings = 'settings',
  Mods = 'mods',
  Editor = 'editor',
  Servers = 'servers'
}

/** Variantes visuales del componente Button */
export enum ButtonVariant {
  Primary = 'primary',
  Success = 'success',
  Warning = 'warning',
  Danger = 'danger',
  Logout = 'logout',
  Control = 'control',
  Toggle = 'toggle',
  EditorSelect = 'editor-select',
  Nav = 'nav'
}

/** Tipo de mensaje WebSocket entrante */
export enum WsMessageType {
  Log = 'log',
  LogsHistory = 'logs_history',
  StatusUpdate = 'status_update',
  Command = 'command',
  BranchesUpdate = 'branches_update'
}

/** Acción de control del servidor */
export enum ServerAction {
  Start = 'start',
  Stop = 'stop',
  Restart = 'restart',
  Kill = 'kill',
  Update = 'update'
}

// =============================================================================
// Domain Interfaces
// =============================================================================

/** Estadísticas de recursos del sistema */
export interface ServerStats {
  cpu: number;
  memory: number;
  memoryTotal: number;
}

/** Estado del apagado automático por inactividad */
export interface IdleShutdownState {
  minutes: number;
  active: boolean;
  remainingSeconds: number;
}

/** Estado completo del servidor devuelto por la API */
export interface ServerStatusPayload {
  status: ServerStatus;
  onlinePlayers: number;
  stats: ServerStats;
  idleShutdown: IdleShutdownState;
}

/** Elemento de la lista de mods */
export interface ModItem {
  modId: string;
  workshopId: string;
}

/** Ítem de configuración INI parseado */
export interface IniSettingItem {
  key: string;
  value: string;
  description: string;
}

/** Configuración del panel del portal */
export interface PanelConfig {
  idleShutdownMinutes: number;
  serverLanguage: string;
}

/** Opción de tipo select (clave-valor genérico) */
export interface SelectOption<T = string> {
  value: T;
  label: string;
}

/** Información de una rama de Steam descubierta dinámicamente desde el backend. */
export interface BranchInfo {
  /** Identificador de la rama en Steam. Cadena vacía para la rama pública por defecto. */
  name: string;
  /** Build ID reportado por Steam. */
  buildId: string;
  /** Timestamp Unix (segundos) de la última actualización. */
  timeUpdated: string;
  /** Descripción opcional de la rama. */
  description: string;
  /** Indica si la rama es la pública por defecto. */
  isDefault: boolean;
  /** Indica si la rama es inestable / pre-release. */
  isUnstable: boolean;
}

/** Estado de carga del catálogo dinámico de ramas de Steam. */
export type BranchLoadState = 'idle' | 'loading' | 'ready' | 'error';

/** Origen del catálogo de ramas: datos reales de Steam o lista de respaldo. */
export type BranchCatalogSource = 'steam' | 'fallback';

/** Estado de runtime de una instancia de servidor PZ. */
export type InstanceStatus = 'STOPPED' | 'STARTING' | 'RUNNING' | 'STOPPING' | 'UPDATING' | 'CRASHED';

/** Instancia de servidor PZ administrada por el portal. */
export interface PzInstance {
  id: string;
  game: string;
  name: string;
  branch: string;
  installed: boolean;
  status: InstanceStatus;
  installPath: string;
  dataPath: string;
  gamePort: number;
  rconPort: number;
  maxPlayers: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
  lastInstalledAt: number | null;
}

/** Registro global de instancias conocido por el portal. */
export interface InstanceRegistry {
  instances: PzInstance[];
  activeInstanceId: string | null;
  updatedAt: number;
}

/** Meta de opción bounded para GuiCard */
export interface BoundedOptionMeta {
  options?: SelectOption[];
  min?: number;
  max?: number;
  translatedDesc?: string;
  description?: string;
}

/** Mensaje WebSocket estructurado */
export interface WsMessage {
  type: WsMessageType;
  data: string | string[] | ServerStatusPayload;
}

/** Respuesta de la API de autenticación */
export interface AuthResponse {
  token: string;
}

export interface PzBackup {
  id: string;
  instanceId: string;
  name: string;
  sizeBytes: number;
  createdAt: number;
  note: string | null;
}
