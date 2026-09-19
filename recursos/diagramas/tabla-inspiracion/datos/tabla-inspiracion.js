/* Datos y clasificación de la tabla comparativa de posturas sobre el origen del
   texto bíblico. Este archivo es la fuente de verdad: se edita a mano y no se
   genera desde ningún otro.

   Todo lo que sigue a la asignación es JSON válido; esa primera línea es la única
   que no lo es. Está así, y no como .json, porque la página se abre con doble clic
   (file://) y ahí el navegador bloquea fetch y XHR de archivos locales por tratarse
   de un origen opaco. Un .json obligaría a mantener dos copias del mismo contenido.
   Para validarlo o formatearlo con una herramienta JSON, copia desde la primera llave.

   Lleva el contenido (10 posturas x 20 criterios, en español e inglés) y también la
   clasificación de la tabla: los grupos temáticos, qué columnas son de etiquetas y con
   qué tono de color se pintan, los valores de cada eje y el corte de la teopneustia.
   El bloque "esquema" documenta qué hace la página con cada propiedad.

   Cualquier corrección doctrinal se aplica aquí y en el documento fuente que indica
   "documento_fuente". */
window.TABLA_DATOS =
{
  "version": "1.0.0",
  "documento_fuente": "recursos/definiciones/posturas-origen-texto-biblico.md",
  "idiomas": [
    "es",
    "en"
  ],
  "esquema": {
    "proposito": "Contenido y clasificación de la tabla comparativa de posturas sobre el origen del texto bíblico. Este archivo es la fuente de verdad y se edita a mano; no se genera desde ningún otro.",
    "regla_de_oro": "Cualquier corrección doctrinal se aplica aquí y en el documento fuente. La página no inventa contenido: todo lo que muestra sale de este archivo.",
    "idiomas": "Cada texto visible existe como objeto { es, en }. La página nunca traduce al vuelo.",
    "grupos": "Agrupación temática de los criterios. La página los usa como fila de encabezado sobre las columnas, como bloques del menú de criterios y como secciones de la ficha de postura.",
    "grupos_orden": "El orden de este arreglo tiene que coincidir con el orden en que los grupos aparecen en criterios: la fila de encabezado calcula el ancho de cada rótulo contando las columnas de su grupo, y si los dos órdenes se desalinean los rótulos dejan de corresponder con las columnas que cubren. Al mover un criterio a otra posición, mueve su grupo aquí igual.",
    "criterios": {
      "id": "Clave con la que se busca el valor dentro de posturas[].celdas.",
      "grupo": "Id del grupo temático al que pertenece la columna.",
      "es_en": "Rótulo de la columna en cada idioma.",
      "esBadges": "Si es true, los valores de esa columna son etiquetas cortas y repetidas; la página las pinta como pastilla de color en vez de texto corrido.",
      "orden": "El orden del arreglo es el orden de las columnas en la página. Los criterios de un mismo grupo tienen que ir seguidos, por lo mismo que explica grupos_orden."
    },
    "posturas": {
      "id": "Identificador estable; se usa en la dirección compartible, así que renombrarlo invalida los enlaces guardados.",
      "es_en": "Nombre completo, tal como aparece en el documento fuente. Es la etiqueta de la fila y el título de la ficha.",
      "corto": "Nombre abreviado derivado de los ejes. Se usa en las pastillas de selección, donde el nombre completo no cabe.",
      "teopneustia": "false en las dos posturas que quedan fuera de la teopneustia. La página marca visualmente ese corte.",
      "eje": "Valor de cada eje, o null cuando el eje no aplica. Alimenta el filtro por ejes; un null nunca coincide con ningún valor marcado.",
      "celdas": "Un valor por cada criterio, con la misma clave que criterios[].id.",
      "orden": "El orden del arreglo es el orden de las filas: recorre la rejilla de ejes y deja al final las dos posturas fuera de la teopneustia. No es alfabético y no debe reordenarse."
    },
    "celdas": {
      "es_en": "Texto de la celda en cada idioma. En vista compacta la página lo recorta a tres líneas y ofrece abrirlo completo.",
      "badge": "Opcional. Clave dentro de etiquetas. Presente solo cuando el valor es una de esas etiquetas cortas; su ausencia en una columna con esBadges significa que esa celda concreta es texto corrido."
    },
    "etiquetas": {
      "es_en": "Texto que se muestra dentro de la pastilla.",
      "tono": "Color semántico que la página aplica: positivo, negativo, medio, neutro o especial. El color vive en el dato, no en el código."
    },
    "ejes": {
      "estructura": "Por cada eje, los valores que la página ofrece como filtro, con su rótulo en cada idioma.",
      "semantica": "Los valores marcados dentro de un mismo eje suman; entre ejes distintos restringen. Marcar un valor reescribe la selección de posturas."
    }
  },
  "etiquetas": {
    "no": {
      "es": "No",
      "en": "No",
      "tono": "positivo"
    },
    "si": {
      "es": "Sí",
      "en": "Yes",
      "tono": "negativo"
    },
    "matizada": {
      "es": "Matizada",
      "en": "Nuanced",
      "tono": "medio"
    },
    "no-teopneustia": {
      "es": "No",
      "en": "No",
      "tono": "neutro"
    },
    "amplia": {
      "es": "Amplia",
      "en": "Wide",
      "tono": "positivo"
    },
    "moderada": {
      "es": "Moderada",
      "en": "Moderate",
      "tono": "medio"
    },
    "escasa": {
      "es": "Escasa",
      "en": "Scarce",
      "tono": "negativo"
    },
    "historica": {
      "es": "Histórica",
      "en": "Historical",
      "tono": "especial"
    }
  },
  "grupos": [
    {
      "id": "ejes",
      "es": "Ejes",
      "en": "Axes"
    },
    {
      "id": "sintesis",
      "es": "Síntesis",
      "en": "Synthesis"
    },
    {
      "id": "obra-autor",
      "es": "Obra de Dios sobre el autor",
      "en": "God's work upon the author"
    },
    {
      "id": "consecuencias",
      "es": "Consecuencias sobre el texto",
      "en": "Consequences for the text"
    },
    {
      "id": "diagnostico",
      "es": "Diagnóstico",
      "en": "Diagnosis"
    },
    {
      "id": "recepcion",
      "es": "Recepción",
      "en": "Reception"
    }
  ],
  "criterios": [
    {
      "id": "prefijo",
      "grupo": "ejes",
      "es": "Prefijo",
      "en": "Prefix"
    },
    {
      "id": "alcance",
      "grupo": "ejes",
      "es": "Alcance",
      "en": "Scope"
    },
    {
      "id": "objeto",
      "grupo": "ejes",
      "es": "Objeto",
      "en": "Object"
    },
    {
      "id": "metodo",
      "grupo": "ejes",
      "es": "Método",
      "en": "Method"
    },
    {
      "id": "descripcion",
      "grupo": "sintesis",
      "es": "Descripción",
      "en": "Description"
    },
    {
      "id": "accionEspiritu",
      "grupo": "obra-autor",
      "es": "Acción del Espíritu sobre el autor",
      "en": "The Spirit's action upon the author"
    },
    {
      "id": "comunicaContenidoNuevo",
      "grupo": "obra-autor",
      "es": "¿Comunica contenido nuevo?",
      "en": "Does it communicate new content?"
    },
    {
      "id": "origenPalabras",
      "grupo": "obra-autor",
      "es": "Origen de las palabras",
      "en": "Origin of the words"
    },
    {
      "id": "origenContenido",
      "grupo": "obra-autor",
      "es": "Origen del contenido",
      "en": "Origin of the content"
    },
    {
      "id": "papelPersonalidad",
      "grupo": "obra-autor",
      "es": "Papel de la personalidad del autor",
      "en": "Role of the author's personality"
    },
    {
      "id": "sujetoAccionDivina",
      "grupo": "obra-autor",
      "es": "Sujeto de la acción divina",
      "en": "Subject of the divine action"
    },
    {
      "id": "esPalabraDeDios",
      "grupo": "consecuencias",
      "es": "¿El texto es Palabra de Dios?",
      "en": "Is the text the Word of God?"
    },
    {
      "id": "inerranciaImplicada",
      "grupo": "consecuencias",
      "es": "Inerrancia implicada",
      "en": "Inerrancy implied"
    },
    {
      "id": "revelacionProposicional",
      "grupo": "consecuencias",
      "es": "Revelación proposicional",
      "en": "Propositional revelation"
    },
    {
      "id": "dentroTeopneustia",
      "grupo": "consecuencias",
      "es": "¿Dentro de la teopneustia?",
      "en": "Within theopneustia?",
      "esBadges": true
    },
    {
      "id": "nivelaBiblia",
      "grupo": "consecuencias",
      "es": "¿Nivela la Biblia con otros escritos?",
      "en": "Does it level the Bible with other writings?"
    },
    {
      "id": "diferenciaOtrosCreyentes",
      "grupo": "diagnostico",
      "es": "Diferencia respecto de otros creyentes",
      "en": "Difference from other believers"
    },
    {
      "id": "algoAjenoAutor",
      "grupo": "diagnostico",
      "es": "¿Algo ajeno del autor en lo afirmado?",
      "en": "Anything of the author's own in what is affirmed?"
    },
    {
      "id": "respuestaDiagnostica",
      "grupo": "diagnostico",
      "es": "Respuesta a la pregunta diagnóstica",
      "en": "Answer to the diagnostic question",
      "esBadges": true
    },
    {
      "id": "atestiguacion",
      "grupo": "recepcion",
      "es": "Atestiguación",
      "en": "Attestation",
      "esBadges": true
    }
  ],
  "ejes": {
    "prefijo": [
      {
        "valor": "inspiracion",
        "es": "Inspiración",
        "en": "Inspiration"
      },
      {
        "valor": "iluminacion",
        "es": "Iluminación",
        "en": "Illumination"
      },
      {
        "valor": "intuicion",
        "es": "Intuición",
        "en": "Intuition"
      }
    ],
    "alcance": [
      {
        "valor": "plenaria",
        "es": "Plenaria",
        "en": "Plenary"
      },
      {
        "valor": "limitada",
        "es": "Limitada",
        "en": "Limited"
      }
    ],
    "objeto": [
      {
        "valor": "verbal",
        "es": "Verbal",
        "en": "Verbal"
      },
      {
        "valor": "conceptual",
        "es": "Conceptual",
        "en": "Conceptual"
      }
    ],
    "metodo": [
      {
        "valor": "mecanica",
        "es": "Mecánica",
        "en": "Mechanical"
      },
      {
        "valor": "organica",
        "es": "Orgánica",
        "en": "Organic"
      }
    ]
  },
  "posturas": [
    {
      "id": "plenaria-verbal-mecanica",
      "es": "Inspiración Plenaria Verbal Mecánica (Teoría del Dictado)",
      "en": "Verbal Plenary Mechanical Inspiration (Dictation Theory)",
      "corto": {
        "es": "Plenaria · Verbal · Mecánica",
        "en": "Plenary · Verbal · Mechanical"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "plenaria",
        "objeto": "verbal",
        "metodo": "mecanica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Plenaria: toda la Escritura sin excepción",
          "en": "Plenary: the whole of Scripture without exception"
        },
        "objeto": {
          "es": "Verbal: las palabras mismas del texto",
          "en": "Verbal: the very words of the text"
        },
        "metodo": {
          "es": "Mecánica / Teoría del Dictado",
          "en": "Mechanical / Dictation theory"
        },
        "accionEspiritu": {
          "es": "Dios dicta las palabras; el autor las recibe y consigna sin aportar nada propio",
          "en": "God dictates the words; the author receives and records them without contributing anything of his own"
        },
        "comunicaContenidoNuevo": {
          "es": "Sí, tanto en palabras como en contenido",
          "en": "Yes, both in words and in content"
        },
        "origenPalabras": {
          "es": "De Dios directamente",
          "en": "From God directly"
        },
        "origenContenido": {
          "es": "De Dios directamente",
          "en": "From God directly"
        },
        "papelPersonalidad": {
          "es": "Suprimida o irrelevante: el autor funciona como amanuense",
          "en": "Suppressed or irrelevant: the author functions as a mere amanuensis"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos exclusivamente",
          "en": "The biblical authors exclusively"
        },
        "esPalabraDeDios": {
          "es": "Sí, hasta la letra",
          "en": "Yes, down to the letter"
        },
        "inerranciaImplicada": {
          "es": "Total, hasta la palabra",
          "en": "Total, down to the word"
        },
        "revelacionProposicional": {
          "es": "Afirmada sin restricción",
          "en": "Affirmed without restriction"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "No en ningún grado",
          "en": "Not to any degree"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie: es un acto único e irrepetible",
          "en": "Of kind: it is a unique, unrepeatable act"
        },
        "algoAjenoAutor": {
          "es": "No: nada del autor entra en lo afirmado",
          "en": "No: nothing of the author enters into what is affirmed"
        },
        "respuestaDiagnostica": {
          "es": "No",
          "en": "No",
          "badge": "no"
        },
        "atestiguacion": {
          "es": "Histórica; sostenida en épocas pasadas y hoy minoritaria",
          "en": "Historical; held in past eras and a minority view today",
          "badge": "historica"
        },
        "descripcion": {
          "es": "Toda la Biblia fue inspirada por Dios palabra por palabra mediante dictado.",
          "en": "The whole Bible was inspired by God word for word through dictation."
        }
      }
    },
    {
      "id": "plenaria-verbal-organica",
      "es": "Inspiración Plenaria Verbal Orgánica (Concursal / Confluente)",
      "en": "Verbal Plenary Organic Inspiration (Concursive / Confluent)",
      "corto": {
        "es": "Plenaria · Verbal · Orgánica",
        "en": "Plenary · Verbal · Organic"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "plenaria",
        "objeto": "verbal",
        "metodo": "organica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Plenaria: toda la Escritura sin excepción",
          "en": "Plenary: the whole of Scripture without exception"
        },
        "objeto": {
          "es": "Verbal: las palabras mismas del texto",
          "en": "Verbal: the very words of the text"
        },
        "metodo": {
          "es": "Orgánica / Concursal / Confluente",
          "en": "Organic / Concursive / Confluent"
        },
        "accionEspiritu": {
          "es": "Dios obra a través del autor, no a pesar de él; no hay dos momentos separables",
          "en": "God works through the author, not despite him; there are no two separable moments"
        },
        "comunicaContenidoNuevo": {
          "es": "Sí, tanto en palabras como en contenido",
          "en": "Yes, both in words and in content"
        },
        "origenPalabras": {
          "es": "De Dios, producidas mediante el autor y su vocabulario",
          "en": "From God, produced through the author and his vocabulary"
        },
        "origenContenido": {
          "es": "De Dios",
          "en": "From God"
        },
        "papelPersonalidad": {
          "es": "Instrumental y real: estilo, vocabulario, experiencia y temperamento quedan en el texto, preparados providencialmente",
          "en": "Instrumental and real: style, vocabulary, experience, and temperament remain in the text, providentially prepared"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos exclusivamente",
          "en": "The biblical authors exclusively"
        },
        "esPalabraDeDios": {
          "es": "Sí, hasta la letra",
          "en": "Yes, down to the letter"
        },
        "inerranciaImplicada": {
          "es": "Total, hasta la palabra",
          "en": "Total, down to the word"
        },
        "revelacionProposicional": {
          "es": "Afirmada sin restricción",
          "en": "Affirmed without restriction"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "No en ningún grado",
          "en": "Not to any degree"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie: es un acto único e irrepetible",
          "en": "Of kind: it is a unique, unrepeatable act"
        },
        "algoAjenoAutor": {
          "es": "No: la huella humana es formal, no altera lo afirmado",
          "en": "No: the human imprint is formal and does not alter what is affirmed"
        },
        "respuestaDiagnostica": {
          "es": "No",
          "en": "No",
          "badge": "no"
        },
        "atestiguacion": {
          "es": "Amplia; posición mayoritaria en la tradición reformada y evangélica clásica",
          "en": "Wide; the majority position in classic Reformed and evangelical tradition",
          "badge": "amplia"
        },
        "descripcion": {
          "es": "Toda la Biblia fue inspirada verbalmente por Dios, quien obró mediante la experiencia, personalidad, vocabulario y facultades de cada autor humano.",
          "en": "The whole Bible was verbally inspired by God, who worked through the experience, personality, vocabulary, and faculties of each human author."
        }
      }
    },
    {
      "id": "plenaria-conceptual-mecanica",
      "es": "Inspiración Plenaria Conceptual Mecánica",
      "en": "Conceptual Plenary Mechanical Inspiration",
      "corto": {
        "es": "Plenaria · Conceptual · Mecánica",
        "en": "Plenary · Conceptual · Mechanical"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "plenaria",
        "objeto": "conceptual",
        "metodo": "mecanica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Plenaria: toda la Escritura sin excepción",
          "en": "Plenary: the whole of Scripture without exception"
        },
        "objeto": {
          "es": "Dinámica / Conceptual: los pensamientos, no las palabras",
          "en": "Dynamic / Conceptual: the thoughts, not the words"
        },
        "metodo": {
          "es": "Mecánica / Teoría del Dictado",
          "en": "Mechanical / Dictation theory"
        },
        "accionEspiritu": {
          "es": "Dios imprime los conceptos sin que medie la elaboración intelectual del autor",
          "en": "God impresses the concepts without the author's intellectual elaboration coming into play"
        },
        "comunicaContenidoNuevo": {
          "es": "Sí, en el plano conceptual",
          "en": "Yes, at the conceptual level"
        },
        "origenPalabras": {
          "es": "Del autor, que viste con sus términos un contenido recibido",
          "en": "From the author, who clothes received content in his own terms"
        },
        "origenContenido": {
          "es": "De Dios",
          "en": "From God"
        },
        "papelPersonalidad": {
          "es": "Anulada en la recepción del concepto, activa en la redacción",
          "en": "Nullified in receiving the concept, active in the writing"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos exclusivamente",
          "en": "The biblical authors exclusively"
        },
        "esPalabraDeDios": {
          "es": "Sí, en su contenido; no en su formulación",
          "en": "Yes, in its content; not in its wording"
        },
        "inerranciaImplicada": {
          "es": "De los conceptos, no de la expresión",
          "en": "Of the concepts, not of the expression"
        },
        "revelacionProposicional": {
          "es": "Afirmada en el plano conceptual",
          "en": "Affirmed at the conceptual level"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "No",
          "en": "No"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie: es un acto único e irrepetible",
          "en": "Of kind: it is a unique, unrepeatable act"
        },
        "algoAjenoAutor": {
          "es": "Posible en la expresión, no en el concepto",
          "en": "Possible in the expression, not in the concept"
        },
        "respuestaDiagnostica": {
          "es": "Matizada: no en el contenido, sí posiblemente en cómo se dijo",
          "en": "Nuanced: not in the content, but possibly in how it was said",
          "badge": "matizada"
        },
        "atestiguacion": {
          "es": "Escasa: combinación formulable pero tensa, ya que el dictado es por naturaleza verbal",
          "en": "Scarce: a formulable but strained combination, since dictation is verbal by nature",
          "badge": "escasa"
        },
        "descripcion": {
          "es": "Toda la Biblia fue inspirada por Dios en cuanto a sus conceptos, comunicándolos al autor de manera mecánica, sin depender de su elaboración intelectual.",
          "en": "The whole Bible was inspired by God as to its concepts, which were communicated to the author mechanically, without depending on his intellectual elaboration."
        }
      }
    },
    {
      "id": "plenaria-conceptual-organica",
      "es": "Inspiración Plenaria Conceptual Orgánica (Concursal / Confluente)",
      "en": "Conceptual Plenary Organic Inspiration (Concursive / Confluent)",
      "corto": {
        "es": "Plenaria · Conceptual · Orgánica",
        "en": "Plenary · Conceptual · Organic"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "plenaria",
        "objeto": "conceptual",
        "metodo": "organica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Plenaria: toda la Escritura sin excepción",
          "en": "Plenary: the whole of Scripture without exception"
        },
        "objeto": {
          "es": "Dinámica / Conceptual: los pensamientos, no las palabras",
          "en": "Dynamic / Conceptual: the thoughts, not the words"
        },
        "metodo": {
          "es": "Orgánica / Concursal / Confluente",
          "en": "Organic / Concursive / Confluent"
        },
        "accionEspiritu": {
          "es": "Dios comunica el contenido a través de las facultades del autor, que lo elabora y expresa",
          "en": "God communicates the content through the author's faculties, who elaborates and expresses it"
        },
        "comunicaContenidoNuevo": {
          "es": "Sí, en el plano conceptual",
          "en": "Yes, at the conceptual level"
        },
        "origenPalabras": {
          "es": "Del autor, elegidas libremente",
          "en": "From the author, freely chosen"
        },
        "origenContenido": {
          "es": "De Dios",
          "en": "From God"
        },
        "papelPersonalidad": {
          "es": "Determinante en la expresión: el autor formula con sus propios recursos lo recibido",
          "en": "Decisive in the expression: the author formulates what he received using his own resources"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos exclusivamente",
          "en": "The biblical authors exclusively"
        },
        "esPalabraDeDios": {
          "es": "Sí, en su contenido; no en su formulación",
          "en": "Yes, in its content; not in its wording"
        },
        "inerranciaImplicada": {
          "es": "De los conceptos, no de la expresión",
          "en": "Of the concepts, not of the expression"
        },
        "revelacionProposicional": {
          "es": "Afirmada en el plano conceptual",
          "en": "Affirmed at the conceptual level"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "No",
          "en": "No"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie: es un acto único e irrepetible",
          "en": "Of kind: it is a unique, unrepeatable act"
        },
        "algoAjenoAutor": {
          "es": "Posible en la expresión, no en el concepto",
          "en": "Possible in the expression, not in the concept"
        },
        "respuestaDiagnostica": {
          "es": "Matizada: no en el contenido, sí posiblemente en cómo se dijo",
          "en": "Nuanced: not in the content, but possibly in how it was said",
          "badge": "matizada"
        },
        "atestiguacion": {
          "es": "Amplia: es la formulación laica más frecuente de la inspiración",
          "en": "Wide: it is the most common lay formulation of inspiration",
          "badge": "amplia"
        },
        "descripcion": {
          "es": "Toda la Biblia recibió su contenido conceptual de Dios, quien lo comunicó mediante las facultades, experiencia y personalidad de los autores humanos.",
          "en": "The whole Bible received its conceptual content from God, who communicated it through the faculties, experience, and personality of the human authors."
        }
      }
    },
    {
      "id": "limitada-verbal-mecanica",
      "es": "Inspiración Limitada (Parcial / Selectiva) Verbal Mecánica",
      "en": "Limited (Partial / Selective) Verbal Mechanical Inspiration",
      "corto": {
        "es": "Limitada · Verbal · Mecánica",
        "en": "Limited · Verbal · Mechanical"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "limitada",
        "objeto": "verbal",
        "metodo": "mecanica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Limitada, parcial o selectiva: solo determinadas partes",
          "en": "Limited, partial, or selective: only certain parts"
        },
        "objeto": {
          "es": "Verbal: las palabras mismas, en esas partes",
          "en": "Verbal: the very words, in those parts"
        },
        "metodo": {
          "es": "Mecánica / Teoría del Dictado",
          "en": "Mechanical / Dictation theory"
        },
        "accionEspiritu": {
          "es": "Dios dicta las palabras en los pasajes inspirados; en el resto no actúa",
          "en": "God dictates the words in the inspired passages; in the rest he does not act"
        },
        "comunicaContenidoNuevo": {
          "es": "Solo en las partes inspiradas",
          "en": "Only in the inspired parts"
        },
        "origenPalabras": {
          "es": "De Dios en las partes inspiradas; del autor en el resto",
          "en": "From God in the inspired parts; from the author in the rest"
        },
        "origenContenido": {
          "es": "De Dios en las partes inspiradas; del autor en el resto",
          "en": "From God in the inspired parts; from the author in the rest"
        },
        "papelPersonalidad": {
          "es": "Suprimida donde hay dictado, plena fuera de él",
          "en": "Suppressed where there is dictation, full outside of it"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos, en momentos determinados",
          "en": "The biblical authors, at specific moments"
        },
        "esPalabraDeDios": {
          "es": "Solo en las partes inspiradas",
          "en": "Only in the inspired parts"
        },
        "inerranciaImplicada": {
          "es": "Solo en las partes inspiradas",
          "en": "Only in the inspired parts"
        },
        "revelacionProposicional": {
          "es": "Afirmada solo en las partes inspiradas",
          "en": "Affirmed only in the inspired parts"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "Parcialmente: el resto queda como escrito humano",
          "en": "Partially: the rest remains as human writing"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie, pero solo en los pasajes inspirados",
          "en": "Of kind, but only in the inspired passages"
        },
        "algoAjenoAutor": {
          "es": "Sí, en todo lo que queda fuera de esas partes",
          "en": "Yes, in everything outside those parts"
        },
        "respuestaDiagnostica": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "atestiguacion": {
          "es": "Escasa: formulable en la rejilla, con pocos defensores identificables",
          "en": "Scarce: formulable within the grid, with few identifiable defenders",
          "badge": "escasa"
        },
        "descripcion": {
          "es": "Solo determinadas partes de la Biblia fueron inspiradas, y en esas partes Dios proporcionó las palabras mediante dictado.",
          "en": "Only certain parts of the Bible were inspired, and in those parts God supplied the words through dictation."
        }
      }
    },
    {
      "id": "limitada-verbal-organica",
      "es": "Inspiración Limitada (Parcial / Selectiva) Verbal Orgánica (Concursal / Confluente)",
      "en": "Limited (Partial / Selective) Verbal Organic Inspiration (Concursive / Confluent)",
      "corto": {
        "es": "Limitada · Verbal · Orgánica",
        "en": "Limited · Verbal · Organic"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "limitada",
        "objeto": "verbal",
        "metodo": "organica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Limitada, parcial o selectiva: solo determinadas partes",
          "en": "Limited, partial, or selective: only certain parts"
        },
        "objeto": {
          "es": "Verbal: las palabras mismas, en esas partes",
          "en": "Verbal: the very words, in those parts"
        },
        "metodo": {
          "es": "Orgánica / Concursal / Confluente",
          "en": "Organic / Concursive / Confluent"
        },
        "accionEspiritu": {
          "es": "Dios obra a través del autor en los pasajes inspirados; en el resto el autor escribe por sí solo",
          "en": "God works through the author in the inspired passages; in the rest the author writes on his own"
        },
        "comunicaContenidoNuevo": {
          "es": "Solo en las partes inspiradas",
          "en": "Only in the inspired parts"
        },
        "origenPalabras": {
          "es": "De Dios mediante el autor en las partes inspiradas; del autor en el resto",
          "en": "From God through the author in the inspired parts; from the author in the rest"
        },
        "origenContenido": {
          "es": "De Dios en las partes inspiradas; del autor en el resto",
          "en": "From God in the inspired parts; from the author in the rest"
        },
        "papelPersonalidad": {
          "es": "Instrumental donde hay inspiración, plena y autónoma fuera de ella",
          "en": "Instrumental where there is inspiration, full and autonomous outside of it"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos, en momentos determinados",
          "en": "The biblical authors, at specific moments"
        },
        "esPalabraDeDios": {
          "es": "Solo en las partes inspiradas",
          "en": "Only in the inspired parts"
        },
        "inerranciaImplicada": {
          "es": "Solo en las partes inspiradas",
          "en": "Only in the inspired parts"
        },
        "revelacionProposicional": {
          "es": "Afirmada solo en las partes inspiradas",
          "en": "Affirmed only in the inspired parts"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "Parcialmente: el resto queda como escrito humano",
          "en": "Partially: the rest remains as human writing"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie, pero solo en los pasajes inspirados",
          "en": "Of kind, but only in the inspired passages"
        },
        "algoAjenoAutor": {
          "es": "Sí, en todo lo que queda fuera de esas partes",
          "en": "Yes, in everything outside those parts"
        },
        "respuestaDiagnostica": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "atestiguacion": {
          "es": "Moderada: subyace a muchas posturas que restringen la inspiración a fe y práctica",
          "en": "Moderate: it underlies many positions that restrict inspiration to faith and practice",
          "badge": "moderada"
        },
        "descripcion": {
          "es": "Solo determinadas partes de la Biblia fueron inspiradas verbalmente, pero Dios produjo esas palabras mediante la experiencia, personalidad y facultades del autor humano.",
          "en": "Only certain parts of the Bible were verbally inspired, but God produced those words through the experience, personality, and faculties of the human author."
        }
      }
    },
    {
      "id": "limitada-conceptual-mecanica",
      "es": "Inspiración Limitada (Parcial / Selectiva) Conceptual Mecánica",
      "en": "Limited (Partial / Selective) Conceptual Mechanical Inspiration",
      "corto": {
        "es": "Limitada · Conceptual · Mecánica",
        "en": "Limited · Conceptual · Mechanical"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "limitada",
        "objeto": "conceptual",
        "metodo": "mecanica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Limitada, parcial o selectiva: solo determinados contenidos",
          "en": "Limited, partial, or selective: only certain contents"
        },
        "objeto": {
          "es": "Dinámica / Conceptual: los pensamientos, en esos contenidos",
          "en": "Dynamic / Conceptual: the thoughts, in those contents"
        },
        "metodo": {
          "es": "Mecánica / Teoría del Dictado",
          "en": "Mechanical / Dictation theory"
        },
        "accionEspiritu": {
          "es": "Dios imprime ciertos conceptos sin mediación intelectual del autor; el resto es suyo",
          "en": "God impresses certain concepts without the author's intellectual mediation; the rest is his own"
        },
        "comunicaContenidoNuevo": {
          "es": "Solo en los contenidos inspirados",
          "en": "Only in the inspired contents"
        },
        "origenPalabras": {
          "es": "Del autor en todos los casos",
          "en": "From the author in all cases"
        },
        "origenContenido": {
          "es": "De Dios en los contenidos inspirados; del autor en el resto",
          "en": "From God in the inspired contents; from the author in the rest"
        },
        "papelPersonalidad": {
          "es": "Anulada en la recepción de esos conceptos, plena en todo lo demás",
          "en": "Nullified in receiving those concepts, full in everything else"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos, en contenidos determinados",
          "en": "The biblical authors, in specific contents"
        },
        "esPalabraDeDios": {
          "es": "Solo en los contenidos inspirados",
          "en": "Only in the inspired contents"
        },
        "inerranciaImplicada": {
          "es": "Solo en los conceptos inspirados",
          "en": "Only in the inspired concepts"
        },
        "revelacionProposicional": {
          "es": "Afirmada solo en los contenidos inspirados",
          "en": "Affirmed only in the inspired contents"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "Parcialmente: el resto queda como escrito humano",
          "en": "Partially: the rest remains as human writing"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie, pero solo en los contenidos inspirados",
          "en": "Of kind, but only in the inspired contents"
        },
        "algoAjenoAutor": {
          "es": "Sí, tanto fuera de esos contenidos como en la expresión de ellos",
          "en": "Yes, both outside those contents and in their expression"
        },
        "respuestaDiagnostica": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "atestiguacion": {
          "es": "Escasa: acumula la tensión del dictado conceptual y la de la limitación",
          "en": "Scarce: it accumulates both the tension of conceptual dictation and that of limitation",
          "badge": "escasa"
        },
        "descripcion": {
          "es": "Solo determinados contenidos de la Biblia fueron inspirados, y Dios comunicó esos contenidos mecánicamente al autor.",
          "en": "Only certain contents of the Bible were inspired, and God communicated those contents mechanically to the author."
        }
      }
    },
    {
      "id": "limitada-conceptual-organica",
      "es": "Inspiración Limitada (Parcial / Selectiva) Conceptual Orgánica (Concursal / Confluente)",
      "en": "Limited (Partial / Selective) Conceptual Organic Inspiration (Concursive / Confluent)",
      "corto": {
        "es": "Limitada · Conceptual · Orgánica",
        "en": "Limited · Conceptual · Organic"
      },
      "teopneustia": true,
      "eje": {
        "prefijo": "inspiracion",
        "alcance": "limitada",
        "objeto": "conceptual",
        "metodo": "organica"
      },
      "celdas": {
        "prefijo": {
          "es": "Inspiración",
          "en": "Inspiration"
        },
        "alcance": {
          "es": "Limitada, parcial o selectiva: solo determinados contenidos",
          "en": "Limited, partial, or selective: only certain contents"
        },
        "objeto": {
          "es": "Dinámica / Conceptual: los pensamientos, en esos contenidos",
          "en": "Dynamic / Conceptual: the thoughts, in those contents"
        },
        "metodo": {
          "es": "Orgánica / Concursal / Confluente",
          "en": "Organic / Concursive / Confluent"
        },
        "accionEspiritu": {
          "es": "Dios comunica ciertos contenidos mediante las facultades del autor; el resto lo escribe por sí solo",
          "en": "God communicates certain contents through the author's faculties; the rest he writes on his own"
        },
        "comunicaContenidoNuevo": {
          "es": "Solo en los contenidos inspirados",
          "en": "Only in the inspired contents"
        },
        "origenPalabras": {
          "es": "Del autor en todos los casos",
          "en": "From the author in all cases"
        },
        "origenContenido": {
          "es": "De Dios en los contenidos inspirados; del autor en el resto",
          "en": "From God in the inspired contents; from the author in the rest"
        },
        "papelPersonalidad": {
          "es": "Determinante: formula lo recibido y aporta todo lo demás",
          "en": "Decisive: he formulates what he received and contributes everything else"
        },
        "sujetoAccionDivina": {
          "es": "Los autores bíblicos, en contenidos determinados",
          "en": "The biblical authors, in specific contents"
        },
        "esPalabraDeDios": {
          "es": "Solo en los contenidos inspirados",
          "en": "Only in the inspired contents"
        },
        "inerranciaImplicada": {
          "es": "Solo en los conceptos inspirados",
          "en": "Only in the inspired concepts"
        },
        "revelacionProposicional": {
          "es": "Afirmada solo en los contenidos inspirados",
          "en": "Affirmed only in the inspired contents"
        },
        "dentroTeopneustia": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "nivelaBiblia": {
          "es": "Parcialmente: el resto queda como escrito humano",
          "en": "Partially: the rest remains as human writing"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De especie, pero solo en los contenidos inspirados",
          "en": "Of kind, but only in the inspired contents"
        },
        "algoAjenoAutor": {
          "es": "Sí, tanto fuera de esos contenidos como en la expresión de ellos",
          "en": "Yes, both outside those contents and in their expression"
        },
        "respuestaDiagnostica": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "atestiguacion": {
          "es": "Amplia: corresponde a la inspiración limitada tal como se sostiene habitualmente",
          "en": "Wide: it corresponds to limited inspiration as it is usually held",
          "badge": "amplia"
        },
        "descripcion": {
          "es": "Solo determinados contenidos de la Biblia fueron inspirados, y Dios comunicó esos conceptos mediante las facultades y experiencia del autor humano.",
          "en": "Only certain contents of the Bible were inspired, and God communicated those concepts through the faculties and experience of the human author."
        }
      }
    },
    {
      "id": "iluminacion-divina",
      "es": "Postura de la Iluminación Divina (teoría de la iluminación o mística)",
      "en": "The Divine Illumination View (illumination or mystical theory)",
      "corto": {
        "es": "Iluminación divina",
        "en": "Divine illumination"
      },
      "teopneustia": false,
      "eje": {
        "prefijo": "iluminacion",
        "alcance": null,
        "objeto": null,
        "metodo": null
      },
      "celdas": {
        "prefijo": {
          "es": "Iluminación",
          "en": "Illumination"
        },
        "alcance": {
          "es": "No aplica: no hay inspiración que acotar",
          "en": "Not applicable: there is no inspiration to delimit"
        },
        "objeto": {
          "es": "Ninguno: no se comunica contenido",
          "en": "None: no content is communicated"
        },
        "metodo": {
          "es": "Elevación de las facultades naturales por el Espíritu",
          "en": "Elevation of the natural faculties by the Spirit"
        },
        "accionEspiritu": {
          "es": "El Espíritu intensifica la percepción espiritual del autor, sin entregarle nada que no pudiera alcanzar",
          "en": "The Spirit intensifies the author's spiritual perception, without giving him anything he could not otherwise attain"
        },
        "comunicaContenidoNuevo": {
          "es": "No: solo permite ver con mayor hondura lo ya accesible",
          "en": "No: it only allows him to see more deeply what was already accessible"
        },
        "origenPalabras": {
          "es": "Del autor",
          "en": "From the author"
        },
        "origenContenido": {
          "es": "Del autor",
          "en": "From the author"
        },
        "papelPersonalidad": {
          "es": "Fuente única del contenido: todo lo escrito procede de él",
          "en": "Sole source of the content: everything written proceeds from him"
        },
        "sujetoAccionDivina": {
          "es": "Todo creyente, no solo los autores bíblicos",
          "en": "Every believer, not only the biblical authors"
        },
        "esPalabraDeDios": {
          "es": "No en sentido propio",
          "en": "Not in the proper sense"
        },
        "inerranciaImplicada": {
          "es": "Ninguna",
          "en": "None"
        },
        "revelacionProposicional": {
          "es": "Diluida o negada",
          "en": "Diluted or denied"
        },
        "dentroTeopneustia": {
          "es": "No",
          "en": "No",
          "badge": "no-teopneustia"
        },
        "nivelaBiblia": {
          "es": "Sí: el texto no difiere cualitativamente de otros escritos religiosos",
          "en": "Yes: the text does not differ qualitatively from other religious writings"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De grado: la misma obra del Espíritu que recibe cualquier creyente, con más intensidad",
          "en": "Of degree: the same work of the Spirit that any believer receives, only more intensely"
        },
        "algoAjenoAutor": {
          "es": "Sí, sin restricción",
          "en": "Yes, without restriction"
        },
        "respuestaDiagnostica": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "atestiguacion": {
          "es": "Atribuida a Schleiermacher, a los unitarios y a algunos teólogos del encuentro del siglo XX",
          "en": "Attributed to Schleiermacher, to Unitarians, and to some twentieth-century encounter theologians"
        },
        "descripcion": {
          "es": "El Espíritu intensifica la percepción espiritual del autor sin comunicarle contenido; lo que recibe no difiere en especie de lo que recibe cualquier creyente.",
          "en": "The Spirit intensifies the author's spiritual perception without communicating content to him; what he receives does not differ in kind from what any believer receives."
        }
      }
    },
    {
      "id": "intuicion-natural",
      "es": "Postura de la Intuición Natural (o inspiración natural)",
      "en": "The Natural Intuition View (or natural inspiration)",
      "corto": {
        "es": "Intuición natural",
        "en": "Natural intuition"
      },
      "teopneustia": false,
      "eje": {
        "prefijo": "intuicion",
        "alcance": null,
        "objeto": null,
        "metodo": null
      },
      "celdas": {
        "prefijo": {
          "es": "Intuición",
          "en": "Intuition"
        },
        "alcance": {
          "es": "No aplica: no hay inspiración que acotar",
          "en": "Not applicable: there is no inspiration to delimit"
        },
        "objeto": {
          "es": "Ninguno: no se comunica contenido",
          "en": "None: no content is communicated"
        },
        "metodo": {
          "es": "Ninguno: perspicacia religiosa natural",
          "en": "None: natural religious insight"
        },
        "accionEspiritu": {
          "es": "Ninguna acción especial",
          "en": "No special action"
        },
        "comunicaContenidoNuevo": {
          "es": "No",
          "en": "No"
        },
        "origenPalabras": {
          "es": "Del autor",
          "en": "From the author"
        },
        "origenContenido": {
          "es": "Del autor",
          "en": "From the author"
        },
        "papelPersonalidad": {
          "es": "Fuente única del contenido: todo lo escrito procede de él",
          "en": "Sole source of the content: everything written proceeds from him"
        },
        "sujetoAccionDivina": {
          "es": "Nadie en particular: es una cualidad humana",
          "en": "No one in particular: it is a human quality"
        },
        "esPalabraDeDios": {
          "es": "No",
          "en": "No"
        },
        "inerranciaImplicada": {
          "es": "Ninguna",
          "en": "None"
        },
        "revelacionProposicional": {
          "es": "Negada",
          "en": "Denied"
        },
        "dentroTeopneustia": {
          "es": "No",
          "en": "No",
          "badge": "no-teopneustia"
        },
        "nivelaBiblia": {
          "es": "Sí: el autor bíblico se equipara a otros grandes pensadores religiosos",
          "en": "Yes: the biblical author is placed on the same level as other great religious thinkers"
        },
        "diferenciaOtrosCreyentes": {
          "es": "De grado, y solo de talento: no hay obra del Espíritu que comparar",
          "en": "Of degree only, and only in talent: there is no work of the Spirit to compare"
        },
        "algoAjenoAutor": {
          "es": "Sí, sin restricción",
          "en": "Yes, without restriction"
        },
        "respuestaDiagnostica": {
          "es": "Sí",
          "en": "Yes",
          "badge": "si"
        },
        "atestiguacion": {
          "es": "Categoría descriptiva de manual más que escuela con adherentes declarados",
          "en": "A descriptive textbook category rather than a school with declared adherents"
        },
        "descripcion": {
          "es": "No hay acción especial del Espíritu; el autor bíblico es un genio religioso, en principio no distinto de otros grandes pensadores.",
          "en": "There is no special action of the Spirit; the biblical author is a religious genius, in principle no different from other great thinkers."
        }
      }
    }
  ]
};
