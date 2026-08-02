---
name: clean-code
description: "Estándares y mejores prácticas de Clean Code (Código Limpio) para estructurar código TypeScript legible y mantenible."
---

# Clean Code (Código Limpio)

Esta habilidad define las directrices para la escritura de código limpio y expresivo en el proyecto. Debe aplicarse al crear o modificar cualquier función, variable o clase.

## Directrices Clave

### 1. Funciones Pequeñas y Enfocadas
* Cada función o método debe hacer una sola cosa y hacerla bien (Single Responsibility a nivel de función).
* Limita el tamaño de las funciones a menos de 20 líneas siempre que sea posible. Si una función tiene múltiples niveles de identación o lógica mixta, extráela en funciones secundarias con nombres autoexplicativos.

### 2. Nombres con Propósito y Semánticos
* **Variables y Propiedades**: Utiliza sustantivos que describan claramente el contenido.
  - *Incorrecto*: `const d = new Date();`, `const lst = [];`, `let flag = false;`
  - *Correcto*: `const createdAt = new Date();`, `const instancesList = [];`, `let isProcessRunning = false;`
* **Funciones y Métodos**: Utiliza verbos de acción indicativos del resultado.
  - *Incorrecto*: `function process(data) {}`, `function check() {}`
  - *Correcto*: `function compressDirectoryToZip(dirPath) {}`, `function verifyAuthenticationToken(token) {}`

### 3. Manejo de Errores Limpio y Seguro
* Nunca dejes un bloque `catch` vacío. Si atrapas un error, regístralo mediante el logger o propágalo adecuadamente.
* Usa excepciones tipadas o mensajes de error descriptivos basados en el diccionario de traducciones (`strings.ts`).
* Prefiere retornar tipos predecibles o lanzar excepciones claras en lugar de devolver `null` o `undefined` sin control.

### 4. Coherencia en el Estilo del Código
* Sigue las normas de formateo establecidas (ESLint/Prettier configurado).
* En la parte del servidor (ESM), asegúrate de que todos los `import` locales utilicen la extensión `.js` de manera consistente.

### 5. Corrección Proactiva de Malas Prácticas
* Si al abrir, examinar o modificar un archivo existente se identifica alguna mala práctica de desarrollo (como cadenas de texto o números mágicos en duro, comentarios inline redundantes, funciones excesivamente largas, acoplamiento inadecuado o violaciones de los principios SOLID), el agente tiene la obligación de **corregir de forma proactiva dicha mala práctica de inmediato** en ese mismo archivo.
