# Tabla comparativa de posturas sobre el origen del texto bíblico

**Contenido de referencia:** [`recursos/definiciones/posturas-origen-texto-biblico.md`](../../../definiciones/posturas-origen-texto-biblico.md)
**Ubicación del módulo:** `recursos/diagramas/tabla-inspiracion/`

## Qué se pide

- Una página independiente que permita **explorar** la tabla de 10 posturas × 21 criterios, no solo leerla: elegir qué posturas se comparan, qué criterios se ven, cuáles se quedan fijos al desplazarse y dónde están las diferencias reales.
- El obstáculo no es el volumen de datos: son 210 celdas. Es que cada celda es una oración, la tabla no cabe en ninguna pantalla y, al desplazarse a la derecha, se pierde de vista de qué postura se está leyendo.
- La página es autónoma: se abre con doble clic, funciona sin conexión y no se publica todavía.

## Contenido

El contenido es el del archivo de referencia y debe coincidir con él celda por celda. Las 10 posturas conservan el orden de ese archivo, que no es alfabético: recorre la rejilla de ejes (Plenaria/Limitada × Verbal/Conceptual × Mecánica/Orgánica) y deja al final las dos posturas que quedan fuera de la teopneustia.

Como el contenido vive dentro de la propia página, el archivo de referencia no lo alimenta: sirve para verificar que lo publicado no se desvió. Cualquier corrección doctrinal tiene que aplicarse en los dos lugares.

Las secciones «Ejes de la clasificación» y «Pregunta diagnóstica» del archivo de referencia forman parte de la página: el lector necesita saber qué significan las columnas de eje y qué se le está preguntando en la columna de respuesta diagnóstica.

## Lo que el usuario debe poder hacer

### Elegir qué posturas compara

- Prender y apagar cada una de las 10 posturas por separado.
- Prender y apagar todas de una sola vez, para poder partir de cero e ir sumando una por una.
- Saber en todo momento cuántas posturas está viendo.
- Si apaga todas, la página se lo dice y le ofrece volver.

### Filtrar por los ejes de la clasificación

- Filtrar por los valores de Prefijo, Alcance, Objeto y Método: por ejemplo, quedarse solo con las posturas plenarias y verbales.
- Los valores elegidos dentro de un mismo eje suman (Plenaria **o** Limitada); los de ejes distintos restringen (Plenaria **y** Verbal).
- Este filtro y la lista de posturas conviven, y el usuario debe entender en todo momento qué posturas está viendo y por qué (ver *Decisiones abiertas*).

### Elegir qué criterios ve y cuáles se quedan fijos

- Ocultar y mostrar cualquier criterio, salvo el nombre de la postura, que es lo que identifica la fila y siempre se ve.
- Prender y apagar criterios por grupos temáticos, no solo uno por uno.
- Fijar a la izquierda los criterios que quiera, para que no se pierdan al desplazarse horizontalmente. El encabezado también permanece visible al desplazarse en vertical.
- Fijar criterios nunca debe dejar el área desplazable sin espacio utilizable: si lo fijado no cabe, la página lo impide o lo advierte.

La agrupación temática de los 21 criterios es la siguiente (**propuesta, sujeta a revisión doctrinal**):

| Grupo | Criterios |
|---|---|
| Ejes | Prefijo, Alcance, Objeto, Método |
| Obra de Dios sobre el autor | Acción del Espíritu sobre el autor, ¿Comunica contenido nuevo?, Origen de las palabras, Origen del contenido, Papel de la personalidad del autor, Sujeto de la acción divina |
| Consecuencias sobre el texto | ¿El texto es Palabra de Dios?, Inerrancia implicada, Revelación proposicional, ¿Dentro de la teopneustia?, ¿Nivela la Biblia con otros escritos? |
| Diagnóstico | Diferencia respecto de otros creyentes, ¿Algo ajeno del autor en lo afirmado?, Respuesta a la pregunta diagnóstica |
| Recepción | Atestiguación |
| Síntesis | Descripción |

### Voltear la tabla

- Poder invertir la orientación: los criterios pasan a ser filas y las posturas, columnas. Con 21 criterios contra 10 posturas, comparar dos o tres posturas se vuelve una lectura vertical y deja de hacer falta el desplazamiento horizontal.
- En la vista volteada lo que se fija a la izquierda son posturas, y lo que se oculta o muestra siguen siendo criterios.
- Voltear no pierde nada: las posturas elegidas, los criterios ocultos y el resto de ajustes siguen aplicando al volver.

### Ver dónde están las diferencias

- Con dos o más posturas visibles, distinguir a simple vista los criterios en los que todas coinciden de aquellos en los que difieren.
- Poder quedarse solo con los criterios en los que hay divergencia, ocultando aquellos en los que todas las posturas visibles dicen lo mismo.
- Dos posturas coinciden en un criterio cuando el texto de la celda es idéntico; no hay equivalencias interpretadas.

### Leer celdas que son oraciones

- Por defecto la tabla se ve compacta: las celdas largas se recortan a unas pocas líneas y se pueden abrir para leerlas completas.
- Un conmutador pasa a vista cómoda, donde todo el texto se ve sin recortar.
- Los criterios cuyo valor es una etiqueta corta que se repite entre posturas —«Respuesta a la pregunta diagnóstica» (No / Matizada / Sí), «¿Dentro de la teopneustia?» (Sí / No) y «Atestiguación» (Amplia / Moderada / Escasa / Histórica)— se muestran como etiquetas distinguibles por color, para poder recorrer esa columna de un vistazo.
- El corte entre las ocho posturas de inspiración y las dos que quedan fuera de la teopneustia se marca visualmente. El usuario no reordena las filas.

### Leerla en su idioma

- La página está en español e inglés, con el idioma seleccionable y reproducible por parámetro.
- La traducción alcanza tanto la interfaz como el contenido de las 210 celdas. El origen de ese texto en inglés está por decidir (ver *Decisiones abiertas*).

### Leerla en el teléfono

- Por debajo de cierto ancho la tabla deja de ser tabla y cada postura se presenta como una ficha con sus criterios apilados.
- Los filtros siguen disponibles, y los criterios ocultos tampoco aparecen en las fichas.

### Volver a la misma vista y compartirla

- Todo lo que el usuario ajusta —posturas visibles, criterios visibles, criterios fijos, orientación, densidad, solo-diferencias e idioma— se refleja en la dirección de la página.
- Un botón de compartir discreto copia esa dirección.
- Al volver a abrir la página sin dirección compartida, se recupera el último estado usado.

## Entrega

- Página autónoma: se abre directamente en el navegador, sin instalación, sin paso de compilación y sin conexión. Los datos viven dentro de la propia página.
- Coherente visualmente con el árbol de posturas, con tema oscuro y claro conmutables.
- Todavía no se publica. Cuando se publique tendrá que salir junto al árbol, porque el árbol va a referenciarla, y el flujo de publicación del repositorio enumera las rutas a copiar una por una: una ruta nueva no se publica hasta agregarla ahí.

## Criterios de aceptación

Verificables mirando la página:

1. Las 10 posturas y los 21 criterios coinciden celda por celda con el archivo de referencia, en el mismo orden.
2. Apagar todas las posturas y volver a prender tres deja exactamente esas tres, en el orden del documento.
3. Filtrar por Plenaria y Verbal deja dos posturas; agregar Mecánica deja una.
4. Desplazarse hasta el extremo derecho de la tabla mantiene visibles los criterios fijados y el nombre de la postura; desplazarse hacia abajo mantiene visible el encabezado.
5. Ocultar un grupo temático completo y volver a mostrarlo devuelve las mismas columnas en el mismo lugar.
6. Voltear la tabla y volver a voltearla deja la vista igual que antes de voltear.
7. Con dos posturas visibles, el modo solo-diferencias oculta los criterios donde ambas dicen literalmente lo mismo y no oculta ningún otro.
8. En vista compacta ninguna fila supera el alto declarado para esa vista, y abrir una celda recortada muestra el texto completo del archivo de referencia.
9. Copiar la dirección compartida y abrirla en una ventana limpia reproduce la vista exacta: mismas posturas, mismos criterios visibles y fijos, misma orientación, misma densidad y mismo idioma.
10. Cambiar a inglés traduce interfaz y contenido, y la dirección compartida conserva el idioma.
11. Reducir la ventana al ancho de un teléfono convierte la tabla en fichas por postura, respetando los criterios ocultos.
12. La página abierta con doble clic, sin servidor y sin conexión, funciona igual que servida.

## Fuera de alcance

- Publicar la página y enlazarla desde el árbol de posturas.
- La convivencia con la tabla de cinco columnas de `tipos-de-inspiracion-biblica.md`.
- Exportar a CSV, Markdown o imagen, e impresión.
- Buscador de texto sobre el contenido.
- Editar el contenido desde la página.
- Reordenar las filas por criterio.

## Decisiones abiertas

1. **Origen del texto en inglés.** El árbol genera su versión en inglés con traducción automática. Aquí eso produciría resultados inservibles con frases como «De especie: es un acto único e irrepetible». Recomendación: redactarlo a mano y guardarlo junto al español.
2. **Cómo conviven el filtro por ejes y la lista de posturas.** Recomendación: que marcar valores de eje reescriba la selección de posturas —es decir, que los ejes sean un atajo para seleccionar y no un segundo filtro independiente—, de modo que siempre haya una sola respuesta a «qué estoy viendo» y el usuario pueda afinar después postura por postura.

### Decisiones tomadas al implementar

Ambas recomendaciones de arriba fueron confirmadas por el usuario antes de implementar:

1. El inglés de las 210 celdas y de la interfaz se redactó a mano (no traducción automática) y vive embebido junto al español en `js/datos.js` y `js/i18n.js`.
2. Marcar un valor de eje en el panel de filtros **reemplaza** la selección de posturas visibles por las que cumplen los ejes marcados (unión dentro de un eje, intersección entre ejes). No es un filtro persistente: no se guarda en la URL ni en el estado; solo la selección de posturas resultante se guarda y se comparte. El usuario puede seguir afinando la selección postura por postura después de usar el atajo.

Además, para que "fijar a la izquierda" tenga sentido en ambas orientaciones (ver "Voltear la tabla"), se mantienen dos listas de fijado independientes y persistentes: criterios fijados (para la orientación normal) y posturas fijadas (para la orientación volteada). Cambiar de orientación no descarta ninguna de las dos.

## Cambios posteriores

### Rediseño de la interfaz y controles en el encabezado

El panel lateral de filtros con casillas de verificación se retiró. Todos los controles viven ahora sobre la tabla: las posturas se prenden y apagan con pastillas que llevan un nombre corto derivado de los ejes (`Plenaria · Verbal · Mecánica`), los ejes son controles segmentados, y el mostrar u ocultar criterios vive en un menú flotante con interruptores.

Ocultar y fijar una columna se hace desde su propio encabezado, con botones que aparecen al apuntarla. Esto reemplaza —no complementa— las casillas del panel para esas dos acciones; el menú flotante sigue siendo el camino para reponer un criterio ya oculto.

La coincidencia y la divergencia se señalan por color: **verde cuando todas las posturas visibles dicen literalmente lo mismo en ese criterio, rojo cuando difieren**, con franja y punto en el encabezado (en la vista volteada, al costado de la etiqueta de fila) y una leyenda en la barra de vista. Sigue valiendo que la comparación es por texto idéntico, sin equivalencias interpretadas.

### Ancho de columna ajustable

Cada columna —incluida la de identidad— se puede ensanchar o angostar arrastrando el borde derecho de su encabezado. El ancho queda fijo: se guarda junto al resto del estado, viaja en la dirección compartible y se recupera al reabrir. Una columna con ancho fijado muestra un tercer botón en su encabezado, junto al de fijar y el de ocultar, que la devuelve a su ancho automático. Los anchos se guardan por orientación, igual que el fijado: los de criterio aplican a la vista normal y los de postura a la volteada.

### La pregunta diagnóstica sale de la página

La sección «Pregunta diagnóstica» se quitó de la guía de la página. Esto revisa lo dicho en *Contenido*, donde se pedía que tanto «Ejes de la clasificación» como «Pregunta diagnóstica» formaran parte de la página: solo la primera se conserva. La columna «Respuesta a la pregunta diagnóstica» sigue estando en la tabla, y el texto de la pregunta sigue viviendo en el archivo de referencia.

### El contenido sale del código y pasa a un archivo de datos

El contenido dejó de vivir embebido entre el código de la página. Ahora está en `datos/tabla-inspiracion.js`, único archivo de datos y fuente de verdad, que se edita a mano. Lleva tanto las celdas como **la clasificación de la tabla**: los grupos temáticos, qué columnas son de etiquetas y con qué tono de color se pintan, los valores de cada eje y qué posturas quedan fuera de la teopneustia. Un bloque `esquema` dentro del propio archivo documenta qué hace la página con cada propiedad. Eso mueve al dato decisiones que antes estaban repartidas entre el CSS y el JS: por ejemplo, el color de una etiqueta ya no depende de su identificador, sino de su `tono`.

Todo el contenido del archivo es JSON válido salvo la primera línea, que lo asigna a `window.TABLA_DATOS` para poder cargarlo con una etiqueta `<script>`. La extensión no es `.json` porque un `.json` solo se puede leer con `fetch`, y `fetch` queda bloqueado al abrir la página con doble clic —`file://` es un origen opaco—, lo que obligaría a mantener dos copias del mismo contenido: el JSON y un gemelo ejecutable. El visor del árbol sí vive con esa duplicación, porque su JSON se genera desde un Markdown; aquí, donde el archivo se edita a mano, una sola copia evita que la página servida y la abierta con doble clic puedan mostrar datos distintos. GitHub Pages sirve el `.js` como cualquier otro recurso estático, así que la decisión no afecta a la publicación.

### Las columnas fijadas se mueven al frente

Fijar una columna ahora la traslada junto a la de identidad, y la fila de grupos muestra ese tramo inicial bajo el rótulo «Fijadas». Antes las columnas se quedaban en su posición original y solo se clavaban al llegar a ellas al desplazarse, con las columnas intermedias pasando por debajo: fijar una columna lejana no se sentía como fijarla. Esto precisa el criterio 4, que sigue cumpliéndose.

### El modo «solo diferencias» explica cuándo no tiene efecto

Con las diez posturas a la vista no hay un solo criterio en el que todas coincidan, así que el modo no ocultaba nada y parecía roto. El botón muestra ahora una pastilla con cuántos criterios ocultaría, la oculta cuando no hay ninguno, y al pulsarlo en ese caso avisa en vez de no hacer nada. El comportamiento del filtro no cambió.

### El panel de celda muestra la postura completa

Al pulsar una celda, el panel ya no muestra solo ese valor: presenta la ficha completa de la postura, con los veinte criterios agrupados por bloque temático —incluidos los que estén ocultos en la tabla— y resalta el criterio de la celda pulsada, desplazándose hasta él.

### Publicación

La página ya se publica, con lo que deja de aplicar el primer punto de *Fuera de alcance*. Se agregó su ruta al flujo `deploy-pages.yml` (disparador y copia), publicando solo `index.html`, `css/` y `js/` — `specs/` es documentación interna y no se copia. En la portada del sitio aparece bajo una sección «Complementos», con una tarjeta deliberadamente más discreta que las de los recursos principales. Enlazarla desde el árbol de posturas sigue pendiente.
