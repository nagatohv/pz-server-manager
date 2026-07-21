# Project Zomboid Dedicated Server & Web Admin Portal

Este proyecto proporciona una solución completa y segura para hospedar un servidor dedicado de **Project Zomboid** junto con un **portal de administración web** elegante e interactivo. Está diseñado específicamente para ser desplegado en **Dokploy** siguiendo las mejores prácticas de seguridad, aislamiento y persistencia de datos.

---

## ✨ Características Principales

*   **Panel Web Elegante**: Interfaz premium con temática de supervivencia ciberpunk y efecto *glassmorphism* (modo oscuro por defecto).
*   **Acciones de Energía**: Encendido, apagado seguro (graceful shutdown) y reinicio del servidor de juego con un solo clic.
*   **Auto-Apagado por Inactividad**: Apagado automático del servidor tras un intervalo de tiempo configurable sin jugadores en línea (para ahorrar recursos de CPU y RAM en tu VPS).
*   **Consola en Vivo**: Terminal interactiva mediante WebSockets para visualizar los logs del servidor de Project Zomboid en tiempo real y enviar comandos de consola.
*   **Gestor de Mods Integrado**: Añade mods de Steam Workshop de forma sencilla introduciendo el ID del Mod y el ID de Workshop.
*   **Editor de Configuración**: Formulario visual para los parámetros más comunes y un editor avanzado de texto plano para editar los archivos `.ini`, `SandboxVars.lua` y `spawnregions.lua`.
*   **Seguridad Fortalecida**:
    *   **Aislamiento del Socket de Docker**: El portal no requiere acceso a `/var/run/docker.sock`, previniendo escalada de privilegios en el host.
    *   **Usuario sin Privilegios**: El contenedor ejecuta todos los procesos bajo el usuario de Linux `steam` (UID 1000).
    *   **Autenticación Protegida**: Acceso al panel protegido por contraseña cifrada con `bcrypt` y sesiones JWT (JSON Web Tokens).

---

## 📂 Estructura del Proyecto (Monorepositorio)

Este proyecto está estructurado como un **Monorepositorio**, lo que significa que **tanto el Cliente (Frontend) como el Servidor (Backend) viven en el mismo proyecto y repositorio**. No necesitas desplegarlos por separado.

### Árbol de Directorios
```
d:\workspace\codiredes\pz/
├── client/              # CÓDIGO DEL FRONTEND (React + Vite)
│   ├── src/             # Componentes, estilos y lógica visual
│   ├── index.html       # Plantilla base
│   └── package.json     # Dependencias del cliente
├── server/              # CÓDIGO DEL BACKEND (Node.js + Express)
│   ├── server.js        # Punto de entrada de la API y WebSockets
│   ├── pz-manager.js    # Gestión del servidor de PZ (Java) y SteamCMD
│   └── package.json     # Dependencias del backend
├── Dockerfile           # Instrucciones de compilación para Dokploy
├── entrypoint.sh        # Script de arranque del contenedor
├── .env.example         # Plantilla de variables de entorno general
└── README.md            # Esta documentación
```

### ¿Cómo funciona en Producción (Dokploy)?
Cuando Dokploy compila este proyecto usando el [`Dockerfile`](file:///d:/workspace/codiredes/pz/Dockerfile):
1. **Compilación del Cliente**: Construye el frontend de React (dentro de `client/`) usando Vite y genera archivos estáticos optimizados en `client/dist`.
2. **Empaquetado**: Copia el backend (`server/`) y los archivos construidos del frontend (`client/dist`) dentro de la misma imagen de Docker.
3. **Ejecución**: Al arrancar, el contenedor solo ejecuta la aplicación de Node.js del backend. Esta aplicación sirve la API en `/api` y, al mismo tiempo, sirve de manera estática los archivos del cliente (HTML/JS/CSS) desde la misma dirección. **Todo corre en un único puerto (3000) bajo una sola aplicación de Dokploy.**

---

## 🏗️ Arquitectura del Sistema y Flujo de Datos

El contenedor ejecuta dos componentes co-localizados dentro del mismo sandbox:
1.  **Backend (Node.js/Express)**: Levanta la API REST y el servidor de WebSockets. Controla el servidor del juego como un proceso hijo (`child_process.spawn`) enviando comandos directamente a su `stdin` y escuchando su `stdout`/`stderr`.
2.  **Servidor de Project Zomboid (Java JRE)**: Ejecutado y actualizado vía SteamCMD.

```
                  ┌──────────────────────────────────────────────┐
                  │              CONTENEDOR DOCKER               │
                  │                                              │
                  │   ┌──────────────┐        ┌──────────────┐   │
 Cliente Web ─────┼──►│ Backend API  │◄──────►│  PZ Server   │   │
(HTTPS / WSS)     │   │  (Node.js)   │ stdin  │ (Java / JRE) │   │
                  │   └──────┬───────┘ stdout └──────────────┘   │
                  │          │                                   │
                  │          ▼ Read/Write                        │
                  │   ┌──────────────┐                           │
                  │   │   Volumen    │ (Persistente)             │
                  │   │  /steam/data │                           │
                  │   └──────────────┘                           │
                  └──────────────────────────────────────────────┘
```

---

## 🚀 Guía de Despliegue en Dokploy

Puedes desplegar este proyecto en Dokploy de dos maneras: utilizando la configuración automatizada de **Docker Compose** (Recomendado) o configurando el **Dockerfile de forma manual**.

---

### Opción A: Despliegue con Docker Compose (Recomendado)
Docker Compose te permite definir la infraestructura como código, por lo que no tendrás que configurar los puertos, volúmenes ni variables de entorno a mano en la interfaz de Dokploy.

1. Ve a tu panel de Dokploy.
2. Crea un nuevo proyecto y selecciona **Compose** para añadir una aplicación de tipo Compose.
3. Conecta tu repositorio Git que contenga este proyecto.
4. Dokploy leerá automáticamente el archivo [`docker-compose.yml`](file:///d:/workspace/codiredes/pz/docker-compose.yml) y creará la aplicación, mapeando de forma automática:
   * **Variables de entorno** básicas.
   * **Volumen persistente** `pz-data-volume` montado en `/home/steam/data`.
   * **Puertos de Red** (`3000` para web, y `16261`, `16262`, `8766` en protocolo UDP para el juego).
5. Ajusta los valores de las variables de entorno (como `ADMIN_PASSWORD` o `JWT_SECRET`) directamente en el archivo de Compose o desde la pestaña **Environment** de Dokploy.
6. Haz clic en **Deploy**.

---

### Opción B: Despliegue Manual con Dockerfile
Si prefieres configurar cada elemento paso a paso en la interfaz web de Dokploy:

#### 1. Crear una Aplicación
1. Ve al dashboard de Dokploy.
2. Crea una nueva aplicación conectando tu repositorio Git.
3. Asegúrate de configurar el tipo de despliegue como **Dockerfile** (Dokploy detectará el archivo [`Dockerfile`](file:///d:/workspace/codiredes/pz/Dockerfile) en la raíz automáticamente).

#### 2. Configurar Variables de Entorno
En la pestaña **Environment** de tu aplicación en Dokploy, agrega obligatoriamente:
* `ADMIN_PASSWORD`: Contraseña maestra para acceder al panel web (ej. `MiContrasenaSeguraPZ123`).
* `JWT_SECRET`: Clave aleatoria para firmar las sesiones web (ej. `un-secreto-muy-largo-y-aleatorio`).
* `SERVER_NAME`: Nombre del servidor (ej. `sobrevivientes`).
* `JVM_MIN_GB`: RAM mínima para Java (ej. `4`).
* `JVM_MAX_GB`: RAM máxima para Java (ej. `8`).
* `STEAMAPPBRANCH`: Rama de Steam (vacío para estable Build 41, `unstable` para Build 42).

#### 3. Crear y Mapear el Volumen Persistente
1. Ve a la pestaña **Volumes** (Volúmenes) en Dokploy.
2. Añade un nuevo volumen:
   * **Nombre**: `pz-data-volume`
   * **Ruta de Montaje (Mount Path)**: `/home/steam/data`
3. Guarda el volumen.

#### 4. Configurar la Exposición de Puertos (Port Mapping)
1. **Puerto del Panel de Administración (HTTP)**: Mapea el puerto `3000` del contenedor al proxy inverso de Dokploy para poder acceder mediante un dominio seguro (HTTPS administrado automáticamente con Let's Encrypt).
2. **Puertos del Juego (UDP)**: En la pestaña de **Ports** de la aplicación, expón los puertos hacia el host usando el protocolo **UDP**:
   * Mapea el puerto `16261` (UDP) del contenedor al puerto `16261` (UDP) del servidor host.
   * Mapea el puerto `16262` (UDP) del contenedor al puerto `16262` (UDP) del servidor host (direct connect).
   * Mapea el puerto `8766` (UDP) del contenedor al puerto `8766` (UDP) del servidor host (Steam Query).

#### 5. Desplegar
Haz clic en **Deploy** en Dokploy.

---

### ⏱️ Primer Inicio del Servidor
En el primer despliegue (con cualquiera de las dos opciones), el script [`entrypoint.sh`](file:///d:/workspace/codiredes/pz/entrypoint.sh) detectará que el juego no está instalado en el volumen persistente y ejecutará SteamCMD para descargarlo (~3-4 GB). Esto tomará algunos minutos dependiendo de la velocidad de red de tu VPS. Una vez finalizada la descarga, el portal web arrancará en el puerto 3000.

---

## 🎮 Guía de Uso del Portal Web

Una vez desplegado el servidor, accede al dominio HTTPS asignado por Dokploy e inicia sesión con la contraseña configurada en `ADMIN_PASSWORD`.

### Iniciar el Servidor de Juego
1. Dirígete a la pestaña **Consola y Control** (o **Parámetros Principales**).
2. Haz clic en **Iniciar Servidor**.
3. En la consola podrás ver en tiempo real la inicialización de Project Zomboid. El estado cambiará a `RUNNING` una vez que se registre la línea `Zomboid Server is running` o `RakNet startup`.

### Apagado Seguro (Graceful Shutdown)
*   **Nunca detengas el contenedor de forma abrupta** si hay jugadores conectados o si no has guardado la partida.
*   Haz clic en **Detener Seguro**. El backend enviará automáticamente el comando `save` (para guardar el estado del mundo y personajes) y luego `quit` para cerrar el servidor de forma ordenada.
*   Si el servidor se congela al cerrar, el panel aplicará un `SIGKILL` forzado de seguridad tras 45 segundos.

### Configurar el Auto-Apagado por Inactividad
1. Ve a la pestaña **Parámetros Principales**.
2. En el campo **Auto-Apagado por Inactividad (Minutos)**, ingresa el tiempo deseado (por ejemplo, `15` minutos).
3. Haz clic en **Guardar Parámetros**.
4. Si el servidor se queda con 0 jugadores activos, se iniciará una cuenta atrás visible en la parte superior derecha de la pantalla. Si un jugador entra antes de que expire el tiempo, la cuenta atrás se cancelará automáticamente.

### Instalar y Actualizar Mods
1. Consigue el **Nombre del Mod (ID Mod)** y el **Workshop Item ID** de la página de la comunidad de Steam.
2. Ve a la pestaña **Gestión de Mods**.
3. Introduce los datos y haz clic en **Agregar a la Lista**.
4. Haz clic en **Guardar Cambios de Mods** al finalizar.
5. Los mods se descargarán de forma automática la próxima vez que inicies el servidor de Project Zomboid.

---

## 🛠️ Desarrollo Local

Si deseas modificar el portal o realizar pruebas de desarrollo de forma local en tu computadora:

1. Configura tu entorno:
   * Copia el archivo `.env.example` en la raíz como `.env` para referencia general, o copia `.env.example` a `server/.env` para que Node lo cargue automáticamente.
   * Por defecto, en modo de desarrollo local el parámetro `DATA_DIR` está configurado como `../data`, lo que creará una carpeta de datos local en la raíz del proyecto para evitar escribir en rutas del sistema.

2. Instala dependencias del backend:
   ```bash
   cd server
   npm install
   ```
3. Instala dependencias del frontend:
   ```bash
   cd ../client
   npm install
   ```
4. Ejecuta el backend en modo de desarrollo (puerto 3000):
   ```bash
   cd ../server
   npm start
   ```
5. Ejecuta el frontend de Vite (puerto 3001 con proxy automático hacia el puerto 3000):
   ```bash
   cd ../client
   npm run dev
   ```
6. Abre en tu navegador `http://localhost:3001`.
