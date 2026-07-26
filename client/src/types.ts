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
  Editor = 'editor'
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
  Command = 'command'
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
