# Project Zomboid Dedicated Server & Web Admin Portal

Este proyecto proporciona una solución completa, ultraligera y segura para hospedar un servidor dedicado de **Project Zomboid** junto con un **portal de administración web** desacoplado bajo principios de **Clean Architecture**, **Atomic Design**, **TypeScript**, **TDD (Test-Driven Development)** y **Cero Hardcode**.

El proyecto mantiene una separación limpia entre el **Backend (`server/`)** y el **Frontend (`client/`)**, garantizando máxima eficiencia, tipado estricto e independización de dependencias.

---

## ✨ Características Principales

*   **Frontend en Atomic Design (`client/`)**: Interfaz desacoplada en **Átomos**, **Moléculas**, **Organismos** y **Páginas**, evitando componentes gigantes de código y facilitando el mantenimiento y reutilización.
*   **Arquitectura Desacoplada y Modular**: Proyectos independientes en `server/` (Node.js + Express + WebSockets) y `client/` (React + Vite), cada uno con su propio `package.json`, `tsconfig.json` y runner de pruebas Vitest.
*   **Clean Architecture & Patrones GoF**:
    *   **Strategy**: Parsers desacoplados para archivos `.ini`, `SandboxVars.lua` y `spawnregions.lua`.
    *   **Observer**: Transmisión de logs y métricas del sistema vía WebSockets en tiempo real.
    *   **Singleton & DIP**: Control centralizado del ciclo de vida del proceso de Java.
*   **Pruebas Unitarias & Cobertura (>90%)**: Suite de pruebas automatizadas independientes en `server/` y `client/` alcanzando **>90% de cobertura** de código (`npm run test:coverage`).
*   **Cero Hardcode**: Rutas de API HTTP, códigos de estado, comandos de consola, señales de OS (`SIGKILL`) y cadenas del sistema totalmente aisladas en `constants.ts` y `strings.ts`.
*   **Panel Web Interactivo & Elegante**: Tema oscuro ciberpunk con *glassmorphism*, terminal en vivo, editor visual/avanzado de parámetros del juego y gestión de mods de Steam Workshop.

---

## 📂 Estructura del Proyecto (Atomic Design)

```
d:\workspace\codiredes\pz/
├── server/                    # PROYECTO BACKEND (Node.js + Express + TS)
│   ├── src/
│   │   ├── domain/            # Puertos (Interfaces de Clean Architecture)
│   │   ├── usecases/          # Casos de uso de negocio
│   │   ├── adapters/          # Estrategias de parseo, repositorios y servicios
│   │   ├── frameworks/        # Drivers de Express y WebSocket
│   │   ├── config/            # Constantes (constants.ts) y Textos (strings.ts)
│   │   └── tests/             # Pruebas unitarias del backend (TDD, >90% Cobertura)
│   ├── server.ts              # Punto de entrada del servidor
│   ├── package.json           # Dependencias del backend
│   ├── tsconfig.json          # Configuración TypeScript para Node
│   └── vitest.config.ts       # Configuración de Pruebas Unitarias del Servidor
├── client/                    # PROYECTO FRONTEND (React + Vite + Atomic Design)
│   ├── src/
│   │   ├── components/
│   │   │   ├── atoms/         # Icon, Button, Input, Select, Badge, ProgressBar
│   │   │   ├── molecules/     # StatusWidget, NavTabs, ControlBar, GuiCard, ModCard
│   │   │   ├── organisms/     # Header, LoginForm, ConsolePanel, SettingsPanel, ModsPanel, EditorPanel
│   │   │   └── pages/         # LoginPage, PortalPage
│   │   ├── config/            # Constantes y textos del cliente
│   │   ├── utils/             # Utilitarios (traductor de descripciones)
│   │   ├── tests/             # Pruebas unitarias del cliente y componentes
│   │   ├── App.tsx            # Controlador de estado principal (Ligero)
│   │   ├── App.css            # Estilos CSS del portal
│   │   └── main.tsx           # Punto de entrada React
│   ├── index.html             # HTML base de la SPA
│   ├── package.json           # Dependencias del cliente
│   ├── tsconfig.json          # Configuración TypeScript para React
│   ├── vite.config.ts         # Configuración Vite del Frontend
│   └── vitest.config.ts       # Configuración de Pruebas Unitarias del Cliente
├── scripts/
│   └── install-zomboid.sh     # Script dedicado a la descarga/actualización con SteamCMD
├── Dockerfile                 # Construcción desacoplada en 2 etapas (Builder & Runner)
├── entrypoint.sh              # Script principal de orquestación del contenedor
├── docker-compose.yml         # Infraestructura como código para Dokploy
└── README.md                  # Esta documentación
```

---

## 🧪 Pruebas Unitarias & Cobertura (>90%)

### Pruebas del Backend (`server/`)
```bash
cd server
npm run test           # Ejecuta las 45 pruebas unitarias
npm run test:coverage  # Genera reporte de cobertura (92.97% de líneas)
```

### Pruebas del Frontend (`client/`)
```bash
cd client
npm run test           # Ejecuta las 8 pruebas unitarias de componentes y utilidades
npm run test:coverage  # Genera reporte de cobertura (100% de líneas)
```
