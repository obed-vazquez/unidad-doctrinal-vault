## Propósito
Árbol de clasificación de posturas filosoficas, teológicas y doctrinales. El objetivo es que, respondiendo secuencialmente, se llegue a la etiqueta histórica de una postura o posición.

## Sintaxis
Dos tipos de línea, ambas en lista anidada de Markdown:

| Nombre de la línea    | Formato                                                                                                               | Uso                                   |
| --------------------- |:----------------------------------------------------------------------------------------------------------------------| ------------------------------------- |
| Arista                | `<Respuesta>`: `<Nombre de Postura>`                                                                                  | Respuesta que produce una postura     |
| Nodo                  | `<Nombre de Postura>` -> `<Pregunta>` (`<Opcionalmente la misma pregunta en formato coloquial>`)                      | Pegunta planteada desde esa postura   | 

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
Una misma postura puede tener **varias líneas `->`**, cada una abriendo un eje de decisión independiente sobre un tópico distinto. En la estructura Un nodo puede sostener dos preguntas (Aristas) paralelas que exploren dimensiones separadas y generan subárboles que no se solapan.

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
    Un ? en el nombre de la postura significa que no se cuenta actualmente con un nombre de la misma o se tiene duda; no significa que este incompleto, es posible que no exista un termino para el mismo.

## Generar diagramas

Doble clic en **[Generar-Diagramas.cmd](diagramas/Generar-Diagramas.cmd)**. Regenera
`recursos/diagramas` (Mermaid, DrawDecisionTree, Graphviz, imagen SVG y los datos del
visor interactivo) a partir de este documento, instalando Graphviz solo si hace falta,
y abre la imagen al terminar. No necesita edición manual ni comandos.
El visor se abre con doble clic en **[arbol-web/index.html](diagramas/arbol-web/index.html)**.

Opciones avanzadas (rutas, formato, resolución, `-Strict`):
`Get-Help .\scripts\convertir-posturas-creencias.ps1 -Full`.

[DrawDesitionTree](https://www.drawdecisiontree.com/embed/card/obed-vazquez/posturas-creencias?f=inline)


## Árbol de Decisión:
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
                                        - Canon neotestamentario pleno* -> ¿El autotestimonio explícito de las escrituras autoritativas sobre su origen divino, la atribución de sus palabras al Espíritu Santo como autor primario y su autoidentificación como Palabra de Dios con autoridad inquebrantable son evidencia suficiente para concluír que es producto de la inspiración divina (Teopneustia)? (¿La Biblia tiene inspiración divina?)
                                          - No: Anti-inspiracionalismo
                                          - Sí: Inspiracionismo / Teopneustia
                                            - Inspiracionismo / Teopneustia -> ¿El pecado de Adán afectó a su descendencia, el humano nace muerto y en un estado de “pecador” (aunque no activamente pecando)? (¿El humano nace con una "Naturaleza pecaminosa"?)
                                              - No, El hombre nace sin pecado y con la capacidad de **hacer el bien y alcanzar el cielo**: ?
                                                - ? -> ¿Antes del Discernimiento, la inocencia humana le da acceso al cielo y no puede pecar?
                                                  - Sí: ?
                                                    - ? -> ¿Después del Discernimiento el humano puede pecar, el primer pecado le condena al infierno, pero **no pierde la capacidad de hacer el bien posteriormente aun si no tiene el perdón de Dios**?
                                                      - Sí: ?
                                                        - ? -> ¿Después de pecar, al pedir perdón a Dios, el humano es perdonado y gana derecho a entrar al cielo al morir?
                                                          - Sí: ?
                                                            - ? -> ¿El volver a pecar remueve del humano el derecho a entrar al cielo?
                                                              - Sí: Pelagianismo
                                                              - No: ?
                                                          - No: ?
                                                      - No: ?
                                                  - No: ? 
                                              - Sí: Depravación Total del hombre
                                                - Depravación Total del hombre -> ¿Tiene el humano la capacidad de hacer bien?
                                                  - Sí: ?
                                                    - ? -> ¿La capacidad de hacer el bien es solo una capacidad “civil” de hacer el bien como "amar a sus hijos"?
                                                      - Sí: ?
                                                        - ? -> ¿Antes del Discernimiento y aun con la capacidad de hacer el bien, el humano sigue estando condenado debido a su estado de muerte (naturaleza pecaminosa) aun sin haber cometido pecado?
                                                          - Sí: ?
                                                            - ? -> ¿Es posible infundirle “gracia” (un Don divino que es posible perder) salvadora con sacramentos como el bautismo regenerador?
                                                              - Sí: ?
                                                                - ? -> ¿Para el humano, el no haber recibido bautismo regenerador antes del Discernimiento, lo deja condenado?
                                                                  - No: ? 
                                                                  - Sí: ?
                                                                    - ? -> ¿Lo deja condenado al Limbo?
                                                                      - Sí: ?
                                                                      - No: ?
                                                                        - ? -> ¿Lo deja condenado al Infierno?
                                                                          - Sí: ?
                                                                          - No: ?
                                                                    - ? -> ¿Después del Discernimiento el humano inevitablemente peca?
                                                                      - No: ?
                                                                      - Sí: ?
                                                                        - ? -> ¿Después de pecar pierde la capacidad de tener fe (hacer obras salvíficas)?
                                                                          - Sí: ?
                                                                          - No: ?
                                                                            - ? -> ¿Después de pecar puede decidir tener fe (obras salvíficas)?
                                                                              - No: ?
                                                                              - Sí: ? {Catolicismo?}
                                                              - No: ?
                                                          - No, tiene inocencia y entrada al cielo a pesar de su estado de muerte (naturaleza pecaminosa) pues no puede pecar: ?
                                                            - ? -> ¿Después del Discernimiento Inevitablemente peca?
                                                              - No: ?
                                                              - Sí: ?
                                                                - ? -> ¿Después de pecar pierde la capacidad de tener fe (hacer obras salvíficas)?
                                                                  - Sí: ?
                                                                    - ? -> ¿Solo Dios puede llamar o mover al individuo para producir fe?
                                                                      - Sí: ?
                                                                      - No: ?
                                                                  - No: ?
                                                                    - ? -> ¿Después de pecar puede decidir tener fe (obras salvíficas)?
                                                                      - No: ?
                                                                      - Sí: ? 
                                                      - No: ?
                                                  - No: Depravación absoluta
                        - Encarnacionismo / Preexistencialismo -> ¿Fue Jesús, en algún momento, en sustancia, igual a Dios y, por tanto, poseyó una naturaleza divina? (¿Dios es la misma sustancia que Jesús?)
                          - No: Homoiousianismo / Semi-Arrianismo
                          - Sí: Consustancialismo
                            -  Consustancialismo -> ¿Se distinguen el Padre y el Hijo de manera permanente y simultánea, pudiendo uno dirigirse al otro como un yo a un tú, en lugar de ser el mismo y único sujeto manifestándose sucesivamente bajo modos o papeles distintos, aun compartiendo una sola e idéntica substancia divina? (¿Existe un Hijo Eterno?)
                              - No: Modalismo / Unicitarismo / Unicitarianismo
                              - Sí: Trinitarianismo
                                - Trinitarianismo -> ¿Jesús tuvo un cuerpo y naturaleza humana real?
                                  - No (solo apariencia): Docetismo
                                  - Sí: ?
                                    - ? -> ¿Jesús tuvo una mente/alma humana racional completa?
                                      - No: Apolinarismo
                                      - Sí: ?
                                        - ? -> ¿Son el Verbo eterno y el hombre Jesús dos alguien distintos, unidos tan estrechamente que actúan y son honrados como uno solo, pero de modo que lo que le ocurre al hombre no le ocurre a Dios: Jesús muere sin que Dios muera, y María es madre del hombre y no de Dios? (¿Dios habitaba dentro del hombre Jesús como en un templo, sin ser él mismo quien nació y murió?)
                                          - Sí: Nestorianismo
                                          - No, un solo, una misma persona del que se dice a la vez que es engendrado del Padre y nacido de mujer: Monoprosopismo
                                            - Monoprosopismo -> ¿La naturaleza humana, al unirse con la divina, dejó de subsistir con sus propias propiedades —no por haber faltado, sino por haber sido transformada, absorbida o mezclada en el acto mismo de la unión—, de modo que el Cristo encarnado subsiste en una sola naturaleza, aun cuando provenga de dos? (¿la divinidad de Cristo anuló su humanidad?)
                                              - Sí, subsiste en una sola naturaleza, en la que lo humano queda absorbido por lo divino: Monofisismo / Eutiquianismo
                                              - No, Cristo conserva su naturaleza humana, Cristo es plenamente Dios y plenamente hombre: Diofisismo / Calcedonianismo (también Miafisismo)
                                                - Diofisismo -> En el Getsemaní Cristo pedía al Padre pasára la copa, tenía la voluntad de morir mientras no quería hacerlo, ¿Tenía Jesucristo dos voluntades? (¿Jesús podía querer como hombre algo distinto de lo que quería como Dios, y aun así obedecer?)
                                                  - No, el "querer" es acto de la persona— siendo Cristo una sola persona, quiere con un solo querer, y su humanidad no añade otro: Monotelitismo / monotelismo
                                                  - Sí, el "querer" es facultad de la naturaleza— una humanidad íntegra incluye su propio querer, que libremente se conforma al divino: [[diotelitismo#3-c-mo-operan-las-dos-voluntades-sin-entrar-en-conflicto|Diotelitismo]] {ortodoxia calcedonense}
  - No: Ateísmo cosmológico*
    - Ateísmo cosmológico* -> ¿La materia/realidad física es eterna y no fue creada por un Dios?
      - Sí: Materialismo cosmológico
      - No: ?
    -  Ateísmo cosmológico* -> ¿Es el universo mismo, en su totalidad, de naturaleza divina?
      - Sí: Panteísmo / Panenteísmo*
      - No: ?
