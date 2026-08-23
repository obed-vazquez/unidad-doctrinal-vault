/* Idioma de la interfaz y de los datos. El inglés se activa con ?lang=en
   (también ?idioma=en o #en). Los textos del árbol se traducen en vivo
   (MyMemory) y se cachean; los de la UI viven en este diccionario. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var CLAVE_LANG = 'arbol-posturas/lang';
  var CLAVE_TRAD = 'arbol-posturas/traducciones/v1';
  var UI = {
    es: {
      tituloPagina: 'Árbol de posturas y creencias',
      ariaLienzo: 'Árbol interactivo de posturas y creencias',
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
      resaltados: 'resaltados',
      encuadrarResaltados: 'Encuadrar todos los nodos resaltados (H)',
      quitarResaltados: 'Quitar todos los resaltados',
      creencias: 'Creencias',
      creenciasTitle: 'Explorador de creencias (E)',
      comparar: 'Comparar',
      compararTitle: 'Comparar creencias en forma de lista (L)',
      razonar: 'Razonar',
      razonarTitle: 'Razonar: en construcción',
      compartir: 'Compartir',
      compartirTitle: 'Copiar enlace con esta vista',
      exportar: 'Exportar',
      exportarTitle: 'Exportar el árbol actual (con tus aportes) en Markdown',
      exportarSvgTitle: 'Descargar el diagrama visible como SVG',
      exportarPngTitle: 'Descargar el diagrama visible como PNG',
      temaTitle: 'Cambiar entre tema oscuro y claro (T)',
      reiniciarTitle: 'Borrar respuestas, resaltados y anclajes',
      idiomaTitle: 'Cambiar idioma (español / English)',
      muteTitle: 'Silenciar o reanudar la música',
      pista: '<kbd>Rueda</kbd> zoom · <kbd>Arrastrar</kbd> mover o anclar · <kbd>Doble clic</kbd> ficha completa · <kbd>Ctrl</kbd>+<kbd>Clic</kbd> resaltar',
      detalle: 'Detalle',
      compararTab: 'Comparar',
      panelCerrar: 'Cerrar panel',
      panelAsa: 'Arrastrar para cambiar el ancho',
      buscarPlaceholder: 'Buscar tradición, religión o sistema…',
      modoCompacto: 'Modo compacto',
      limpiarSeleccion: 'Limpiar selección',
      irComparar: 'Comparar →',
      tradicionesTitulo: 'Tradiciones y sistemas de creencias',
      posturasTitulo: 'Posturas sin afiliación',
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
      bienvenida: 'Toda creencia nace de una pregunta.',
      definicion: 'Definición',
      definicionBuscando: 'Consultando Wikipedia…',
      definicionVacia: 'Wikipedia no tiene (o no alcanzó) una ficha para este término.',
      definicionOffline: 'Sin conexión: no se pudo consultar Wikipedia.',
      fuenteWikipedia: 'Fuente: Wikipedia',
      religionesRama: 'Religiones y tradiciones de esta rama',
      posturasRama: 'Posturas de esta rama',
      ningunaRegistrada: 'ninguna registrada',
      sostenidaPor: 'Sostenida por',
      deshacer: 'Deshacer',
      deshacerDesc: 'Deshace esta respuesta y poda la rama que colgaba de ella.',
      chincheta: 'Chincheta',
      chinchetaDesc: 'Este nodo está anclado a mano. Púlsala para devolverlo a la posición automática.',
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
      idiomaEs: 'Español'
    },
    en: {
      tituloPagina: 'Tree of postures and beliefs',
      ariaLienzo: 'Interactive tree of postures and beliefs',
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
      resaltados: 'highlighted',
      encuadrarResaltados: 'Frame all highlighted nodes (H)',
      quitarResaltados: 'Clear all highlights',
      creencias: 'Beliefs',
      creenciasTitle: 'Beliefs explorer (E)',
      comparar: 'Compare',
      compararTitle: 'Compare beliefs as a list (L)',
      razonar: 'Reason',
      razonarTitle: 'Reason: coming soon',
      compartir: 'Share',
      compartirTitle: 'Copy a link to this view',
      exportar: 'Export',
      exportarTitle: 'Export the current tree (with your additions) as Markdown',
      exportarSvgTitle: 'Download the visible diagram as SVG',
      exportarPngTitle: 'Download the visible diagram as PNG',
      temaTitle: 'Toggle dark and light theme (T)',
      reiniciarTitle: 'Clear answers, highlights and pins',
      idiomaTitle: 'Switch language (Spanish / English)',
      muteTitle: 'Mute or unmute the music',
      pista: '<kbd>Wheel</kbd> zoom · <kbd>Drag</kbd> pan or pin · <kbd>Double-click</kbd> full card · <kbd>Ctrl</kbd>+<kbd>Click</kbd> highlight',
      detalle: 'Detail',
      compararTab: 'Compare',
      panelCerrar: 'Close panel',
      panelAsa: 'Drag to resize',
      buscarPlaceholder: 'Search a tradition, religion or system…',
      modoCompacto: 'Compact mode',
      limpiarSeleccion: 'Clear selection',
      irComparar: 'Compare →',
      tradicionesTitulo: 'Traditions and belief systems',
      posturasTitulo: 'Unaffiliated postures',
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
      bienvenida: 'Every belief begins with a question.',
      definicion: 'Definition',
      definicionBuscando: 'Looking up Wikipedia…',
      definicionVacia: 'Wikipedia has no entry (or none could be reached) for this term.',
      definicionOffline: 'Offline: Wikipedia could not be reached.',
      fuenteWikipedia: 'Source: Wikipedia',
      religionesRama: 'Religions and traditions in this branch',
      posturasRama: 'Postures in this branch',
      ningunaRegistrada: 'none recorded',
      sostenidaPor: 'Held by',
      deshacer: 'Undo',
      deshacerDesc: 'Undoes this answer and prunes the branch that hung from it.',
      chincheta: 'Pin',
      chinchetaDesc: 'This node is pinned by hand. Click to return it to the automatic layout.',
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
      idiomaEs: 'Español'
    }
  };

  var cacheTrad = {};
  var cola = [];
  var ocupado = false;
  var oyentes = [];

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

    /* Texto de datos: en español se devuelve el original; en inglés se usa
       la traducción cacheada o se encola una petición y se pinta el original
       hasta que llegue. */
    dato: function (clave, original) {
      if (!original) return original;
      if (this.idioma === 'es') return original;
      var id = 'en|' + clave;
      if (Object.prototype.hasOwnProperty.call(cacheTrad, id)) return cacheTrad[id] || original;
      this.encolar(id, original);
      return original;
    },

    encolar: function (id, original) {
      var i;
      for (i = 0; i < cola.length; i++) if (cola[i].id === id) return;
      cola.push({ id: id, original: original });
      bombearCola();
    }
  };

  function bombearCola() {
    if (ocupado || !cola.length) return;
    ocupado = true;
    var trabajo = cola.shift();
    traducirRemoto(trabajo.original).then(function (traducido) {
      cacheTrad[trabajo.id] = traducido || trabajo.original;
      guardarCacheDisco();
      ocupado = false;
      oyentes.forEach(function (fn) { fn(I18n.idioma); });
      global.setTimeout(bombearCola, 120);
    }, function () {
      ocupado = false;
      global.setTimeout(bombearCola, 400);
    });
  }

  function traducirRemoto(texto) {
    var url = 'https://api.mymemory.translated.net/get?langpair=es|en&q='
      + encodeURIComponent(String(texto).slice(0, 480));
    return fetch(url).then(function (respuesta) {
      if (!respuesta.ok) throw new Error('HTTP');
      return respuesta.json();
    }).then(function (json) {
      var t = json && json.responseData && json.responseData.translatedText;
      if (!t || /INVALID|QUERY LENGTH/i.test(t)) return texto;
      return t;
    });
  }

  Arbol.I18n = I18n;

})(window);
