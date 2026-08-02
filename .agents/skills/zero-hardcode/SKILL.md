---
name: zero-hardcode
description: "Reglas para evitar código duro (hardcoding) mediante centralización de configuraciones, constantes y cadenas de traducción."
---

# Zero Hardcode (Cero Código Duro)

Esta habilidad prohíbe escribir cadenas de texto mágicas, números fijos, URLs, rutas de red o comandos del sistema operativo directamente en los archivos de ejecución y lógica de negocio.

## Directrices Clave

### 1. Centralización de Constantes y Configuración
Todos los valores estáticos del sistema deben definirse en los archivos correspondientes:

* **Servidor (Backend)**:
  - [`server/src/config/constants.ts`](file:///d:/workspace/codiredes/pz/server/src/config/constants.ts): Contiene nombres de rutas de la API, códigos de estado HTTP, puertos por defecto, y nombres de archivos de configuración física del juego.
* **Cliente (Frontend)**:
  - [`client/src/config/constants.ts`](file:///d:/workspace/codiredes/pz/client/src/config/constants.ts): Define rutas endpoints, intervalos de refresco y variables globales de navegación.

### 2. Diccionarios de Mensajes y Textos Traducidos
Cualquier mensaje, etiqueta de botón, notificación o texto visible al usuario o consola debe extraerse a los archivos de internacionalización/cadenas:

* **Servidor (Backend)**:
  - [`server/src/config/strings.ts`](file:///d:/workspace/codiredes/pz/server/src/config/strings.ts): Alberga los mensajes de error de la API, warnings del servidor y respuestas de la consola.
* **Cliente (Frontend)**:
  - [`client/src/config/strings.ts`](file:///d:/workspace/codiredes/pz/client/src/config/strings.ts): Contiene todos los textos que renderizan los componentes de React.

### 3. Excepciones de Puertos y Comandos
* No uses cadenas directas al instanciar puertos o rutas.
* Si el sistema necesita invocar un binario externo (ej: `zip`, `unzip`, `steamcmd`), las rutas y argumentos por defecto deben obtenerse a través de la configuración del repositorio o constantes globales del sistema.
