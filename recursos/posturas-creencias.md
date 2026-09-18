## Propósito
Árbol de clasificación de posturas filosóficas, teológicas y doctrinales. El objetivo es que, respondiendo secuencialmente, se llegue a la etiqueta histórica de una postura o posición.

## Sintaxis
Dos tipos de línea, ambas en lista anidada de Markdown:

| Nombre de la línea    | Formato                                                                                                                                                                  | Uso                                   |
| --------------------- |:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------- |
| Arista                | `<Respuesta> -- <Aclaración>`: `<Nombre de Postura>` {`<Tradiciónes o sistemas de creencias que sostienen la postura separados por comas>`}                              | Respuesta que produce una postura     |
| Nodo                  | `<Nombre de Posturas separadas por &>` -> `<Pregunta>` (`<Opcionalmente la misma pregunta en formato coloquial>`)  {`<wikilink a documento de análisis de la pregunta>`} | Pegunta planteada desde esa postura   | 

La indentación expresa anidamiento. El nombre de postura repetido al inicio de la línea `->` no es redundancia: identifica desde qué nodo se hace la pregunta, y es lo que permite que una postura tenga más de una pregunta colgando.

## Notación
- `*`   término sugerido por falta de nombre oficial (p. ej. `Historicidad de Jesús*`)
- `?`   postura aun sin nombrar; hueco pendiente de trabajo o ausencia de uno.
- `{}`  grupo o tradición que sostiene la postura (ejemplo empírico, no definición):
  `Arrianismo de los JW (Testigos de Jehová)`, `{Islam Suní/Chiita}`
- `[[]]` enlace wikilink a documentos de descripción/desarrollo de postura o pregunta
- `&`   pregunta compartida por varias posturas: `Teísmo & Deísmo -> ¿Jesucristo realmente existió?`. Es un punto de convergencia: ramas distintas vuelven a unirse en un mismo nodo.

## Particularidad estructural: no es un árbol binario estricto
Una misma postura puede tener **varias líneas `->`**, cada una abriendo un eje de decisión independiente sobre un tópico distinto. En la estructura Un nodo puede sostener dos preguntas (Aristas) paralelas que exploren dimensiones separadas y generan subárboles que no se solapan.

Consecuencias para quien lea o edite el archivo:
1. La ramificación en un punto (una rama origen) puede ser mayor que 2 aunque actualmente no se cuente con escenarios representativos. El grado del nodo es (número de respuestas) x (número de ejes abiertos).
2. Los subárboles de ejes distintos pueden alcanzar posturas equivalentes por caminos diferentes.
3. Al insertar un nodo hay que decidir primero **a qué eje pertenece**; colgar una pregunta de un eje ajeno puede romper la coherencia del recorrido.
4. Las respuestas no siempre son Sí/No literal: pueden ir glosadas para desambiguar (`No (solo apariencia):`, `No -- Solo una:`, `No -- Dos naturalezas distintas...:`). La glosa forma parte de la arista.
5. Las respuestas pueden ser un listado de posturas no solo `Sí` vs. `No`, pero se prefiere fuertemente que sean binarias.

## Criterios de diseño de nodos
- Un nodo por afirmación, no por pieza de evidencia; la evidencia se acumula dentro del nodo al desarrollarlo.
- Terminología formal, genérica y neutral: debe abarcar muchas posturas y definir solo el punto central en disputa.

## Cómo leer el árbol:
    Arista= <Respuesta de la Pregunta y descripción implicita de la misma>: <Nombre de Postura> {<sistemas de creencias que adoptan esta postura>}
    Nodo= <Nombre de Postura> -> <Pregunta hacia la Postura>
    Un * en el nombre de la postura significa que es un termino sugerido debido a falta de un término oficial.
    Un ? en el nombre de la postura significa que no se cuenta actualmente con un nombre de la misma o se tiene duda; no significa que este incompleto, es posible que no exista un termino para el mismo.

## Regenerar el visor

Desde la raíz del repositorio: en **cmd** `run`, en **PowerShell** `.\run.ps1`,
o doble clic en **[run.cmd](../run.cmd)**. Sincroniza Drive y regenera los datos
de este árbol para el visor.

El visor se abre con doble clic en **[arbol-web/index.html](diagramas/arbol-web/index.html)**.



## Árbol de Decisión:
- Existencia -> ¿El universo fue causado por un Creador? { [[La inexistencia de un Dios creador]] }
  - Sí: Creacionismo
    - Creacionismo -> ¿Identificas a ese Creador como "Dios"?
      - No: Deísmo
      - Sí: Teísmo
        - Teísmo & Deísmo -> ¿Jesucristo realmente existió?
          - No: Miticismo
          - Sí: Historicidad de Jesús*
            - Historicidad de Jesús* -> ¿Jesús declaró ser Dios?
              - No: ?
              - Sí: ?
                - ? -> ¿La evidencia de los milagros de Jesús son suficientes para concluír que realmente ocurrieron?
                  - No: Naturalismo cristológico*
                    - Naturalismo cristológico* -> ¿Jesús fue un profeta?
                      - Sí: Socinianismo* {Judaísmo moderno/liberal (académico)}
                      - No: Reduccionismo histórico*
                        - Reduccionismo histórico* -> ¿Jesús fue un engañador?
                          - Sí: Postura del Impostor {Judaísmo rabínico/talmúdico}
                          - No: ?
                            - ? -> ¿Jesús fue solo un sabio?
                              - Sí: ?
                              - No: ?
                                - ? -> ¿Jesús fue solamente una persona confundida?
                                  - Sí: Postura del Lunático
                                  - No: Postura de la Leyenda
                  - Sí: ?
                    - ? -> ¿Los milagros (especialmente su resurección) y demás evidencias funcionan como signos acreditativos de la identidad divina declarada de Jesús? (¿Jesús es Dios?)
                      - No: ?
                        - ? -> ¿Es Jesucristo un ser creado?
                          - No: Subordinacionismo {SUD?}
                          - Sí: Cristo-creaturismo*
                            - Cristo-creaturismo* -> ¿Era Jesucristo inferior y subordinado a Dios?
                              - No: Sin-nombre {No se identifica quién que sostenga esta postura}
                              - Sí: ?
                                - ? -> ¿Era Jesucristo inicialmente un ser divino?
                                  - Sí: Arrianismo
                                    - Arrianismo -> ¿Es Jesús identificado como el Arcángel Miguel?
                                      - Sí: Arrianismo de los JW (Testigos de Jehová)
                                      - No: Arrianismo Clasico
                                  - No: Unitarismo
                                    - Unitarismo -> ¿Dios adoptó a Jesucristo como hijo posteriormente?
                                      - Sí: Adopcionismo
                                      - No: Unitarismo Clasico
                                        - Unitarismo Clasico -> ¿Jesucristo llegó a morir?
                                          - Sí: Ebionismo
                                            - Ebionismo -> ¿Jesucristo Resucitó?
                                              - Sí: Ebionismo Clasico
                                              - No: Ahmadismo {Islam Ahmadí}
                                          - No: ? {Islam Suní/Chiita}
                      - Sí: Encarnacionismo / Preexistencialismo
                        - Encarnacionismo / Preexistencialismo & Subordinacionismo -> ¿El uso normativo y litúrgico que Jesucristo hace de las Escrituras hebreas es evidencia suficiente para reconocerlas como revelación divina autoritativa? (¿El Antiguo Testamento tiene revelación divina?)
                          - No: Teología Liberal / Racionalismo Teológico?
                          - Sí: ?
                            - ? -> ¿El reconocimiento de relevación divina se extiende al conjunto del Tanaj/TaNaKh (antiguo Testamento), y no solo a los libros expresamente citados? (¿Todo el Antiguo Testamento es revelación divina?)
                              - No: ?
                              - Sí: ?
                                - ? -> ¿La comisión que Jesucristo confiere a sus apóstoles para transmitir su enseñanza, el reconocimiento recíproco entre los apóstoles y la recepción de la iglesia primitiva es evidencia suficiente para reconocer el testimonio apostólico como revelación divina autoritativa? (¿Las cartas apostólicas son revelación divina?)
                                  - No: ?
                                    - ? -> ¿Solo las palabras de Jesús dentro del Nuevo Testamento son autoritativas?
                                      - Sí: ?
                                      - No: ?
                                  - Sí: Autoridad apostólica derivada*
                                    - Autoridad apostólica derivada* -> ¿La recepción universal de la iglesia primitiva y el trato que da al resto de los escritos neotestamentarios, en pie de igualdad con los ya reconocidos, son evidencia suficiente para extenderles ese mismo reconocimiento como revelación divina autoritativa? (¿El Nuevo Testamento es revelación divina?)
                                      - No: Canon neotestamentario restringido*
                                      - Sí: Canon neotestamentario pleno*
                                        - Canon neotestamentario pleno* -> ¿La Biblia contiene sesgos humanos?
                                          - Sí: Teología Liberal / Inerrancia limitada {Iglesia Episcopal, Metodista Unida (UMC), Presbiteriana USA (PCUSA), Luterana ELCA}
                                          - No: ?
                                            - ? -> ¿La Biblia es clara y sin ambigüedades en su mensaje, y todo lo que dice es completamente verdadero?
                                              - Sí: ?
                                              - No: ?
                                        - Canon neotestamentario pleno* -> ¿El autotestimonio explícito de las escrituras autoritativas sobre su origen divino, la atribución de sus palabras al Espíritu Santo como autor primario y su autoidentificación como Palabra de Dios con autoridad inquebrantable son evidencia suficiente para concluír que es producto de la inspiración divina? (¿La Biblia es inspirada por Dios?)
                                          - No: Anti-inspiracionalismo
                                          - Sí: Inspiracionismo / Teopneustia
                                            - Inspiracionismo / Teopneustia -> ¿La interpretación de la Biblia requiere de un magisterio eclesiástico con autoridad infalible?
                                              - Sí: ?
                                              - No: ?
                                            - Inspiracionismo / Teopneustia -> ¿El pecado de Adán afectó a su descendencia, el humano nace muerto y con una naturaleza pecaminosa (aunque no activamente pecando)? (¿El humano nace con una "Naturaleza pecaminosa"?)
                                              - No -- El hombre nace sin pecado y con la capacidad de **hacer el bien y alcanzar el cielo**: ?
                                                - ? -> ¿**Antes del Discernimiento**, la inocencia humana le da acceso al cielo y no puede pecar? (¿Los niños van al cielo al morir?)
                                                  - Sí: ?
                                                  - No: ?
                                                - ? -> ¿**Después del Discernimiento** el humano puede pecar, el primer pecado le condena al infierno?
                                                  - Sí: ?
                                                    - ? -> ¿Después de pecar el humano conserva la capacidad de hacer el bien posteriormente, aun si no tiene el perdón de Dios?
                                                      - No: ?
                                                      - Sí: ?
                                                        - ? -> ¿Después de pecar, al pedir perdón a Dios, el humano es perdonado y gana derecho a entrar al cielo al morir?
                                                          - Sí: ?
                                                            - ? -> ¿El volver a pecar remueve del humano el derecho a entrar al cielo?
                                                              - Sí: Pelagianismo
                                                              - No: ?
                                                          - No: ?
                                                  - No: ?
                                              - Sí: Depravación Total del hombre
                                                - Depravación Total del hombre -> ¿**Antes del Discernimiento** el humano sigue estando condenado debido a su estado de muerte (estado de “pecador”) aun sin haber cometido pecado? (¿Al morir un niño, va a un lugar diferente al cielo?)
                                                  - Sí: ?
                                                    - ? -> ¿Es posible infundirle “gracia” (un Don divino que es posible perder) salvadora con sacramentos como el bautismo regenerador? (¿El niño debe ser bautizado para ir al cielo, pero no le asegura la entrada?)
                                                      - Sí: ?
                                                        - ? -> ¿El no haber recibido el bautismo lo deja condenado al Limbo?
                                                          - Sí: ? {Catolicismo Ortodoxo?}
                                                          - No: ?
                                                            - ? -> ¿El no haber recibido el bautismo lo deja condenado al Infierno?
                                                              - Sí: ? {Catolicismo Moderno?}
                                                              - No: ?
                                                  - No -- la inocencia le da acceso al cielo y no puede pecar: ?
                                                - Depravación Total del hombre -> ¿Después del Discernimiento es posible para el humano alcanzar el cielo mediante sus buenas obras? (¿Puede un adulto ir al cielo siendo bueno?)
                                                  - Sí: ?
                                                  - No: ?
                                                    - ? -> ¿Después de pecar el ser humano necesita una transformación/conversión/regeneración espiritual para entrar al cielo? (¿Se necesita una conversión para entrar al cielo?)
                                                      - No: ?
                                                      - Sí: Conversionismo
                                                        - Conversionismo -> ¿Es posible que el humano rechace el llamado de Dios a recibir la gracia que le lleva a esa conversión? (¿Puede el hombre resistir el llamado a la conversion?) { [[Monergismo.md]] }
                                                          - No: Gracia Irresistible / Monerguismo {Calvinismo / Tradición Reformada}
                                                            - Gracia Irresistible / Monerguismo -> ¿Es necesaria la intervención activa y directa de Dios sobre la voluntad del humano para que el humano acepte el llamado a esa conversión? (¿Dios tiene una elección incondicional de sus santos?)
                                                              - Sí: ?
                                                              - No: ?
                                                          - Sí: Gracia Resistible / Sinerguismo {Arminianismo / Metodismo}
                                                            - Gracia Resistible / Sinerguismo -> Si al humano le falta 1 de estos elementos puede tener esa conversión? Escuchar el evangelio, Creer en el evangelio, tener Fe en Cristo Jesús, Entregarle su vida a Dios por completo (Arrepentimiento), Invocar el nombre de Dios (pedir ayuda)
                                                              - Sí: ?
                                                              - No: ?
                                                                - ? -> ¿El humano no puede tener esa transformación hasta no bautizarse y es en el momento del bautismo cuando ocurre esa conversion?
                                                                  - Sí: Salvación Bautismal
                                                                  - No: ?
                                                        - Conversionismo -> ¿El volver a pecar después de esa conversión remueve del humano el derecho a entrar al cielo? { [[La Perdida de la Salvación]] }
                                                          - No: Perseverancia de los Santos {Calvinismo, Bautistas}
                                                          - Sí: Preservación Condicional de los Santos {Arminianismo, Metodismo, Pentecostalismo}
                                            - Inspiracionismo / Teopneustia -> ¿Debe entenderse que la inspiración divina de la Biblia fue plena y se extendió a la totalidad de las Escrituras, de modo que cada una de sus partes y todo lo que los autores bíblicos escribieron quedó comprendido bajo la acción inspiradora de Dios? (¿Toda la Biblia ha sido inspirada?) (¿Cada parte de la Biblia fue inspirada?) { [[tipos-de-inspiracion-biblica.md]] }
                                              - Sí: Inspiracionalismo Plenario
                                                - Inspiracionalismo Plenario -> ¿Es plausible concebir un escenario en el que, incluso suponiendo una exégesis ideal, una interpretación bíblica alcance un grado de certeza suficientemente alto —o una incertidumbre suficientemente baja— como para considerarla segura en al menos uno de los topicos específicos que la Biblia expone? (¿El hombre puede entender lo que la Biblia expresa sobre al menos una cosa?)
                                              - No -- la Biblia fue inspirada parcialmente: Inspiracionalismo Limitado
                                                - Inspiracionalismo Limitado -> ¿Cuál es, en este sentido, el límite o la extensión de la inspiración?
                                                  - Ciertos Hechos o Dichos de los apóstoles fueron inspirados: Inspiracionalismo Limitado Selectivo
                                                  - Ciertas Secciónes (físicas) de la Biblia: Inspiracionalismo Limitado Parcial
                                                  - Cierto Contenido o Temas fueron inspirados -- (por ejemplo, solo las palabras de Jesús o solo el tema de la salvación fue inspirado): ?
                                            - Inspiracionismo / Teopneustia -> ¿Lo que Dios inspiró fueron las palabras y no solamente temas o conceptos a los escritores? (¿Dios inspiró las palabras que mandó escribir?)
                                              - Sí: Inspiracionalismo Verbal
                                              - No: Inspiracionalismo Dinámico / Conceptual
                                            - Inspiracionismo / Teopneustia -> ¿Dios dictó directamente palabra por palabra a escribir a sus escritores, sin que estos aportaran sus propias palabras? (¿Dios dictó cada palabra de lo que se tenía que escribir?)
                                              - Sí: Inspiracionalismo Mecánico / Dictado
                                              - No: Inspiracionalismo Orgánico / Concursal / Confluente
                        - Encarnacionismo / Pre-existencialismo -> ¿Fue Jesús, en algún momento, en sustancia, igual a Dios y, por tanto, poseyó una naturaleza divina? (¿Dios es la misma sustancia que Jesús?)
                          - No: Homoiousianismo / Semi-Arrianismo
                          - Sí: Consustancialismo
                            - Consustancialismo -> ¿El Padre y el Hijo no son sujetos personalmente distintos, ni coexisten simultánea y eternamente, ni pueden relacionarse entre sí como un yo y un tú, pues son un único sujeto que se manifiesta sucesivamente bajo distintos modos o papeles? (¿Dios se transformó en Jesucristo y cuando habla con el Padre no habla con otra persona de la Trinidad, sino consigo mismo?) { [[Modalismo.md]] }
                              - Sí: Modalismo / Unicitarismo / Unicitarianismo
                              - No -- Aunque sean 2 personas distintas, ambos comparten una misma e idéntica sustancia divina: Trinitarianismo/Trinitarismo
                                - Trinitarianismo/Trinitarismo -> ¿Jesús tuvo un cuerpo y naturaleza humana real?
                                  - No (solo apariencia): Docetismo
                                  - Sí: ?
                                    - ? -> ¿Jesús tuvo una mente/alma humana racional completa?
                                      - No: Apolinarismo
                                      - Sí: ?
                                        - ? -> ¿Las actividades atribuidas a la naturaleza divina (existir eternamente, hacer milagros, perdonar pecados) y aquellas atribuidas a la naturaleza humana (descansar, aprender, sufrir, morir) son atribuidas a una sola *hipóstasis* (sujeto personal), Jesucristo, sin que existan en él dos *hipóstasis* (sujetos personales) distintas que impliquen que lo que hace o padece la naturaleza humana no pueda atribuirse propiamente al sujeto divino, es decir, la misma *hipóstasis* (sujeto personal), Jesucristo, es quien perdona pecados y quien muere, aunque lo primero corresponda a su naturaleza divina y lo segundo a su naturaleza humana, y no a dos *hipóstasis* (sujetos personales) distintas? (¿Es la misma persona quien perdonó pecados y quien murió en la cruz?)
                                          - No: Dualidad hipostática de Cristo* {Nestorianismo}
                                          - Sí: Monoprosopismo
                                            - Monoprosopismo -> ¿La naturaleza humana, al unirse con la divina, dejó de subsistir con sus propias propiedades —no por haber faltado, sino por haber sido transformada, absorbida o mezclada en el acto mismo de la unión—, de modo que el Cristo encarnado subsiste en una sola naturaleza, aun cuando provenga de dos? (¿la divinidad de Cristo anuló su humanidad?)
                                              - Sí -- subsiste en una sola naturaleza, en la que lo humano queda absorbido por lo divino: Monofisismo / Eutiquianismo
                                              - No -- Cristo conserva su naturaleza humana, Cristo es plenamente Dios y plenamente hombre: Diofisismo / Calcedonianismo / Miafisismo
                                                - Diofisismo / Calcedonianismo / Miafisismo -> En el Getsemaní Cristo pedía al Padre pasára la copa, tenía la voluntad de morir mientras no quería hacerlo, ¿Tenía Jesucristo dos voluntades? (¿Jesús podía querer como hombre algo distinto de lo que quería como Dios, y aun así obedecer?)
                                                  - No -- el "querer" es acto de la persona— siendo Cristo una sola persona, quiere con un solo querer, y su humanidad no añade otro: Monotelitismo / monotelismo
                                                  - Sí -- el "querer" es facultad de la naturaleza— una humanidad íntegra incluye su propio querer, que libremente se conforma al divino: [[diotelitismo#3-c-mo-operan-las-dos-voluntades-sin-entrar-en-conflicto|Diotelitismo]] {Ortodoxia calcedonense}
  - No: Ateísmo cosmológico*
    - Ateísmo cosmológico* -> ¿La materia/realidad física es eterna y no fue creada por un Dios?
      - Sí: Materialismo cosmológico
      - No: ?
    - Ateísmo cosmológico* -> ¿Es el universo mismo, en su totalidad, de naturaleza divina?
      - Sí: Panteísmo / Panenteísmo*
      - No: ?
