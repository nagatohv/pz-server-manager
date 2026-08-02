---
name: gof-patterns
description: "Uso de patrones de diseño del Gang of Four (GoF) recomendados para resolver problemas estructurales y de comportamiento en la arquitectura."
---

# Patrones de Diseño GoF (Gang of Four)

Esta habilidad documenta y prescribe el uso de patrones de diseño GoF establecidos en el codebase para resolver problemas recurrentes de desacoplamiento, inyección y asignación de responsabilidades.

## Patrones Clave en el Proyecto

### 1. Patrón Strategy & Factory (Estrategia y Fábrica)
* **Propósito**: Despachar y enrutar dinámicamente comportamientos o acciones basadas en condiciones de ejecución (ej: el tipo de juego seleccionado).
* **Aplicación**: Utilizado en [`MultiGameProcessControlService.ts`](file:///d:/workspace/codiredes/pz/server/src/adapters/services/MultiGameProcessControlService.ts) para despachar comandos de inicio, parada o log al servicio de control específico de un juego sin que el router conozca los detalles internos.

### 2. Patrón Repository (Repositorio)
* **Propósito**: Desacoplar la persistencia y lectura física de los datos de la lógica de negocio de la aplicación.
* **Aplicación**: Implementado en [`PzInstanceRepository.ts`](file:///d:/workspace/codiredes/pz/server/src/adapters/repositories/PzInstanceRepository.ts). Toda carga y guardado del registro (`registry.json`) se delega al repositorio. Si en el futuro se migra a SQLite o PostgreSQL, la lógica de negocio en `PzInstanceService` permanecerá intacta.

### 3. Patrón Adapter (Adaptador)
* **Propósito**: Adaptar la interfaz de una clase o librería externa para que coincida con las firmas y tipos requeridos por nuestro dominio.
* **Aplicación**: Utilizado para envolver llamadas asíncronas complejas de herramientas CLI del sistema operativo (como `spawn('zip')` o `spawn('unzip')`) en firmas de métodos asíncronos limpios de TypeScript que devuelven promesas controladas.

### 4. Patrón Observer (Observador)
* **Propósito**: Notificar a múltiples suscriptores sobre cambios de estado o eventos en tiempo real sin crear dependencias acopladas.
* **Aplicación**: Utilizado en los eventos de consola y WebSockets del servidor para distribuir los logs del proceso del juego a todos los clientes web conectados.
