/* Idioma de la interfaz y de los datos. El inglés se activa con ?lang=en
   (también ?idioma=en o #en). Los textos del árbol salen de js/traducciones-en.js
   (generado al convertir el Markdown) y, si falta alguno, de MyMemory;
   los de la UI viven en este diccionario. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var CLAVE_LANG = 'arbol-posturas/lang';
  var CLAVE_TRAD = 'arbol-posturas/traducciones/v1';
  var UI = {
    es: {
      tituloPagina: 'Análisis de posturas y creencias',
      ariaLienzo: 'Análisis interactivo de posturas y creencias',
      ajustar: 'Ajustar',
      ajustarTitle: 'Ajustar el árbol a la ventana (F)',
      reorganizar: 'Reorganizar',
      reorganizarTitle: 'Restaurar las posiciones automáticas (R)',
      recorrido: 'Recorrido',
      recorridoTitle: 'Cómo se revelan las ramas (A para ciclar)',
      cuestionario: 'Cuestionario',
      limpio: 'Limpio',
      exploracion: 'Exploración libre',
      completo: 'Árbol completo',
      edicion: 'Edición',
      resaltados: 'resaltados',
      encuadrarResaltados: 'Encuadrar todos los nodos resaltados (H)',
      quitarResaltados: 'Quitar todos los resaltados',
      creencias: 'Creencias',
      creenciasTitle: 'Explorador de creencias (C)',
      exportar: 'Exportar',
      exportarTitle: 'Exportar, compartir o descargar una imagen',
      exportarUrl: 'Compartir vista actual (URL)',
      exportarMd: 'Markdown (propuesta)',
      exportarSvg: 'Imagen SVG',
      exportarPng: 'Imagen PNG',
      temaTitle: 'Cambiar entre tema oscuro y claro (T)',
      reiniciarTitle: 'Borrar respuestas, resaltados y anclajes',
      idiomaTitle: 'Cambiar idioma (español / English)',
      muteTitle: 'Silenciar o reanudar la música',
      pista: '<kbd>Rueda</kbd> zoom · <kbd>Arrastrar</kbd> mover o anclar · <kbd>Doble clic</kbd> ficha completa · <kbd>Ctrl</kbd>+<kbd>Clic</kbd> resaltar',
      detalle: 'Detalle',
      compararTab: 'Comparar',
      analisis: 'Análisis profundo',
      analisisConstruccion: 'En construcción',
      analisisConstruccionNota: 'El análisis profundo cruzará el recorrido con las posturas del árbol para señalar tensiones, implicaciones y compromisos. Llegará en una próxima versión.',
      panelCerrar: 'Cerrar panel',
      panelAsa: 'Arrastrar para cambiar el ancho',
      buscarPlaceholder: 'Buscar tradición, religión o sistema…',
      modoCompacto: 'Modo compacto',
      limpiarSeleccion: 'Limpiar selección',
      irComparar: 'Comparar →',
      irAnalizar: 'Analizar →',
      tradicionesTitulo: 'Tradiciones y sistemas de creencias',
      posturasTitulo: 'Posturas',
      soloDesacuerdos: 'Solo desacuerdos',
      profundidad: 'Profundidad',
      toda: 'Toda',
      niveles3: '3 niveles',
      niveles5: '5 niveles',
      niveles8: '8 niveles',
      copiar: 'Copiar',
      csv: 'Exportar CSV',
      json: 'Exportar JSON',
      cancelar: 'Cancelar',
      eliminar: 'Eliminar',
      cargando: 'Cargando el árbol…',
      panelVacio: 'Selecciona un nodo del árbol para ver su ficha completa.',
      bienvenida: 'Lo importante es no dejar de hacerse preguntas. La curiosidad tiene su propia razón de existir.',
      bienvenidaFuente: 'Albert Einstein',
      tambien: 'También: {lista}',
      posturasSostenidas: '{n} postura sostenida',
      posturasSostenidasPlural: '{n} posturas sostenidas',
      ningunaTradicion: 'Ninguna tradición coincide con la búsqueda.',
      ningunaPosturaSuelta: 'Ninguna postura coincide con la búsqueda.',
      notaSinAfiliacion: 'Toda postura nombrada del árbol, con tradición o sin ella. Al elegirla se compara por el recorrido de respuestas que lleva de la raíz hasta ella, sin arrastrar las demás posturas de su tradición.',
      seleccionActiva: 'Selección activa',
      seleccionVacia: 'Selecciona una o varias tradiciones para desplegar su camino en el árbol e iluminarlo desde la raíz. Puedes combinarlas con posturas concretas para compararlas entre sí.',
      tambienAparece: 'También aparece como: {lista}',
      posturaSinTradicion: 'Postura sin tradición registrada; se compara por el recorrido de respuestas que la alcanza desde la raíz.',
      posturaDeTradicion: 'Postura sostenida por {lista}; aquí se compara sola, por el recorrido de respuestas que la alcanza desde la raíz.',
      adhesionTentativa: 'adhesión tentativa',
      respuestasHeredadas: '{n} respuestas heredadas hasta la raíz',
      notasHistoricas: 'Notas históricas',
      chincheta: 'Nodo anclado',
      asaNodo: 'Mover tarjeta',
      definicion: 'Definición',
      definicionBuscando: 'Consultando Wikipedia…',
      definicionVacia: 'Wikipedia no tiene (o no alcanzó) una ficha para este término.',
      definicionOffline: 'Sin conexión: no se pudo consultar Wikipedia.',
      fuenteWikipedia: 'Fuente: Wikipedia',
      religionesRama: 'Religiones y tradiciones de esta rama',
      posturasRama: 'Posturas de esta rama',
      ningunaRegistrada: 'ninguna registrada',
      sostenidaPor: 'Sostenida por',
      ramaAbre: 'Abre {n} nodos del árbol.',
      ramaAbreUno: 'Abre 1 nodo del árbol.',
      ramaMasPoblada: 'Es la rama más poblada de esta pregunta.',
      deshacer: 'Deshacer',
      deshacerDesc: 'Deshace esta respuesta y poda la rama que colgaba de ella.',
      chinchetaDesc: 'Este nodo está anclado a mano. Púlsala para devolverlo a la posición automática.',
      asaNodoDesc: 'Arrástrala para colocarla a mano. Al soltar queda anclada con una chincheta.',
      origen: 'ORIGEN',
      postura: 'POSTURA',
      convergencia: 'CONVERGENCIA',
      eje: 'EJE',
      posturaVarios: 'POSTURA · VARIOS EJES',
      mostrarRamas: '▸ Mostrar ramas',
      ocultarRamas: '▾ Ocultar ramas',
      recorridoAviso: 'Recorrido: {nombre}',
      svgListo: 'SVG descargado.',
      pngListo: 'PNG descargado.',
      exportaFallo: 'No se pudo exportar la imagen.',
      idiomaEn: 'English',
      idiomaEs: 'Español',
      agregarCampo: 'Agregar campo',
      agregarCampoDesc: 'Elige un campo que aún no está en la tarjeta para rellenarlo.',
      placeholderNombre: 'Nombre de la postura…',
      ejeIntegrado: 'Eje integrado',
      ejeIntegradoDesc: 'Esta tarjeta une una postura y su única pregunta. Al añadir un segundo eje, se parten en nodos distintos.',
      nuevoEje: 'Nuevo eje',
      nuevoEjeDesc: 'Añade un eje de pregunta. Si la pregunta estaba integrada, se extrae y el padre queda como postura.',
      nuevoNodoDesc: 'Crea una postura vacía como respuesta de esta pregunta. La etiqueta se edita en la línea.',
      ramasCompactasDesc: 'Muestra u oculta los hijos de esta tarjeta.',
      eliminarNodo: 'Eliminar nodo',
      eliminarNodoDesc: 'Borra esta tarjeta y la rama que cuelga de ella, si no se alcanza por otro camino.',
      ayudaReligiones: 'Religiones o sistemas que sostienen esta postura. Separa con comas. Un ? marca adhesión tentativa.',
      ayudaNotas: 'Notas históricas o aclaraciones del documento.',
      ayudaEnlaces: 'Enlaces a notas del vault, uno por coma.',
      ayudaFormal: 'Pregunta formal: el enunciado canónico del eje.',
      ayudaColoquial: 'Versión coloquial, más corta, de la misma pregunta.',
      huerfanoTitulo: 'Nodo huérfano',
      huerfanoTexto: 'Esto dejará «{nombre}» como una segunda raíz del árbol.',
      huerfanoAceptar: 'Dejar como raíz',
      borrarNodoTitulo: 'Eliminar nodo',
      borrarNodoTexto: 'Se borrará «{nombre}» y su rama exclusiva ({detalle}).',
      noBorrarUltimaRaiz: 'No se puede borrar la última raíz del árbol.',
      continuar: 'Continuar',
      aliasReligiones: 'Religiones',
      aliasNotas: 'Notas',
      aliasEnlaces: 'Enlaces',
      aliasFormal: 'Pregunta formal',
      aliasColoquial: 'Pregunta coloquial',
      respuestaEnLinea: 'Respuesta',
      aclaracionRespuesta: 'Aclaración',
      pistaEdicion: '<kbd>Rueda</kbd> zoom · <kbd>Arrastrar</kbd> mover · clic en campos para editar · arrastra los extremos de las líneas'
    },
    en: {
      tituloPagina: 'Analysis of postures and beliefs',
      ariaLienzo: 'Interactive analysis of postures and beliefs',
      ajustar: 'Fit',
      ajustarTitle: 'Fit the tree to the window (F)',
      reorganizar: 'Rearrange',
      reorganizarTitle: 'Restore automatic positions (R)',
      recorrido: 'Traversal',
      recorridoTitle: 'How branches are revealed (A to cycle)',
      cuestionario: 'Questionnaire',
      limpio: 'Clean',
      exploracion: 'Free exploration',
      completo: 'Full tree',
      edicion: 'Edit',
      resaltados: 'highlighted',
      encuadrarResaltados: 'Frame all highlighted nodes (H)',
      quitarResaltados: 'Clear all highlights',
      creencias: 'Beliefs',
      creenciasTitle: 'Beliefs explorer (C)',
      exportar: 'Export',
      exportarTitle: 'Export, share or download an image',
      exportarUrl: 'Share current view (URL)',
      exportarMd: 'Markdown (proposal)',
      exportarSvg: 'SVG image',
      exportarPng: 'PNG image',
      temaTitle: 'Toggle dark and light theme (T)',
      reiniciarTitle: 'Clear answers, highlights and pins',
      idiomaTitle: 'Switch language (Spanish / English)',
      muteTitle: 'Mute or unmute the music',
      pista: '<kbd>Wheel</kbd> zoom · <kbd>Drag</kbd> pan or pin · <kbd>Double-click</kbd> full card · <kbd>Ctrl</kbd>+<kbd>Click</kbd> highlight',
      detalle: 'Detail',
      compararTab: 'Compare',
      analisis: 'Deep analysis',
      analisisConstruccion: 'Under construction',
      analisisConstruccionNota: 'Deep analysis will cross your traversal with the postures of the tree to point out tensions, implications and trade-offs. Coming in a future version.',
      panelCerrar: 'Close panel',
      panelAsa: 'Drag to resize',
      buscarPlaceholder: 'Search a tradition, religion or system…',
      modoCompacto: 'Compact mode',
      limpiarSeleccion: 'Clear selection',
      irComparar: 'Compare →',
      irAnalizar: 'Analyze →',
      tradicionesTitulo: 'Traditions and belief systems',
      posturasTitulo: 'Postures',
      soloDesacuerdos: 'Disagreements only',
      profundidad: 'Depth',
      toda: 'All',
      niveles3: '3 levels',
      niveles5: '5 levels',
      niveles8: '8 levels',
      copiar: 'Copy',
      csv: 'Export CSV',
      json: 'Export JSON',
      cancelar: 'Cancel',
      eliminar: 'Delete',
      cargando: 'Loading the tree…',
      panelVacio: 'Select a node in the tree to see its full card.',
      bienvenida: 'The important thing is not to stop questioning. Curiosity has its own reason for existing.',
      bienvenidaFuente: 'Albert Einstein',
      tambien: 'Also: {lista}',
      posturasSostenidas: '{n} posture held',
      posturasSostenidasPlural: '{n} postures held',
      ningunaTradicion: 'No tradition matches the search.',
      ningunaPosturaSuelta: 'No posture matches the search.',
      notaSinAfiliacion: 'Every named posture in the tree, with or without a tradition. Choosing one compares it by the chain of answers that reaches it from the root, without dragging along the other postures of its tradition.',
      seleccionActiva: 'Active selection',
      seleccionVacia: 'Select one or more traditions to unfold their path in the tree and light it from the root. You can combine them with individual postures to compare them.',
      tambienAparece: 'Also appears as: {lista}',
      posturaSinTradicion: 'Posture with no recorded tradition; it is compared by the chain of answers that reaches it from the root.',
      posturaDeTradicion: 'Posture held by {lista}; here it is compared on its own, by the chain of answers that reaches it from the root.',
      adhesionTentativa: 'tentative adherence',
      respuestasHeredadas: '{n} inherited answers back to the root',
      notasHistoricas: 'Historical notes',
      definicion: 'Definition',
      definicionBuscando: 'Looking up Wikipedia…',
      definicionVacia: 'Wikipedia has no entry (or none could be reached) for this term.',
      definicionOffline: 'Offline: Wikipedia could not be reached.',
      fuenteWikipedia: 'Source: Wikipedia',
      religionesRama: 'Religions and traditions in this branch',
      posturasRama: 'Postures in this branch',
      ningunaRegistrada: 'none recorded',
      sostenidaPor: 'Held by',
      ramaAbre: 'Opens {n} nodes of the tree.',
      ramaAbreUno: 'Opens 1 node of the tree.',
      ramaMasPoblada: 'It is the most populated branch of this question.',
      deshacer: 'Undo',
      deshacerDesc: 'Undoes this answer and prunes the branch that hung from it.',
      chincheta: 'Pinned node',
      asaNodo: 'Move card',
      chinchetaDesc: 'This node is pinned by hand. Click to return it to the automatic layout.',
      asaNodoDesc: 'Drag to place it by hand. When you drop it, it stays pinned.',
      origen: 'ORIGIN',
      postura: 'POSTURE',
      convergencia: 'CONVERGENCE',
      eje: 'AXIS',
      posturaVarios: 'POSTURE · SEVERAL AXES',
      mostrarRamas: '▸ Show branches',
      ocultarRamas: '▾ Hide branches',
      recorridoAviso: 'Traversal: {nombre}',
      svgListo: 'SVG downloaded.',
      pngListo: 'PNG downloaded.',
      exportaFallo: 'The image could not be exported.',
      idiomaEn: 'English',
      idiomaEs: 'Español',
      agregarCampo: 'Add field',
      agregarCampoDesc: 'Pick a field that is not yet on the card and fill it in.',
      placeholderNombre: 'Posture name…',
      ejeIntegrado: 'Integrated axis',
      ejeIntegradoDesc: 'This card joins a posture and its only question. Adding a second axis splits them into separate nodes.',
      nuevoEje: 'New axis',
      nuevoEjeDesc: 'Adds a question axis. If the question was integrated in the card, it is extracted and the parent becomes a posture.',
      nuevoNodoDesc: 'Creates an empty posture as an answer to this question. The answer label is edited on the line.',
      ramasCompactasDesc: 'Show or hide this card’s children.',
      eliminarNodo: 'Delete node',
      eliminarNodoDesc: 'Deletes this card and the branch that hangs from it, if it is not reached by another path.',
      ayudaReligiones: 'Religions or systems that hold this posture. Separate with commas. A ? marks tentative adherence.',
      ayudaNotas: 'Historical notes or clarifications from the document.',
      ayudaEnlaces: 'Links to vault notes, one per comma.',
      ayudaFormal: 'Formal question: the canonical wording of the axis.',
      ayudaColoquial: 'Shorter, colloquial version of the same question.',
      huerfanoTitulo: 'Orphan node',
      huerfanoTexto: 'This will leave “{nombre}” as a second root of the tree.',
      huerfanoAceptar: 'Keep as root',
      borrarNodoTitulo: 'Delete node',
      borrarNodoTexto: 'This will delete “{nombre}” and its exclusive branch ({detalle}).',
      noBorrarUltimaRaiz: 'The last root of the tree cannot be deleted.',
      continuar: 'Continue',
      aliasReligiones: 'Religions',
      aliasNotas: 'Notes',
      aliasEnlaces: 'Links',
      aliasFormal: 'Formal question',
      aliasColoquial: 'Colloquial question',
      respuestaEnLinea: 'Answer',
      aclaracionRespuesta: 'Clarification',
      pistaEdicion: '<kbd>Wheel</kbd> zoom · <kbd>Drag</kbd> pan · click fields to edit · drag the ends of the lines'
    }
  };

  var cacheTrad = {};
  var inflightTrad = {};
  var avisoTrad = null;
  var cola = [];
  var ocupado = false;
  var oyentes = [];

  function meterEnEN(clave, traducido) {
    var en = Arbol.EN || (Arbol.EN = {
      questions: {}, postures: {}, traditions: {}, yes: 'Yes', no: 'No', unnamed: '(unnamed)'
    });
    var partes = String(clave).split('.');
    if (partes[0] === 'q') {
      en.questions = en.questions || {};
      en.questions[partes[1]] = en.questions[partes[1]] || {};
      var q = en.questions[partes[1]];
      if (partes[2] === 'formal') q.formal = traducido;
      else if (partes[2] === 'coloquial') q.colloquial = traducido;
      else if (partes[3] === 'label') {
        q.answers = q.answers || {};
        q.answers[partes[2]] = q.answers[partes[2]] || {};
        q.answers[partes[2]].label = traducido;
      } else if (partes[3] === 'gloss') {
        q.answers = q.answers || {};
        q.answers[partes[2]] = q.answers[partes[2]] || {};
        q.answers[partes[2]].gloss = traducido;
      }
    } else if (partes[0] === 'p' && partes[2] === 'label') {
      en.postures = en.postures || {};
      en.postures[partes[1]] = traducido;
    } else if (partes[0] === 't') {
      en.traditions = en.traditions || {};
      en.traditions[clave.slice(2)] = traducido;
    }
  }

  function pedirTraduccion(clave, original) {
    if (!original || inflightTrad[original]) return;
    inflightTrad[original] = true;
    var url = 'https://api.mymemory.translated.net/get?q='
      + encodeURIComponent(String(original).slice(0, 450))
      + '&langpair=es|en';
    fetch(url).then(function (respuesta) { return respuesta.json(); }).then(function (datos) {
      var texto = datos && datos.responseData && datos.responseData.translatedText;
      if (!texto) { delete inflightTrad[original]; return; }
      cacheTrad[original] = texto;
      guardarCacheDisco();
      meterEnEN(clave, texto);
      global.clearTimeout(avisoTrad);
      avisoTrad = global.setTimeout(function () {
        oyentes.forEach(function (fn) { fn(I18n.idioma); });
      }, 450);
    }).catch(function () { delete inflightTrad[original]; });
  }

  function leerCacheDisco() {
    try {
      var crudo = global.localStorage.getItem(CLAVE_TRAD);
      if (crudo) cacheTrad = JSON.parse(crudo) || {};
    } catch (error) { cacheTrad = {}; }
  }

  function guardarCacheDisco() {
    try { global.localStorage.setItem(CLAVE_TRAD, JSON.stringify(cacheTrad)); }
    catch (error) { /* cuota */ }
  }

  function idiomaDesdeURL() {
    var parametros = new URLSearchParams(global.location.search);
    var lang = (parametros.get('lang') || parametros.get('idioma') || '').toLowerCase();
    if (lang === 'en' || lang === 'es') return lang;
    if ((global.location.hash || '').toLowerCase() === '#en') return 'en';
    if (/\/en(\/|$)/i.test(global.location.pathname || '')) return 'en';
    try {
      var guardado = global.localStorage.getItem(CLAVE_LANG);
      if (guardado === 'en' || guardado === 'es') return guardado;
    } catch (error) { /* nada */ }
    return 'es';
  }

  function interpolar(plantilla, vars) {
    if (!vars) return plantilla;
    return String(plantilla).replace(/\{(\w+)\}/g, function (_, clave) {
      return vars[clave] == null ? '' : String(vars[clave]);
    });
  }

  var CLAVE_FRASE = 'arbol-posturas/frase-bienvenida';

  /* Citas sobre el asombro y la busca de la verdad — no conclusiones
     de una escuela ni lemas de un sistema. Se rotan en cada carga. */
  var FRASES_BIENVENIDA = [
    {
      es: 'El asombro es el principio de la filosofía.',
      en: 'Wonder is the beginning of philosophy.',
      fuente: 'Platón'
    },
    {
      es: 'Todos los hombres desean por naturaleza saber.',
      en: 'All men by nature desire to know.',
      fuente: 'Aristóteles'
    },
    {
      es: 'Prefiero la busca de la verdad a la verdad ya poseída.',
      en: 'I prefer the search for truth to truth already possessed.',
      fuente: 'Gotthold E. Lessing'
    },
    {
      es: 'La verdad es hija del tiempo.',
      en: 'Truth is the daughter of time.',
      fuente: 'Francis Bacon'
    },
    {
      es: 'Si no esperas lo inesperado, no lo hallarás.',
      en: 'If you do not expect the unexpected, you will not find it.',
      fuente: 'Heráclito'
    },
    {
      es: 'La naturaleza ama ocultarse.',
      en: 'Nature loves to hide.',
      fuente: 'Heráclito'
    },
    {
      es: 'Ama las preguntas mismas.',
      en: 'Love the questions themselves.',
      fuente: 'Rainer Maria Rilke'
    },
    {
      es: 'Busquemos como quienes han de hallar, y hallemos como quienes han de buscar.',
      en: 'Let us seek as those who are to find, and find as those who are to keep seeking.',
      fuente: 'San Agustín'
    },
    {
      es: 'El primer principio es no engañarte a ti mismo; y tú eres la persona más fácil de engañar.',
      en: 'The first principle is that you must not fool yourself—and you are the easiest person to fool.',
      fuente: 'Richard Feynman'
    },
    {
      es: 'No leas para contradecir ni para dar por sentado, sino para sopesar y considerar.',
      en: 'Read not to contradict and confute, nor to believe and take for granted, but to weigh and consider.',
      fuente: 'Francis Bacon'
    },
    {
      es: 'La lectura proporciona a la mente materiales de conocimiento; es el pensamiento el que hace nuestro lo leído.',
      en: 'Reading furnishes the mind only with materials of knowledge; it is thinking that makes what we read ours.',
      fuente: 'John Locke'
    },
    {
      es: 'Lo importante es no dejar de hacerse preguntas. La curiosidad tiene su propia razón de existir.',
      en: 'The important thing is not to stop questioning. Curiosity has its own reason for existing.',
      fuente: 'Albert Einstein'
    },
    {
      es: 'Mientras vivas, sigue aprendiendo a vivir.',
      en: 'As long as you live, keep learning how to live.',
      fuente: 'Séneca'
    },
    {
      es: '¿No es acaso un placer aprender con perseverancia y poner en práctica lo aprendido?',
      en: 'Is it not pleasant to learn with constant perseverance and application?',
      fuente: 'Confucio'
    },
    {
      es: 'Cuanto más aprendemos sobre el mundo y más profundo es nuestro aprendizaje, más consciente, específico y articulado será nuestro conocimiento de lo que no sabemos.',
      en: 'The more we learn about the world, and the deeper our learning, the more conscious, specific, and articulate will be our knowledge of what we do not know.',
      fuente: 'Karl Popper'
    }
  ];

  var I18n = {
    idioma: 'es',

    iniciar: function () {
      leerCacheDisco();
      this.idioma = idiomaDesdeURL();
      this.persistir();
      this.aplicarDOM();
    },

    t: function (clave, vars) {
      var tabla = UI[this.idioma] || UI.es;
      var texto = tabla[clave] != null ? tabla[clave] : (UI.es[clave] || clave);
      return interpolar(texto, vars);
    },

    elegirBienvenida: function () {
      var n = FRASES_BIENVENIDA.length;
      var indice = 0;
      try {
        indice = Number(global.localStorage.getItem(CLAVE_FRASE)) || 0;
        if (indice < 0 || indice >= n) indice = 0;
        global.localStorage.setItem(CLAVE_FRASE, String((indice + 1) % n));
      } catch (error) {
        indice = Math.floor(Math.random() * n);
      }
      var frase = FRASES_BIENVENIDA[indice];
      return {
        texto: this.idioma === 'en' ? frase.en : frase.es,
        fuente: frase.fuente
      };
    },

    persistir: function () {
      try { global.localStorage.setItem(CLAVE_LANG, this.idioma); } catch (error) { /* nada */ }
      document.documentElement.setAttribute('lang', this.idioma);
      document.title = this.t('tituloPagina');
    },

    aplicarDOM: function () {
      var self = this;
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.textContent = self.t(el.getAttribute('data-i18n'));
      });
      document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
        el.innerHTML = self.t(el.getAttribute('data-i18n-html'));
      });
      document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        el.setAttribute('title', self.t(el.getAttribute('data-i18n-title')));
      });
      document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        el.setAttribute('aria-label', self.t(el.getAttribute('data-i18n-aria')));
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        el.setAttribute('placeholder', self.t(el.getAttribute('data-i18n-placeholder')));
      });
      this.persistir();
    },

    fijar: function (idioma) {
      if (idioma !== 'en' && idioma !== 'es') return;
      if (this.idioma === idioma) return;
      this.idioma = idioma;
      this.persistir();
      this.aplicarDOM();
      oyentes.forEach(function (fn) { fn(idioma); });
    },

    alternar: function () {
      this.fijar(this.idioma === 'en' ? 'es' : 'en');
    },

    suscribir: function (fn) { oyentes.push(fn); },

    /* Texto de datos: en español se devuelve el original; en inglés se lee
       el overlay generado (Arbol.EN) y, si falta, se pide a MyMemory y se
       cachea. */
    dato: function (clave, original) {
      if (!original) return original;
      if (this.idioma !== 'en') return original;
      var en = Arbol.EN || {};
      if (clave === 'unnamed') return en.unnamed || '(unnamed)';
      if (original === 'Sí') return en.yes || 'Yes';
      if (original === 'No') return en.no || 'No';
      if (cacheTrad[original]) {
        meterEnEN(clave, cacheTrad[original]);
        return cacheTrad[original];
      }
      var partes = String(clave).split('.');
      if (partes[0] === 'q' && en.questions && en.questions[partes[1]]) {
        var q = en.questions[partes[1]];
        if (partes[2] === 'formal' && q.formal) return q.formal;
        if (partes[2] === 'coloquial' && q.colloquial) return q.colloquial;
        if (partes[3] === 'label') {
          if (q.answers && q.answers[partes[2]] && q.answers[partes[2]].label) {
            return q.answers[partes[2]].label;
          }
          if (original === 'Sí') return en.yes || 'Yes';
          if (original === 'No') return en.no || 'No';
        }
        if (partes[3] === 'gloss' && q.answers && q.answers[partes[2]] && q.answers[partes[2]].gloss) {
          return q.answers[partes[2]].gloss;
        }
      }
      if (partes[0] === 'p' && partes[2] === 'label' && en.postures && en.postures[partes[1]]) {
        return en.postures[partes[1]];
      }
      if (partes[0] === 't' && en.traditions) {
        var nombre = clave.slice(2);
        if (en.traditions[nombre]) return en.traditions[nombre];
      }
      pedirTraduccion(clave, original);
      return original;
    }
  };

  Arbol.I18n = I18n;

})(window);
