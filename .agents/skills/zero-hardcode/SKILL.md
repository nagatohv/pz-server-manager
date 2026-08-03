---
name: zero-hardcode
description: "Reglas para evitar código duro (hardcoding) mediante centralización de configuraciones, constantes, códigos de error y cadenas de traducción."
---

# Zero Hardcode (Cero Código Duro)

Esta habilidad prohíbe escribir cadenas de texto mágicas, números fijos, URLs, rutas de red o comandos del sistema operativo directamente en los archivos de ejecución y lógica de negocio. Además, define la separación de responsabilidades entre el **backend** (códigos + logs) y el **cliente** (traducciones i18n).

## Directrices Clave

### 1. Centralización de Constantes y Configuración
Todos los valores estáticos del sistema deben definirse en los archivos correspondientes:

* **Servidor (Backend)**:
  - [`../../../server/src/config/constants.ts`](../../../server/src/config/constants.ts): rutas de la API, códigos de estado HTTP, puertos por defecto, nombres físicos de archivos del juego y rutas de directorios en runtime.
  - [`../../../server/src/config/errorCodes.ts`](../../../server/src/config/errorCodes.ts): catálogo inmutable de **códigos de error tipados** (`ERR_*`) devueltos por la API. El cliente los traduce usando i18n.
  - [`../../../server/src/config/system-config.ts`](../../../server/src/config/system-config.ts): estado del sistema cargado en runtime (rutas, secretos, parámetros JVM).
  - [`../../../server/src/config/strings.ts`](../../../server/src/config/strings.ts): mensajes en español que el backend loguea y envía como **fallback** dentro de `res.json({ code, error })`.

* **Cliente (Frontend)**:
  - [`../../../client/src/config/constants.ts`](../../../client/src/config/constants.ts): rutas de endpoints (`API_AUTH_LOGIN`, `API_INSTANCES`, etc.) y constantes de navegación/intervalos.
  - [`../../../client/src/config/env.ts`](../../../client/src/config/env.ts): variables de entorno (`API_BASE`, `WS_URL`, `APP_NAME`) accesibles en runtime.

### 2. Textos Visibles al Usuario (i18n)
**Todo texto renderizado al usuario (etiquetas, mensajes, placeholders, tooltips, descripciones de opciones de configuración) debe residir en los archivos de internacionalización del cliente**. Nunca en `strings.ts` del cliente (ese archivo ya no existe).

* **Cliente**:
  - [`../../../client/src/i18n/locales/en.json`](../../../client/src/i18n/locales/en.json) y [`../../../client/src/i18n/locales/es.json`](../../../client/src/i18n/locales/es.json): todos los textos visibles organizados por namespace (`common`, `header`, `nav`, `servers`, `console`, `auth`, `createModal`, `editor`, `mods`, `backups`, `settings`, `cleanup`, `modal`, `workspace`, `dictionary`, `errors`).
  - Se accede en componentes React vía `useTranslation()` (`const { t } = useTranslation(); t('servers.title')`).
  - En código no-React (hooks, services, utils), usar `translate('clave')` desde [`../../../client/src/utils/i18n.ts`](../../../client/src/utils/i18n.ts), que reexporta la instancia singleton de i18next.
  - El **diccionario técnico** de descripciones de variables (`MaxPlayers`, `ZombieConfig.Speed`, etc.) está en el namespace `dictionary.*` de los JSON. [`../../../client/src/utils/translator.ts`](../../../client/src/utils/translator.ts) lo consulta con fallback a regex de reemplazo.

* **Errores del backend → cliente**:
  1. El backend lanza `new AppError(ERR_INSTANCE_NAME_INVALID, mensajeEs)` (ver [`../../../server/src/domain/AppError.ts`](../../../server/src/domain/AppError.ts)).
  2. El endpoint Express responde `res.status(400).json({ code: err.code, error: err.message })`.
  3. [`../../../client/src/utils/apiError.ts`](../../../client/src/utils/apiError.ts) recibe la respuesta y, si el `code` existe, lo traduce vía `i18n.t('errors.<code>')`. Si no, usa el `error` original como fallback.
  4. Esto permite añadir un nuevo idioma en el cliente sin tocar el backend: el código `ERR_*` es estable, sólo cambia la traducción en el JSON.

### 3. Excepciones de Puertos, Comandos y Rutas de Archivos
* No uses cadenas directas al instanciar puertos o rutas; leer siempre de `constants.ts` / `system-config.ts`.
* Si el sistema necesita invocar un binario externo (ej: `zip`, `unzip`, `steamcmd`), las rutas y argumentos por defecto deben obtenerse a través de la configuración del repositorio (`PzInstanceService.steamCmdDir`) o constantes globales del sistema (`SERVER_CONSTANTS.STEAM_CMD_DIR`).
* Los flags de los binarios externos (`-q`, `-rq`, `-oq`) van en `constants.ts`, no inline.

### 4. Uso de `AppError` en Backend
* Toda excepción que deba propagarse a la API debe ser `new AppError(code, message, params?)` (ver [`../../../server/src/domain/AppError.ts`](../../../server/src/domain/AppError.ts)).
* El código debe ser uno de los definidos en `errorCodes.ts`. Nunca se debe lanzar `new Error('texto duro')` desde un use case o servicio.
* En el endpoint Express, `if (err instanceof AppError)` se serializa como `{ code, error }`. Errores genéricos se mapean a un código por defecto (`ERR_SAVE_FILE_FAILED`).
