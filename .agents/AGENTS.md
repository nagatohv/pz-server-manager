# Reglas del Agente (AGENTS.md)

Este archivo contiene las directrices obligatorias de diseño de software y estilo de código para cualquier Agente de Inteligencia Artificial que trabaje en esta base de código. Estas reglas se aplican rigurosamente para garantizar la consistencia, legibilidad y estabilidad del proyecto.

---

## 1. Clean Code (Código Limpio)
* **Funciones Pequeñas y Enfocadas**: Cada función debe realizar una única tarea y tener pocas líneas de código. Si una función crece demasiado, debe dividirse en sub-funciones coherentes.
* **Nombres Expresivos**: Usa nombres descriptivos, pronunciables y que revelen claramente la intención (variables, funciones, clases). Evita abreviaturas confusas.
* **Manejo de Errores Limpio**: Usa bloques `try-catch` estructurados y propaga los errores de manera oportuna a la capa correspondiente. Evita silenciar errores de forma silenciosa (bloques vacíos).
* **Consistencia en el Estilo**: Respeta el estilo de formato actual del código, utilizando imports con extensiones `.js` según lo requerido por el entorno ESM del proyecto.

## 2. Clean Architecture (Arquitectura Limpia)
El proyecto está estructurado en tres capas principales. Las dependencias deben apuntar únicamente hacia adentro:
1. **Domain (Dominio)**: Contiene los puertos, entidades e interfaces base (ej: `IPzInstanceService.ts`). No depende de frameworks, bases de datos o librerías externas.
2. **Adapters (Adaptadores)**: Implementa la lógica de negocio y mapea los puertos a tecnologías concretas (ej: servicios como `PzInstanceService.ts` y repositorios como `PzInstanceRepository.ts`).
3. **Frameworks / Web (Infraestructura)**: Capa externa donde residen los servidores HTTP (Express, Websockets), configuraciones y el cliente frontend (React/Vite).

*Cualquier interacción entre capas debe realizarse a través de la inyección de dependencias utilizando los puertos e interfaces del Dominio.*

## 3. Principios SOLID
* **S (Single Responsibility)**: Cada clase, componente y módulo debe tener una sola razón para cambiar.
* **O (Open/Closed)**: Las entidades de software deben estar abiertas para su extensión, pero cerradas para su modificación (ej: uso de enrutadores estratégicos).
* **L (Liskov Substitution)**: Las clases hijas deben poder ser sustituidas por sus clases padre o interfaces sin alterar el comportamiento esperado.
* **I (Interface Segregation)**: Diseña interfaces pequeñas y específicas en lugar de interfaces masivas de múltiples propósitos.
* **D (Dependency Inversion)**: Depende de abstracciones (interfaces/puertos) y no de implementaciones concretas. Inyecta siempre los servicios o repositorios en sus constructores.

## 4. Self-Documenting Code (Código Autodocumentado)
* **Semántica sobre Comentarios**: La estructura del código, los nombres de los métodos y las variables deben explicar el *qué* y el *cómo* del código de forma inmediata.
* **Legibilidad**: Prefiere estructurar condiciones complejas en variables booleanas con nombres autoexplicativos en lugar de escribir párrafos de comentarios explicativos.

## 5. Patrones GoF (Gang of Four)
Utiliza patrones de diseño establecidos para resolver problemas arquitectónicos comunes de manera limpia:
* **Strategy / Factory**: Para enrutar acciones a implementaciones específicas del juego de forma dinámica (ej: despacho multijuegos).
* **Repository**: Para el acceso y almacenamiento persistente de datos de forma desacoplada de la lógica del negocio.
* **Adapter**: Para adaptar llamadas de APIs externas o comandos del sistema operativo (`spawn`) a las firmas requeridas por nuestro Dominio.

## 6. Zero Hardcode (Cero Código Duro)
* **Cero Cadenas Mágicas**: Ninguna ruta, número mágico, comando, URL o mensaje del sistema debe escribirse directamente en el código de ejecución.
* **Uso de Archivos de Configuración**: Todos los valores constantes deben residir en:
  - [`../server/src/config/constants.ts`](../server/src/config/constants.ts) para rutas del backend, códigos HTTP, puertos por defecto y nombres físicos de archivos del juego.
  - [`../server/src/config/errorCodes.ts`](../server/src/config/errorCodes.ts) para el catálogo de **códigos de error tipados** (`ERR_*`) que el backend devuelve en `res.json({ code, error })`. Estos códigos son consumidos por el cliente y traducidos vía `i18n`.
  - [`../server/src/config/strings.ts`](../server/src/config/strings.ts) para los **mensajes en español** que el backend loguea y envía como `fallback` en las respuestas de error.
  - [`../client/src/config/constants.ts`](../client/src/config/constants.ts) para rutas de endpoints (`API_*`), intervalos de refresco y constantes de navegación del frontend.
  - [`../client/src/config/env.ts`](../client/src/config/env.ts) para variables de entorno del cliente (`API_BASE`, `WS_URL`, `APP_NAME`).
  - [`../client/src/i18n/locales/`](../client/src/i18n/locales/) (`en.json`, `es.json`) para **todos los textos visibles al usuario** del frontend. Se accede vía `useTranslation()` en componentes o `translate()` en `../client/src/utils/i18n.ts` para código no-React.
  - [`../client/src/utils/apiError.ts`](../client/src/utils/apiError.ts) es la **única pieza** que sabe cómo mapear un `code` del backend a una cadena traducida (`i18n.t('errors.<code>')`) con fallback al campo `error`.

## 7. Zero Documenting Code (Cero Comentarios Redundantes)
* **Evita Comentarios Inline**: No escribas comentarios línea por línea que repitan lo que el código TypeScript ya describe con claridad.
* **Excepción**: Se permiten comentarios JSDoc únicamente en las firmas de los puertos (interfaces en la capa de Dominio) para describir la API pública y el propósito general del contrato. El código de implementación debe ser 100% autodocumentado.

## 8. Desarrollo Guiado (TDD, BDD y SSD)
* **TDD (Test-Driven Development)**: Escribe y ejecuta primero pruebas unitarias o de integración que fallen (fase roja), implementa el código justo para pasar (fase verde) y refactoriza bajo pruebas.
* **BDD (Behavior-Driven Development)**: Estructura los casos de prueba con escenarios de negocio legibles siguiendo la sintaxis `Dado (Given) - Cuando (When) - Entonces (Then)`.
* **SSD (System Sequence Diagrams)**: Utiliza diagramas de secuencia Mermaid para validar el flujo e interacciones entre servicios o capas antes de escribir código.

## 9. Verificación de Instrucciones del Agente y Cobertura Mínima
* **Autocomprobación del Agente**: El Agente de IA tiene la obligación estricta de revisar, verificar y validar de forma reflexiva todas las instrucciones recibidas en cada turno de ejecución. Una tarea **no se considera completada** si no se satisfacen rigurosamente todos los requisitos y directrices establecidos.
* **Cobertura Mínima del 80%**: Cada archivo TypeScript nuevo o modificado debe contar con una cobertura de pruebas unitarias o de integración de **al menos el 80%** de sus líneas y ramas lógicas. Ejecuta localmente `npm run test` para garantizar este estándar antes de concluir.
* **Corrección Proactiva de Malas Prácticas**: Si al abrir, examinar o modificar un archivo existente se identifica alguna mala práctica de desarrollo (como cadenas de texto o números mágicos en duro, comentarios inline redundantes, funciones excesivamente largas, acoplamiento inadecuado o violaciones de los principios SOLID), el agente tiene la obligación de **corregir de forma proactiva dicha mala práctica de inmediato** en ese mismo archivo.

## 10. Evitar Desbordamientos de Buffer en Procesos Spawneados
* **Modo Silencioso en Comandos CLI**: Al invocar utilidades de sistema (tales como `zip`, `unzip`, etc.) mediante `spawn` en directorios que contengan gran cantidad de archivos o datos, se debe usar siempre la opción silenciosa (ej: `-q`, `-rq`, `-oq`) para prevenir que el flujo de salida estándar (`stdout`) sature y desborde el buffer del proceso hijo, lo cual congelará el proceso indefinidamente y causará caídas por timeout.

## 11. Estilos y Presentación (CSS)
* **Prohibición de Estilos en Línea (Inline Styles)**: Bajo ninguna circunstancia se deben escribir estilos en línea (`style={{...}}`) en los componentes de React, a menos que sea un cálculo puramente dinámico que dependa de variables de estado de React que cambien de forma continua (ej. porcentaje de progreso, posición arrastrada).
* **Centralización de Estilos**: Los estilos del frontend se organizan así:
  - **Design tokens y mixins globales**: [`../client/src/styles/`](../client/src/styles/) — `_tokens.scss` (colores, radios, fuentes, espaciados), `_mixins.scss` (helpers reutilizables), `_reset.scss`, `_typography.scss`, `_animations.scss`.
  - **Entry point global**: [`../client/src/styles/main.scss`](../client/src/styles/main.scss) importa `App.css` para mantener compatibilidad visual histórica y luego define las reglas globales (`.alert`, `.filters-bar`, `.search-input`, `.table`).
  - **Estilos por componente**: cada organismo/molécula/átomo con estilos propios usa un archivo `.scss` hermano (ej: `Header.scss` junto a `Header.tsx`, `AlertModal.scss` junto a `AlertModal.tsx`).
  - **Clases descriptivas**: usar nombres semánticos en kebab-case (`.filters-bar__group`, `.search-input__clear`).
* **Sin Colores en Duro**: Nunca utilices valores hexadecimales (`#38bdf8`), `rgb`, `rgba` o palabras clave de color de forma dura en el código TSX o CSS. Emplea siempre las variables CSS de paleta definidas en `_tokens.scss` (ej: `var(--color-primary)`, `var(--border-radius-sm)`, etc.). Cuando se necesite un valor SCSS (no CSS runtime), importar `@use '@/styles/tokens' as t;` y usar `t.$primary`, `t.$bg-card`, etc.
