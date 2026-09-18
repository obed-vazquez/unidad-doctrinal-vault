# CLAUDE.md — `recursos/diagramas/arbol-web/`

Este archivo define **cómo se documentan** las funcionalidades nuevas y los cambios de este proyecto (el visor interactivo del árbol de posturas y creencias). No contiene especificación de ninguna funcionalidad en particular — eso vive siempre en `specs/`.

## Regla general

Ninguna funcionalidad nueva ni cambio de comportamiento se implementa sin un archivo de especificación en `specs/`, ya sea nuevo o una sección agregada a uno existente. Este `CLAUDE.md` **no** es el lugar para especificar features: solo indica el proceso a seguir.

## Mapa de `specs/` (qué es cada archivo)

- **`ESPECIFICACION.md`** — especificación maestra/arquitectónica: modelo de datos, topología del grafo, principios técnicos generales. Se actualiza solo ante cambios estructurales o de arquitectura, no para el detalle de una feature puntual.
- **`requirement.md`** — bitácora histórica del levantamiento de requerimientos original. Ya no se edita; es un registro, no un documento vivo.
- **`modo-edicion.md`** / **`modo-edicion-mejoras.md`** — especificación del Modo de Edición. Se sigue ampliando: nuevas peticiones se agregan, y debajo de cada una se documentan las decisiones de implementación que la precisan.
- **`modo-cuestionario.md`**, **`definición-creencias-opcionales.md`**, **`pruebas-creencias-opcionales.md`** — especificaciones de otras features/modos puntuales, mismo criterio: un archivo por feature.
- **`{N}a-iteracion.md`** — registros históricos de iteraciones completas de trabajo. Se puede seguir esta numeración para iteraciones grandes, pero para una feature concreta se prefiere un archivo con nombre propio (ver abajo).
- **`6a-8a-iteraciones.md`** — las iteraciones 6ª a 8ª, juntas en un archivo porque son anteriores a que cada iteración tuviera el suyo. Mismo contenido y formato que los `{N}a-iteracion.md`: bugs y mejoras de esa tanda, mezclados. (Antes se llamaba `bugs-y-cambios.md`, un nombre genérico que no decía de qué hablaba.)
- **`pipeline-de-datos-y-pruebas.md`** — bitácora del camino documento fuente → JSON (`scripts/convertir_posturas_creencias.py`) y de la suite `prueba-modelo.js`. No es una funcionalidad del visor, sino los cimientos de los que dependen todas las vistas.

## Cuándo crear un archivo nuevo vs. ampliar uno existente

- **Feature o modo nuevo, o un cambio lo bastante grande como para consultarse después por separado:** archivo nuevo en `specs/`, nombrado en español, minúsculas y guiones (ej. `modo-cuestionario.md`, `expandir-colapsar-todo.md`).
- **Cambio o bug sobre una feature que ya tiene su archivo:** se agrega como sección nueva dentro de ese mismo archivo (ver "Cambios de especificación" abajo), no en uno aparte.
- **Bug del convertidor, de los datos generados o de la suite de pruebas:** va en `pipeline-de-datos-y-pruebas.md`, aunque se haya descubierto trabajando en otra feature.
- **Bug o ajuste menor que no pertenece a ninguna feature documentada ni al pipeline:** se abre el archivo de la iteración en curso (`{N}a-iteracion.md`) y se agrega ahí.

## Formato de un archivo de especificación

Seguir el patrón ya usado en `modo-edicion-mejoras.md` y `requirement.md`:

1. **Petición / Cambios** — qué se pidió, cerca de las palabras de quien lo pidió.
2. **Preguntas y respuestas** (si hubo preguntas aclaratorias antes de implementar) — se conservan como parte del documento; evitan volver a discutir algo ya resuelto.
3. **Aclaraciones de implementación / Decisiones tomadas al implementar** — decisiones concretas para cada caso límite, sin modificar el texto de la petición original: solo lo precisan.

## Cambios de especificación (cuando algo ya implementado cambia)

Cuando una funcionalidad ya documentada cambia (nuevos requisitos, revisión de comportamiento después de entregada), se agrega una sección nueva al final del mismo archivo (por ejemplo `## Cambios posteriores` o `## Iteración N`), igual que hace `6a-8a-iteraciones.md` con sus iteraciones numeradas. No se reescribe ni se borra una decisión anterior en silencio: si una decisión nueva reemplaza una vieja, se dice explícitamente en la sección nueva.
