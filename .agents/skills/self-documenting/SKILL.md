---
name: self-documenting
description: "Directrices para escribir código autodocumentado mediante semántica, tipado fuerte y nombres explicativos en lugar de comentarios."
---

# Código Autodocumentado (Self-Documenting Code)

Esta habilidad establece las bases para escribir código cuya estructura, nomenclatura y tipado expliquen el *qué* y el *cómo* del software de manera inmediata, eliminando la necesidad de explicaciones en prosa.

## Directrices Clave

### 1. Semántica sobre Comentarios
El código TypeScript bien estructurado debe leerse casi como lenguaje natural.
* **Incorrecto**:
  ```typescript
  // Comprobar si el jugador puede unirse
  if (p < max && inst.status === 'RUNNING') { ... }
  ```
* **Correcto**:
  ```typescript
  const isServerAvailable = instance.status === ServerStatus.Running;
  const hasEmptyPlayerSlots = currentPlayersCount < instance.maxPlayers;

  if (isServerAvailable && hasEmptyPlayerSlots) { ... }
  ```

### 2. Tipado Fuerte y Explicativo
* Utiliza enumeraciones (`enum`) en lugar de strings sueltos o números mágicos para definir estados legibles.
  - *Incorrecto*: `status: 'RUNNING' | 'STOPPED'`
  - *Correcto*: `status: ServerStatus.Running`
* Define alias de tipos y contratos claros para que el compilador y los desarrolladores comprendan qué estructura de datos viaja por la aplicación.

### 3. Encapsulación de Condiciones Complejas
Si una condición lógica tiene más de dos operadores lógicos, extráela en una variable booleana o una función auxiliar con un nombre descriptivo:
* **Incorrecto**:
  ```typescript
  if (req.params.id && req.params.id !== 'active' && !instance.installed) { ... }
  ```
* **Correcto**:
  ```typescript
  const isValidInstanceId = instanceId && instanceId !== 'active';
  const requiresInstallation = !instance.installed;

  if (isValidInstanceId && requiresInstallation) { ... }
  ```
