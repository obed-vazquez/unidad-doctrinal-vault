# Convergencias (`&`): unir varias posturas a una misma pregunta

## Resumen

El árbol permite que dos o más posturas compartan la misma pregunta (`Postura A & Postura B -> ¿Pregunta?`), pero esa unión solo puede escribirse a mano en el documento fuente: el Modo de Edición no ofrece ninguna forma de crearla ni de deshacerla. Se requiere que el usuario pueda unir posturas a una pregunta existente, quitar una postura de una pregunta compartida, y distinguir a simple vista cuáles preguntas son compartidas.

## 1. Problema

En Modo de Edición el usuario puede crear preguntas, respuestas y posturas, y puede cambiar de qué postura cuelga una pregunta. No puede, en cambio, hacer que una pregunta cuelgue de dos posturas a la vez. Para lograrlo tiene que salir de la aplicación y editar el documento fuente a mano, lo que obliga a conocer la sintaxis y a regenerar el visor.

La convergencia no es un caso raro del árbol: cuando dos posturas distintas llegan al mismo punto de decisión, duplicar la pregunta bajo cada una rompe la equivalencia entre ambos caminos y multiplica el mantenimiento.

## 2. Comportamiento actual observable

- Una pregunta compartida, escrita a mano en el documento fuente, se dibuja correctamente: aparece como un nodo único con una línea entrante por cada postura, se rotula como convergencia y el panel lateral la describe.
- El punto de unión de una línea puede sostenerse y arrastrarse. Al soltarlo sobre otra tarjeta, la pregunta **cambia** de postura; al soltarlo en el vacío, se desconecta. En ningún caso se duplica.
- Las tarjetas de postura ofrecen controles para agregar una respuesta y para agregar una pregunta nueva; ninguno sirve para apuntar a una pregunta que ya existe.

## 3. Requerimientos

**R1. Unir desde la pregunta (gesto principal).** La tarjeta de la pregunta debe ofrecer un control para sumarle otra postura de origen. Al activarlo, una línea sale de la tarjeta y sigue al cursor; el usuario hace clic sobre una tarjeta de postura y la unión queda hecha. Solo las tarjetas de postura son destino válido, y deben distinguirse de las que no lo son mientras dura el gesto. La operación puede cancelarse sin dejar cambios.

**R2. Unir desde la postura.** La tarjeta de postura debe ofrecer el gesto equivalente en sentido inverso: una línea que sale de ella y se confirma con un clic sobre la pregunta con la que se desea converger. Este control existe porque la necesidad suele advertirse estando en la postura, no en la pregunta.

**R3. Unir arrastrando, con modificador.** Sosteniendo el modificador —Ctrl en Windows y Linux, ⌥ Alt en Mac—, arrastrar el punto de unión de una línea debe **copiarla** en lugar de moverla: la línea original permanece en su lugar y lo que sigue al cursor es una copia translúcida que, al soltarse sobre una postura válida, la suma como origen.

El modificador debe poder presionarse y soltarse en cualquier momento del arrastre, incluso después de haberlo iniciado, alternando cuantas veces haga falta entre copiar y mover; el estado vigente al soltar el botón del ratón es el que se aplica. Soltar una copia en el vacío no debe producir efecto alguno.

**R4. Quitar una postura de una pregunta compartida.** Debe poder hacerse de dos maneras, sin borrar la pregunta ni las demás uniones:

- arrastrando esa línea y soltándola en el vacío;
- con un control de cierre situado **en el lienzo, junto al punto de unión con la postura**. No debe vivir dentro de la tarjeta.

**R5. Uniones duplicadas.** Una misma postura no puede figurar dos veces como origen de la misma pregunta. Si el usuario mueve una línea hacia una postura que ya es origen de esa pregunta, las dos uniones se funden en una: la postura de partida deja de ser origen y la línea movida desaparece. Si intenta lo mismo copiando (R3), no ocurre nada.

**R6. Última postura.** Quitar la única postura que sostiene una pregunta deja a la pregunta huérfana, y se resuelve con el diálogo ya definido para huérfanos: eliminar, cancelar o asignar padre.

**R7. Evidencia visual permanente.** Que una pregunta sea compartida debe reconocerse sin seleccionarla ni abrir el panel: sus líneas entrantes deben distinguirse de las demás, y las posturas que participan deben mostrar que su pregunta no es exclusiva. Mirando solo una postura, hoy no hay forma de saberlo.

**R8. Conjunto visible al seleccionar.** Seleccionar la pregunta o cualquiera de sus posturas de origen debe resaltar el grupo completo —la pregunta, todas sus posturas y las líneas que las unen—, de modo que una convergencia de tres o más siga siendo legible.

**R9. Deshacer.** Crear una unión, quitarla y fundir dos uniones deben poder deshacerse con Ctrl+Z y rehacerse, como cualquier otro cambio de edición.

## 4. Fuera de alcance

- **Elegir cuál postura es la principal.** Cuando una pregunta tiene varias posturas de origen, el documento fuente la escribe anidada bajo una de ellas. Controlar cuál es queda fuera de este requerimiento; el orden se conserva tal como resulte de las operaciones anteriores.
- Todo lo que no sea el Modo de Edición. Los modos de consulta y el cuestionario ya interpretan las preguntas compartidas y no se modifican.

## 5. Restricciones

- El documento fuente ya expresa la convergencia con `A & B -> ¿Pregunta?` y no debe cambiarse: lo que se genere al guardar tiene que seguir siendo legible por el convertidor actual.
- Una pregunta compartida nunca se dibuja fusionada dentro de la tarjeta de una postura; conserva su tarjeta propia.
- No debe poder crearse una unión que haga que una pregunta descienda de sí misma.

## 6. Criterios de aceptación

1. Desde la tarjeta de una pregunta, en dos pasos (activar el control y hacer clic en una postura), la pregunta queda compartida y se rotula como tal.
2. El mismo resultado se obtiene partiendo de la tarjeta de la postura.
3. Arrastrar el punto de unión con el modificador sostenido produce una copia; sin el modificador, mueve la línea como hoy. Presionar o soltar el modificador a media maniobra cambia el comportamiento en pantalla de inmediato.
4. En Mac, el gesto con ⌥ Alt funciona y no abre menús del sistema; en Windows y Linux funciona con Ctrl.
5. Un intento inválido —una postura que ya es origen, un destino del tipo equivocado, una unión que crearía un ciclo— no modifica nada y lo comunica; el gesto sigue esperando un destino válido en lugar de cancelarse.
6. Soltar una línea en el vacío, o usar el control de cierre junto al punto de unión, quita esa postura y deja intactas las demás.
7. Al quedar una sola postura, la pregunta deja de presentarse como compartida.
8. Quitar la última postura abre el diálogo de huérfanos.
9. Recorriendo el árbol sin seleccionar nada se identifican las preguntas compartidas y las posturas que participan en ellas.
10. Ctrl+Z revierte cada una de las operaciones anteriores.
11. Lo guardado vuelve a cargarse produciendo el mismo árbol.

## Aclaraciones de implementación

Decisiones tomadas al implementar (no cambian el texto de arriba; lo precisan).

### La capa de datos ya existía

El grafo conecta una arista `'eje'` por cada postura que liste esa pregunta en su `question_axes` (`js/state.js`, `construirGrafo`): dos posturas con el mismo eje ya producían, antes de este trabajo, dos aristas entrando al mismo nodo-pregunta, sin caso especial. `js/edits.js` ya tenía `attachAxis`/`ligarEje` (aditivo e idempotente), `removeAxis`/`desconectarEje` y `rewireAxis`/`reengancharEje` (con fusión automática de duplicados). El render ya pintaba el glifo `&` y el rótulo "CONVERGENCIA" cuando una pregunta tenía más de una entrada visible. Por eso `js/edits.js` y el modelo de grafo en `js/state.js` **no se modificaron** para R1–R6, salvo agregar `Arbol.grupoConvergenciaDeSeleccion` (nuevo, para R8). Todo el trabajo de R1–R7 quedó en la capa de interacción (`js/edit-mode.js`, `js/renderer.js`, `js/app.js`) y en CSS/i18n.

### R1/R2: se reutilizó el gesto de "enlazar padre" del flujo de huérfanos

`Arbol.EditMode.iniciarEnlacePadre` (el gesto de clic-clic con preview que ya usaba "asignar padre" en el diálogo de nodo huérfano) se reutilizó tal cual para "sumar postura de origen" (tipo `'pregunta'`, ya existía) y se le agregó un tipo nuevo, `'ejePostura'`, para "converger con pregunta existente" desde la postura (no tenía análogo previo, porque el flujo de huérfano nunca necesitaba que una postura buscara una pregunta ya existente). A la validez de ambos tipos se le agregó la exclusión de "ya es origen" (`esPadreValidoEnlace`, `js/edit-mode.js`); para el caso huérfano original esa exclusión es un no-op, así que no lo altera.

Los controles que disparan el gesto viven **dentro** de la tarjeta (a diferencia del control de cierre de R4): un icono pequeño en la esquina superior izquierda de cada tarjeta (junto a la papelera, a `x=36` en vez de `x=8`), visible en hover de la tarjeta. Se usó el glifo `git-merge` de Lucide (MIT) en ambos casos (pregunta y postura), porque es la misma operación de datos (`Edits.ligarEje`) vista desde cada extremo.

### R3: acotado a `eje` + extremo `desde`

El modificador Ctrl/⌥Alt para copiar solo tiene efecto arrastrando el punto que identifica **qué postura origina la pregunta** (extremo `desde` de una arista `'eje'`); en cualquier otra combinación (aristas `'respuesta'`, o el extremo `hasta` de un `'eje'`) el modificador se ignora y el arrastre se comporta como siempre. El modo `rewire` del arrastre ya dejaba la arista original intacta en pantalla durante el gesto (solo movía una curva de preview aparte), así que "la línea original permanece en su lugar" no necesitó código nuevo — solo una clase `copia` en el preview para la translucidez.

### R4: control de cierre siempre visible, no solo en hover

El botón de cierre (`edit-quitar-eje`) se dibuja junto a cada asa de extremo `desde` de una arista `'eje'`, en la misma capa `capa-asas` (coordenadas de mundo, no dentro de la tarjeta). Se decidió que fuera sutil pero **siempre visible** (opacidad baja por defecto, completa en su propio hover) en vez de aparecer solo al pasar el mouse sobre la tarjeta, siguiendo el mismo criterio que ya usan los discos de las asas de reenganche (tampoco ocultos por defecto). Su clic llama directamente al mismo callback que "soltar en el vacío" (`alDesconectar`), así que hereda el diálogo de huérfano (R6) sin lógica adicional.

### R7: insignia de postura

La pregunta compartida ya mostraba su evidencia visual (glifo `&`, rótulo CONVERGENCIA). Lo nuevo es la insignia en la tarjeta de **postura**: se agregó la clase `postura-convergente` (borde con el color de acento de eje) cuando alguno de los `question_axes` de esa postura apunta a una pregunta con `is_convergence`, más una nota en el tooltip de la tarjeta (`Arbol.EditMode.tooltipDeNodo`, que ahora recibe `datos` como segundo parámetro para poder consultar `is_convergence`).

### R8: mecanismo nuevo, independiente de "camino"

Se evaluó reutilizar `contexto.camino` (el resaltado de ruta de creencias) pero se descartó: `camino` ya tiene su propia semántica de "atenuar lo que no está en la ruta", que entraría en conflicto con highlighting simultáneo de creencias y de convergencia. En su lugar, `Arbol.grupoConvergenciaDeSeleccion(grafo, datos, seleccionadoId)` (nuevo, en `js/state.js`) calcula el conjunto de forma independiente, y `js/app.js` lo pasa como `contexto.grupoConvergencia` **solo** cuando `Estado.divulgacion === 'edicion'` (fuera de alcance en los demás modos, según §4 de este documento). `js/renderer.js` le agrega la clase `convergencia-activa` a nodos y aristas de forma aditiva (no reemplaza `seleccionado`, `camino` ni `resaltado`).

### R9

Cada mutación nueva (`Edits.ligarEje` desde R1/R2/R3-copia) se envuelve en `conHistorial(...)`, el mismo mecanismo de snapshot completo que ya usa el resto del modo de edición — no hizo falta tocar el sistema de historial. A diferencia del flujo de huérfano, el gesto de clic-clic de R1/R2 no necesita `marcarUndo` preventivo: no hay ninguna mutación previa que revertir si el usuario cancela con Escape.

### Pruebas

Se agregó una sección `== Convergencias: attachAxis/removeAxis/rewireAxis ==` a `prueba-modelo.js` (capa de datos: suma de un tercer origen, idempotencia de duplicados, fusión al mover, detección de ciclos, y `grupoConvergenciaDeSeleccion`). La verificación interactiva de los gestos (arrastrar con modificador, clic-clic, hover del botón de cierre) no se automatizó — el costo de simular esos gestos en navegador se evaluó contra el beneficio, y quedó para prueba de aceptación manual.

## Addendum: correcciones tras la primera prueba en navegador

Lo que sigue **reemplaza** las decisiones correspondientes de la sección anterior. Queda la palabra del usuario como referencia de cada punto.

### A1. El botón de cierre aparece por cercanía del cursor, no de forma permanente

> "La x que se marca cerca del punto de la liga en la postura deberia desaparecer y solo aparecer cuando el mouse está cerca de ella (no encima, sino cuando se va acercando)."

Esto sustituye la decisión de R4 de dejarlo "sutil pero siempre visible". El control está oculto por defecto y se revela cuando el puntero entra en un radio de ~90 px de pantalla (`RADIO_PROXIMIDAD_PX`, `js/edit-mode.js`), con una transición de opacidad y escala. No basta con `:hover` de CSS: el requisito es justamente que ya esté visible **antes** de que el cursor lo pise, para poder apuntarle. Por eso se mide la distancia en `pointermove` (con `requestAnimationFrame` de por medio y solo sobre los controles que hay en `capa-asas`), y cada control guarda su centro en `data-cx`/`data-cy`.

Detalle de implementación que hacía falta para que el control **funcione** además de verse (era el bug de "la x no es interactuable"): `#capa-asas` tiene `pointer-events: none`, así que cada control tiene que reactivarlos por su cuenta — se hace junto con la revelación (`.control-lienzo.cerca { pointer-events: all; }`), de modo que solo es clickeable cuando está visible.

### A2. El gesto principal sale de la flecha, no solo de la tarjeta

> "La flecha que lleva a la pregunta debe tener un botón para crear una nueva liga hacia arriba, segun yo, esta era la funcionalidad principal."

R1 pedía el control en la **tarjeta** de la pregunta; esto lo amplía: la propia línea que entra a la pregunta lleva un botón `+`, junto al punto donde la flecha toca la tarjeta, que inicia el mismo gesto de "sumar postura de origen" hacia arriba. Es el punto de entrada principal, porque es donde se mira cuando se quiere otra línea como la que ya está. El control de la tarjeta (R1) se conserva como acceso secundario.

Los dos controles del lienzo quedan simétricos sobre la misma línea y con la misma regla de cercanía: junto al extremo de la **postura**, la `x` que quita esa unión; junto al extremo de la **pregunta**, el `+` que suma otra. El `+` reutiliza el mismo atributo `data-edit-converger` que el control de la tarjeta (con el id del nodo pregunta), así que no necesitó despacho propio.

### A3. Una convergencia recién creada tiene que verse sin recargar

> "Al unir las 2 posiciones en una pregunta (converger) lo que se dibuja son solo las lineas, no se dibuja igual que las convergencias que vienen del JSON actualmente. F5 (actualizar la pagina) corrige el problema."

Era un fallo de la caché de repintado, no del modelo. `pintarNodo` (`js/renderer.js`) salta el repintado del cuerpo de una tarjeta cuando su "firma" no cambió, y esa firma no incluía nada que se moviera al converger: ni el rótulo de la banda (`EJE` ↔ `CONVERGENCIA`), ni el título con los orígenes unidos por `&`, ni el número de líneas entrantes (del que depende el puerto `&` que se dibuja sobre la tarjeta). Se agregaron los tres a la firma. Recargar "arreglaba" el problema solo porque construía las tarjetas desde cero.

### A4. El «+» funciona como clic y como arrastre

> "me gustaría agregar a la especificacion y la funcionalidad que sea también al arrastrar el boton, cuando al boton se le de click sostenido, la animación cambiará a la que ahorita aparece al darle click, y al soltarse dentro de un nodo postura se generará la liga, si se suelta sobre espacio vacio (nada) no ocurrirá nada, será como si se le hubiese dado un click."

El control se arma al **pulsar**, no al soltar, así que el mismo botón sirve para las dos formas de trabajar sin que el usuario tenga que elegir una:

- **Clic:** pulsar y soltar sin mover deja el gesto armado, esperando el clic en la postura de destino (comportamiento de R1, sin cambios).
- **Arrastre:** mantener pulsado arrastra la misma línea de previsualización que ya aparece al armarlo. Al soltar **sobre una postura válida** la unión queda hecha; al soltar **en el vacío** no pasa nada y el gesto **sigue armado**, exactamente como si solo se hubiera hecho clic.
- Soltar un arrastre sobre un destino **inválido** (tipo equivocado, ciclo, postura que ya es origen) avisa y sigue esperando, igual que un clic inválido (AC#5).

La distinción entre «clic» y «arrastre» es el desplazamiento del puntero entre pulsar y soltar (`UMBRAL_ARRASTRE_CONVERGER`, 6 px). Como el control de la tarjeta (R1) lleva el mismo atributo, hereda el arrastre sin código aparte.

### A5. Un clic en el vacío cancela el gesto completo

> "Al dar clic en + y posteriormente en nada, actualmente sale una leyenda, Está bien mantenerla, pero deberíamos cancelar la acción completa también."

Esto **precisa** AC#5: «seguir esperando un destino válido» aplica a un **destino** equivocado (una tarjeta que no sirve), no al vacío. Un clic suelto sobre el lienzo vacío mantiene el aviso y además **cancela** el gesto. Queda acotado a las convergencias (`cancelarEnVacio` en la especificación del gesto): el flujo de nodo huérfano conserva su comportamiento, donde el vacío no cancela y solo Escape aborta.

Nótese que esto no choca con A4: soltar un **arrastre** en el vacío no cancela (es el final de un arrastre, no un clic dirigido al vacío). La secuencia completa queda así: soltar el arrastre en el vacío deja la flecha viva esperando destino, y **hace falta un clic posterior fuera de cualquier tarjeta** para que se cancele.

### A6. La «x» también en el extremo de la pregunta

> "Agreguemos también el botón de la `x` en la parte de abajo en el punto donde se une con el eje. Sería una duplicación del mismo botón, solo que aparecería al lado del `+` en la parte opuesta a la línea."

La misma «x» de R4 se repite junto al punto donde la flecha entra a la pregunta, al lado contrario del «+» respecto de la línea (el «+» a un lado, la «x» al otro). Quita la misma unión que su gemela de arriba: una unión debe poder deshacerse desde cualquiera de sus dos extremos, sin obligar a subir la vista hasta la postura. Comparte comportamiento (revelado por cercanía) y despacho con la «x» del extremo de la postura.

### A7. Los controles del lienzo no deben tragarse el destino

Los controles de `capa-asas` se dibujan **por encima** de las tarjetas, y el destino de un gesto se resuelve con `document.elementFromPoint`. Un control visible bajo el cursor al soltar devolvía el control en vez de la tarjeta, y el destino se leía como vacío. Mientras dura un gesto de ligar o de reenganchar, los controles del lienzo quedan sin `pointer-events` (`#lienzo.enlazando-padre`, `#lienzo.reenganchando`): durante el gesto no hacen falta y así no compiten por el cursor. A tener en cuenta al agregar cualquier control nuevo a esa capa.
