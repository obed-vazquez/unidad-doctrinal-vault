## Mejoras para el modo de Edición

Cambios:
- **Las preguntas van siempre separadas**. Ahora vamos a separar siempre los nodos de Postura con los nodos de Eje (Pregunta) ya no se fusionarán los nodos de eje con un nodo de postura cuando solo tiene un eje; ahora, incluso cuando una postura tenga una sola pregunta, se verá el eje separado de la postura como ahora se muestran cuando son 2 o más.
- **Los nodos huérfanos no se eliminarán sin prompt**. Cuando el usuario Remueva una línea de uno de los nodos de manera que deje a un nodo huérfano, el sistema le mostrará un prompt de confirmación, el sistema debe preguntar si el usuario quiere eliminar el nodo, quiere cancelar la acción o quiere asignarle un padre; en caso de que el usuario de click en asignarle un padre el sistema solicitará que de un click en un nodo para ligarlo como padre, el sistema bloqueará temporalmente cualquier otra acción, modificará el icono del mouse del usuario y forzará el mouse a sostener el punto superior de la linea que une al nodo que iba a quedar huérfano hasta que el usuario de click a un nodo al que pueda unir su nodo huérfano. Si el usuario intentá asignar como padre a un nodo que no es posible (por ejemplo agregar una postura como padre de otra postura) el sistema simplemente ignorará la acción y mostrará un mensaje de error en la parte superior que desaparecerá despues de 2 segundos. Esto solo aplicará a los nodos que si tiene información o hijos, si un nodo está completamente vacío y queda huérfano, el sistema simplemente lo eliminará. 
- **Los puntos de las líneas se fijan fuera del centro**. Los puntos de las líneas (ligas) a los nodos hijos/padres deben poder moverse a lo largo del borde del nodo no solo en el centro del borde del nodo.
- Introducir la funcionalidad clásica de Ctrl+Z y Ctrl+Y. Consultar por mejores prácticas para esto y seguirlas.

## Aclaraciones de implementación

Decisiones tomadas al implementar (no cambian el texto de arriba; lo precisan).

### Preguntas siempre separadas

- **Solo en modo Edición.** Indagatorio, Limpio, Exploración, Árbol completo y Cuestionario siguen fusionando postura + único eje no convergente en una tarjeta unificada (`T:…`).
- En edición el grafo se reconstruye con ejes siempre sueltos (`B:…` + `P:…`). Los ids de las otras vistas no cambian.

### Desconectar y reenganchar

- Soltar el asa de una línea **en el vacío** desconecta esa arista.
- Reenganchar el asa a **otro nodo válido** mueve la arista.
- En ambos casos, si el nodo que pierde esa entrada queda sin padres, aplica la lógica de huérfano (abajo).
- Soltar sobre un nodo **inválido** (mismo tipo, ciclo, etc.) no desconecta: la línea vuelve a como estaba.

### Huérfanos (ya no se borran a ciegas)

Hoy, si una postura se quedaba sin entradas (ninguna pregunta derivaba hacia ella), desaparecía del árbol. Eso se sustituye por:

1. Si el nodo está **completamente vacío**, se elimina **sin** prompt.
2. Si tiene información o hijos, sale un diálogo de tres acciones: **Eliminar / Cancelar / Asignar padre**.
3. No hay «dejar como segunda raíz» ni un cuarto botón.

**Vacío, de forma estricta:**

- Postura: innominada (`?`), sin religiones ni notas, sin ejes ni hijos.
- Eje: sin texto formal ni coloquial y sin respuestas.

**Asignar padre:** modo de enlace (el navegador no puede mover el cursor del sistema). Banda elástica desde el **borde superior** del huérfano hasta el puntero; el resto de acciones bloqueadas. Escape **cancela y restaura** la línea. Clic en un destino imposible: aviso 2 s arriba y se **sigue esperando** un padre válido.

Al ligar una **postura** huérfana a una pregunta se **reutiliza la etiqueta de respuesta** que tenía hacia su padre anterior. Después el foco va al campo de esa respuesta y se **selecciona todo el texto**. No se pide texto antes ni se usa «Sí» por defecto.

### Puntos de ancla en el perímetro

- Arrastrar el asa **a lo largo del borde del mismo nodo** (todo el perímetro, lados y esquinas) **desliza** el punto de anclaje.
- Arrastrar **a otro nodo** o **lejos del borde** (vacío u otro destino) **reengancha o desconecta**.
- El offset vive **solo en memoria de esta sesión**. No se guarda en JSON, markdown ni en el borrador local. Se pierde al recargar.
- En modo edición las **líneas se dibujan por encima de los nodos** (origen y destino incluidos) para no perderlas al deslizar.

### Ctrl+Z / Ctrl+Y

- Historial de sesión (tope ~100), no persistido.
- Entra: cambios de **datos** de edición, **resize** de tarjetas y **pin/chincheta**.
- No entra: «Agregar campo» vacío (solo UI) ni cámara (pan/zoom).
- Con un campo de texto enfocado, Ctrl+Z es el del input. Al salir, un undo deshace **toda esa sesión de texto**.
- Rehacer: Ctrl+Y y Ctrl+Shift+Z.
