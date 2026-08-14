## Propósito
Árbol de decisiones que clasifica posturas doctrinales. Cada nodo es una pregunta; cada respuesta conduce a una postura nombrada. El objetivo es que cualquier persona, respondiendo secuencialmente, llegue a la etiqueta histórica de su propia posición.
No es un mapa de doctrinas, es un clasificador.

## Sintaxis
Dos tipos de línea, ambas en lista anidada de Markdown:

    <Respuesta>: <Nombre de Postura>          — arista: respuesta que produce una postura
    <Nombre de Postura> -> <Pregunta>          — nodo: pregunta planteada desde esa postura

La indentación expresa anidamiento. El nombre de postura repetido al inicio de la línea `->` no es redundancia: identifica desde qué nodo se hace la pregunta, y es lo que permite que una postura tenga más de una pregunta colgando.

## Notación
- `*`   término sugerido por falta de nombre oficial (p. ej. `Historicidad de Jesús*`)
- `?`   postura aun sin nombrar; hueco pendiente de trabajo o ausencia de uno.
- `{}`  grupo o tradición que sostiene la postura (ejemplo empírico, no definición):
  `Arrianismo de los JW (Testigos de Jehová)`, `{Islam Suní/Chiita}`
- `[[]]` enlace a nota de Obsidian donde la postura se desarrolla (p. ej. `[[diotelitismo]]`)
- `&`   pregunta compartida por varias posturas: `Teísmo & Deísmo -> ¿Jesucristo realmente existió?`
  Es un punto de convergencia: ramas distintas vuelven a unirse en un mismo nodo.

## Particularidad estructural: no es un árbol binario estricto
Una misma postura puede tener **varias líneas `->`**, cada una abriendo un eje de decisión independiente sobre un tópico distinto. Ejemplo en el archivo: `Historicidad de Jesús*` sostiene dos preguntas paralelas —`¿Jesús declaró ser Dios?` y `¿Es Jesucristo un ser creado?`— que exploran dimensiones separadas (evidencial una, ontológica la otra) y generan subárboles que no se solapan.

Consecuencias para quien lea o edite el archivo:
1. La ramificación en un punto (una rama origen) puede ser mayor que 2 aunque actualmente no se cuente con escenarios representativos. El grado del nodo es (número de respuestas) x (número de ejes abiertos).
2. Los subárboles de ejes distintos pueden alcanzar posturas equivalentes por caminos diferentes.
3. Al insertar un nodo hay que decidir primero **a qué eje pertenece**; colgar una pregunta de un eje ajeno puede romper la coherencia del recorrido.
4. Las respuestas no siempre son Sí/No literal: pueden ir glosadas para desambiguar (`No (solo apariencia):`, `No, Solo una:`, `No, Dos naturalezas distintas...:`). La glosa forma parte de la arista.
5. Las respuestas pueden ser un listado de posturas no solo `Sí` vs. `No`, pero se prefiere fuertemente que sean binarias.

## Criterios de diseño de nodos
- Un nodo por afirmación, no por pieza de evidencia; la evidencia se acumula dentro del nodo al desarrollarlo.
- Terminología formal, genérica y neutral: debe abarcar muchas posturas y definir solo el punto central en disputa.

## Cómo leer el árbol:
    Arista= <Respuesta de la Pregunta y descripción implicita de la misma>: <Nombre de Postura> {<sistemas de creencias que adoptan esta postura>}
    Nodo= <Nombre de Postura> -> <Pregunta hacia la Postura>
    Un * en el nombre de la postura significa que es un termino sugerido debido a falta de un término oficial.
    Un ? en el nombre de la postura significa que no se cuenta actualmente con un nombre de la misma, no significa que este incompleto, es posible que no exista un termino para el mismo.

## Árbol de Decisión:
- Existencia: ¿Cómo inició el universo?
    - Existencia -> ¿El universo fue causado por un Creador?
      - Sí: Creacionismo
          - Creacionismo -> ¿El Creador se identifica como Dios?
              - No: Deísmo
              - Sí: Teísmo
                  - Teísmo & Deísmo -> ¿Jesucristo realmente existió?
                      - No: Miticismo
                      - Sí: Historicidad de Jesús*
                          - Historicidad de Jesús* -> ¿Jesús declaró ser Dios?
                            - No: ?
                            - Sí: ?
                              - ? -> ¿La evidencia de los milagros de Jesús son suficientes para concluír que realmente ocurrieron?
                                - No: ?
                                - Sí: ?
                                  - ? -> ¿Los milagros (especialmente su resurección) y otras posibles evidencias funcionan como signos acreditativos de la identidad divina declarada de Jesús? (¿Jesús es Dios?)
                                    - No: ?
                                        - ? -> ¿Es Jesucristo un ser creado?
                                            - Sí: Cristo-creaturismo*
                                                - Cristo-creaturismo* -> ¿Era Jesucristo inferior y subordinado a Dios?
                                                    - No: Sin-nombre {No se identifica quién que sostenga esta postura}
                                                    - Sí: Subordinacionismo
                                                        - Subordinacionismo -> ¿Era Jesucristo inicialmente un ser divino?
                                                            - Sí: Arrianismo
                                                                - Arrianismo -> ¿Es Jesús identificado como el Arcángel Miguel?
                                                                    - Sí: Arrianismo de los JW (Testigos de Jehová)
                                                                    - No: Arrianismo Clasico
                                                            - No: Unitarismo
                                                                - Unitarismo -> ¿Dios adoptó a Jesucristo como hijo posteriormente?
                                                                - Sí: Adopcionismo 
                                                                - No: Unitarismo Clasico
                                                                    - Unitarismo Clasico -> ¿Jesús realizó milagros?
                                                                        - Sí: ?
                                                                            - ? -> ¿Jesucristo llegó a morir?
                                                                                - Sí: Ebionismo
                                                                                - Ebionismo -> ¿Jesucristo Resucitó?
                                                                                    - Sí: Ebionismo Clasico
                                                                                    - No: Ahmadismo {Islam Ahmadí}
                                                                                - No: ? {Islam Suní/Chiita}
                                                                        - No: Naturalismo cristológico
                                                                            - Naturalismo cristológico -> ¿Jesús fue un profeta?
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
                                    - Sí: Encarnacionismo / Preexistencialismo
                                        - Encarnacionismo / Preexistencialismo -> ¿El uso normativo y litúrgico que Jesucristo hace de las Escrituras hebreas es evidencia suficiente para reconocerlas como revelación divina autoritativa? (¿El Antiguo Testamento tiene revelación divina?)
                                          - No: Teología Liberal / Racionalismo Teológico?
                                          - Sí: ?
                                              - ? -> ¿El reconocimiento de relevación divina se extiende al conjunto del Tanaj/TaNaKh (antiguo Testamento), y no solo a los libros expresamente citados? (¿Todo el Antiguo Testamento es revelación divina?)
                                                  - No: ?
                                                  - Sí: ?
                                                    - ? -> ¿La comisión que Jesucristo confiere a sus apóstoles para transmitir su enseñanza, el reconocimiento recíproco entre los apóstoles y la recepción de la iglesia primitiva es evidencia suficiente para reconocer el testimonio apostólico como revelación divina autoritativa? (¿Las cartas apostólicas son revelación divina?)
                                                      - No: ?
                                                        - ? -> ¿Solo las palabras de Jesús son autoritativas?
                                                          - Sí: ?
                                                          - No: ?
                                                      - Sí: Autoridad apostólica derivada*
                                                          - Autoridad apostólica derivada* -> ¿La recepción universal de la iglesia primitiva y el trato que da al resto de los escritos neotestamentarios, en pie de igualdad con los ya reconocidos, son evidencia suficiente para extenderles ese mismo reconocimiento como revelación divina autoritativa? (¿El Nuevo Testamento es revelación divina?)
                                                              - No: Canon neotestamentario restringido*
                                                              - Sí: Canon neotestamentario pleno*
                                                                - Canon neotestamentario pleno* -> ¿El autotestimonio explícito de las escrituras autoritativas sobre su origen divino, la atribución de sus palabras al Espíritu Santo como autor primario y su auto-identificación como Palabra de Dios con autoridad inquebrantable son evidencia suficiente para concluír que es producto de la inspiración divina (Teopneustia)? (¿La Biblia tiene inspiración divina?)
                                                                    - No: Anti-inspiracionalismo
                                                                    - Sí: Inspiracionismo / Teopneustia
                                        - Encarnacionismo / Preexistencialismo -> ¿Es Jesús en sustancia diferente a Dios?
                                            - Sí: Homoiousianismo / Semi-Arrianismo
                                            - No: Consustancialismo
                                                -  Consustancialismo -> ¿Es Jesús el mismo en substancia pero diferente persona que Dios?
                                                    - No: Modalismo / Unicitarismo / Unicitarianismo
                                                    - Sí: Trinitarianismo
                                                        - Trinitarianismo -> ¿Jesús tuvo un cuerpo y naturaleza humana real, o solo lo aparentaba?
                                                            - No (solo apariencia): Docetismo
                                                            - Sí: ?
                                                                - ? -> ¿Jesús tuvo una mente/alma humana racional completa?
                                                                    - No: Apolinarismo
                                                                    - Sí: ?
                                                                        - ? -> ¿Las dos naturalezas forman dos personas distintas?
                                                                            - Sí: Nestorianismo
                                                                            - No, Solo una: ?
                                                                                - ? -> ¿La naturaleza humana pierde su integridad, siendo absorbida por la divina?
                                                                                    - Sí: Monofisismo (Eutiquianismo)
                                                                                    - No, Cristo es plenamente Dios y plenamente hombre: ?
                                                                                        - ? -> ¿La unión se describe como una sola naturaleza con las 2 mezcladas?
                                                                                            - Sí: Miafisismo
                                                                                            - No, Dos naturalezas distintas, sin mezcla ni separación (unión hipostática): Calcedonianismo / Diofisismo
                                                                                            - Calcedonianismo / Diofisismo -> ¿Cristo tiene dos voluntades?
                                                                                                - No, tiene una sola: Monotelitismo
                                                                                                - Sí: [[diotelitismo|Diotelitismo]] {ortodoxia calcedonense}
                                                                                                - [[diotelitismo|Diotelitismo]] -> 
	  - No: Naturalismo cosmológico o Panteísmo*
        - Naturalismo cosmológico o Panteísmo* -> ¿Es el universo mismo, en su totalidad, de naturaleza divina?
          - Sí: Panteísmo / Panenteísmo*
          - No: Naturalismo cosmológico*
              - Naturalismo cosmológico* -> ¿Siempre ha existido?
                  - Sí: Eternalismo
                  - No: Cosmogénesis espontánea*
    