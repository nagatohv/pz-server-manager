// =============================================================================
// API Endpoints
// =============================================================================

/** Endpoint de autenticación */
export const API_AUTH_LOGIN = '/api/auth/login';

/** Endpoint de estado del servidor */
export const API_STATUS = '/api/status';

/** Endpoint de control del servidor */
export const API_CONTROL = '/api/control';

/** Endpoint de catálogo dinámico de ramas de Steam */
export const API_BRANCHES = '/api/branches';

/** Endpoint de gestión de instancias de servidor PZ */
export const API_INSTANCES = '/api/instances';

/** Endpoint de configuración INI */
export const API_CONFIG_SETTINGS = '/api/config/settings';

/** Endpoint de configuración del panel */
export const API_CONFIG_PANEL = '/api/config/panel';

/** Endpoint de configuración parseada (GUI) */
export const API_CONFIG_PARSED = '/api/config/parsed';

/** Endpoint de configuración en texto plano (RAW) */
export const API_CONFIG_RAW = '/api/config/raw';

// =============================================================================
// Storage
// =============================================================================

/** Clave de almacenamiento del token JWT en localStorage */
export const STORAGE_KEY_TOKEN = 'pz_token';

// =============================================================================
// Limits & Timeouts
// =============================================================================

/** Número máximo de líneas de log a retener en memoria */
export const LOG_HISTORY_MAX_LINES = 500;

/** Tiempo en ms para ocultar mensajes de éxito automáticamente */
export const SUCCESS_MESSAGE_TIMEOUT_MS = 4000;

/** Tiempo en ms para reintentar la conexión WebSocket tras cierre */
export const WS_RECONNECT_DELAY_MS = 3000;

// =============================================================================
// WebSocket
// =============================================================================

/** Protocolo WebSocket seguro */
export const WS_PROTOCOL_SECURE = 'wss:';

/** Protocolo WebSocket sin cifrar */
export const WS_PROTOCOL_PLAIN = 'ws:';

/** Protocolo HTTPS de la página para detectar modo seguro */
export const HTTPS_PROTOCOL = 'https:';

/** Ruta del endpoint WebSocket */
export const WS_PATH = '/ws';

// =============================================================================
// Configuration Parsing
// =============================================================================

/** Separador de mods en el archivo server.ini */
export const MOD_LIST_SEPARATOR = ';';

/** Clave INI para la lista de IDs de mods */
export const INI_KEY_MODS = 'Mods';

/** Clave INI para los IDs de taller de Steam */
export const INI_KEY_WORKSHOP_ITEMS = 'WorkshopItems';

/** Separador de categoría y clave en el path del SandboxVars */
export const SANDBOX_PATH_SEPARATOR = '.';

// =============================================================================
// UI Thresholds & Colors
// =============================================================================

/** Umbral de uso de CPU/Memoria para color de alerta en ProgressBar */
export const PROGRESS_HIGH_THRESHOLD = 80;

/** Color primario de la barra de progreso en estado normal */
export const PROGRESS_COLOR_NORMAL = '#10b981';

/** Color de la barra de progreso en estado de alerta */
export const PROGRESS_COLOR_HIGH = '#f43f5e';

/** Color del widget de auto-apagado */
export const IDLE_WIDGET_COLOR = '#fbbf24';

/** Color del widget de jugadores conectados */
export const PLAYERS_WIDGET_COLOR = '#38bdf8';

/** Color del encabezado de categoría en SandboxVars */
export const SANDBOX_CATEGORY_COLOR = '#38bdf8';

// =============================================================================
// Backwards compat export (alias used by some components)
// =============================================================================

/** @deprecated Usar las constantes individuales en su lugar */
export const CLIENT_CONSTANTS = {
  API_AUTH_LOGIN,
  API_STATUS,
  API_CONTROL,
  API_BRANCHES,
  API_CONFIG_SETTINGS,
  API_CONFIG_PANEL,
  API_CONFIG_PARSED,
  API_CONFIG_RAW
};

// =============================================================================
// Games Catalog
// =============================================================================

/** ID único de Project Zomboid en el catálogo */
export const GAME_ID_PROJECT_ZOMBOID = 'project-zomboid';

