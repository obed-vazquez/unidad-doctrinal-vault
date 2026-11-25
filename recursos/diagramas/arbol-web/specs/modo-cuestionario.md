## Modo Cuestionario

- Lo que actualmente se llama Modo Cuestionario cambiará su nombre a modo Indagatorio.
- Se generará una nueva vista y se llamará Modo Cuestionario, este modo presentará pregunta por pregunta, y mostrará al usuario tanta información como sea posible que le sea útil al usuario para responder la pregunta. El punto focal será una sola pregunta y el usuario podrá seleccionar solo una de sus respuestas.
  - Se introducirá un campo nuevo como preview del modo de `análsiis profundo` donde se mostrará la información disponible sobre el análsis de una pregunta, esto no es la implementación de la funcionalidad de `análsiis profundo` pero sí sentará un presedente para cuando se implemente la funcionalidad. Para este punto este nuevo campo ya ha sido introducido en el documento de [posturas-creencias.md](../../../posturas-creencias.md) en los nodos de Preguntas/ejes y se puede consultar su formato fuente desde allí, estos análisis se presentarán como parte de la información que el usuario puede consultar además del resto de la información con la cual el sistema ya cuenta y le presentará ordenadamente
- Es muy importante para esta implementación generar un diseño moderno y user friendly para cautivar la atención del usuario y proveer de información para que pueda tomar una decisión tocante a las preguntas que se le presentan.
- Al final del cuestionario al usuario se le presentará con un reporte donde se le mostrará Las posturas que el sistema identifico que sostiene (obtenidas del archivo fuente y presentadas en el resto de las vistas/modos) con un enfasis en la postura más específica que tubo, también se le presentará con las religiones con las que encaja su postura específica y que otras tradiciónes se le acercan a la que tiene y cuáles son sus coincidencias. La manera de presentar el reporte es libre para el implementador, pero se le anima a generar un diseño moderno, vistoso y sobre todo, útil para generar no solo conclusiónes, sino despertar curiosidad en el usuario.
- Se recomienda aprovechar al maximo el espacio de la pantalla o el tamaño de la ventana en escritorio, tomar en cuenta la compatibilidad con movil y generar un diseño armonico y visualmente agradable al usuario.
- Se establecerá este modo como el modo inicial (el primero que el usuairo verá) 


## Bugs pendientes:

- Tenemos una funcionalidad en la que al abrir el panel de creencias, las posturas y religiones de los nodos abiertos (las hojas) o del proximo ancestro deben aparecer preseleccionadas en el panel. Esto no es para todas las vistas, y funciona bien en la vista principal, pero no está funcionando en el modo/vista Limpio cuando sí debería.
- La especificación de que el número que aparece en las tarjetas se refiere al número de nodos que están colgados bajo un nodo debería aparecer como información en el tooltip de la tarjeta.
- La pregunta de ¿Jesús es Dios? Está mal traducida por el script y me imagino que está guardada así en el archivo de caché, revisa el archivo y corrige no solo esa sino cualquier inconsistencia de traduccion que te encuentres, yo también econtré: Canon Neotestamentario Pleno.
- El highlight/resaltado de los nodos con Ctrl+Click actualmente es morado, me parece que un resaltado en blanco sería mejor, quizás agregarle un poco más de brillo (no mucho) también ayudaría.
- Al Eliminar todo el arbol, debería resetear todo el estado del arbol a su estado inicial, no sé si lo hace con la estructura que el usuario crea manualmente (nodos nuevos, preguntas, etc.) pero no lo está haciendo con el resaltado de los nodos con Ctrl+Click.
- Al hacer el highlight en amarillo que hace normalmente el panel de creencias, el sistema está añadiendo un resltado morado en los nodos ya resaltados en amarillo (el mismo que se usa para el highlight de Ctrl+Click), esto no debería ser así, creo que podemos simplemente eliminar el duplicado de resaltado y dejar el amarillo como lo hacemos en el resto de las vistas..


## Cambios posteriores

### Bug: «Tradiciones que suelen tomar este camino» casi siempre vacío

**Petición.** Con «Mostrar adelantos» activo, la mayoría de las respuestas decían «Sin tradición registrada en el documento». En `posturas-creencias.md`, una tradición ubicada en un nodo abraza toda la rama: coincide con todos los nodos superiores. Por tanto, los nodos cercanos a la raíz deberían listar todas las tradiciones que se ubican debajo de ellos.

**Causa.** El cuestionario solo leía las tradiciones escritas directamente en la postura destino de cada respuesta. No recorría el subárbol, como sí lo hace el panel de detalle (`recolectarAgregado` en `app.js`).

**Decisiones tomadas al implementar.**
- Las tradiciones de una respuesta son las de su postura destino más las de todos los nodos que cuelgan de ella. Las convergencias se cuentan una sola vez.
- Se excluyen las anotaciones marcadas como nota (`is_note`) y los nombres que no figuran en `traditions_index`. Se muestran sin duplicados y en orden alfabético.
- El cálculo vive en `Arbol.tradicionesDeRespuestas(grafo, indice)` (`state.js`), junto a `pesoDeRespuestas`, y se memoriza en el grafo. Así se puede probar sin navegador (`prueba-modelo.js`, sección «Tradiciones por respuesta»).
- El reporte final del cuestionario no cambia: las «religiones con las que encaja» siguen siendo las ubicadas exactamente en la postura más específica del usuario.

**Ajuste posterior: la lista se volvió un bloque enorme.** Con la herencia de la rama, cerca de la raíz cada respuesta lista decenas de tradiciones. Petición: mostrar solo 2 o 3 renglones y, si hay más, mencionar el total.
- La lista va en su propio renglón, bajo el rótulo, cortada a 3 renglones con `line-clamp`.
- Si hay más de una tradición, junto al rótulo se muestra «({n} en total)», también oculto como adelanto.
- La lista completa queda en el `title` (visible al pasar el mouse una vez revelados los adelantos).

### Chips de «Tradiciones que encajan con tu postura» se veían mal

**Petición.** Al crecer los nombres de las tradiciones, los chips del reporte se ven muy mal: el texto se sale del chip y otros chips se vuelven enormes, de varias líneas. Que se vea lo mejor posible.

**Causa.** Cuadrícula de columnas iguales (`minmax(160px, 1fr)`) con píldoras de `border-radius: 999px`. Con dos o más líneas, las esquinas redondas cortaban el texto. Los nombres largos casi siempre lo son por un paréntesis final («Reformados/Presbiterianos (Confesión de Westminster 10.3)»).

**Decisiones tomadas al implementar.**
- El paréntesis final se muestra en una segunda línea, más chica y tenue; el nombre principal va en negrita. El nombre completo queda en el `title` y en `data-tradicion` (lo que usa «explorar»).
- Los chips se acomodan en filas con `flex-wrap` y miden lo que su contenido, en lugar de ocupar columnas iguales; el ancho máximo es el del contenedor y el texto parte palabras si hace falta (`overflow-wrap: anywhere`).
- Radio de 12px en lugar de 999px: los nombres cortos se siguen viendo como píldora y los de dos líneas, como tarjeta, sin texto cortado.
- Solo cambian estos chips del reporte; el «Sostenida por» de la ficha de postura (enlaces separados por `·`) no se tocó.

**Rediseño (reemplaza las decisiones anteriores de esta sección).** La versión de dos niveles también se veía mal: dos tamaños y pesos de letra dentro de cada chip, una fuente más grande que la del resto del reporte, y chips de alturas desiguales (unos «gordos», otros chicos). Petición: rediseñarla.
- Ya no son chips: es una lista compacta en columnas (`auto-fill, minmax(230px, 1fr)`), con filas de un renglón y todas de la misma altura.
- Una sola fuente y un solo tamaño (0.86rem, como el resto del texto del reporte). El nombre va en semi-negrita; el paréntesis sigue en el mismo renglón tras «·», en color tenue.
- Lo que no cabe se corta con «…»; el nombre completo queda en el `title`.
- Viñeta dorada a la izquierda; al pasar el mouse, borde de acento y fondo dorado suave. Cada fila sigue siendo el botón que explora la tradición en el árbol.

### «Tradiciones cercanas»: puntaje ilegible y sección confusa

**Petición.**
1. La leyenda «Coincidencias en el camino» aparece pegada al nombre de la tradición.
2. Algunos puntajes salen como `7.714285714285714/13 (59%)`, junto a otros limpios como `10/16 (63%)`.
3. «Tradiciones que encajan con tu postura» y «Tradiciones cercanas» suenan a lo mismo; lo que se quiere decir es «otras tradiciones que se acercan, además de las que encajan exactamente».
4. ¿Los decimales vienen de la certeza con que se respondió? Si es así, está bien y debe seguir afectando; si no, hay que meterlo.

**Preguntas y respuestas.**
- *¿Los decimales vienen de la certeza?* Sí, ya estaba implementado: cada respuesta coincidente vale `nivel / 7` (ver el comentario de `NIVELES_CERTEZA`). El problema era solo de presentación: se mostraba el valor ponderado crudo como si fuera un conteo.

**Decisiones tomadas al implementar.**
- `coincidenciasTradicion` devuelve además `coinciden`, el conteo entero. Se muestra «{n} de {total} respuestas coinciden · afinidad {pct} %». El conteo es entero y la afinidad sigue ponderada por la certeza, como antes. El orden y el umbral de inclusión (`comunes < 2`) no cambian.
- El nombre va en su propia línea y el conteo debajo (`.quiz-cercana-cabecera`).
- Título: «Otras tradiciones afines» (en: «Other related traditions»), con una frase debajo que dice que no sostienen exactamente la postura, pero comparten parte de las respuestas, y que la afinidad pondera según la certeza.
- Si no hay ninguna, mensaje propio: «Ninguna otra tradición del documento comparte suficientes respuestas contigo.» Antes reusaba el de la sección de arriba («…sostiene exactamente esta postura»), que ahí no tenía sentido.

### Tradiciones al 100 % aparecían como «afines» y no como «encajan»

**Petición.** En un reporte, «Otras tradiciones afines» listaba Pentecostalismo con «17 de 17 respuestas coinciden · 100 %», y todas las demás también al 100 %, mientras «encajan con tu postura» solo mostraba unas pocas.

**Causa.** «Encajan» solo contaba las tradiciones anotadas en las posturas *más específicas* del usuario (la postura nombrada más cercana a cada hoja). Quedaban fuera las anotadas en posturas intermedias que el usuario sí alcanzó (p. ej. Gracia Resistible, que tiene preguntas debajo) y las anotadas en posturas sin nombre (`?`), que se saltaban hacia el ancestro nombrado. Todas esas caían en «afines» aunque coincidieran en todo su camino.

**Decisiones tomadas al implementar.**
- Encaja toda tradición cuyo camino completo coincide con las respuestas del usuario (`coinciden === total`, conteo entero). Equivale, por la regla del documento, a estar anotada en alguna postura que el usuario alcanzó.
- La certeza no decide si encaja: si las respuestas coinciden, encaja aunque haya habido dudas. La certeza solo pondera la afinidad de las parciales.
- Orden en «encajan»: primero las anotadas en las posturas más específicas (como antes); después, las demás, de camino más largo a más corto y luego alfabético.
- «Afines» queda solo para coincidencias parciales (menos del 100 %), con el mismo umbral y orden que antes.

### Mejoras del reporte (2026-11-24)

**Petición.** Sugerencias para mejorar el reporte; se pidieron todas:
1. En «afines», mostrar en qué preguntas difiere cada tradición.
2. Agrupar «encajan» por postura.
3. Destacar las tradiciones a una sola respuesta de distancia, ligado a los puntos de duda.
4. Copiar o compartir el resultado.

**Decisiones tomadas al implementar.**
- La comparación usa `Busqueda.coincidencia` (ver `pipeline-de-datos-y-pruebas.md`, «Tradiciones en posturas repetidas y en convergencias»), que en una convergencia elige la rama que más coincide con el usuario y devuelve las diferencias.
- **Encajan, agrupadas:** un grupo por postura alcanzada donde el documento anota la tradición, con su cuenta. Primero las posturas más específicas; después las demás. Las posturas sin nombre se titulan «Postura sin nombre: «¿pregunta?» → respuesta». Si no se encuentra la postura (p. ej. con el panel de creencias), el grupo es «Otras posturas de tu recorrido».
- **A una respuesta de distancia:** sección nueva, después de «encajan». Tradiciones que coinciden en todo su camino salvo en una pregunta que el usuario sí respondió (y al menos 2 coincidencias). Muestra la pregunta, «Su respuesta: … · la tuya: …» y «aquí dudaste» si el usuario marcó duda en esa pregunta. Máximo 5, de camino más largo a más corto. Salen de «afines» para no repetirlas; si no hay ninguna, la sección no aparece.
- **Afines:** bajo el conteo, «Difieren en: «¿…?», «¿…?» y N más» (hasta 2 preguntas).
- **Copiar enlace:** botón junto a «Repetir cuestionario» que copia la URL actual (ya lleva el recorrido en `?path=`). Confirma con «Enlace copiado» durante 2 s; sin portapapeles disponible, muestra la URL para copiarla a mano.