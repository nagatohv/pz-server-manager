/**
 * Spanish Strings and Translations dictionary for Project Zomboid Server Portal frontend.
 * Enforces Zero Hardcoding across all React components, buttons, tabs, forms, and alerts.
 */
export const CLIENT_STRINGS = {
  TITLE: 'PZ Server Manager',
  SUBTITLE: 'Project Zomboid Dedicated Manager',

  AUTH: {
    LOGIN_TITLE: 'PZ Server Manager',
    SUBTITLE: 'Ingrese la contraseña maestra de administración',
    /** @deprecated Use SUBTITLE */
    LOGIN_SUBTITLE: 'Ingrese la contraseña maestra de administración',
    PASSWORD_PLACEHOLDER: 'Contraseña de administración',
    LOGIN_BTN: 'Iniciar Sesión',
    LOADING_TEXT: 'Verificando...',
    /** @deprecated Use LOGIN_BTN */
    SUBMIT_BTN: 'Iniciar Sesión',
    /** @deprecated Use LOADING_TEXT */
    SUBMIT_VERIFYING: 'Verificando...',
    ERR_AUTH_FAILED: 'Contraseña incorrecta o autenticación fallida',
    ERR_SESSION_EXPIRED: 'Sesión expirada o no autorizada',
    LOGOUT_BTN: 'Salir'
  },

  ERRORS: {
    REQUEST_FAILED: 'Error en la petición al servidor',
    SAVE_FAILED: 'Error guardando el archivo de configuración',
    UNKNOWN_ERROR: 'Ocurrió un error desconocido'
  },

  MODAL: {
    ALERT_TITLE: 'Aviso del Sistema',
    ERROR_TITLE: 'Error en la Operación',
    SUCCESS_TITLE: 'Operación Exitosa',
    CONFIRM_TITLE: 'Confirmación Requerida',
    CONFIRM_DELETE_TITLE: 'Confirmar Eliminación',
    ACCEPT_BTN: 'Entendido',
    CONFIRM_BTN: 'Confirmar',
    CANCEL_BTN: 'Cancelar'
  },

  STATUS: {
    STOPPED: 'DETENIDO',
    RUNNING: 'EJECUTÁNDOSE',
    STARTING: 'INICIANDO',
    STOPPING: 'DETENIENDO',
    UPDATING: 'ACTUALIZANDO',
    CRASHED: 'ERROR'
  },

  CLEANUP: {
    BTN_CLEANUP: 'Liberar Espacio',
    BTN_CLEANING: 'Limpiando...',
    BTN_TITLE: 'Eliminar archivos temporales, logs antiguos y core dumps',
    CONFIRM_TITLE: 'Liberar espacio en disco',
    CONFIRM_MSG: '¿Estás seguro de que deseas liberar espacio en el disco? Se eliminarán volcados de memoria (core.*) y logs de más de 3 días de antigüedad. Tus partidas y archivos de configuración no se verán afectados.',
    CONFIRM_BTN: 'Liberar',
    SUCCESS_TITLE: 'Limpieza completada',
    SUCCESS_MSG: 'Se ha liberado {space} de espacio en disco (se eliminaron {count} archivos residuales).',
    ERROR_TITLE: 'Error de limpieza',
    ERROR_DEFAULT: 'Error al liberar espacio'
  },

  SERVERS_PAGE: {
    TITLE: 'Servidores de Project Zomboid',
    SUBTITLE: 'Crea distintos servidores con diferentes versiones, configura sus puertos y migra datos entre ellos.',
    EMPTY_TITLE: 'No hay servidores todavía',
    EMPTY_SUBTITLE: 'Crea tu primer servidor para empezar. No se descargará nada hasta que confirmes la versión.',
    CREATE_BTN: 'Crear Servidor',
    NAME_LABEL: 'Nombre del servidor',
    NAME_PLACEHOLDER: 'ej: servertest',
    BRANCH_LABEL: 'Rama de Steam',
    BRANCH_PUBLIC_DEFAULT: 'Rama pública (por defecto)',
    BRANCH_PLACEHOLDER: 'ej: b42stable (vacío para rama pública)',
    BRANCH_OPTION_WITH_BUILD: '{name} (Build {buildId})',
    BRANCH_FALLBACK_HINT: 'No se pudo conectar con Steam: mostrando lista de respaldo local.',
    GAME_PORT_LABEL: 'Puerto de juego (UDP)',
    RCON_PORT_LABEL: 'Puerto RCON (TCP)',
    MAX_PLAYERS_LABEL: 'Máximo de jugadores',
    SELECT_BTN: 'Activar',
    INSTALL_BTN: 'Instalar / Actualizar',
    START_BTN: 'Iniciar Servidor',
    STOP_BTN: 'Detener Servidor',
    CONFIGURE_BTN: 'Configuración',
    UPDATE_BTN: 'Actualizar',
    DELETE_BTN: 'Eliminar',
    MIGRATE_BTN: 'Migrar datos…',
    INSTALLED_BADGE: 'Instalado',
    NOT_INSTALLED_BADGE: 'Sin instalar',
    ACTIVE_BADGE: 'Activo',
    LAST_ERROR_LABEL: 'Último error',
    CONFIRM_DELETE_TITLE: 'Eliminar servidor',
    CONFIRM_DELETE_MSG: '¿Seguro que quieres eliminar "{name}"? Se borrará también todo su directorio (instalación Steam y datos de usuario).',
    MIGRATE_DIALOG_TITLE: 'Migrar datos de usuario',
    MIGRATE_DIALOG_DESC: 'Copia la carpeta Zomboid/ de la instancia origen a la instancia destino. NO se toca la instalación Steam.',
    MIGRATE_SOURCE_LABEL: 'Instancia origen',
    MIGRATE_TARGET_LABEL: 'Instancia destino',
    MIGRATE_BTN_CONFIRM: 'Migrar datos',
    MIGRATE_SUCCESS: 'Migración completada: {files} archivo(s), {bytes} bytes copiados.',
    MIGRATE_CONFIRM_TITLE: 'Migrar a "{name}"',
    CREATE_DIALOG: {
      GAME_LABEL: 'Juego / Servidor',
      GAME_DESC: 'Elige el servidor de juego a desplegar. En el futuro se admitirán más opciones.',
      PROJECT_ZOMBOID: 'Project Zomboid',
      BRANCH_LOADING: '⏳ Consultando ramas desde Steam...',
      BRANCH_ERROR: '❌ Error al consultar ramas de Steam',
      BRANCH_DESC_LOADING: '⏳ Conectando con SteamCMD para obtener la lista oficial de versiones...',
      BRANCH_DESC_ERROR: '⚠️ {error} Presiona "Reintentar" para volver a consultar.',
      BRANCH_COUNT_SINGLE: '1 rama disponible desde Steam',
      BRANCH_COUNT_PLURAL: '{count} ramas disponibles desde Steam',
      RETRY_BTN: 'Reintentar',
      RETRY_TITLE: 'Reconsultar catálogo desde Steam'
    }
  },

  NAV_TABS: {
    CONSOLE: 'Consola y Control',
    SETTINGS: 'Parámetros Principales',
    MODS: 'Gestión de Mods',
    EDITOR: 'Configuración Avanzada',
    SERVERS: 'Servidores',
    BACKUPS: 'Respaldos (Backups)'
  },

  BACKUPS: {
    TITLE: 'Gestión de Respaldos de Servidor',
    SUBTITLE: 'Crea, restaura y administra copias de seguridad de las partidas guardadas y configuraciones.',
    CREATE_BTN: 'Crear Respaldo Ahora',
    NOTE_LABEL: 'Nota / Descripción del respaldo',
    NOTE_PLACEHOLDER: 'ej: Respaldo previo a actualización 42.19, previo a torneo PvP...',
    RESTORE_BTN: 'Restaurar',
    DELETE_BTN: 'Eliminar',
    CONFIRM_RESTORE_TITLE: '¿Restaurar Respaldo?',
    CONFIRM_RESTORE_MSG: 'Se reemplazará la partida guardada y configuración actual por la del respaldo "{name}". ¿Deseas continuar?',
    CONFIRM_DELETE_TITLE: '¿Eliminar Respaldo?',
    CONFIRM_DELETE_MSG: 'Se eliminará permanentemente el respaldo "{name}". Esta acción no se puede deshacer.',
    EMPTY_TITLE: 'No hay respaldos guardados para este servidor',
    EMPTY_DESC: 'Genera un respaldo manual antes de realizar cambios importantes o actualizar el servidor.',
    COL_NAME: 'Identificador',
    COL_DATE: 'Fecha y Hora',
    COL_NOTE: 'Nota / Descripción',
    COL_SIZE: 'Tamaño',
    COL_ACTIONS: 'Acciones'
  },

  STATUS_WIDGETS: {
    SERVER_STATUS_TITLE: 'Estado del Servidor',
    ONLINE_PLAYERS_TITLE: 'Jugadores Online',
    CPU_USAGE_TITLE: 'Uso de Procesador',
    MEMORY_USAGE_TITLE: 'Uso de Memoria RAM',
    IDLE_SHUTDOWN_TITLE: 'Auto-Apagado Inactividad',

    STATUS_ONLINE: 'EN LINEA',
    STATUS_OFFLINE: 'APAGADO',
    STATUS_STARTING: 'INICIANDO',
    STATUS_STOPPING: 'DETENIENDO',
    STATUS_UPDATING: 'ACTUALIZANDO',
    STATUS_CRASHED: 'ERROR / CAÍDO',

    PLAYERS_CONNECTED: 'Conectados actualmente',
    PLAYERS_STOPPED: 'Servidor detenido',
    IDLE_SUBTITLE: 'Sin jugadores online'
  },

  CONTROL_BAR: {
    START_SERVER: 'Iniciar Servidor',
    STOP_SERVER: 'Detener Seguro',
    RESTART_SERVER: 'Reiniciar',
    KILL_SERVER: 'Forzar Cierre',
    UPDATE_GAME: 'Actualizar Juego (SteamCMD)',
    REFRESH_BRANCHES: 'Reconsultar Steam',
    BRANCH_DEFAULT_NAME: 'Rama Pública (Estable)',
    BRANCH_LABEL_WITH_BUILD: '{name} (Build {buildId})',
    BRANCH_LOADING: 'Consultando Steam…',
    BRANCH_LOAD_ERROR: 'No se pudieron obtener las ramas',
    BRANCH_NO_DATA: 'Steam no devolvió ramas',
    BRANCH_ERROR_PREFIX: 'Error al consultar Steam:',
    BRANCH_SOURCE_STEAM: 'Catálogo en vivo desde Steam',
    BRANCH_SOURCE_FALLBACK: 'Lista de respaldo (SteamCMD no devolvió ramas reales)',
    SERVER_SELECT_LABEL: 'Servidor Activo:',
    NO_SERVERS_AVAILABLE: 'No hay servidores creados'
  },

  CONSOLE_PANEL: {
    TERMINAL_TITLE: 'Project Zomboid Server Console',
    INPUT_PLACEHOLDER: 'Escriba un comando RCON/servidor (ej: help, save, players)...',
    SEND_BTN: 'Enviar'
  },

  SETTINGS_PANEL: {
    GENERAL_SECTION_TITLE: 'Opciones Generales del Servidor y Portal',
    SERVER_INI_TITLE: 'Parámetros Configurados en server.ini',
    SAVE_SETTINGS_BTN: 'Guardar Parámetros Principales',
    SUCCESS_MESSAGE: 'Parámetros guardados exitosamente.',
    IDLE_SHUTDOWN_LABEL: 'Auto-Apagado por Inactividad (Minutos)',
    IDLE_SHUTDOWN_DESC: 'Tiempo en minutos con 0 jugadores online antes de apagar automáticamente el servidor para ahorrar RAM/CPU (0 = Desactivado).',
    SERVER_LANG_LABEL: 'Idioma del Servidor (JVM User Language)',
    SERVER_LANG_DESC: 'Idioma para los logs y mensajes del servidor de juego.',
    LANGUAGES: {
      es: 'Español (es)',
      en: 'English (en)',
      fr: 'Français (fr)',
      de: 'Deutsch (de)',
      it: 'Italiano (it)',
      pt: 'Português (pt)',
      ru: 'Русский (ru)'
    }
  },

  MODS_PANEL: {
    ADD_MOD_TITLE: 'Añadir Nuevo Mod de Steam Workshop',
    INSTALLED_MODS_TITLE: 'Mods Instalados Actualmente',
    MOD_ID_LABEL: 'ID del Mod (Mod ID)',
    MOD_ID_PLACEHOLDER: 'ej: Hydrocraft',
    WORKSHOP_ID_LABEL: 'ID de Workshop (Item ID)',
    WORKSHOP_ID_PLACEHOLDER: 'ej: 514493422',
    ADD_MOD_BTN: 'Agregar a la Lista',
    SAVE_MODS_BTN: 'Guardar Cambios de Mods',
    REMOVE_MOD_BTN: 'Eliminar',
    NO_MODS_TEXT: 'No hay mods añadidos a la configuración del servidor.',
    SUCCESS_MESSAGE: 'Configuración de Mods guardada exitosamente.'
  },

  EDITOR_PANEL: {
    TAB_INI: 'server.ini',
    TAB_SANDBOX: 'SandboxVars.lua',
    TAB_SPAWN: 'spawnregions.lua',
    MODE_GUI: 'Vista Visual (GUI)',
    MODE_RAW: 'Texto Plano (RAW)',
    SAVE_BTN_TEMPLATE: 'Guardar Cambios ({type})',
    LOADING_TEXT: 'Cargando datos del archivo...',
    CATEGORY_PREFIX: 'Categoría: ',
    SPAWN_ENABLED: 'Habilidado',
    SPAWN_DISABLED: 'Deshabilitado',
    SPAWN_DELETE: 'Eliminar',
    SUCCESS_MESSAGE_TEMPLATE: 'Archivo {type} guardado exitosamente.'
  },

  GUI_CARD: {
    BOOLEAN_TRUE: 'Verdadero (true)',
    BOOLEAN_FALSE: 'Falso (false)'
  },

  STATUS_LABELS: {
    RUNNING: '🟢 En Línea',
    STARTING: '🟡 Iniciando...',
    STOPPED: '🔴 Detenido',
    STOPPING: '🟡 Deteniendo...',
    UPDATING: '⚡ Actualizando...',
    CRASHED: '💥 Caído (Crashed)',
    UNKNOWN: '⚪ Desconectado'
  },

  WARNINGS: {
    ACTIVE_SERVER: '⚠️ Servidor Activo: No guardes configuraciones mientras el servidor esté en línea. Project Zomboid reescribirá estos archivos al apagarse, perdiendo tus cambios.'
  },

  DICTIONARY: {
    // server.ini variables
    'MaxPlayers': 'Cantidad máxima de jugadores permitidos simultáneamente en el servidor.',
    'Password': 'Contraseña requerida para ingresar al servidor. Dejar vacío si se desea libre acceso.',
    'Port': 'Puerto UDP principal de comunicación (por defecto 16261).',
    'Public': 'Determina si el servidor aparecerá visible en la pestaña pública de servidores de Steam.',
    'PublicName': 'Nombre público que se mostrará en la lista de servidores de Steam.',
    'PublicDescription': 'Descripción del servidor que se mostrará en la lista pública.',
    'RCONPort': 'Puerto para la consola de control remoto (RCON).',
    'RCONPassword': 'Contraseña requerida para conectarse y ejecutar comandos remotos vía RCON.',
    'PVP': 'Habilita el modo Jugador contra Jugador (daño entre jugadores).',
    'SafetySystem': 'Habilita el sistema de seguridad/seguro de PVP para evitar ataques accidentales.',
    'ShowSafety': 'Muestra el indicador visual de seguridad de PVP en la interfaz del jugador.',
    'DoLuaChecksum': 'Verifica que los archivos Lua del cliente coincidan exactamente con los del servidor para prevenir mods tramposos.',
    'Open': 'Si está en False, solo los usuarios en la lista blanca (whitelist) o registrados previamente podrán conectarse.',
    'AutoCreateUserInWhiteList': 'Registra automáticamente en la base de datos a los nuevos usuarios al conectarse por primera vez.',
    'SpeedLimit': 'Límite de velocidad máxima permitido para los vehículos antes de que el servidor lo bloquee.',
    'BadWordPolicy': 'Acción a tomar si un jugador dice una mala palabra en el chat público.',
    'MapRemotePlayerVisibility': 'Define quién puede ver a otros jugadores en el mapa del juego.',
    
    // Anti-cheat variables
    'AntiCheatSafety': 'Desactiva el anti-cheat del seguro de PVP. Recomendado en 4 (Ignorar) para evitar expulsiones falsas.',
    'AntiCheatMovement': 'Desactiva el anti-cheat de velocidad/movimiento. Recomendado en 4 (Ignorar) si los jugadores experimentan lag o usan vehículos rápidos.',
    'AntiCheatHit': 'Desactiva el anti-cheat de registro de golpes a distancia. Recomendado en 4 (Ignorar).',
    'AntiCheatPacket': 'Desactiva el anti-cheat de análisis de paquetes de red. Recomendado en 4 (Ignorar).',
    'AntiCheatPermission': 'Desactiva el anti-cheat de permisos de comandos admin/moderador. Recomendado en 4 (Ignorar).',
    'AntiCheatXP': 'Desactiva el anti-cheat de aumento de experiencia de habilidades. Recomendado en 4 (Ignorar).',
    'AntiCheatSafeHouse': 'Desactiva el anti-cheat de protección e ingreso a refugios. Recomendado en 4 (Ignorar).',
    'AntiCheatPlayer': 'Desactiva el anti-cheat general del estado de los jugadores. Recomendado en 4 (Ignorar) para prevenir desconexiones constantes.',
    'AntiCheatChecksum': 'Desactiva el anti-cheat de chequeo de archivos Lua de mods modificados. Recomendado en 4 (Ignorar).',
    'AntiCheatItem': 'Desactiva el anti-cheat de creación/obtención de objetos del inventario. Recomendado en 4 (Ignorar).',
    
    // SandboxVars.lua - Zombies
    'Zombies': 'Multiplicador de la cantidad total de zombis en el mundo.',
    'ZombieConfig.PopulationMultiplier': 'Ajuste detallado de población de zombis en el mapa.',
    'ZombieConfig.Speed': 'Establece la velocidad de los zombis (caminantes, corredores, etc.).',
    'ZombieConfig.Strength': 'Establece la fuerza física de los zombis (fuerte, normal, débil).',
    'ZombieConfig.Toughness': 'Establece la resistencia de los zombis (salud/dureza).',
    'ZombieConfig.Transmission': 'Método de transmisión del virus (saliva, rasguños, ninguno).',
    'ZombieConfig.Mortality': 'Tiempo que transcurre antes de que un jugador infectado muera y se convierta.',
    'ZombieConfig.Cognition': 'Habilidad cognitiva de los zombis (abrir puertas, navegación, básica).',
    'ZombieConfig.Memory': 'Duración del recuerdo de los zombis al perseguir o escuchar un ruido.',
    'ZombieConfig.Decomposition': 'Efecto de la descomposición del tiempo sobre la fuerza y velocidad de los zombis.',
    'ZombieConfig.Sight': 'Nivel de visión de los zombis (luz del día, visión nocturna, normal).',
    'ZombieConfig.Hearing': 'Nivel de audición de los zombis (muy agudo, normal, sordo).',
    
    // SandboxVars.lua - General/Mundo
    'DayLength': 'Duración en la vida real de un día completo dentro del juego.',
    'StartMonth': 'Mes del año en el que comienza el apocalipsis.',
    'StartDay': 'Día del mes en el que inicia la partida.',
    'StartTime': 'Hora del día en la que inicia la partida.',
    'WaterShut': 'Tiempo que tardará el suministro de agua corriente en cortarse.',
    'ElecShut': 'Tiempo que tardará la red eléctrica de la ciudad en apagarse.',
    'NightDarkness': 'Qué tan oscuras serán las noches (totalmente negro, brillante, etc.).',
    'LootRespawn': 'Con qué frecuencia se regenerarán los objetos dentro de los contenedores ya saqueados.',
    'MultiplierConfig.XPMultiplier': 'Multiplicador de ganancia de experiencia global para todas las habilidades.',
    'Nutrition': 'Habilita el sistema de carbohidratos, grasas y calorías que afectan al peso del personaje.',
    'StarterKit': 'Si se activa, el jugador aparecerá con una bolsa de inicio que incluye comida, herramientas básicas y una botella de agua.',
    
    // Otros Sandbox
    'CarSpawnRate': 'Frecuencia con la que aparecen vehículos en las calles.',
    'ChanceHasGas': 'Probabilidad de que un coche tenga gasolina al encontrarlo.',
    'InitialGas': 'Cantidad inicial de gasolina que tendrán los coches al aparecer.',
    'CarGasConsumption': 'Multiplicador de consumo de combustible al manejar vehículos.',
    'LockedHouses': 'Probabilidad de que las casas tengan sus puertas bajo llave.',
    'Alarms': 'Frecuencia con la que las casas tendrán alarmas activas al forzar sus entradas.',
    'AllowDestructionByAdmin': 'Permite a los administradores destruir estructuras con herramientas.'
  }
};
export type ClientStringsType = typeof CLIENT_STRINGS;
