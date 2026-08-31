# Casos de prueba: creencias opcionales y cambios de recorrido

Documento de QA alineado con [definición-creencias-opcionales.md](definición-creencias-opcionales.md). Cada paso indica qué debe verse, qué no debe verse y qué persiste después de la acción.

Buena parte de estos casos está automatizada en `prueba-creencias.js`, que se ejecuta con `node prueba-creencias.js` desde `recursos/diagramas/arbol-web/`. Los pasos marcados con **(auto)** los cubre ese archivo; el resto es verificación manual, porque dependen del color, del encuadre de la cámara o de pulsar con el ratón.

Al final, las decisiones que se tomaron sobre los puntos que la definición dejaba abiertos y el estado de la implementación.

---

## Glosario

| Término | Significado |
|---|---|
| **Resaltado amarillo** | El resaltado que el panel aplica a los nodos de una religión marcada. Temporal: vive mientras el panel esté abierto. |
| **Camino dorado** | El camino destacado desde la raíz hasta una postura marcada. También temporal. |
| **Apertura del panel** | Lo que el panel deja abierto mientras está desplegado. No son respuestas del usuario: se suman a las reglas del recorrido solo para dibujar, no se guardan y desaparecen al cerrar el panel. |
| **Rama fijada** | La rama que queda abierta de forma permanente tras pulsar `Explorar` o `Explorar todas`. Sobrevive al cierre del panel y a los cambios de recorrido. |
| **Vista previa del cuestionario** | El nodo-pregunta que el cuestionario muestra cuando hay posturas marcadas y el panel está abierto: aquel cuyos ancestros estarían desplegados en las demás vistas. |
| **Estado base** | El estado de un recorrido con el panel cerrado, sin resaltado, sin camino dorado y sin apertura del panel. Las ramas fijadas sí forman parte del estado base. |

### Secciones del panel de creencias

| Sección | Contenido | Botón `Explorar` |
|---|---|---|
| Controles del panel | Buscador, «Modo compacto», «Limpiar selección» y **`Explorar todas`** | — |
| **Selección activa** (arriba) | Ficha de cada religión y de cada postura marcada | **Sí**, y solo junto a las **posturas** |
| Listado de religiones | Checkboxes para marcar y desmarcar | No |
| Listado de posturas | Checkboxes para marcar y desmarcar | No |

### Efectos del panel abierto con selección activa

| Tipo de selección | Efecto en el árbol | En el recorrido `cuestionario` |
|---|---|---|
| Religión | Resaltado amarillo sobre el camino que lleva a su postura, y apertura hasta esos nodos. | **Deshabilitada.** Los checkboxes de religiones quedan inertes y la selección se suelta al entrar. |
| Postura | Camino dorado desde la raíz hasta la postura, y apertura por esa ruta. | El lienzo está oculto, pero el cuestionario **sí** muestra la vista previa de esa postura. |

La apertura **suma**, no sustituye: cada recorrido sigue aplicando su propia regla sobre las preguntas que el panel abre. Por eso el indagatorio conserva sus hermanos atenuados y el limpio sigue enseñando una sola rama por pregunta.

Con varias posturas marcadas se unen sus rutas y, en las preguntas donde se contradicen, prevalece la de la primera. Como el árbol es de decisión, dos posturas distintas siempre se contradicen en alguna pregunta, así que la unión abre ramas incompatibles a la vez. Esa es la razón de que `Explorar todas` esté deshabilitado en el cuestionario.

### Panel abierto en el cuestionario

Siempre que el panel esté abierto en `cuestionario`, las opciones **no aceptan clic**, haya o no algo marcado.

Si además hay una postura marcada, el cuestionario muestra su vista previa: el nodo-pregunta al que llegaría esa ruta, de modo que el usuario ve lo que abriría su selección antes de intentar responder. El formato del cuestionario no cambia; cambia qué pregunta tiene delante.

Las religiones no participan: sus controles están deshabilitados y su selección se suelta al entrar al cuestionario, porque su ruta termina en una postura concreta y mezclarla con la del usuario le plantearía preguntas de ramas opuestas.

### Cerrar el panel sin pulsar `Explorar` ni `Explorar todas`

1. Desaparece el resaltado amarillo.
2. Desaparece el camino dorado.
3. Desaparece la apertura del panel y el árbol vuelve a la expansión propia del recorrido activo.
4. En el cuestionario desaparece la vista previa: las preguntas vuelven a depender de lo que el usuario respondió, más las ramas fijadas si hubo un `Explorar` previo.
5. Los checkboxes pueden seguir marcados, pero el árbol ya no refleja esa selección. Al reabrir el panel, los tres efectos vuelven de inmediato.
6. No se borran las respuestas del usuario.
7. No se borran las ramas fijadas por un `Explorar` anterior.

### Pulsar `Explorar` sobre una postura de «Selección activa»

1. El panel se cierra.
2. Desaparecen el resaltado amarillo y el camino dorado.
3. La rama hasta esa postura **queda fijada** y permanece abierta en el recorrido activo.
4. El nodo de la postura queda seleccionado y enfocado.
5. El botón solo aparece junto a posturas de «Selección activa»; nunca junto a religiones ni en el listado general.
6. Funciona en todos los recorridos, incluido el cuestionario, y la rama queda fijada aunque el usuario no hubiera respondido esas preguntas.

### Pulsar `Explorar todas`

Lo mismo, pero para todas las posturas marcadas. **Deshabilitado en el cuestionario**, donde se muestra visible pero inerte. Disponible en el resto de recorridos.

### Expansión por recorrido

| Grupo | Recorridos | Comportamiento |
|---|---|---|
| Compartido | `indagatorio`, `limpio`, `exploracion` | Comparten la misma expansión al alternar entre ellos. |
| Separado | `cuestionario`, `completo`, `edicion` | Cada uno guarda la suya; al volver se restaura la propia. |

### Estado base de cada recorrido

| Recorrido | Qué debe verse |
|---|---|
| `cuestionario` | Cuestionario a pantalla completa, lienzo oculto. Preguntas según lo que el usuario respondió, más las ramas fijadas. Las opciones aceptan clic. |
| `indagatorio` | Solo los nodos alcanzables por las respuestas del usuario, más las ramas fijadas. Al responder una pregunta se revelan **todas** sus posturas destino, con la no elegida atenuada. Sin respuestas ni ramas fijadas: únicamente el nodo raíz «Existencia». |
| `limpio` | Solo el camino elegido por las respuestas del usuario, más las ramas fijadas. Una rama por pregunta respondida. |
| `exploracion` | La raíz, los nodos expandidos a mano en este recorrido y las ramas fijadas. |
| `completo` | Los 119 nodos del árbol. |
| `edicion` | Vista de edición con la expansión propia de ese recorrido. |

### Búsqueda en el panel

- Filtra las listas del panel. No marca checkboxes, no resalta y no abre nodos.
- Es el campo de búsqueda que ya existía; no se ha añadido un segundo campo.
- En religiones busca por nombre y alias.
- En posturas busca además por el texto de **la pregunta que lleva a la postura** y por el de **la respuesta concreta que la elige**. No por la pregunta que la postura plantea, que es la de sus descendientes.
- Ignora mayúsculas y acentos, y compara por fragmento.

### Posturas sin nombre

El panel no las lista, porque son cincuenta y todas se llamarían igual. Pero sí se buscan y se seleccionan: en cuanto hay texto en el buscador aparecen como «(sin nombre)», junto a la pregunta y la respuesta que llevan a ellas, que es lo único que las distingue entre sí. Ese par se muestra también con el modo compacto activo. Una vez marcada, la postura sigue a la vista aunque se borre la búsqueda; al desmarcarla vuelve a ocultarse.

---

## Datos de prueba

| Alias | Sujeto | Cómo se llega a él |
|---|---|---|
| **Postura A** | «Diotelitismo» | Trece respuestas desde la raíz. Entra por «Sí» a la pregunta de Getsemaní. |
| **Postura B** | «Monotelitismo / monotelismo» | Hermana contraria de la Postura A: mismo camino salvo la última respuesta. |
| **Postura C** | «Gracia Irresistible» | Dieciséis respuestas, por una rama distinta. |
| **Postura D** | «Docetismo» | Entra por «No (solo apariencia)» a «¿Jesús tuvo un cuerpo y naturaleza humana real?». |
| **Religión A** | «Nestorianismo» | Sostiene «Dualidad hipostática de Cristo», a once respuestas de la raíz. |
| **Religión B** | «Judaísmo rabínico/talmúdico» | Sostiene «Postura del Impostor», a siete respuestas, por otra rama. |

Los caminos de las dos religiones comparten sus **cuatro** primeras respuestas y divergen a partir de ahí. Todas las rutas de este árbol pasan por un punto de convergencia que vuelve ambigua una de las preguntas iniciales; es esperado y no debe reportarse como fallo.

**Reinicio.** Antes de cada caso: vaciar el almacenamiento local del visor y recargar. Debe quedar el recorrido `cuestionario`, el panel cerrado, sin checkboxes marcados, sin respuestas y sin ramas fijadas.

---

## Caso 1: religión y postura fuera del cuestionario, cambio de recorrido y cierre sin `Explorar`

| Paso | Acción | Estado esperado |
|---|---|---|
| 1.1 | Abrir la página. | Recorrido `cuestionario`. Panel cerrado. Lienzo oculto. Cuestionario en su estado base, con las opciones aceptando clic. |
| 1.2 | Cambiar a `indagatorio`. Abrir el panel. | Solo el nodo raíz visible. Sin resaltado ni camino dorado. Abrir el panel no responde preguntas. **(auto)** |
| 1.3 | Marcar la **Religión A**. | Resaltado amarillo sobre el camino que lleva a su postura, y esos nodos quedan a la vista, incluido «Dualidad hipostática de Cristo». **(auto)** |
| 1.4 | Marcar la **Postura A**. | Camino dorado desde la raíz hasta «Diotelitismo», con esa ruta a la vista. Los nodos de la religión siguen en amarillo. **(auto)** |
| 1.5 | Cambiar a `completo` sin cerrar el panel. | Todos los nodos visibles. Resaltado y camino dorado **siguen** mientras el panel esté abierto. La expansión de `indagatorio` no se aplica aquí. |
| 1.6 | Cambiar a `edicion` sin cerrar el panel. | Se restaura la expansión propia de `edicion`, no la de `completo`. Los tres efectos del panel siguen activos. |
| 1.7 | Cerrar el panel con ✕ o con el atajo `C`. **No** usar `Explorar`. | Sin resaltado, sin camino dorado y sin ningún nodo abierto por el panel. Los checkboxes pueden seguir marcados, pero el árbol no muestra la selección. |
| 1.8 | Revisar la expansión de `edicion`. | Es exactamente la que `edicion` tenía en el paso 1.6. Abrir el panel en un recorrido y cerrarlo en otro no traslada expansiones entre ellos. **(auto)** |
| 1.9 | Reabrir el panel sin tocar los checkboxes. | Los tres efectos vuelven de inmediato. |
| 1.10 | Cerrar y abrir el panel varias veces. | Mismo resultado que el paso 1.7 cada vez. No se acumulan nodos abiertos ni quedan residuos. **(auto)** |

---

## Caso 2: `Explorar` sobre una postura

| Paso | Acción | Estado esperado |
|---|---|---|
| 2.1 | En `indagatorio`, abrir el panel. | Solo el nodo raíz visible. |
| 2.2 | Marcar la **Religión A** y la **Postura A**. | Resaltado amarillo y camino dorado. |
| 2.3 | Revisar «Selección activa». | La ficha de la Postura A ofrece `Explorar`. La de la Religión A **no**. Ninguna tarjeta del listado inferior lo ofrece. |
| 2.4 | Pulsar `Explorar` junto a la Postura A. | Panel cerrado, sin resaltado ni camino dorado. «Diotelitismo» seleccionado y enfocado, con su rama fijada aunque el usuario no hubiera respondido nada. **(auto)** |
| 2.5 | Reabrir el panel. | Los checkboxes siguen marcados y vuelven los efectos. La rama fijada no se ha alterado. |
| 2.6 | Cerrar el panel. | Sin resaltado ni camino dorado. La rama fijada **sigue abierta**. **(auto)** |
| 2.7 | Cambiar a `limpio`. | Se ve el camino hasta «Diotelitismo» y la siguiente pregunta pendiente. La hermana «Monotelitismo / monotelismo» **no** se ve. **(auto)** |
| 2.8 | Cambiar a `exploracion`. | La rama fijada sigue visible: no colapsa al alternar entre `indagatorio`, `limpio` y `exploracion`. **(auto)** |

---

## Caso 3: `Explorar todas` con dos posturas de ramas distintas

| Paso | Acción | Estado esperado |
|---|---|---|
| 3.1 | En `indagatorio`, abrir el panel. Marcar la **Postura A** y la **Postura C**. | Los dos caminos dorados a la vista. **(auto)** |
| 3.2 | Observar `Explorar todas`. | Habilitado. |
| 3.3 | Pulsarlo. | Panel cerrado, sin resaltado ni camino dorado. **Las dos** ramas quedan fijadas y abiertas. |
| 3.4 | Cambiar a `limpio`. | Ambas ramas siguen presentes. La unión es contradictoria y aun así «Gracia Irresistible» es alcanzable, porque el árbol tiene un punto de convergencia. Es lo esperado. |
| 3.5 | Cambiar a `exploracion`. | Las ramas siguen abiertas. |
| 3.6 | Cambiar a `completo` y volver a `exploracion`. | La expansión de `completo` no contamina la del grupo compartido y las ramas fijadas siguen visibles. **(auto)** |

---

## Caso 4: varias religiones y recorridos compartidos

| Paso | Acción | Estado esperado |
|---|---|---|
| 4.1 | En `indagatorio`, abrir el panel. | Solo el nodo raíz visible. |
| 4.2 | Marcar la **Religión A** y la **Religión B**. | Resaltado amarillo sobre la unión de sus dos caminos. Las cuatro primeras respuestas son comunes y sus nodos se resaltan una sola vez, sin acumular efecto ni cambiar de color. Sin camino dorado. **(auto)** |
| 4.3 | Cambiar a `limpio` sin cerrar el panel. | Los nodos de ambas religiones siguen visibles y resaltados, aunque el usuario no haya respondido nada. **(auto)** |
| 4.4 | Cambiar a `exploracion` sin cerrar el panel. | Igual que el paso anterior. No se mezcla con `completo` ni con `cuestionario`. |
| 4.5 | Volver a `indagatorio`. | La misma expansión compartida. El resaltado sigue mientras el panel siga abierto. |
| 4.6 | Cambiar a `completo`. | Todos los nodos visibles, con el resaltado de ambas religiones. |
| 4.7 | Cerrar el panel. | Estado base de `completo`: árbol entero, sin resaltado y sin nodos abiertos por el panel. |

---

## Caso 5: religiones deshabilitadas en el cuestionario

| Paso | Acción | Estado esperado |
|---|---|---|
| 5.1 | En `indagatorio`, abrir el panel y marcar la **Religión A** y la **Postura A**. | Resaltado amarillo y camino dorado. |
| 5.2 | Cambiar a `cuestionario` con el panel abierto. | La selección de religiones **se suelta**: el checkbox de la Religión A queda desmarcado. La sección de religiones aparece atenuada, con sus checkboxes inertes y una nota que explica por qué. La Postura A sigue marcada. |
| 5.3 | Intentar marcar cualquier religión. | No se puede: el control no responde y no aparece en «Selección activa». |
| 5.4 | Observar el cuestionario. | Muestra la vista previa de «Diotelitismo». El formato es el de siempre; lo que cambia es qué pregunta tiene delante. Las opciones **no aceptan clic**. `Explorar todas` visible pero **deshabilitado**. |
| 5.5 | Volver a `indagatorio`. | Las religiones vuelven a estar habilitadas, pero **desmarcadas**: soltarlas en el paso 5.2 fue definitivo. La Postura A sigue marcada y su camino dorado vuelve. |

---

## Caso 6: bloqueo de respuestas en el cuestionario

| Paso | Acción | Estado esperado |
|---|---|---|
| 6.1 | En `cuestionario`, abrir el panel sin marcar nada. | Las opciones **no aceptan clic**, aunque no haya nada seleccionado. |
| 6.2 | Marcar la **Postura A**. | El cuestionario pasa a mostrar la vista previa de «Diotelitismo»: la pregunta en foco es la de esa ruta, no la inicial, y el contador de progreso lo refleja. |
| 6.3 | Desmarcar la Postura A. | El cuestionario vuelve a su pregunta de arranque. Las opciones **siguen** sin aceptar clic, porque el panel sigue abierto. |
| 6.4 | Volver a marcarla y pulsar una opción. | La respuesta no se registra: el contador no cambia y la pregunta en foco no avanza. |
| 6.5 | Cerrar el panel sin usar `Explorar`. | Las opciones aceptan clic de nuevo. La vista previa desaparece y la pregunta en foco vuelve a ser la inicial. Los checkboxes pueden seguir marcados, pero sin efecto. |
| 6.6 | Responder la primera pregunta. | La respuesta **sí** se registra y el cuestionario avanza según las respuestas reales. |

---

## Caso 7: `Explorar todas` deshabilitado y `Explorar` disponible en el cuestionario

| Paso | Acción | Estado esperado |
|---|---|---|
| 7.1 | En `indagatorio`, abrir el panel y marcar la **Postura A**. | `Explorar todas` habilitado. **(auto)** |
| 7.2 | Cambiar a `cuestionario` con el panel abierto. | `Explorar todas` **deshabilitado**, pero visible y no oculto, para que se entienda que la acción existe y aquí no aplica. **(auto)** |
| 7.3 | Pulsar `Explorar todas`. | No ocurre nada: el panel sigue abierto y no se fija ninguna rama. |
| 7.4 | Revisar «Selección activa». | La ficha de la Postura A **sí** ofrece `Explorar`: la definición inhabilita aquí solo `Explorar todas`, y su argumento —posturas contrapuestas— no aplica a una sola. |
| 7.5 | Pulsarlo. | Panel cerrado y rama de «Diotelitismo» fijada. El cuestionario acepta clics de nuevo y arranca desde el final de esa rama. |
| 7.6 | Cambiar a `indagatorio`. | La rama fijada está a la vista, sin resaltado ni camino dorado. La expansión de `cuestionario` no ha contaminado el grupo compartido. **(auto)** |

---

## Caso 8: cerrar el panel en el cuestionario sin contaminar `indagatorio`

| Paso | Acción | Estado esperado |
|---|---|---|
| 8.1 | En `indagatorio`, abrir el panel. Marcar la **Religión B** y la **Postura A**. | Resaltado amarillo y camino dorado, ambos a la vista. |
| 8.2 | Cambiar a `cuestionario` sin cerrar el panel. | El lienzo sigue oculto y no hereda lo abierto en `indagatorio`. La religión queda desmarcada e inerte. Vista previa de la postura activa. Opciones bloqueadas. |
| 8.3 | Cerrar el panel. | Cuestionario desbloqueado. La vista previa desaparece. |
| 8.4 | Cambiar a `indagatorio`. | Estado base: solo el nodo raíz. Sin resaltado, sin camino dorado y sin **ningún** nodo abierto del paso 8.1. **(auto)** |
| 8.5 | Abrir el panel. | La **Postura A** sigue marcada y su camino dorado vuelve. La **Religión B** no: se soltó al entrar al cuestionario y hay que volver a marcarla. |

---

## Caso 9: búsqueda por pregunta y por respuesta

| Paso | Acción | Estado esperado |
|---|---|---|
| 9.1 | En `indagatorio`, abrir el panel. Revisar los controles. | Hay **un solo** campo de búsqueda. |
| 9.2 | Buscar `Getsemaní`, sin marcar nada. | Aparecen exactamente dos posturas: «Monotelitismo / monotelismo» y «Diotelitismo», que son las que esa pregunta abre. **No** aparece «Diofisismo / Calcedonianismo», que es quien la formula. El árbol no cambia. **(auto)** |
| 9.3 | Buscar `getsemani`, sin tilde y en minúsculas. | El mismo resultado. **(auto)** |
| 9.4 | Con el filtro puesto, marcar la **Postura A**. | Aparece el camino dorado hasta «Diotelitismo». El filtro sigue afectando solo a la lista. |
| 9.5 | Desmarcarla y buscar `solo apariencia`. | Aparece **una sola** postura, «Docetismo», que es el destino de esa respuesta. Se indexa la respuesta que lleva a la postura, no las demás de su pregunta. **(auto)** |
| 9.6 | Buscar `El universo fue causado por un Creador`. | Aparece «Creacionismo», que es a donde lleva el «Sí» de esa pregunta. **(auto)** |
| 9.7 | Buscar `Nestorianismo`. | Aparece en la lista de **religiones**. A las religiones no se les aplica búsqueda por pregunta. **(auto)** |
| 9.8 | Buscar `xyzxyz-no-existe`. | Ambas listas vacías o con su mensaje de «sin resultados». El árbol no cambia. **(auto)** |
| 9.9 | Cerrar el panel con el filtro escrito. | El texto puede quedarse en el campo. No afecta al árbol. |

---

## Caso 10: ficha de postura con el modo compacto desactivado

| Paso | Acción | Estado esperado |
|---|---|---|
| 10.1 | En `indagatorio`, abrir el panel y desactivar «Modo compacto». Localizar la **Postura A**. | Su tarjeta muestra la pregunta de Getsemaní y la respuesta «Sí». |
| 10.2 | Localizar la **Postura D**, «Docetismo». | Muestra «¿Jesús tuvo un cuerpo y naturaleza humana real?» y la respuesta «No». |
| 10.3 | Activar el modo compacto. | Las tarjetas con nombre ocultan pregunta y respuesta y dejan solo el nombre. |
| 10.4 | Desactivarlo y localizar «Creacionismo». | Muestra «¿El universo fue causado por un Creador?» junto a «Sí». El par corresponde: ambos salen de la misma pregunta, la que lleva a la postura. **(auto)** |
| 10.5 | Localizar la **Postura C**, «Gracia Irresistible». | Muestra la pregunta que lleva a ella junto a su respectiva respuesta, no la pregunta que la postura plantea. **(auto)** |

---

## Caso 11: desmarcar creencias con el panel abierto

| Paso | Acción | Estado esperado |
|---|---|---|
| 11.1 | En `indagatorio`, abrir el panel. Marcar la **Religión A** y la **Postura A**. | Resaltado amarillo y camino dorado. |
| 11.2 | Desmarcar la Religión A. | El resaltado desaparece de inmediato, sin cerrar el panel. El camino dorado **permanece**. |
| 11.3 | Desmarcar la Postura A. | Desaparece el camino dorado y el árbol vuelve a mostrar solo el nodo raíz. |
| 11.4 | Marcar la **Postura B**. | El camino dorado llega ahora a «Monotelitismo / monotelismo». «Diotelitismo» no está en él. |
| 11.5 | Pulsar «Limpiar selección». | No queda nada marcado, sin resaltado ni camino dorado, y el árbol vuelve al nodo raíz. Ni las respuestas del usuario ni las ramas fijadas se ven afectadas. |

---

## Caso 12: «Ver en el árbol» y ubicación del botón `Explorar`

| Paso | Acción | Estado esperado |
|---|---|---|
| 12.1 | En `cuestionario`, responder las dos primeras preguntas. Panel cerrado. | Cuestionario en progreso según las respuestas reales. |
| 12.2 | Pulsar «Ver en el árbol». | Cambia a `indagatorio` con el panel cerrado. Quedan abiertos al menos los nodos-pregunta que el cuestionario tenía, y esa apertura viene de las respuestas del usuario, no del panel. |
| 12.3 | Abrir el panel y marcar la **Religión B**. Revisar «Selección activa». | Resaltado amarillo sobre su camino. Su ficha **no** ofrece `Explorar`. |
| 12.4 | Marcar la **Postura A**. Revisar «Selección activa». | Camino dorado hasta «Diotelitismo». Su ficha **sí** ofrece `Explorar`. En el listado general, ninguna tarjeta lo ofrece. |
| 12.5 | Pulsar `Explorar` junto a la postura. | Panel cerrado, sin resaltado ni camino dorado. «Diotelitismo» enfocado y su rama fijada. Las respuestas del cuestionario **siguen** registradas. |

---

## Caso 13: la rama fijada sobrevive al cuestionario

| Paso | Acción | Estado esperado |
|---|---|---|
| 13.1 | En `indagatorio`, abrir el panel, marcar la **Postura A** y pulsar `Explorar`. | Panel cerrado y rama fijada. |
| 13.2 | Cambiar a `cuestionario`. | Las preguntas pendientes son las que quedan **después** de esa rama. La pregunta en foco no es la inicial y el contador ya refleja las respuestas de la ruta fijada. **(auto)** |
| 13.3 | Abrir el panel. | Las opciones no aceptan clic. La vista previa coincide con la rama ya fijada, así que el recorrido mostrado no cambia. |
| 13.4 | Cerrar el panel. | La vista previa desaparece, pero la rama fijada permanece: la pregunta en foco sigue siendo la posterior a esa rama. Un `Explorar` previo forma parte del estado base del cuestionario. **(auto)** |
| 13.5 | Pulsar «Reiniciar» en el cuestionario. | Las respuestas del usuario se borran. Las ramas fijadas se conservan; véase la decisión D-5. |

---

## Caso 14: posturas sin nombre

| Paso | Acción | Estado esperado |
|---|---|---|
| 14.1 | En `indagatorio`, abrir el panel con el buscador vacío. | El listado de posturas no muestra ninguna «(sin nombre)». **(auto)** |
| 14.2 | Buscar `Jesús declaró ser Dios`. | Aparecen las posturas «(sin nombre)» que esa pregunta abre, cada una con la pregunta y la respuesta que llevan a ella, de modo que se distinguen entre sí. **(auto)** |
| 14.3 | Activar «Modo compacto» con la búsqueda puesta. | Las posturas con nombre ocultan su pregunta, pero las «(sin nombre)» la conservan: sin ella serían tarjetas idénticas. |
| 14.4 | Marcar una de ellas. | Camino dorado hasta su nodo. Aparece en «Selección activa» como «(sin nombre)» y con su botón `Explorar`. |
| 14.5 | Borrar el texto del buscador. | La postura marcada **sigue** a la vista en el listado, para poder desmarcarla. Las demás «(sin nombre)» desaparecen. **(auto)** |
| 14.6 | Desmarcarla. | Vuelve a ocultarse del listado. **(auto)** |

---

## Checklist global

- [ ] Panel abierto con selección: resaltado amarillo en religiones, camino dorado en posturas, y sus nodos a la vista.
- [ ] Panel cerrado sin `Explorar`: se revierten los tres efectos y el árbol queda en el estado base del recorrido activo.
- [ ] Reabrir el panel con los checkboxes marcados devuelve los tres efectos de inmediato.
- [ ] Abrir y cerrar el panel nunca modifica las respuestas del usuario ni las ramas fijadas.
- [ ] Abrir el panel en un recorrido y cerrarlo en otro no traslada expansiones entre ellos.
- [ ] El indagatorio conserva sus hermanos atenuados también cuando el panel abre la ruta.
- [ ] El limpio sigue enseñando una sola rama por pregunta.
- [ ] `Explorar` y `Explorar todas` cierran el panel, quitan los resaltados y dejan la rama abierta.
- [ ] `indagatorio`, `limpio` y `exploracion` comparten expansión; `cuestionario`, `completo` y `edicion` la guardan por separado.
- [ ] Las religiones quedan deshabilitadas y desmarcadas en el cuestionario.
- [ ] Con el panel abierto en el cuestionario y una postura marcada: vista previa y respuestas bloqueadas.
- [ ] Con el panel abierto y nada marcado: respuestas bloqueadas igualmente.
- [ ] `Explorar todas` deshabilitado en el cuestionario, habilitado en el resto.
- [ ] `Explorar` solo junto a posturas de «Selección activa».
- [ ] La búsqueda encuentra una postura por la pregunta y la respuesta que llevan a ella.
- [ ] Las posturas sin nombre solo se listan al buscar o mientras estén marcadas.
- [ ] Con el modo compacto desactivado, la ficha muestra pregunta y respuesta, y ambas son de la misma pregunta.
- [ ] «Ver en el árbol» abre `indagatorio` con los nodos-pregunta del cuestionario.

---

## Referencia cruzada con la definición

| Requisito de la definición | Casos |
|---|---|
| Religiones: resaltado amarillo y apertura hasta sus nodos | 1, 4, 11 |
| Religiones deshabilitadas en el cuestionario | 5, 8 |
| Al cerrar el panel no quedan nodos desplegados forzadamente | 1, 4, 8 |
| `Explorar` solo en las posturas ya seleccionadas | 2, 7, 12 |
| `Explorar` enfoca el nodo, cierra el panel y quita el resaltado | 2, 7, 12, 13 |
| `Explorar todas` deja las ramas abiertas en cualquier recorrido | 3, 13 |
| Responder deshabilitado en el cuestionario con el panel abierto | 5, 6, 8 |
| `Explorar todas` deshabilitado en el cuestionario | 5, 7 |
| Búsqueda por pregunta, en el campo que ya existía | 9 |
| Posturas sin nombre buscables y seleccionables | 14 |
| Respuesta en la ficha con el modo compacto desactivado | 10 |
| Expansión separada de `edicion`, `cuestionario` y `completo` | 1, 2, 3, 5, 7, 8 |
| «Ver en el árbol» abre los nodos-pregunta del cuestionario | 12 |

---

## Decisiones sobre lo que la definición dejaba abierto

- **D-1. «Deshabilitada para las religiones» en el cuestionario** significa el control, no solo su efecto: los checkboxes quedan inertes y la selección de religiones se suelta al entrar. Se optó por atenuar la sección en vez de ocultarla, para que la regla se entienda en lugar de sufrirse, y porque ocultarla dejaría al buscador señalando huecos. Casos 5 y 8.
- **D-2. El resaltado amarillo cubre la ruta completa** desde la raíz hasta la postura afiliada, no solo el nodo de la postura: sin sus ancestros el resaltado señalaría un nodo suelto sin explicar cómo se llega a él. Casos 1.3 y 4.2.
- **D-3. `Explorar` individual sí está disponible en el cuestionario.** La definición inhabilita ahí únicamente `Explorar todas`, y su argumento —posturas contrapuestas— no aplica a una sola. Caso 7.
- **D-4. La vista previa del cuestionario es intencional.** El cuestionario no cambia de formato: muestra el nodo-pregunta cuyos ancestros estarían desplegados en las demás vistas. Casos 5.4, 6.2 y 13.
- **D-5. «Reiniciar» no borra las ramas fijadas.** Borra las respuestas del usuario; lo fijado con `Explorar` es una decisión de navegación aparte. Caso 13.5.
- **D-6. La ficha muestra la respuesta escueta** —«Sí» o «No»— y no la etiqueta larga con su matiz. Es suficiente para identificar la rama.

---

## Estado de la implementación

Los seis desajustes que se detectaron al preparar estas pruebas están resueltos.

- **La expansión ya no se restaura sobre el recorrido equivocado.** El panel dejó de escribir en la expansión guardada: lo que abre se recalcula en cada repintado y no se guarda en ninguna parte, así que cerrarlo no tiene nada que devolver a su sitio. Antes se tomaba una instantánea al abrir y se restauraba al cerrar, aunque entre medias se hubiera cambiado de vista.
- **Marcar una religión abre el árbol** también en `indagatorio` y en `limpio`. Antes esos recorridos decidían qué enseñar solo a partir de las respuestas, y como las religiones no aportan ninguna, sus nodos no llegaban a verse ni, por tanto, su resaltado.
- **El buscador encuentra una postura por la pregunta que lleva a ella.** Antes se indexaba la pregunta que la postura plantea, que es la de sus descendientes, así que escribir una pregunta devolvía a quien la formula y no a las posturas que abre.
- **La ficha empareja pregunta y respuesta de la misma pregunta.** Ambas salen ahora de la misma entrada, así que no puede volver a mostrarse la pregunta de una junto a la respuesta de otra.
- **Las posturas sin nombre son buscables y seleccionables**, con la pregunta y la respuesta que las distinguen, y siguen ocultas mientras no se busquen ni estén marcadas.
- **Las religiones quedan inertes en el cuestionario**, con su sección atenuada y una nota que explica el motivo.

La lógica quedó en `js/creencias.js`, un módulo sin DOM, y en las reglas de visibilidad de `js/state.js`, que ahora aceptan la apertura del panel y dejan que cada recorrido aplique la suya. Eso es lo que permite que `prueba-creencias.js` compruebe casi todo sin navegador.

**Fuera de cobertura automática**, por depender del DOM: los colores del resaltado, el encuadre de la cámara, el bloqueo de clics en el cuestionario y el estado visual de los controles deshabilitados. Esos pasos se verifican a mano con las tablas de arriba.

**Nota sobre `prueba-modelo.js`.** Ese arnés tiene nueve comprobaciones que ya fallaban antes de este trabajo: dan por buenos un corpus de siete tradiciones y unos identificadores de nodo que el documento fuente dejó atrás hace tiempo, y hay dos sobre cruces de flechas en el trazado. No se han tocado porque quedan fuera de esta funcionalidad.
