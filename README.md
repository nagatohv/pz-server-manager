# Project Zomboid Dedicated Server & Web Admin Portal

Este proyecto proporciona una solución completa, ultraligera y segura para hospedar un servidor dedicado de **Project Zomboid** junto con un **portal de administración web** desacoplado bajo principios de **Clean Architecture**, **Atomic Design**, **TypeScript**, **TDD (Test-Driven Development)**, **i18n** y **Cero Hardcode**.

El proyecto mantiene una separación limpia entre el **Backend (`server/`)** y el **Frontend (`client/`)** con tipos compartidos vía JSON y WebSockets, garantizando máxima eficiencia, tipado estricto e independización de dependencias.

---

## ✨ Características Principales

*   **Frontend en Atomic Design (`client/`)**: Interfaz desacoplada en **Átomos**, **Moléculas**, **Organismos** y **Páginas**.
*   **i18n (Internacionalización)**: Textos 100% traducibles con `i18next` + `react-i18next` (es/en). Selector de idioma en el header con persistencia en `localStorage`. **Diccionario técnico** de descripciones de variables de configuración con traducciones a ambos idiomas.
*   **Errores traducibles desde el backend**: El servidor responde con códigos de error tipados (`ERR_*`) y el cliente los traduce automáticamente a mensajes legibles en el idioma activo.
*   **Arquitectura Multi-juego desacoplada**: `GameRegistry` + `IGameStrategy` permite añadir otros juegos sin tocar el core (Project Zomboid es la primera implementación en `games/pz/`).
*   **Multi-instancia**: Crea varios servidores con distintas versiones (Build 41, Build 42 estable, Build 42 inestable, etc.), distintos puertos y datos aislados. Migra los datos de usuario entre instancias o elimínalas con un click.
*   **Sin auto-install**: El portal arranca vacío. Nada se descarga hasta que el operador crea una instancia y pulsa **Instalar / Actualizar**.
*   **Filtros en vistas**:
    *   **Servidores**: búsqueda por nombre, filtro por instalación, por estado (activo/inactivo), por rama de Steam y ordenamiento.
    *   **Editor de configuración (INI / SandboxVars)**: búsqueda en vivo por clave, valor, descripción o categoría.
*   **Clean Architecture & Patrones GoF**:
    *   **Strategy**: Parsers desacoplados para `.ini`, `SandboxVars.lua`, `spawnregions.lua` y `VdfParser` (SteamCMD).
    *   **Observer**: Logs y métricas vía WebSockets en tiempo real, incluyendo actualizaciones del catálogo de ramas.
    *   **Singleton**: Instancias únicas para `SteamBranchCatalogService` y catálogo de instancias.
    *   **Repository**: Persistencia desacoplada de instancias y configuraciones.
*   **Pruebas Unitarias & Cobertura**: `npm run test:coverage` en backend y frontend.
*   **Cero Hardcode**: Constantes, códigos de error y mensajes aislados en `constants.ts`, `errorCodes.ts` y `strings.ts`.
*   **Panel Web Interactivo & Elegante**: Tema oscuro, terminal en vivo, editor visual GUI/RAW, gestión de mods, backups y servidor activo.

---

## 📂 Estructura del Proyecto (Atomic Design)

```
./
├── server/                            # PROYECTO BACKEND (Node.js + Express + TS)
│   ├── src/
│   │   ├── domain/                    # Capa de Dominio (Clean Architecture)
│   │   │   ├── AppError.ts            # Error tipado con code + params
│   │   │   └── ports/                 # Interfaces (IAuthService, IPzInstanceService, etc.)
│   │   ├── usecases/                  # Casos de uso
│   │   │   ├── AuthenticateUseCase.ts
│   │   │   ├── ControlServerUseCase.ts
│   │   │   ├── ListBranchesUseCase.ts
│   │   │   └── ManageConfigUseCase.ts
│   │   ├── adapters/                  # Implementaciones
│   │   │   ├── parsers/               # Strategy: IniParser, SandboxParser, SpawnParser, VdfParser, BranchClassifier
│   │   │   ├── repositories/          # PzInstanceRepository, PzConfigRepository
│   │   │   ├── security/              # JwtAuthService
│   │   │   └── services/              # PzInstanceService, PzBackupService, PzProcessControlService, SteamBranchCatalogService, MultiGameProcessControlService
│   │   ├── games/                     # Multi-juego (Registry + Strategy)
│   │   │   ├── GameRegistry.ts
│   │   │   └── pz/                    # IGameStrategy para Project Zomboid
│   │   ├── frameworks/                # Drivers externos
│   │   │   ├── express/               # express-app.ts (rutas HTTP + middleware)
│   │   │   └── websocket/             # websocket-server.ts (logs/status en tiempo real)
│   │   ├── config/                    # Configuración centralizada
│   │   │   ├── constants.ts           # Rutas, puertos, HTTP status
│   │   │   ├── errorCodes.ts          # Catálogo de códigos de error (ERR_*)
│   │   │   ├── strings.ts             # Mensajes en español (logs + fallback API)
│   │   │   └── system-config.ts       # Configuración del sistema en runtime
│   │   ├── types.ts                   # Tipos compartidos del dominio
│   │   └── tests/                     # 21 archivos de tests
│   ├── server.ts                      # Punto de entrada
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── client/                            # PROYECTO FRONTEND (React + Vite + Atomic Design)
│   ├── src/
│   │   ├── components/
│   │   │   ├── atoms/                 # Button, Input, Select, Badge, ProgressBar, Icon, SearchInput
│   │   │   ├── molecules/             # StatusWidget, NavTabs, ControlBar, GuiCard, ModCard, InstanceCard, AlertModal
│   │   │   ├── organisms/             # Header, LoginForm, ConsolePanel, SettingsPanel, ModsPanel,
│   │   │   │                          # EditorPanel, BackupsPanel, CreateInstanceDialog,
│   │   │   │                          # ServerConfigWorkspace, ServerFiltersBar
│   │   │   └── pages/                 # LoginPage, PortalPage, ServersPage
│   │   ├── hooks/                     # Lógica de estado reutilizable
│   │   │   ├── useAuth.ts             # Login + JWT
│   │   │   ├── useServerStatus.ts     # Status, logs y WebSocket
│   │   │   ├── useConfigManager.ts    # INI / Sandbox / Mods
│   │   │   ├── useInstances.ts        # CRUD de instancias
│   │   │   ├── useBackups.ts          # Backups (factory con token + instanceId nombrados)
│   │   │   ├── useModal.ts            # Modal reactivo
│   │   │   └── useRouter.ts           # Routing de la SPA
│   │   ├── services/
│   │   │   └── apiService.ts          # Capa HTTP + resolución de errores por código
│   │   ├── i18n/
│   │   │   ├── index.ts               # Configuración i18next
│   │   │   └── locales/               # en.json, es.json
│   │   ├── utils/
│   │   │   ├── i18n.ts                # Helper translate() para código no-React
│   │   │   ├── apiError.ts            # Resuelve mensajes por código de error del backend
│   │   │   └── translator.ts          # Diccionario técnico de variables de configuración
│   │   ├── styles/                    # _tokens, _mixins, _reset, _typography, _animations, main
│   │   ├── config/                    # constants.ts (rutas API), env.ts
│   │   ├── tests/                     # 14 archivos de tests
│   │   ├── types.ts                   # Tipos compartidos con backend
│   │   ├── App.tsx                    # Composición de hooks y páginas
│   │   ├── App.css
│   │   ├── env.d.ts
│   │   └── main.tsx                   # Punto de entrada React
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
├── scripts/
│   └── install-zomboid.sh             # Script de descarga/actualización con SteamCMD
├── Dockerfile                         # Build desacoplado en 2 etapas (Builder & Runner)
├── entrypoint.sh                      # Orquestación del contenedor
├── docker-compose.yml                 # Infraestructura como código
├── LICENSE
└── README.md                          # Esta documentación
```

---

## 🌐 Internacionalización (i18n)

### Cliente

*   **Librería**: `i18next` v26 + `react-i18next` v17 + `i18next-browser-languagedetector`.
*   **Idiomas soportados**: `es` (fallback) y `en`.
*   **Persistencia**: El idioma elegido se guarda en `localStorage` bajo la clave gestionada por `i18next-browser-languagedetector`.
*   **Estructura de claves**: `camelCase` anidado por feature (ej: `servers.title`, `backups.confirmDeleteMsg`, `errors.ERR_INSTANCE_NOT_FOUND`).
*   **Interpolación**: prefijo `{` y sufijo `}` (ej: `{name}`, `{count, plural, ...}`).
*   **Namespaces principales**: `common`, `header`, `nav`, `servers`, `console`, `auth`, `createModal`, `editor`, `mods`, `backups`, `settings`, `cleanup`, `modal`, `workspace`, `dictionary`, `errors`.

### Backend → Cliente (errores)

1. El backend responde con `{ code: 'ERR_INSTANCE_NAME_INVALID', error: 'mensaje fallback' }`.
2. `client/src/utils/apiError.ts` recibe la respuesta y, si el `code` existe, lo traduce vía `i18n.t('errors.<code>')`.
3. Si el código no tiene traducción, se usa el campo `error` original.
4. Esto permite añadir nuevos idiomas en el cliente sin tocar el backend.

---

## 🧪 Pruebas Unitarias

### Pruebas del Backend (`server/`)

```bash
cd server
npm test           # 21 archivos, 140 tests pasando (1 skipped)
npm run test:coverage
```

Cobertura aproximada: **89% statements, 91% lines, 95% functions**.

### Pruebas del Frontend (`client/`)

```bash
cd client
npm test           # 14 archivos, 83 tests pasando
npm run test:coverage
```

Umbrales configurados en `vitest.config.ts`: 90% lines / 90% statements / 65% functions / 78% branches.

### Tests destacados

| Suite | Cobertura |
|-------|-----------|
| `SearchInput.test.tsx` | Renderizado, `onChange`, botón de limpieza |
| `ServerFiltersBar.test.ts` | 10 tests sobre la lógica pura `filterAndSortInstances` |
| `organisms.test.tsx` | Filtros de INI, Sandbox, no-matches |
| `ServersPage.test.tsx` | Integración de búsqueda, no-results, clear |
| `hooks.test.ts` | `useAuth`, `useServerStatus`, `useConfigManager`, `useBackups` |
| `services.test.ts` | Capa HTTP de `ApiService` con códigos de error |

---

## 🛠️ Comandos Útiles

### Cliente

```bash
npm run dev         # Servidor de desarrollo Vite
npm run build       # tsc + vite build
npm run test        # vitest run
npm run test:coverage
```

### Servidor

```bash
npm run dev         # tsx watch server.ts
npm run build       # tsup (ESM, minificado)
npm start           # node dist/server.js
npm run test        # vitest run
npm run test:coverage
```

---

## 🏗️ Convenciones del Proyecto

Las reglas de arquitectura, código y estilo están centralizadas en [`.agents/AGENTS.md`](.agents/AGENTS.md) y las skills en [`.agents/skills/`](.agents/skills/):

* **Clean Code** — Funciones pequeñas, nombres expresivos, manejo de errores limpio.
* **Clean Architecture** — Domain → Adapters → Frameworks (dependencias hacia adentro).
* **SOLID** — Single Responsibility, Open/Closed, Liskov, Interface Segregation, Dependency Inversion.
* **Self-Documenting** — El código debe explicar el qué y el cómo sin comentarios.
* **GoF Patterns** — Strategy, Observer, Singleton, Repository, Adapter.
* **Zero Hardcode** — Constantes y cadenas aisladas en `constants.ts`, `errorCodes.ts` y `strings.ts`.
* **Zero Documenting** — Sin comentarios inline; JSDoc solo en puertos del dominio.
* **TDD/BDD/SSD** — Pruebas primero, mínimo 80% de cobertura.

---

## 🐳 Despliegue

```bash
docker compose up -d
```

El `entrypoint.sh`:
1. Crea los directorios de Steam y datos.
2. Arranca el backend que sirve también el cliente compilado.
3. Ejecuta `scripts/install-zomboid.sh` cuando se crea la primera instancia.
