## Modo edición
Necesitamos generar un modo distinto al resto de las vistas de recorrido. En esta vista generaremos un modo de edición más visual de la herramienta. 

Actualmente, la herramienta ya cuenta con edición, pero son muchos pasos para hacerlo porque la herramienta no está centrada en la edición del árbol sino en su exploración y análisis. Este nuevo modo tendrá dentro del mismo árbol herramientas de edición:
- Cada nodo con pregunta tendrá como parte de sus hijos un nodo de creación de un nuevo nodo solamente con un + (símbolo de suma/más) el cual generará un nuevo nodo vacío como hijo de su padre (sería su hermano), este + sería solo un control no un nodo real en la estructura.
- Cada nodo tendrá también como parte de sus hijos un nodo de creación de pregunta/eje con un tema visual parecido al que tienen las preguntas (ejes) actualmente. Este nodo Creará no solo un nodo de pregunta, sino que tendría que extraer la pregunta del nodo "padre" para que este quedara como postura.
  - Obviamente, al tener 2 o más preguntas/ejes, el botón de creación de nodo nuevo se eliminará de su padre y pasará a estar debajo de las preguntas.
- 
- Las líneas de las preguntas y nodos deben poder reajustarse (modificar la tarjeta de origen y destino), pero obviamente no puede ir `pregunta -> pregunta` ni `postura -> postura` solo `pregunta -> postura` y `postura -> pregunta` (a menos que estén integradas en un nodo-integrado) es un cambio grande porque la estructura que genére debe reflejar el cambio.
  - Los nodos huérfanos pueden quedar como una segunda raíz. Solamente solicitar confirmación del usuario antes de dejar un nodo o rama huérfana.
  - No se permite una estructura recursiva; nodos apuntando (hacia abajo) a ancestros.
- En el nivel más inferior, deben de estar mostrados las ramas de un nodo para que despliegue el control de nuevo nodo (+)

- las tarjetas deben contar con otros botones de mostrar y ocultar ramas (no los de las otras vistas, algo más compacto) con ánimos de tener la misma funcionalidad pero ahorrar espacio en la tarjeta.
- En lugar de poner todos los campos vacíos implementaremos un signo de más (+) al final de todos los campos y lo que cause es que antes de agregar el campo el sistema preguntará qué campo (que no está ya desplegado) quiere agregar/rellnar el usuario, de esta manera, no tendremos las tarjetas llenas de campos vacíos.
    - Se identificó una sección de Notas en la generación del script, las notas no están soportadas en el sistema actual, se deben eliminar del script de generación a partir de [posturas-creencias.md](../../../posturas-creencias.md), esto con animos de que no estorbe a la especificación, solo los campos que están soportados por el archivo fuente que se acaba de indicar son los que deben aparecer para agregarse como campos a las tarjetas.
    - El botón de ocultar/mostrar ramas se colocará alineado a la derecha del fondo de la tarjeta y a la izquierda dejas el + que muestra los campos que están vacíos.
- Los títulos de los campos se mostrarán como outlined input with floating label donde aparece el título del campo en la parte superior del input.
    - En caso de que los fondos de las tarjetas difieran en tonalidad o color unos de otros, prestar atención especial a la armonización de esos colores con el fondo de las floating labels.
- Los campos que puede editar el usuario son solamente aquellos que el documento fuente ([posturas-creencias.md](../../../posturas-creencias.md)) soporta exceptuando las ligas a otros documentos Markdown (ligas internas)
- El nombre de la postura es importante que salga más "resaltada", lo primero que se viene a la mente es que sea de fuente más grande, pero la solución queda a juicio/sugerencia del implementador. Lo que sí es un problema es que es ilogico que la fuente de los titulos de las propiedades de las tarjetas sea más grande que las del título mismo de la tarjeta.
- Es necesario que salga completo el nombre/título de las propiedades de la tarjeta (porque en unas tiene elipses porque el nombre es muy grande). Se debe desplegar completo, podemos simplemente hacer sus fuentes más pequeñas para que no ocupen tanto espacio.
    - Vamos a poner alias para los títulos de algunos campos: "Tradiciones / sistemas" se va a llamar "Religiones" (estos son solo un alias, no modificar el resto de las estructuras internas, solamente como se despliegan en las tarjetas de esta vista en específico);
    - Las religiones debido a que puede tener varias las manejaremos con el uso estándar de chips.
- El nombre de la postura se verá siempre en la barra de título pero será editable. Harémos que se vea igual que como se ve en los nodos (que no se vea que es un input) pero que sea editable al dar click en él.
- Si el usuario hace Zoom-out muy lejos (en el punto en el que ya no sea legible el texto de las tarjetas, que la tarjeta cambie a mostrar solo el nombre de la postura/Pregunta Coloquial en texto más grande (para que sea legible)
  - Recordando que al hacer Zoom out, el usuario PUEDE SEGUIR Haciendo Zoom out. Eso quizás haga que se mueva el `ratio` (relación de tamaño) entre el texto ya modificado del título (postura) vs. el tamaño de la tarjeta, la solicitud es: hay que mantener la relación. Una vez que se active el título como único dato que el usuario puede ver al alejar el árbol, el texto debe mantener la relación con la tarjeta, no puede hacerse más grande que la tarjeta ni quedarse del mismo tamaño mientras que la tarjeta se hace más pequeña. La idea de que se quede solo el título es para que se vea claramente aunque el nodo esté pequeño por el Zoom out del usuario.
- Pondremos la respuesta a una pregunta como campo DE LA LÍNEA en lugar de dentro de la postura y que el usuario pueda editar ese campo en el aire solo dando click en él. Si no tiene respuesta (porque apenas lo está creando) que solo aparezca un + con fondo muy transparente y sin bordes, favor de consultar en internet el estandar para este tipo de controles, pues es estandar para líneas de unión en muchas herramientas de este estilo, deben ser cosas como: El tamaño del campo de texto de la respuesta debe ser un cuadrado un poco ancho (rectangulo al final), sin padding, sin bordes, fondo obscuro o que se blendee con el fondo de la gráfica, etc.
    - Esto traería un cambio natural en la creación de las posturas nuevas (no preguntas), sería mejor que cuando el usuario diése click en el icono de + para crear un nuevo nodo postura, que el sistema cree el nodo y luego posicióne automáticamente el foco del usuario en este campo de respuesta para que lo rellene (si es que no lo rellenó ya en algún otro lado, quizás en el futuro lo pueda rellenar desde otro lado).
- Los tooltips de información/detalle del nodo no deben de aparecer, al menos no con ese uso, es mejor que se utilice ese tooltip para mostrar información de otro estilo tocante a los campos y otras cosas de las tarjetas, quizás mostrar la información de para qué se usan los campos o qué representan, y quizás describir la estructura de los nodos compuestos de postura+pregunta, pero no para mostrar los detalles del nodo que usan otras vistas.
- los campos de texto con mucho texto nunca tendrán barra de scroll al mostrarse llenos
    - El texto en todos lados debería estar wrapped.
    - El recuadro del texto debería encompass'earlo, packaged, ajustarse al tamaño del texto y crecer, por lo tanto, la tarjeta entera tendría que hacer lo mismo.
    - Esto nos lleva a que la tarjeta debe ser resizeable, su tamaño debe ser manualmente ajustable.

- La selección de creencia debe funcionar correctamente en el modo de edición. Si se accede a una creencia el árbol debe mostrar y desplegar la ruta hasta él y al cerrar el panel dde creencias no debe replegar la(s) rama(s). 
  - Se le recuerda al implementador que estas especificaciónes son solo para el modo de Edición 
  - Se le recuerda al implementador que el abrir un nodo debe estar ligado de cierta manera a la creencia al abrir el panel de creencias, se debe tener cuidado de no romper esa funcionalidad
- Se marcará la sección de la pregunta dentro de un nodo-integrado (tarjeta-integrada) con un diseño parecido al de los ejes individuales (el tema amarillo que tienen) pero que quede como una sección interna del nodo, para representar la integración (quizas podemos ponerle un nombre/título de sección como eje integrado o pregunta integrada), con una opacidad más tenue. Es importante recordar que el diseño es primordial y que si esto hace que la tarjeta se vea mal se debe priorizar en todo momento que la tarjeta se vea profesional y apegada a estandares de diseño gráfico aún si es necesario modificar este diseñó o cancelar el punto (y cualquier otro).

- El botón de eliminar (trash) vamos a reutilizarlo para eliminar no solo las ramas sino el nodo entero.

- Accesos directos y teclado en campos de entrada de texto.
  - La tecla Escape debería desenfocar el rellenado de los campos como forma intuitiva para salir de los campos de edición.
  - Enter debe hacer algo parecido a la tecla escape, desenfocar el campo de texto y guardar
  - Hacer click fuera de un campo de texto también debería hacer que perdiera el foco.
  - Alt+Enter debe crear una nueva línea en un campo de entrada de texto











#### Pláticas posteriores con agente y bugs

El diseño de lo que tienes en las tarjetas integradas como "eje integrado", actualmente lo tienes como título, pero solo está ligado a la pregunta formal, me gustaría que fuese diferente. Quiero que el recuadro sombreado en amarillo se utilize para englobar todos los campos que son pertenecientes al eje/Pregunta. Siendo así deberían estár siempre en la parte de abajo. La leyenda de Eje Integrado debería estar no como texto dentro del recuadro que delimita esa zona sino como título de la zona utilizando el mismo patron de floating label que estámos usando en los campos, solo que para una region.

Al parecer tienes un bug en los campos con mucho texto, está calculando mal el reajuste de tamaño basado en el texto, usualmente funciona bien, pero si el  texto salta de linea por una palabra pequeña (el ultimo renglon queda con una palabra) no se ajusta bien verticalmente, corta la pabra en la parte inferior.

Espero podamos ajustar los simbolos de creación de nodos:
- el control de creación de postura nueva tiene un circulo que lo rodea, esto es correcto, pero afuera del circulo tiene un recuadro que supongo que no debería estár, me parece que si quitamos el borde el recuadro no se ve en absoluto, que es lo que buscabas claramente.
- en cuanto al control de creacion de preguntas/eje tiene varias cosas, el fondo sí es amarillo transparente pero esta detras del fondo azul del control , supongo que es mejor cambiar el fondo azul del control del circulo a amarillo, y quitar el amarillo que ya está, porque el amarillo es el fondo del recuadro y no del circulo, el recuadro que lo engloba parece que tiene un borde tambien aunque es con lineas discontinuas, supongo que querías poner esas lineas discontinuas en el circulo y no en el recuadro, verdad? porque se vería mucho mejor así, y la ultima es que tanto el borde del circulo como el `+` son de color azul, supongo que quisiste ponerlos amarillos porque se vería mejor.

el texto de las respues ahora no solo no es cuadrado sino que no calcula bien el tamaño y está cortando texto, no hay problema con que el texto se escriba en una sola línea cuando se está escribiendo en él mientras que al final (al perder el foco) quede de forma cuadrada (o cercano a cuadrado)

El resto está quedando muy bien, el unico detalle que veo es que el titulo de la secion de eje integrado "Eje integrado" tiene fondo azul sobre el fondo ddel recuadro de sección que es amarillo, está parcialmente solapado con el fondo azul de la tarjeta y ese no se ve mal pero sí se ve mal el fondo azul sobre el amarillo, no tengo idea de cómo arreglar eso, quizas poner fondo transparente y simplemente CORTAR la linea amarilla de borde de la sección? es complicado, espero sepas cual es el estandar en la industria para este problema porque debe ser recurrente.

oh, tambien se me pasó comentarte que el titulo de los recuardos de campo no cortan las líneas de borde de campos en las tarjetas eje como sí lo hace en los otros tipos de tarjetas.

Quedó bien que en los campos de respuesta ya no se comen el texto, pero noto que al final dejan una linea en blanco, desde que se renderean inicialmente aparecen 2 lineas 1 con el contenido del campo y la otra en blanco, y despues de editarla es igual. Por otro lado, el cuadro queda muy alto, debería quedar siempre un poco ancho (mas ancho que alto), esto es estandar supuse que lo sacarias en la consulta por eso no lo mencioné.

También me acano de dar cuenta que los titulos de los campos (floating labels) tienen el mmismo fondo que las tarjetas compuestas pero las tarjetas de posiciónes tienen un fondo de color diferente.

Perfecto quedói muy bien, excepto una cosa, al escribir en el campo no se ve nada de lo que se está escribiendo porque aparece una scrolling bar que nisiquiera se necesita, se pueden ocultar las scrolling bars?

Quedó bien, pero al aprecer hicimos que apareciera un halo amarillo en las respuestas de las preguntas que están subrayadas por el highlight del camino de creencias (cuando se selecciona una creencia)

Estoy notando que es muy dificil pinnear/ancalr una tarjeta, podemos poner fijo un espacio arriba a la derecha (donde aparece el pin/chincheta) para un simbolo de movimiento o de agarre y cuando el usuario lo agarre y mueva que se sustituya por el pin, y viceversa?

Estoy notando también que el texto de las respuestas siempre está por debajo de los nodos (cuando escribo mucho se pasa por atras y no deja verlo), esto debe ser al revez, el texto de la respuesta por defecto debe estar por encima de los nodos.

Otra cosa que noté es que cuando estoy escribiendo el espacio se hace mas grande pero no crece lo suficiente de manera que no puedo ver el inicio de la frase que empecé a escribir en el campo de respuesta. Esto idealmente no debería ser así. Aunque es de baja prioridad.

Lo que í es de alta prioridad es que el campo de respuesta se está comiendo texto en ciertos escenarios, al parecer es parecido a lo que pasaba en los campos de las tarjetas, donde si la ultima linea tiene una palabra no la desplegaba bien, pero en este caso, si se come toda la linea y la palabra no queda visible. Por ejemplo, en este caso:
```
Sí, Al aprecer hicimos que apareciera un halo amarillo en las respuestas de las preguntas que están subrayadas por el highlight del camino de creencias (cuando se selecciona una creencia)
```
La ultima parte no se ve, especifiamente:
`creencia)`

En cuanto al resto, el rado (tamaño) del recuadro esta bien, y la funcoinalidad está bien, solo me gustaría quitarle el bold (negrita) a la fuente de esos campos de respuesta.




## A Resaltar
- Intentemos que los estados, las tarjetas, el diseño y demás opciones que son modificadas o diferentes a los otros modos, sean exclusivas de esta vista/modo, para no interferir con el resto, el modo de edición es especial en muchos aspectos y requiere funcionalidades que el resto de los modos no requieren, por lo tanto, preferirémos no reutilizarlos si son dierentes en la medida de lo posible.
- Es importante el diseño estético para cada uno de los controles descritos, deben ser modernos y preferentemente con animaciónes modernas, el implementador puede consultar por trends actuales en el mundo del desarrollo web.