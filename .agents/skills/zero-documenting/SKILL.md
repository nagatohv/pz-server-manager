---
name: zero-documenting
description: "Pautas de Zero Documenting para evitar comentarios redundantes en el código y limitar los comentarios a docstrings JSDoc en interfaces públicas."
---

# Zero Documenting Code (Cero Comentarios Redundantes)

Esta habilidad prohíbe escribir comentarios inline redundantes que dupliquen o repitan lo que el código TypeScript ya expresa con claridad, garantizando una base de código limpia y autoexplicativa.

## Directrices Clave

### 1. Prohibición de Comentarios Inline que describan la Acción
* No escribas comentarios que digan "qué" está haciendo la línea de código siguiente si el código es evidente.
* **Incorrecto**:
  ```typescript
  // Aumentar en 1 la cantidad de archivos
  filesRemoved++;
  // Comprobar si la contraseña coincide
  if (password === hash) { ... }
  ```
* **Correcto**:
  ```typescript
  filesRemoved++;
  if (isPasswordCorrect) { ... }
  ```

### 2. Comentarios sobre el "Por qué" (Excepciones Permitidas)
* Solo se permiten comentarios explicativos en casos extremadamente complejos donde haya un comportamiento no evidente o un workaround técnico que no se pueda expresar mediante código estructurado.
* *Ejemplo*: Documentar por qué se utiliza `-q` en los comandos de compresión para evitar que se desborde el buffer del sistema operativo.

### 3. JSDoc en Puertos del Dominio
* **Única Excepción para Documentar Firma Pública**: Se fomenta el uso de comentarios JSDoc (`/** ... */`) exclusivamente en las firmas de puertos/interfaces del dominio (como `IPzInstanceService.ts`) para documentar el propósito del contrato y guiar al desarrollador al consumir la API pública. Las clases adaptadoras que implementan la interfaz no deben duplicar estos comentarios.
