---
name: solid
description: "Principios SOLID aplicados a clases, funciones, módulos e interfaces en TypeScript y React."
---

# Principios SOLID

Esta habilidad define cómo aplicar los principios SOLID para garantizar un código modular, mantenible y extensible en este proyecto.

## Directrices de Aplicación

### S - Single Responsibility Principle (Responsabilidad Única)
* Cada clase, componente React o módulo de servicio debe tener una única razón para cambiar.
* Si un componente React maneja fetching de datos, renderizado de layout compleja y validación de formularios, sepáralo. Usa hooks personalizados para la lógica de datos (`useBackups`, `useServerStatus`) y sub-componentes atómicos para la vista.

### O - Open/Closed Principle (Abierto/Cerrado)
* Las entidades de software deben estar abiertas para su extensión, pero cerradas para su modificación.
* **Caso de Uso del Proyecto (Soporte Multijuegos)**: En lugar de agregar condicionales de tipo `if (game === 'zomboid')` en múltiples métodos de control, implementa una interfaz común y delega a servicios especializados dinámicamente mediante polimorfismo.

### L - Liskov Substitution Principle (Sustitución de Liskov)
* Las subclases o implementaciones de una interfaz deben poder reemplazar a su tipo base sin alterar la corrección del programa.
* Si una nueva implementación de `IServerControlService` (por ejemplo, para un juego diferente) se pasa al enrutador, su comportamiento de inicio, detención y logs debe respetar las promesas y contratos esperados por la UI.

### I - Interface Segregation Principle (Segregación de Interfaces)
* Diseña interfaces del dominio pequeñas y específicas para evitar obligar a los adaptadores a implementar métodos que no necesitan.
* Separa responsabilidades amplias (ej: separar control de procesos, configuración y backups en puertos independientes como `IServerControlService`, `IPzConfigRepository` e `IPzBackupService`).

### D - Dependency Inversion Principle (Inversión de Dependencias)
* Los módulos de alto nivel no deben depender de módulos de bajo nivel; ambos deben depender de abstracciones.
* **Inyección de Dependencias**: Pasa siempre los repositorios y servicios a los controladores o enrutadores mediante sus constructores o parámetros de inicialización, en lugar de instanciarlos con `new` directamente dentro del código de ejecución.
