/**
 * Global Constants for the Project Zomboid Server Portal backend.
 */
export const SERVER_CONSTANTS = {
  DEFAULT_PORT: 3000,
  DEFAULT_HOST: '0.0.0.0',
  DEFAULT_JWT_SECRET: 'super-secret-pz-token-key-change-me',
  DEFAULT_ADMIN_PASSWORD: 'admin',
  
  DEFAULT_DATA_DIR: '/home/steam/data',

  /** Subdirectory under DATA_DIR where all PZ server instances live. */
  INSTANCES_DIR_NAME: 'instances',
  /** File name of the per-directory instance metadata. */
  INSTANCE_METADATA_FILE: 'instance.json',
  /** File name of the global registry under INSTANCES_DIR_NAME. */
  INSTANCE_REGISTRY_FILE: 'registry.json',
  /** Per-instance subdirectory holding SteamCMD's install. */
  INSTANCE_INSTALL_DIR_NAME: 'pzserver',
  /** Per-instance subdirectory holding user data (Zomboid saves, mods, configs). */
  INSTANCE_USERDATA_DIR_NAME: 'Zomboid',
  /** Default Steam branch (empty string = public). */
  DEFAULT_INSTANCE_BRANCH: '',
  /** Default UDP game port. */
  DEFAULT_GAME_PORT: 16261,
  /** Default RCON TCP port. */
  DEFAULT_RCON_PORT: 27015,
  /** Default max players. */
  DEFAULT_MAX_PLAYERS: 16,
  /** Minimum port allowed for new instances. */
  MIN_INSTANCE_PORT: 1024,
  /** Maximum port allowed for new instances. */
  MAX_INSTANCE_PORT: 65535,
  
  JVM_MIN_GB_FALLBACK: 4,
  JVM_MAX_GB_FALLBACK: 8,
  
  MAX_LOG_BUFFER_SIZE: 1000,
  PLAYER_COUNT_QUERY_INTERVAL_MS: 60000,
  RESOURCE_MONITOR_INTERVAL_MS: 3000,
  
  STEAM_APP_ID: '380870',
  STEAM_CMD_DIR: '/home/steam/steamcmd',

  /** Timeout (ms) for steamcmd +app_info_print discovery calls. */
  STEAMCMD_BRANCH_DISCOVERY_TIMEOUT_MS: 30_000,
  /** Time (ms) during which the branch list is considered fresh. */
  STEAMCMD_BRANCH_CACHE_TTL_MS: 60 * 60 * 1000,

  /**
   * Lowercase Steam branch names considered the public/default channel.
   * Steam does not flag the default branch explicitly; this list follows
   * Valve's de-facto convention. Configure via env `STEAM_DEFAULT_BRANCHES`
   * (comma-separated) to override per deployment.
   */
  STEAM_DEFAULT_BRANCHES: (process.env.STEAM_DEFAULT_BRANCHES
    ? process.env.STEAM_DEFAULT_BRANCHES.split(',').map((s) => s.trim()).filter(Boolean)
    : ['public']),

  /**
   * Substrings that mark a branch as a pre-release / unstable channel.
   * Used purely for UI labelling — SteamCMD itself does not care. Configure
   * via env `STEAM_UNSTABLE_KEYWORDS` (comma-separated) to override.
   */
  STEAM_UNSTABLE_KEYWORDS: (process.env.STEAM_UNSTABLE_KEYWORDS
    ? process.env.STEAM_UNSTABLE_KEYWORDS.split(',').map((s) => s.trim()).filter(Boolean)
    : ['unstable', 'beta', 'alpha', 'test', 'experimental', 'preview', 'rc', 'nightly', 'b42stable', 'b41stable']),

  /**
   * Curated fallback list of Project Zomboid branches used when the live
   * `+app_info_print` discovery does not return any branches (e.g. inside
   * a restricted container, before Steam has indexed the app, or transient
   * SteamCMD errors). `name === ''` is the default public branch.
   * Override entirely via `STEAM_FALLBACK_BRANCHES` env (JSON array).
   */
  STEAM_FALLBACK_BRANCHES: (() => {
    const raw = process.env.STEAM_FALLBACK_BRANCHES;
    if (raw && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {
        // Fall through to the default curated list.
      }
    }
    return [
      { name: '', buildId: '', description: 'Rama Pública Estable (Build 41)', isDefault: true, isUnstable: false },
      { name: 'b42stable', buildId: '', description: 'Build 42 Estable', isDefault: false, isUnstable: false },
      { name: 'unstable', buildId: '', description: 'Build 42 Unstable', isDefault: false, isUnstable: true }
    ];
  })(),
  
  JVM_ARG_MIN_MEM_PREFIX: '-Xms',
  JVM_ARG_MAX_MEM_PREFIX: '-Xmx',
  JVM_ARG_LANG_PREFIX: '-Duser.language=',
  
  JWT_EXPIRY_SECONDS: 43200, // 12 hours

  // Comandos de la consola de administración
  CMD_SAVE: 'save\n',
  CMD_QUIT: 'quit\n',
  CMD_PLAYERS: 'players\n',
  
  // Procesos y Señales
  SIGNAL_SIGKILL: 'SIGKILL' as const,
  PLATFORM_LINUX: 'linux',
  
  // Nombres de archivos y subdirectorios
  PATH_PROC: '/proc',
  PATH_START_SCRIPT: 'start-server.sh',
  PATH_BINARY_PZ: 'ProjectZomboid64',
  PATH_CONFIG_JSON: 'ProjectZomboid64.json',
  PATH_INSTALLED_BRANCH: 'installed_branch.txt',
  PATH_PANEL_CONFIG: 'panel_config.json',
  PATH_BACKUP_DIR: 'pzserver_backup',
  
  // Rutas y librerías de entorno
  ENV_JRE_BIN: 'jre64/bin',
  ENV_LINUX64: 'linux64',
  ENV_NATIVES: 'natives',
  ENV_JRE_LIB: 'jre64/lib/amd64',
  ENV_JSIG: 'libjsig.so',

  // Rutas HTTP de la API
  ROUTES: {
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',
    STATUS: '/api/status',
    CONTROL: '/api/control',
    BRANCHES: '/api/branches',
    INSTANCES: '/api/instances',
    INSTANCE_BY_ID: '/api/instances/:id',
    INSTANCE_SELECT: '/api/instances/:id/select',
    INSTANCE_INSTALL: '/api/instances/:id/install',
    INSTANCE_MIGRATE: '/api/instances/:id/migrate',
    SETTINGS: '/api/config/settings',
    PANEL: '/api/config/panel',
    RAW: '/api/config/raw/:type',
    PARSED: '/api/config/parsed/:type'
  },

  // Códigos de Estado HTTP
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    INTERNAL_SERVER_ERROR: 500
  }
};
