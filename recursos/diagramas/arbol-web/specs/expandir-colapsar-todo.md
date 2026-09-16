# Expandir/colapsar ramas: guardado de estado y "expandir todo" (Edición y Exploración libre)

**Ubicación de la funcionalidad:** botón de expandir/colapsar ramas de cada tarjeta, en Modo Edición (`js/edit-mode.js`) y Modo Exploración libre (`js/layout.js` + `js/renderer.js`), respaldado por `Estado.expandidos` / `Estado.alternarExpandido` en `js/state.js`.

## Comportamiento actual (para contexto)

- `Estado.expandidos` es un `Set` plano de ids de nodo. Un nodo es visible si algún ancestro suyo en la ruta hacia él está en `expandidos` (recorrido en `nodosVisibles`, `js/state.js`).
- El botón de cada tarjeta (`alternarExpandido(nodoId)`) solo agrega o quita **su propio id** del set:
  - Expandir: agrega el id → se hacen visibles los hijos directos, pero los hijos no se marcan como expandidos ellos mismos (sus propios botones siguen en "colapsado").
  - Colapsar: quita el id y llama a `olvidarExpandidosOcultos()`, que **borra del set cualquier id que deje de ser visible** — si un nieto estaba expandido, esa marca se pierde. Volver a expandir el nodo solo reabre el nivel de hijos, nunca lo que había más abajo.
- No existe hoy ningún botón que expanda o colapse un subárbol completo de una sola vez.

## Petición

- Agregar, junto al botón de expandir/colapsar existente, un **nuevo botón "expandir todo"** que expanda recursivamente el nodo y **todos** sus descendientes (no solo los hijos directos).
- El botón de colapsar **existente** debe empezar a **guardar** qué nodos internos estaban expandidos antes de colapsar, para que al volver a expandir (con ese mismo botón) se restaure exactamente esa profundidad — ejemplo: si estaban abiertos los nietos (y solo los nietos), colapsar y volver a expandir debe reabrir los nietos, no más ni menos.
- Ese mismo botón nuevo, cuando actúa como "colapsar todo", **no guarda** nada: borra el estado en vez de conservarlo. Después de usar "colapsar todo" y luego usar el botón normal de expandir, solo se abre el nivel de hijos directos, porque "colapsar todo" reinició el árbol a su estado inicial.

## Preguntas y respuestas

1. **¿El estado guardado debe persistir al recargar la página, como `expandidos`, o basta con memoria de sesión?**
   → Se pidió evaluar costo de implementación y de fluidez antes de decidir. Decisión: se persiste con el mismo mecanismo de guardado de sesión que ya usa `expandidos`/`expandidosPorRecorrido` (mismo objeto de estado, mismo ciclo de guardado). El costo adicional es un objeto pequeño más en el JSON que ya se serializa en cada `guardar()`; no es una estructura que recorra el árbol, así que no debería notarse en la fluidez. Ver "Persistencia" abajo.
2. **Al usar "colapsar todo" sobre un nodo, ¿se borra también la memoria guardada de sus descendientes, o solo la del nodo en el que se dio clic?**
   → Se borra la de **todo el subárbol**: ningún descendiente conserva memoria propia después de un "colapsar todo" sobre un ancestro suyo.
3. **¿El ícono del botón nuevo debe reflejar en vivo si el subárbol está 100% expandido (sin importar cómo llegó a estarlo), o basta con una bandera propia que el botón activa/desactiva él mismo?**
   → Bandera propia (más barata de calcular; evita recorrer el subárbol en cada render). Se confirmó de paso que el botón **existente** ya cambia de ícono según su propio estado (▸/▾) y que ese mismo patrón (ícono y texto dinámicos) debe replicarse en el botón nuevo.
4. **¿Esto aplica solo a Modo Edición o también a Exploración libre?**
   → A ambos modos. En Exploración libre (`js/layout.js`, función `parteExpandir`) se acortan las etiquetas visibles: el botón existente pasa de "▸ Mostrar ramas" / "▾ Ocultar ramas" a "▸ Expandir" / "▾ Colapsar", y el botón nuevo usa "Expandir todo" / "Colapsar todo". **Ese renombrado de texto no aplica a Modo Edición:** ahí los controles no muestran texto, solo un ícono con tooltip, y el tooltip del botón existente (`js/edit-mode.js`) se queda igual que hoy, sin cambios. Lo que sí cambia en Modo Edición es el **ícono** del botón nuevo (ver "Etiquetas e íconos" abajo), porque ahí no hay texto que diga "todo".

## Aclaraciones de implementación (decisiones tomadas)

### Estructura de estado nueva

- `Estado.ramasGuardadas`: mapa `{ [nodoId]: string[] }` con los ids de descendientes que estaban en `expandidos` en el momento de colapsar ese nodo con el botón normal.
- `Estado.expandidoTotal`: mapa `{ [nodoId]: boolean }`, la bandera propia del botón nuevo (punto 3 de las preguntas). Solo la toca ese botón, salvo la excepción indicada abajo.

### Botón existente (expandir/colapsar un nivel)

- **Colapsar** (`expandidos.has(nodoId)` → false): antes de quitar `nodoId` de `expandidos` y de correr `olvidarExpandidosOcultos()`, se calcula el subárbol de descendientes de `nodoId` que sigan en `expandidos` en ese momento (recorriendo la estructura estática del grafo, sin depender de visibilidad) y se guarda esa lista en `ramasGuardadas[nodoId]`. Si la lista queda vacía, se guarda vacía igual (ver casos límite).
  - Esto reemplaza el "olvido silencioso" que hoy hace `olvidarExpandidosOcultos()`: la limpieza del set `expandidos` se mantiene igual (sigue evitando ids fantasma), pero ya no es información perdida porque queda respaldada en `ramasGuardadas`.
  - La captura ocurre **siempre** que se colapsa con este botón, sin importar el origen de lo que estaba expandido (toggles manuales nodo por nodo, o un "expandir todo" previo). No hay lógica especial por origen.
  - `expandidoTotal[nodoId]` se apaga (`false`) al colapsar con este botón, para que el ícono no diga "colapsar todo" sobre una tarjeta que ya está colapsada.
- **Expandir** (`expandidos.has(nodoId)` → true): se agrega `nodoId` a `expandidos` (como hoy) y, si existe `ramasGuardadas[nodoId]`, se agregan también esos ids guardados a `expandidos` (filtrando los que ya no existan en el grafo — ver casos límite). La entrada de `ramasGuardadas[nodoId]` **no se borra** al restaurar: si se vuelve a colapsar sin pasar por "colapsar todo", se recalcula y sobreescribe con el estado vigente, así que queda siempre al día sola.

### Botón nuevo (expandir todo / colapsar todo)

- Aparece junto al botón existente, en todas las tarjetas donde hoy aparece el botón de expandir/colapsar (mismas condiciones — no se agrega condición extra como "solo si tiene nietos"; si el nodo no tiene más que hijos directos, "expandir todo" equivale a un expandir normal).
- **Expandir todo:** se calcula el conjunto completo de descendientes de `nodoId` en el grafo (recursivo, siguiendo `salidas`, con un `Set` para no duplicar en convergencias) y se agregan todos esos ids más `nodoId` a `expandidos`. Se pone `expandidoTotal[nodoId] = true`. No toca `ramasGuardadas`.
- **Colapsar todo:** se quita `nodoId` y todo ese mismo conjunto de descendientes de `expandidos`. Se borra `ramasGuardadas` para `nodoId` **y para todo su subárbol** (cascada completa, punto 2 de las preguntas) — ningún descendiente conserva memoria propia después. Se pone `expandidoTotal[nodoId] = false`.
- El botón decide si actúa como "expandir todo" o "colapsar todo" mirando únicamente `expandidoTotal[nodoId]` (bandera propia, no un recorrido en vivo del subárbol — decisión de rendimiento, punto 3 de las preguntas).

### Persistencia

- `ramasGuardadas` y `expandidoTotal` se guardan y restauran con el mismo mecanismo de sesión que ya usa `expandidos`/`expandidosPorRecorrido` (mismo objeto serializado en `guardar()`/`cargar()` de `js/state.js`). A diferencia de `expandidosPorRecorrido`, no dependen del "recorrido"/modo de divulgación activo — se guardan aparte, ya que esta funcionalidad solo existe en Edición y Exploración libre.

### Casos límite

- **Ids guardados que ya no existen** (el nodo fue borrado o el árbol cambió entre el colapso y la expansión): se filtran silenciosamente al restaurar; no es un error.
- **Guardar una lista vacía es válido:** si al colapsar no había ningún descendiente expandido, `ramasGuardadas[nodoId]` queda como arreglo vacío (no se omite la clave), para distinguir "colapsó sin nada abierto debajo" de "nunca se ha guardado nada para este nodo".
- **Cambios manuales a un descendiente mientras el ancestro sigue expandido** (el usuario expande/colapsa un nieto directamente) no disparan ningún guardado por sí solos: la foto se toma únicamente cuando se colapsa el ancestro con su propio botón, así que automáticamente refleja lo último que haya hecho el usuario debajo.
- Esta funcionalidad **no** modifica el comportamiento de `expandidosPorRecorrido` (el respaldo de expansión al cambiar de modo/recorrido) ni el de `olvidarExpandidosOcultos()` cuando se invoca por otras razones (borrar una rama, cambiar de modo, etc.) — el guardado nuevo solo se dispara desde el botón de colapsar de una tarjeta.

### Etiquetas e íconos

- **Modo Exploración libre** (`js/layout.js`, función `parteExpandir`): el texto del botón **existente** pasa de `▾ Ocultar ramas` / `▸ Mostrar ramas` a `▾ Colapsar` / `▸ Expandir`. Se agrega un botón hermano con el texto `Expandir todo` / `Colapsar todo`.
  - Este renombrado queda automáticamente acotado a este modo porque `parteExpandir` solo se invoca cuando `contexto.divulgacion === 'exploracion'` — es la condición que ya protege sus dos únicos puntos de llamada en `componerCuerpoPregunta` (`js/layout.js`). Para cualquier otro recorrido, incluida Edición, esta función nunca se ejecuta.
- **Modo Edición** (`js/edit-mode.js`): el control de expandir/colapsar de esta vista no pasa por `parteExpandir` en absoluto — es una función aparte, `pintarPie`, dentro de `edit-mode.js`. Por eso el renombrado de arriba no lo toca de ningún modo. El tooltip del botón **existente** (`tooltipDeControl`, `tipo === 'rama'`) no cambia — sigue diciendo `tUI('mostrarRamas', 'Mostrar ramas')` como hoy, sin volverse dinámico. El botón **nuevo** sí necesita tooltip propio, dinámico según `expandidoTotal`: `Expandir todo` / `Colapsar todo`.
- **Ícono del botón nuevo (ambos modos, especialmente crítico en Edición):** no debe ser una simple duplicación del triángulo del botón existente (`▸▸`/`▾▾`) — tiene que leerse como una acción distinta a simple vista, sobre todo en Edición, donde no hay texto que lo aclare y el único diferenciador es el ícono. Se usa un ícono de **dos chevrons apilados/empalmados** (el mismo lenguaje visual que usan la mayoría de los árboles y acordeones para "expandir/colapsar todo": apuntando hacia abajo para "expandir todo", hacia arriba para "colapsar todo").
  - Se dibuja como **trazos SVG** (`crearSVG('path', ...)`), no como carácter Unicode: el botón existente sí usa un glifo de texto (`▸`/`▾` vía `textoSVG`) porque es un triángulo simple con soporte universal, pero el proyecto ya evita depender de glifos para íconos menos comunes — la papelera (`pintarPapelera`) y el resize (`pintarResize`) en `edit-mode.js` están dibujados a mano con `path` (`M 6 7 H 16 ...`), precisamente para no depender de qué tan bien renderice cada fuente/sistema un carácter poco común. Un doble chevrón sigue el mismo criterio: dos polilíneas cortas apiladas con un pequeño espacio entre ellas, igual de simples de dibujar que el ícono de resize.
- Claves de i18n sugeridas (agregar en `js/i18n.js` y su contraparte en `js/traducciones-en.js`): `colapsarRamas` / `expandirRamas` (para el botón existente en Exploración libre, en reemplazo de `ocultarRamas` / `mostrarRamas`) y `colapsarRamasTodo` / `expandirRamasTodo` (para el tooltip/texto del botón nuevo en ambos modos). Conservar las claves viejas si se usan en algún otro lugar no cubierto por esta especificación, para no romper esas vistas.

## Corrección posterior: íconos de ambos botones (antes de implementar)

Al preparar la implementación se detectó una contradicción en la sección "Etiquetas e íconos" de arriba: dice que el ícono nuevo aplica "ambos modos" pero al mismo tiempo da por hecho que el botón **existente** se queda con su glifo de texto (`▸`/`▾`) sin cambios. Se consultó al respecto y la respuesta corrigió el planteamiento original:

> "La especificación tiene ese error y es grave. Lo que buscamos es que el icono de ambos cambie. La idea es poner iconos con un muy buen diseño y que armonicen con el tema del sitio. Necesita ser un buen diseño. Por otro lado, en ambas vistas (Edición y libre) deben tener iconos consistentes: el de colapsar/expandir debe ser algo como una flecha, y el de Colapsar/Expandir todo debe ser 2 flechas. El modo de exploración libre debe ser el único con texto. Ninguno debe ser solo texto."

Esto **reemplaza** los puntos de la sección anterior que asumían que el botón existente no cambiaba de ícono. Decisiones tomadas a partir de esta corrección:

- **Ambos botones, en ambos modos, se dibujan con ícono SVG** (`path`, no carácter Unicode): el existente (nivel) con un solo chevrón; el nuevo (todo) con dos chevrones apilados. Esto reemplaza también el glifo `▸`/`▾` que usaba el botón existente hasta ahora (en Exploración libre iba embebido en el propio texto del botón; en Edición era `textoSVG('▸'/'▾', ...)`).
- **Dirección consistente entre ambos íconos:** el chevrón (simple o doble) apunta hacia **abajo** cuando la acción invita a abrir ("cerrado, pulsa para expandir") y hacia **arriba** cuando invita a cerrar ("abierto, pulsa para colapsar"). Esto sustituye la rotación lateral/vertical que tenía el glifo `▸`/`▾` original (lateral cuando colapsado, hacia abajo cuando expandido): ahora el botón de nivel también rota solo entre abajo/arriba, igual que el de "todo", para que la única diferencia visual entre ambos sea el número de trazos (uno vs. dos).
- **Exploración libre es el único modo con texto** junto al ícono — en ambos botones (`▾/▸ + "Expandir"/"Colapsar"` y `doble chevrón + "Expandir todo"/"Colapsar todo"`). El texto del botón existente pierde la flecha Unicode que llevaba incrustada (ya no hace falta: el ícono SVG la reemplaza) y usa las claves nuevas `expandirRamas`/`colapsarRamas` con textos simples (`"Expandir"`/`"Colapsar"`, sin flecha).
- **Edición se queda sin texto en ningún botón** (solo ícono + tooltip), tal como ya decía la especificación original para el botón nuevo; ahora aplica igual al existente, que ya no mostraba texto de por sí.
- El tooltip del botón **existente** en Edición sigue sin cambios, tal como decía la especificación (`tUI('mostrarRamas', ...)`, estático). El tooltip del botón **nuevo** es dinámico y se completó con una segunda línea descriptiva (`ramasTodoDesc`), siguiendo el mismo patrón de dos líneas (`<h4>`+`<p>`) que ya usan los demás tooltips de controles de Edición.
- Corrección menor de ubicación: las cadenas en inglés de estas claves se agregaron directamente en el bloque `en` de `js/i18n.js` (junto a sus equivalentes en español), no en `js/traducciones-en.js` — ese archivo es el caché de traducción del *contenido* del árbol (posturas/preguntas), no de los textos de interfaz.
- Implementación de los chevrones: función compartida (duplicada, no un módulo nuevo, para no introducir una abstracción extra) `dChevron(cx, cy, apuntaArriba)` / `dChevronDoble(cx, cy, apuntaArriba)` en `js/renderer.js` (para Exploración) y en `js/edit-mode.js` (para Edición), ambas generando un `path` `d="M … L … L …"`.
- `Estado.alternarExpandidoTotal(nodoId)` (nueva función en `js/state.js`) implementa "expandir/colapsar todo", apoyada en `Arbol.descendientesDeNodo(grafo, nodoId)` (también nueva: el conjunto completo de descendientes de un nodo, memoizado por grafo, factorizado desde la función ya existente `descendientesPorNodo`, que antes calculaba lo mismo pero solo devolvía el tamaño). `alternarExpandido` (botón existente) usa la misma función para calcular, al colapsar, qué descendientes seguían expandidos y guardarlos en `ramasGuardadas[nodoId]`.
- `alExpandirTodo` (app.js) reutiliza el mismo comportamiento de encuadre de cámara que `alExpandir`: al terminar de expandir todo, la vista se centra en el nodo y su subárbol.

## Iteración 2: correcciones tras probar en el navegador

La primera implementación de la corrección anterior tenía varios problemas que solo se vieron al probar en un navegador real. Quedan documentados aquí, con la palabra del usuario como referencia de cada uno.

### Diseño de los íconos: geometría real de Lucide, no improvisada

> "Los iconos son sumamente feos. La idea era utilizar iconos oficiales de alguna librería."

El primer intento calculaba el chevrón a mano (`M(cx-r,cy-dy) L cx (cy+dy) L(cx+r,cy-dy)` con `r=4.5, dy=3`), lo cual se veía torpe. Se reemplazó por la geometría exacta de los íconos `chevron-down` / `chevrons-down` de [Lucide](https://lucide.dev) (MIT): dos cadenas `d` fijas en la rejilla de 24×24 de esa librería (`M6 9l6 6 6-6` para el sencillo; `M7 6l5 5 5-5M7 13l5 5 5-5` para el doble), posicionadas con un solo `transform: translate(cx,cy) scale(s, ±s) translate(-12,-12)` — la dirección (arriba/abajo) se logra invirtiendo el signo de la escala vertical, sin recalcular puntos. Esto **no** carga la librería ni agrega ninguna dependencia: es literalmente la misma cantidad de código que el trazo a mano que reemplaza, solo que las coordenadas vienen de un ícono real en vez de inventadas. `stroke-width` pasa de un valor arbitrario a `2` (la convención de Lucide en su rejilla de 24), ya que el `transform` lo escala junto con la geometría. Funciones renombradas: `dChevron`/`dChevronDoble` (iteración 1) → `chevronD`/`chevronTransform` (en `js/renderer.js` y `js/edit-mode.js`, duplicadas en ambos archivos como ya se documentó arriba).

### Orden de los botones en Edición: «todo» a la derecha, no a la izquierda

> "Los iconos de expandir todo deberían ir a la derecha (eso es lógico, no sé cómo se te pudo ir), como está en modo libre."

Era un descuido de la iteración 1: en Edición (`js/edit-mode.js`, `pintarPie`) el botón «todo» había quedado a la izquierda del botón de nivel, al revés que en Exploración libre (donde «todo» ya quedaba a la derecha desde el principio). Corregido: en Edición, «todo» ocupa ahora el extremo derecho de la tarjeta (`parte.xDerecha`, el mismo sitio donde vivía antes el único botón) y el de nivel queda a su izquierda (`xDerecha - ANCHO_ICONO_RAMA - GAP_ICONO_RAMA`).

### Exploración libre: alineación, fuente y que nunca salte de línea

> "En el modo libre, los iconos a veces, por su tamaño, hacen que salten de línea; la fuente es demasiado grande y nunca debería forzar a que el segundo botón salte de línea." / "el boton de colapsar debe de ir alineado a la izquierda y el de colapsar todo debe de ir alineado a la derecha."

- El botón de nivel queda fijo en `x: 0` (izquierda) y el de «todo» en `x: anchoInterno - anchoTodo` (siempre pegado al borde derecho de la tarjeta), en la misma fila — ya no existe la lógica de la iteración 1 que los apilaba en dos filas cuando no cabían lado a lado.
- Se agregó una fuente más chica exclusiva de estos botones, `F_BOTON_EXPANDIR` (11px, antes usaban la de 12.5px de los botones de respuesta) y se redujo el ícono de 14 a 13px, para que quepan cómodamente en la fila casi siempre.
- **Nunca saltan de línea**, ni se solapan entre sí ni con el borde de la tarjeta (ver siguiente punto): en vez de eso, el botón «todo» cede espacio (se trunca su texto) cuando no alcanza.

### Bug: el botón «todo» se salía del borde de la tarjeta

> "cuando no hay suficiente espacio, en lugar de hacer un pack() y ajustar los límites del nodo al contenido, el botón simplemente se sale de los límites del nodo (del borde del nodo), lo cual es claramente un bug."

Se evaluó ajustar el ancho de la tarjeta al contenido de esta fila (un `pack()` real), pero el ancho de las tarjetas con pregunta (`ANCHO_TARJETA`/`ANCHO_PREGUNTA`) es una constante fija de la que dependen otras partes del layout — convertirlo en dinámico es un cambio de arquitectura mucho más grande y riesgoso que lo que pide este bug. En su lugar, `js/layout.js` gana `ajustarBotonExpandir(texto, anchoDisponible)`, que trunca el texto con elipsis (`recortar`, la misma función que ya usa el resto del proyecto para esto) cuando no cabe, y calcula el ancho del botón «todo» siempre a partir del espacio que **sobra** después del botón de nivel (`restante = anchoInterno - nivel.ancho - GAP_BOTON`). Por construcción, `nivel.ancho + GAP_BOTON + todo.ancho` nunca excede `anchoInterno`: el peor caso es un botón «todo» reducido a solo el ícono, nunca uno que se salga de la tarjeta.

### Cambio de funcionalidad: «todo» ya no usa una bandera propia, sino el mismo estado que el botón de nivel

> "el boton de expandir todo no esta funcionando como la especificacion dice... vamos a cambiar la funcionalidad porque actualmente no esta cambiando de sentido cuando esta expandido todo. Lo que vamos a hacer es que si hay un hijo expandido el boton tanto de 'colapsar' como de 'colapsar todo' cambian de estado y ahora mostraran la opcion de colapsar, porque actualmente el de expandir todo nunca cambia a colapsar."

Esto **reemplaza** la decisión original del punto 3 de "Preguntas y respuestas" (arriba): ya no existe `Estado.expandidoTotal` como mapa/bandera independiente. La razón de esa bandera era evitar "recorrer el subárbol en cada render" para saber si estaba 100% expandido — pero lo que se necesita ahora es mucho más barato: **el mismo booleano que ya usa el botón de nivel**, `expandidos.has(nodoId)` (una consulta a un `Set`, sin recorrer nada), no si el subárbol entero sigue expandido. Como no se puede ver un hijo expandido sin que el nodo mismo esté en `expandidos`, esta condición ya captura exactamente "hay algo abierto debajo": si el nodo está expandido (por el botón de nivel, por «expandir todo», o por toques manuales en cualquier descendiente visible), **ambos botones** muestran "colapsar"/"colapsar todo"; si no, ambos muestran "expandir"/"expandir todo". Consecuencias:

- `Estado.alternarExpandidoTotal(nodoId)` decide su rama (expandir-todo vs. colapsar-todo) mirando `this.expandidos.has(nodoId)`, no una bandera aparte.
- Pulsar «colapsar todo» sobre un nodo que está expandido (aunque nunca se haya usado «expandir todo» sobre él, p. ej. porque se expandió a mano nivel por nivel) **colapsa todo el subárbol** — ya no hay forma de que «todo» quede "atascado" mostrando "expandir" mientras el nodo está visiblemente abierto.
- `Estado.expandidoTotal` desaparece por completo: del estado (`js/state.js`), de su persistencia (`guardar`/`cargar`), de `reiniciar()`, y de los contextos que se pasaban a `Layout.componer`/`Vista.render` en `app.js`. El campo `expandidoTotal` que reciben las partes compuestas en `js/layout.js`/`js/edit-mode.js` (para pintar el ícono) sigue existiendo como dato de paso hacia el pintado, pero ahora es siempre igual a `expandido` (el mismo valor), no un estado independiente.
- Se investigó primero si valía la pena "si acaso" el chequeo en vivo (el punto 3 original lo descartó por costo) — pero como el chequeo real que hace falta es el mismo que ya usa el botón de nivel (`expandidos.has`, O(1)), no un recorrido de subárbol, no hay ningún costo adicional: es, si acaso, más barato que mantener una bandera aparte.

### Bug de rendimiento (crítico, no introducido por esta funcionalidad, pero expuesto por ella): `reducirCruces` recontaba todo el grafo en cada intercambio

> "El expandir todo es demasiado pesado en el modo de edición; se queda alrededor de 15 segundos... la página se queda trabada después de eso." / "al parecer no solo es en la raiz, aun en un nodo que solo tiene hojas (ya desplegadas) debajo sigue tardando muchisimo."

Se instrumentó temporalmente `refrescar()` (`js/app.js`) para medir cada fase del render en vez de adivinar. El resultado (con 338 nodos visibles en Edición, contando los nodos de control `+`/nuevo eje): `total=16962ms`, de los cuales `layout=16413ms` — la medición de texto (`altoDeTexto`, `etiquetaArista`) sumaba apenas ~200ms. El segundo dato del usuario (misma lentitud expandiendo un nodo cuyos hijos ya eran hojas visibles, con el mismo total de 338 nodos) confirmó que el costo dependía del **total de nodos ya visibles en pantalla**, no de qué tan grande fuera lo que se acababa de tocar — la firma clásica de un algoritmo que reprocesa todo el grafo en cada render, sin importar el tamaño del cambio.

La causa, en `js/layout.js`: `reducirCruces` (parte del layout tipo Sugiyama que ya existía antes de esta funcionalidad, usado por *todos* los recorridos) evalúa cada intercambio candidato de dos nodos vecinos llamando a `contarCruces(segmentos,...)`, que es O(aristas²) porque compara cada par de aristas del grafo **completo**. Con ~300 aristas eso es ~90 000 operaciones por intercambio, multiplicado por cientos de intercambios candidatos (todas las filas, hasta 12 pasadas, y la función se invoca tres veces por cálculo de layout) — de ahí los ~16 segundos. Este algoritmo nunca se había estresado así porque, antes de "expandir todo" en Edición, nunca había existido una forma de dejar tantos nodos de Edición visibles a la vez (ni siquiera "árbol completo" combina con el renderizador pesado de Edición).

**Arreglo:** un intercambio de dos nodos vecinos solo puede cambiar el número de cruces de los pares de aristas que tocan a esos dos nodos — todos los demás pares quedan exactamente igual. `reducirCruces` ahora calcula, una sola vez, un índice nodo → aristas que lo tocan (`indiceSegmentosPorNodo`), y por cada intercambio candidato solo recuenta los cruces de las aristas relevantes contra el resto (`contarCrucesLocal`), ajustando el total conocido (`actual = actual - antes + después`) en vez de recontar el grafo entero. Es matemáticamente equivalente a lo que hacía antes (mismo criterio de aceptar/rechazar el intercambio, mismo resultado final) — no cambia cómo se acomoda el árbol, solo cuánto cuesta decidirlo. `contarCruces` (la versión O(aristas²) completa) se conserva para el conteo inicial único, que sigue siendo barato al hacerse una sola vez.

Se agregó una prueba de regresión en `prueba-modelo.js` ("Rendimiento: layout con el grafo casi completo") que arma el grafo de Edición con controles (~300 nodos/aristas, todos visibles) y falla si `Layout.calcular` tarda 3 segundos o más, para que este tipo de regresión no vuelva a colarse en silencio.

La instrumentación temporal en `refrescar()` (marcada `// TEMP-PERF`) sigue en el código a la espera de que se confirme la mejora en el navegador; se retira en cuanto se confirme.
