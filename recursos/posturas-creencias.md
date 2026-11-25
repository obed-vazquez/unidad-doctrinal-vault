## Propósito
Árbol de clasificación de posturas filosóficas, teológicas y doctrinales. El objetivo es que, respondiendo secuencialmente, se llegue a la etiqueta histórica de una postura o posición.

## Sintaxis
Dos tipos de línea, ambas en lista anidada de Markdown:

| Nombre de la línea    | Formato                                                                                                                                                                  | Uso                                   |
| --------------------- |:-------------------------------------------------------------------------------------------------------------------------------------------------------------------------| ------------------------------------- |
| Arista                | `<Respuesta> -- <Aclaración>`: `<Nombre de Postura>` {`<Tradiciones o sistemas de creencias que sostienen la postura separados por comas>`}                              | Respuesta que produce una postura     |
| Nodo                  | `<Nombre de Posturas separadas por &>` -> `<Pregunta>` (`<Opcionalmente la misma pregunta en formato coloquial>`)  {`<wikilink a documento de análisis de la pregunta>`} | Pregunta planteada desde esa postura   | 

La indentación expresa anidamiento. El nombre de postura repetido al inicio de la línea `->` no es redundancia: identifica desde qué nodo se hace la pregunta, y es lo que permite que una postura tenga más de una pregunta colgando.

## Notación
- `*`   término sugerido por falta de nombre oficial (p. ej. `Historicidad de Jesús*`)
- `?`   postura aún sin nombre, o cuyo nombre se desconoce o es dudoso; no implica que esté incompleta: puede no existir un término para ella.
- `{}`  grupo o tradición que sostiene la postura (ejemplo empírico, no definición):
  `Arrianismo de los JW (Testigos de Jehová)`, `{Islam Suní/Chiita}`
  - Anotar una tradición en una respuesta afirma que sostiene esa postura **y todas las del camino hasta la raíz**; no afirma nada de lo que cuelga debajo.
  - Si una tradición no tiene postura oficial sobre una pregunta, no se anota en ninguna de sus respuestas.
  - Lo normal es anotarla en hojas. Se anota en una postura intermedia cuando ahí se detiene: es lo más bajo que sostiene y no aparece anotada en nada que cuelgue de esa postura, por ningún eje. Si ya aparece más abajo, esa anotación de abajo la incluye y no se repite arriba.
  - Tradiciones divididas: algunas tradiciones agrupan iglesias o corrientes que, a partir de cierta pregunta, responden distinto. La tradición se anota en la última postura en que todos sus grupos coinciden, y cada grupo, con nombre propio, se anota más abajo en la rama que sostiene, con estas mismas reglas, hasta llegar incluso a una hoja. Ejemplo: `X` anotada en la postura A, su grupo `X-α` en B y su grupo `X-β` en C (B y C debajo de A) significa que toda la tradición sostiene A, que α además sostiene B y β además C; no que `X` sostenga cualquier otra postura D que cuelgue de A.
- `[[]]` enlace wikilink a documentos de descripción/desarrollo de postura o pregunta
- `&`   pregunta compartida por varias posturas: `Teísmo & Deísmo -> ¿Jesucristo realmente existió?`. Es un punto de convergencia: ramas distintas vuelven a unirse en un mismo nodo.
- `~`   al inicio de un sinónimo (tras `/`): ese sinónimo no se usa para buscar definiciones externas (p. ej. Wikipedia), porque suelto significa otra cosa (`Inspiracionalismo Mecánico / ~Dictado`). No se muestra en el visor ni cambia la identidad de la postura: citarla sin la marca sigue siendo la misma postura.

## Particularidad estructural: no es un árbol binario estricto
Una misma postura puede tener **varias líneas `->`**, cada una abriendo un eje de decisión independiente sobre un tópico distinto. En la estructura, un nodo puede sostener dos preguntas paralelas que exploren dimensiones separadas y generan subárboles que no se solapan.

Consecuencias para quien lea o edite el archivo:
1. La ramificación en un punto (una rama origen) puede ser mayor que 2 aunque actualmente no se cuente con escenarios representativos. El grado del nodo es (número de respuestas) x (número de ejes abiertos).
2. Los subárboles de ejes distintos pueden alcanzar posturas equivalentes por caminos diferentes.
3. Al insertar un nodo hay que decidir primero **a qué eje pertenece**; colgar una pregunta de un eje ajeno puede romper la coherencia del recorrido.
4. Las respuestas no siempre son Sí/No literal: pueden ir glosadas para desambiguar (`No (solo apariencia):`, `No -- Solo una:`, `No -- Dos naturalezas distintas...:`). La glosa forma parte de la arista.
5. Las respuestas pueden ser un listado de posturas no solo `Sí` vs. `No`, pero se prefiere fuertemente que sean binarias.
6. Varias aristas pueden desembocar en **una misma postura**, no solo en una misma pregunta (`&`). Basta con que la respuesta repita el nombre de una postura que ya aparece en otra parte del árbol (o uno de sus sinónimos separados por `/`): ambas aristas apuntan al mismo nodo, y las preguntas que cuelguen de esa postura se escriben una sola vez, en cualquiera de sus apariciones. Ejemplo: `Edad de responsabilidad` se alcanza tanto negando el pecado original como afirmándolo sin culpa original. Excepciones: los `?` nunca se unen entre sí (cada uno es un hueco distinto), y si la postura repetida está dentro de su propio subárbol, el visor la trata como nodo aparte para no formar un ciclo.

## Criterios de diseño de nodos
- Un nodo por afirmación, no por pieza de evidencia; la evidencia se acumula dentro del nodo al desarrollarlo.
- Terminología formal, genérica y neutral: debe abarcar muchas posturas y definir solo el punto central en disputa.

## Cómo leer el árbol:
    Arista= <Respuesta de la Pregunta y descripción implícita de la misma>: <Nombre de Postura> {<sistemas de creencias que adoptan esta postura>}
    Nodo= <Nombre de Postura> -> <Pregunta hacia la Postura>
    Un * en el nombre de la postura significa que es un término sugerido debido a falta de un término oficial.
    Un ? en el nombre de la postura significa que no se cuenta actualmente con un nombre de la misma o se tiene duda; no significa que esté incompleto, es posible que no exista un término para el mismo.

## Regenerar el visor

Desde la raíz del repositorio: en **cmd** `run`, en **PowerShell** `.\run.ps1`,
o doble clic en **[run.cmd](../run.cmd)**. Sincroniza Drive y regenera los datos
de este árbol para el visor.

El visor se abre con doble clic en **[arbol-web/index.html](diagramas/arbol-web/index.html)**.



## Árbol de Decisión:
- Existencia -> ¿El cosmos fue creado `ex nihilo` (de la nada) por el *Fundamento Último*, el cual es incausado y, por tanto, necesariamente eterno? (¿El universo fue causado por un Creador?) { [[La inexistencia de un Dios creador]] }
  - Sí: Creacionismo cosmológico* / Teísmo filosófico
    - Creacionismo cosmológico* / Teísmo filosófico -> ¿Jesucristo realmente existió?
      - No: Miticismo
      - Sí: Historicidad de Jesús*
        - Historicidad de Jesús* -> ¿Jesús de alguna manera, en algún momento afirmó ser igual al *Fundamento Último*? (¿Jesús afirmó ser Dios?)
          - No: ?
            - ? -> ¿La evidencia de los milagros de Jesús es suficiente para concluir que realmente ocurrieron?
              - No: ? {Judaísmo moderno/liberal (académico), Deísmo}
              - Sí: ?
                - ? -> ¿Jesucristo existió antes de su concepción humana? (¿Jesús ya existía antes de nacer?)
                  - Sí: Preexistencialismo*
                    - Preexistencialismo* -> ¿Fue Jesucristo la primera y más alta de las criaturas, de rango superior a toda otra, y por medio de la cual se hizo todo lo demás? (¿Jesús fue la primera criatura?) { [[La Naturaleza de Dios — Posiciones sobre la Trinidad]] }
                      - Sí: Arrianismo
                        - Arrianismo -> ¿Es Jesús identificado como el Arcángel Miguel? { [[Jehovah Witnesses]] }
                          - Sí: [[El Arrianismo de TJ|Arrianismo de los JW (Testigos de Jehová)]]
                          - No: Arrianismo Clásico {Arrianismo germánico (godos, vándalos, lombardos; histórico)}
                      - No: ?
                  - No: Psilantropismo
                    - Psilantropismo -> ¿Dios adoptó a Jesucristo como hijo posteriormente (p. ej., en su bautismo)?
                      - Sí: Adopcionismo {Ebionismo}
                      - No: ?
                        - ? -> ¿Jesucristo murió en la crucifixión?
                          - Sí: ?
                            - ? -> ¿Jesucristo resucitó?
                              - Sí: Socinianismo {Cristadelfianos, Unitarismo bíblico, Iglesia ni Cristo}
                              - No: ?
                          - No: ?
                            - ? -> ¿Jesucristo fue crucificado?
                              - Sí -- sobrevivió a la crucifixión: Teoría del desmayo {Islam Ahmadí}
                              - No: Teoría de la sustitución {Islam Suní/Chiita}
          - Sí: ?
            - ? -> ¿La evidencia de los milagros de Jesús es suficiente para concluir que realmente ocurrieron?
              - No: Naturalismo cristológico*
                - Naturalismo cristológico* -> ¿Jesús fue un profeta?
                  - Sí: Profetismo naturalista*
                  - No: Reduccionismo histórico*
                    - Reduccionismo histórico* -> ¿Jesús fue un engañador?
                      - Sí: Postura del Impostor {Judaísmo rabínico/talmúdico}
                      - No: ?
                        - ? -> ¿Jesús fue solo un sabio?
                          - Sí: Postura del Maestro moral*
                          - No: ?
                            - ? -> ¿Jesús fue solamente una persona confundida?
                              - Sí: Postura del Lunático
                              - No: Postura de la Leyenda
              - Sí: ?
                - ? -> ¿Los milagros (especialmente su resurrección) y demás evidencias funcionan como signos acreditativos de la identidad divina declarada de Jesús? (¿Jesús es Dios?)
                  - No: ?
                    - ? -> ¿Es Jesucristo un ser creado?
                      - No: Subordinacionismo
                      - Sí: Cristo-creaturismo*
                        - Cristo-creaturismo* -> ¿Fue Jesucristo en algún punto inferior y subordinado al *Fundamento Último*? (¿Fue Jesús inferior a Dios?)
                          - No: ?
                          - Sí: ?
                            - ? -> ¿Era Jesucristo inicialmente un ser divino?
                              - Sí: ?
                              - No: Unitarismo
                                - Unitarismo -> ¿Dios adoptó a Jesucristo como hijo posteriormente?
                                  - Sí: Adopcionismo
                                  - No: Unitarismo Clásico
                                    - Unitarismo Clásico -> ¿Jesucristo llegó a morir?
                                      - Sí: ?
                                        - ? -> ¿Jesucristo resucitó?
                                          - Sí: ?
                                          - No: ?
                                      - No: ?
                  - Sí: Encarnacionismo
                    - Encarnacionismo & Subordinacionismo -> ¿El uso normativo y litúrgico que Jesucristo hace de las Escrituras hebreas es evidencia suficiente para reconocer al menos las referencias como texto con inspiración u origen divino autoritativo? (¿Parte del Antiguo Testamento proviene de Dios?)
                      - No: Teología Liberal / Racionalismo Teológico?
                      - Sí: ?
                        - ? -> ¿El reconocimiento de inspiración u origen divino se extiende al conjunto del Tanaj/TaNaKh (antiguo Testamento), y no solo a los libros expresamente citados? (¿Todo el Antiguo Testamento proviene de Dios?) { [[Is the Bible God’s Revelation_]] }
                          - No: Canon veterotestamentario restringido*
                          - Sí: Canon veterotestamentario pleno*
                            - Canon veterotestamentario pleno* -> ¿La comisión que Jesucristo confiere a sus apóstoles para transmitir su enseñanza, el reconocimiento recíproco entre los apóstoles y la recepción de la iglesia primitiva es evidencia suficiente para reconocer el testimonio apostólico como texto con inspiración o de origen divino autoritativo? (¿Las cartas apostólicas provienen de Dios?)
                              - No: ?
                                - ? -> ¿Solo las palabras de Jesús dentro del Nuevo Testamento son autoritativas?
                                  - Sí: Cristianismo de letras rojas*
                                  - No: ?
                                - ? -> ¿Dios intensificó la percepción espiritual de los autores del Nuevo Testamento sin comunicarles el contenido de lo que escribirían y lo que reciben de Dios no difiere en especie de lo que recibe cualquier creyente, siendo el resultado un producto mismo del escritor siendo simplemente elevado? (¿Dios solo ayudó a los escritores del NT a percibir mejor al escribir?) { [[tipos-de-inspiracion-biblica.md]] }
                                  - Sí: Postura de la Iluminación Divina (teoría de la iluminación o mística)
                                  - No: ?
                                    - ? -> ¿Los autores neotestamentarios fueron simplemente genios religiosos, en principio no distintos de otros grandes pensadores y no hubo alguna acción especial de parte de Dios al escribir la Biblia? (¿El Nuevo Testamento es creación humana?)
                                      - Sí: Postura de la Intuición Natural (o inspiración natural)
                                      - No: ?
                              - Sí: Autoridad apostólica derivada*
                                - Autoridad apostólica derivada* -> ¿La recepción universal de la iglesia primitiva y el trato que da al resto de los escritos neotestamentarios, en pie de igualdad con los ya reconocidos, son evidencia suficiente para extenderles ese mismo reconocimiento como texto con inspiración o de origen divino autoritativo? (¿El Nuevo Testamento proviene de Dios?) { [[Is the Bible God’s Revelation_]]}
                                  - No: Canon neotestamentario restringido*
                                  - Sí: Canon neotestamentario pleno*
                                    - Canon neotestamentario pleno* -> ¿El autotestimonio explícito de las escrituras autoritativas sobre su origen divino, la atribución de sus palabras al Espíritu Santo como autor primario y su autoidentificación como Palabra de Dios con autoridad inquebrantable son evidencia suficiente para concluir que es producto de la inspiración divina? (¿La Biblia es inspirada por Dios?) { [[Is the Bible God’s Revelation_]], [[La Biblia - La Palabra de Dios]], [[The Bible, Weapon of Desperate]] }
                                      - Sí: Postura de la inspiración bíblica
                                        - Postura de la inspiración bíblica -> ¿La Biblia es clara y sin ambigüedades en su mensaje?
                                          - Sí: Perspicuidad de las Escrituras
                                            - Perspicuidad de las Escrituras -> ¿Esa claridad se extiende a todo lo que la Biblia enseña, y no solo a lo necesario para la salvación? (¿Toda la Biblia es clara, y no solo el mensaje de salvación?)
                                              - Sí: Perspicuidad plena*
                                              - No -- la claridad abarca al menos lo necesario para la salvación, no todos los pasajes: Perspicuidad salvífica* {Reformados/Presbiterianos (Confesión de Westminster 1.7), Bautistas (Confesión de 1689), Luteranismo}
                                          - No: ? {Catolicismo, Ortodoxia (calcedonense)}
                                        - Postura de la inspiración bíblica -> ¿Todo lo que la Biblia afirma es completamente verdadero?
                                          - Sí: Inerrancia bíblica {Catolicismo, Luteranismo confesional (LCMS, WELS), Reformados conservadores (PCA, OPC), Bautistas, Pentecostalismo (Asambleas de Dios), Evangelicalismo conservador (Declaración de Chicago)}
                                          - No: Errancia bíblica* {Protestantismo de línea principal (ELCA, PCUSA, Iglesia Episcopal, Metodismo Unido)}
                                        - Postura de la inspiración bíblica -> ¿La interpretación de la Biblia requiere de un magisterio eclesiástico con autoridad infalible?
                                          - Sí: Infalibilidad de la Iglesia {Catolicismo, Ortodoxia (calcedonense), Ortodoxia oriental (no calcedonense)}
                                          - No: Sola Scriptura {Luteranismo, Reformados/Presbiterianos, Anglicanismo, Bautistas, Metodismo, Pentecostalismo, Anabaptismo, Adventismo}
                                        - Postura de la inspiración bíblica -> ¿El pecado de Adán afectó a su descendencia, el humano nace muerto y con una naturaleza pecaminosa (aunque no activamente pecando)? (¿El humano nace con una "Naturaleza pecaminosa"?) { [[depravación-total-del-humano]], [[La Depravación Total del Hombre]] }
                                          - No -- El hombre nace sin pecado y con la capacidad de **hacer el bien y alcanzar el cielo**: ?
                                            - ? -> ¿**Antes del Discernimiento**, la inocencia humana le da acceso al cielo y no puede pecar? (¿Los niños van al cielo al morir?)
                                              - Sí: Edad de responsabilidad {Iglesias de Cristo (Restauracionismo)}
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
                                          - Sí: Pecado original {Bautistas}
                                            - Pecado original -> ¿**Antes del Discernimiento** el humano sigue estando condenado debido a su estado de muerte (estado de “pecador”) aun sin haber cometido pecado? (¿Al morir un niño, va a un lugar diferente al cielo?)
                                              - Sí: Culpa original {Anglicanismo}
                                                - Culpa original -> ¿Es posible infundirle “gracia” (un Don divino que es posible perder) salvadora con sacramentos como el bautismo regenerador? (¿El niño debe ser bautizado para ir al cielo, pero no le asegura la entrada?)
                                                  - Sí: Regeneración bautismal {Catolicismo, Luteranismo, Anglicanismo anglocatólico}
                                                    - Regeneración bautismal -> ¿El no haber recibido el bautismo lo deja condenado al Limbo?
                                                      - Sí: Limbo de los niños {Catolicismo escolástico (s. XIII–XX; Catecismo de Pío X)}
                                                      - No: ?
                                                        - ? -> ¿El no haber recibido el bautismo lo deja condenado al Infierno?
                                                          - Sí: Condenación de los infantes no bautizados* {Agustinismo (s. V–XII)}
                                                          - No: Esperanza de salvación de los infantes no bautizados*
                                                  - No: ? {Reformados/Presbiterianos, Bautistas reformados, Anglicanismo evangélico}
                                              - No -- la inocencia le da acceso al cielo y no puede pecar: Edad de responsabilidad {Ortodoxia (calcedonense; pecado ancestral sin culpa heredada), Bautistas (mayoría; Fe y Mensaje Bautista 2000), Pentecostalismo (Asambleas de Dios), Anabaptismo (menonitas)}
                                            - Pecado original -> ¿Después del Discernimiento es posible para el humano alcanzar el cielo mediante sus buenas obras? (¿Puede un adulto ir al cielo siendo bueno?)
                                              - Sí: ?
                                              - No: ?
                                                - ? -> ¿Después de pecar el ser humano necesita una transformación/conversión/regeneración espiritual para entrar al cielo? (¿Se necesita una conversión para entrar al cielo?)
                                                  - No: ?
                                                  - Sí: Conversionismo {Bautistas}
                                                    - Conversionismo -> ¿Es posible que el humano rechace el llamado de Dios a recibir la gracia que le lleva a esa conversión? (¿Puede el hombre resistir el llamado a la conversión?) { [[Monergismo.md]] }
                                                      - No: Gracia Irresistible {Reformados/Presbiterianos, Bautistas reformados}
                                                      - Sí: Gracia Resistible {Catolicismo, Ortodoxia (calcedonense), Luteranismo, Metodismo/Arminianismo, Movimiento de Santidad (Nazarenos), Pentecostalismo, Bautistas no calvinistas (incl. Bautistas Libres), Adventismo, Anabaptismo}
                                                    - Conversionismo -> ¿La elección de quiénes reciben el llamado de Dios a recibir la gracia que le lleva a esa conversión se basa únicamente en la voluntad de Dios, y no en algo previsto en el humano (fe, obras, mérito o voluntad)? (¿Dios elige a sus santos incondicionalmente?) { [[La Predestinación]] }
                                                      - Sí: Elección incondicional {Reformados/Presbiterianos, Bautistas reformados, Luteranismo}
                                                      - No: Elección condicional {Ortodoxia (calcedonense; Confesión de Dositeo, decreto 3), Metodismo/Arminianismo, Movimiento de Santidad (Nazarenos), Pentecostalismo, Bautistas no calvinistas (incl. Bautistas Libres), Adventismo, Anabaptismo}
                                                    - Conversionismo -> ¿Si al humano le falta 1 de estos elementos, puede tener esa conversión?: 1) Escuchar el evangelio, 2) Creer en el evangelio, 3) tener Fe en Cristo Jesús, 4) Entregarle su vida a Dios por completo (Arrepentimiento), 5) Invocar el nombre de Dios (pedir ayuda)? (¿El humano puede convertirse sin invocar el nombre de Dios o algún paso anterior?)
                                                      - Sí: ? {Catolicismo, Ortodoxia (calcedonense), Luteranismo, Reformados/Presbiterianos (Confesión de Westminster 10.3), Bautistas reformados (Confesión de 1689, 10.3)}
                                                      - No: ?
                                                        - ? -> ¿El humano tiene esa transformación solo hasta el punto del bautismo y es en ese momento cuando ocurre esa conversión/transformación? (¿El Bautismo Salva?) { [[La Salvación Bautismal]] }
                                                          - Sí: Salvación Bautismal
                                                          - No: ? {Metodismo/Arminianismo, Movimiento de Santidad (Nazarenos), Pentecostalismo, Bautistas no calvinistas (incl. Bautistas Libres), Adventismo, Anabaptismo}
                                                    - Conversionismo -> ¿El volver a pecar después de esa conversión remueve del humano el derecho a entrar al cielo? (¿La Salvación se puede perder?) { [[La Perdida de la Salvación]] }
                                                      - No: [[Conclusión de la Pérdida de la Salvación|Perseverancia de los Santos]] {Reformados/Presbiterianos, Bautistas (Bautistas del Sur, Bautistas reformados)}
                                                      - Sí: Preservación Condicional de los Santos {Catolicismo, Ortodoxia (calcedonense), Luteranismo, Anglicanismo, Metodismo/Arminianismo, Pentecostalismo, Bautistas Libres, Adventismo, Anabaptismo}
                                                    - Conversionismo -> ¿Esa conversión es obra exclusiva de Dios, sin que el humano coopere en ella? (¿Dios produce la conversión sin ayuda del humano?)  { [[Monergismo.md]] }
                                                      - Sí: Monergismo {Reformados/Presbiterianos, Bautistas reformados, Luteranismo}
                                                      - No -- el humano aporta algo: Sinergismo {Catolicismo, Ortodoxia (calcedonense), Metodismo/Arminianismo, Movimiento de Santidad (Nazarenos), Pentecostalismo, Bautistas no calvinistas (incl. Bautistas Libres), Adventismo, Anabaptismo}
                                        - Postura de la inspiración bíblica -> ¿Debe entenderse que la inspiración divina de la Biblia fue plena y se extendió a la totalidad de las Escrituras, de modo que cada una de sus partes y todo lo que los autores bíblicos escribieron quedó comprendido bajo la acción inspiradora de Dios? (¿Cada parte de la Biblia fue inspirada?) { [[tipos-de-inspiracion-biblica.md]] }
                                          - Sí: Inspiracionalismo Plenario {Catolicismo, Adventismo}
                                          - No -- la Biblia fue inspirada parcialmente: Inspiracionalismo Limitado
                                            - Inspiracionalismo Limitado -> ¿Cuál es, en este sentido, el límite o la extensión de la inspiración?
                                              - Ciertos Hechos o Dichos de los apóstoles fueron inspirados: Inspiracionalismo Limitado Selectivo
                                              - Ciertas Secciones (físicas) de la Biblia: Inspiracionalismo Limitado Parcial
                                              - Cierto Contenido o Temas fueron inspirados -- (por ejemplo, solo las palabras de Jesús o solo el tema de la salvación fue inspirado): ?
                                        - Postura de la inspiración bíblica -> ¿Lo que Dios inspiró fueron las palabras y no solamente temas o conceptos a los escritores? (¿Dios inspiró las palabras que mandó escribir?) { [[tipos-de-inspiracion-biblica.md]] }
                                          - Sí: Inspiracionalismo Verbal
                                          - No: Inspiracionalismo Dinámico / ~Conceptual {Adventismo (inspiración del pensamiento)}
                                        - Postura de la inspiración bíblica -> ¿Dios comunicó lo inspirado usando al escritor como mero instrumento, sin que este aportara su propia elaboración (experiencia, personalidad, vocabulario o facultades)? (¿El escritor fue solo un instrumento, como quien escribe un dictado?) { [[tipos-de-inspiracion-biblica.md]] }
                                          - Sí: Inspiracionalismo Mecánico / ~Dictado
                                          - No: Inspiracionalismo Orgánico / ~Concursal / ~Confluente {Catolicismo, Adventismo}
                                            - Inspiracionalismo Plenario & Inspiracionalismo Verbal & Inspiracionalismo Orgánico / Concursal / Confluente -> ¿Es plausible concebir un escenario en el que, incluso suponiendo una exégesis ideal, una interpretación bíblica alcance un grado de certeza suficientemente alto —o una incertidumbre suficientemente baja— como para considerarla segura en al menos uno de los tópicos específicos que la Biblia expone? (¿El hombre puede entender lo que la Biblia expresa sobre al menos una cosa?)
                                              - Sí: ? {Bautistas, Luteranismo confesional, Reformados conservadores, Pentecostalismo (Asambleas de Dios), Evangelicalismo conservador (Declaración de Chicago)}
                                              - No: ?
                                      - No: ?
                                        - ? -> ¿El autor humano, al escribir, pudo haber introducido en lo que la Escritura afirma como verdadero y normativo algo que no corresponde a lo que Dios quiso comunicar? (¿Se les pudo colar a los autores algún error u opinión propia al escribir la Biblia?)
                                          - Sí: ?
                                          - No: Postura de la inspiración bíblica
                    - Encarnacionismo -> ¿Fue Jesús, en algún momento, en sustancia, igual a Dios y, por tanto, poseyó una naturaleza divina? (¿Dios es la misma sustancia que Jesús?) { [[La Naturaleza de Dios — Posiciones sobre la Trinidad]] }
                      - No: Homoiousianismo / Semi-Arrianismo
                      - Sí: Consustancialismo
                        - Consustancialismo -> ¿Esa igualdad en sustancia con Dios es eterna —sin principio— y no adquirida a partir de algún momento (como su concepción, bautismo, resurrección o exaltación)? (¿Jesús siempre fue Dios?)
                          - Sí: Consustancialismo eterno*
                            - Consustancialismo eterno* -> ¿El Padre y el Hijo no son sujetos personalmente distintos, ni coexisten simultánea y eternamente, ni pueden relacionarse entre sí como un yo y un tú, pues son un único sujeto que se manifiesta sucesivamente bajo distintos modos o papeles? (¿Dios se transformó en Jesucristo y cuando habla con el Padre no habla con otra persona de la Trinidad, sino consigo mismo?) { [[Modalismo]], [[La Naturaleza de Dios — Posiciones sobre la Trinidad]] }
                              - Sí: Modalismo / Unicitarismo / Unicitarianismo {Pentecostalismo unicitario (Iglesia Pentecostal Unida), Sabelianismo (histórico)}
                              - No -- Aunque sean 2 personas distintas, ambos comparten una misma e idéntica sustancia divina: Trinitarianismo/Trinitarismo
                                - Trinitarianismo/Trinitarismo -> ¿Jesús tuvo un cuerpo y naturaleza humana real?
                                  - No (solo apariencia): Docetismo
                                  - Sí: ?
                                    - ? -> ¿Jesús tuvo una mente/alma humana racional completa?
                                      - No: Apolinarismo
                                      - Sí: ?
                                        - ? -> ¿Las actividades atribuidas a la naturaleza divina (existir eternamente, hacer milagros, perdonar pecados) y aquellas atribuidas a la naturaleza humana (descansar, aprender, sufrir, morir) son atribuidas a una sola *hipóstasis* (sujeto personal), Jesucristo, sin que existan en él dos *hipóstasis* (sujetos personales) distintas que impliquen que lo que hace o padece la naturaleza humana no pueda atribuirse propiamente al sujeto divino, es decir, la misma *hipóstasis* (sujeto personal), Jesucristo, es quien perdona pecados y quien muere, aunque lo primero corresponda a su naturaleza divina y lo segundo a su naturaleza humana, y no a dos *hipóstasis* (sujetos personales) distintas? (¿Es la misma persona quien perdonó pecados y quien murió en la cruz?)
                                          - No: Dualidad hipostática de Cristo* {Nestorianismo, Iglesia Asiria del Oriente (históricamente; hoy rechaza la etiqueta)}
                                          - Sí: Monoprosopismo
                                            - Monoprosopismo -> ¿La naturaleza humana, al unirse con la divina, dejó de subsistir con sus propias propiedades —no por haber faltado, sino por haber sido transformada, absorbida o mezclada en el acto mismo de la unión—, de modo que el Cristo encarnado subsiste en una sola naturaleza, aun cuando provenga de dos? (¿la divinidad de Cristo anuló su humanidad?) { [[naturalezas-de-cristo]] }
                                              - Sí -- subsiste en una sola naturaleza, en la que lo humano queda absorbido por lo divino: Monofisismo / Eutiquianismo
                                              - No -- Cristo conserva su naturaleza humana, Cristo es plenamente Dios y plenamente hombre: Diofisismo / Calcedonianismo / Miafisismo {Bautistas, Pentecostalismo trinitario, Adventismo, Anabaptismo}
                                                - Diofisismo / Calcedonianismo / Miafisismo -> En el Getsemaní Cristo pedía al Padre pasará la copa, tenía la voluntad de morir mientras no quería hacerlo, ¿Tenía Jesucristo dos voluntades? (¿Jesús podía querer como hombre algo distinto de lo que quería como Dios, y aun así obedecer?) { [[naturalezas-de-cristo]] }
                                                  - No -- el "querer" es acto de la persona— siendo Cristo una sola persona, quiere con un solo querer, y su humanidad no añade otro: Monotelitismo / monotelismo {Ortodoxia oriental (no calcedonense; una voluntad unida), Maronitas (históricamente)}
                                                  - Sí -- el "querer" es facultad de la naturaleza— una humanidad íntegra incluye su propio querer, que libremente se conforma al divino: [[diotelitismo#3-c-mo-operan-las-dos-voluntades-sin-entrar-en-conflicto|Diotelitismo]] {Ortodoxia (calcedonense), Catolicismo, Luteranismo, Anglicanismo, Reformados/Presbiterianos}
                          - No -- la adquirió en algún momento: Consustancialismo adquirido*
  - No: Cosmología no creacionista*
    - Cosmología no creacionista* -> ¿Los elementos que conforman el cosmos que conocemos siempre han existido, sin haber sido causados por nada más? (¿El cosmos es eterno y nada lo causó?)
      - Sí: Eternidad incausada del cosmos*
        - Eternidad incausada del cosmos* -> ¿Lo que existe eternamente y sin causa (el *Fundamento Último*) posee mente, en su totalidad o en alguna de sus partes, de modo que piensa y conoce? (¿El Fundamento Último tiene mente y piensa?)
          - Sí: ?
            - ? -> ¿El cosmos que conocemos sí fue formado (no creado) por un `ente` con eternidad? (¿El universo fue formado por alguien eterno?)
              - Sí: Panenteísmo / Demiurgo platónico / creatio ex materia
                - Panenteísmo / Demiurgo platónico / creatio ex materia -> ¿Esta conclusión se fundamenta puramente en el uso de lógica y filosofía?
                  - No -- Existen otras fuentes confiables que lo afirman: ? {Mormonismo (SUD), Vedānta Viśiṣṭādvaita, Vedānta Dvaita}
                  - Sí: ?
              - No: Panteísmo {Advaita Vedānta, Jainismo, Sāṃkhya}
            - ? -> ¿El *Fundamento Último* está compuesto de dos partes, una que piensa (mente) y otra que no piensa (materia o cuerpo)? (¿El Fundamento Último tiene una parte con mente y otra que no?)
              - Sí: Fundamento Último compuesto* {Sāṃkhya, Jainismo}
              - No -- piensa en su totalidad: Fundamento Último unitario* {Advaita Vedānta}
          - No: Materialismo {Cārvāka, Epicureísmo, Naturalismo ateo}
        - Eternidad incausada del cosmos* -> ¿El cosmos eterno consiste en una sucesión de estados, cada uno causado por otro anterior, sin un primer estado? (¿El universo siempre ha estado cambiando, sin un primer momento?)
          - Sí: Regresión infinita* {Hinduismo, Budismo, Jainismo}
          - No: ?
      - No: ?
        - ? -> ¿Los elementos que conforman el cosmos surgieron de la sustancia misma del *Fundamento Último*, y no de la nada ni de una materia ajena a él? (¿El universo salió del Fundamento Último mismo?)
          - Sí: Emanacionismo {Neoplatonismo}
          - No: ?
            - ? -> ¿El cosmos surgió sin causa alguna? (¿El universo apareció de la nada, sin que nada lo causara?)
              - Sí: ?
              - No: ?
