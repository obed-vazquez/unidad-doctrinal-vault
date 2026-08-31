/* Definiciones dinámicas de posturas: búsqueda + extracto introductorio
   en Wikipedia (API pública, CORS). Nada se redacta a mano; si no hay
   artículo o no hay red, se informa el vacío. Los extractos se cachean. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var CLAVE = 'arbol-posturas/defs-wiki/v1';
  var cache = {};
  var inflight = {};

  function leerDisco() {
    try {
      var crudo = global.localStorage.getItem(CLAVE);
      if (crudo) cache = JSON.parse(crudo) || {};
    } catch (error) { cache = {}; }
  }

  function guardarDisco() {
    try { global.localStorage.setItem(CLAVE, JSON.stringify(cache)); }
    catch (error) { /* cuota */ }
  }

  function wikiHost(idioma) {
    return idioma === 'en' ? 'en.wikipedia.org' : 'es.wikipedia.org';
  }

  function recortar(texto, max) {
    var limpio = String(texto || '').replace(/\s+/g, ' ').trim();
    if (limpio.length <= max) return limpio;
    var corte = limpio.lastIndexOf(' ', max);
    return limpio.slice(0, corte > 40 ? corte : max).replace(/[ ,;:]+$/, '') + '…';
  }

  function esDesambiguacion(extracto, idioma) {
    var t = String(extracto || '').toLowerCase();
    if (idioma === 'en') {
      return t.indexOf('may refer to') !== -1 || t.indexOf('can refer to') !== -1;
    }
    return t.indexOf('puede referirse') !== -1 || t.indexOf('puede designar') !== -1;
  }

  /* Candidatos de búsqueda a partir de la etiqueta de la postura, sin
     inventar sinónimos: se parte el propio nombre (barras, paréntesis, *). */
  function candidatos(etiqueta) {
    var limpia = String(etiqueta || '')
      .replace(/\*+$/g, '')
      .replace(/\?+$/g, '')
      .trim();
    if (!limpia || limpia === '?' || /^sin[- ]nombre$/i.test(limpia)) return [];
    var vistos = {};
    var lista = [];
    function add(texto) {
      var t = String(texto || '').replace(/\s+/g, ' ').trim();
      if (!t || vistos[t.toLowerCase()]) return;
      vistos[t.toLowerCase()] = true;
      lista.push(t);
    }
    add(limpia);
    limpia.split(/\s*\/\s*/).forEach(function (parte) {
      var p = parte.replace(/[()]/g, ' ').replace(/\btambién\b/ig, ' ').trim();
      add(p);
    });
    var paren = limpia.match(/\(([^)]+)\)/);
    if (paren) add(paren[1]);
    var cabeza = limpia.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
    add(cabeza);
    var deLos = cabeza.split(/\s+de los\s+/i)[0];
    if (deLos && deLos !== cabeza) add(deLos);
    var de = cabeza.split(/\s+de\s+/i)[0];
    if (de && de !== cabeza && de.split(' ').length <= 3) add(de);
    return lista;
  }

  function getJson(url) {
    return fetch(url).then(function (respuesta) {
      if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
      return respuesta.json();
    });
  }

  function buscarTitulo(termino, idioma) {
    var url = 'https://' + wikiHost(idioma)
      + '/w/api.php?action=opensearch&limit=1&namespace=0&format=json&origin=*'
      + '&search=' + encodeURIComponent(termino);
    return getJson(url).then(function (json) {
      return json && json[1] && json[1][0] ? json[1][0] : null;
    });
  }

  function extractoDe(titulo, idioma) {
    var url = 'https://' + wikiHost(idioma)
      + '/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1'
      + '&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(titulo);
    return getJson(url).then(function (json) {
      var pages = json && json.query && json.query.pages;
      if (!pages) return null;
      var id = Object.keys(pages)[0];
      var page = pages[id];
      if (!page || page.missing || !page.extract) return null;
      if (esDesambiguacion(page.extract, idioma)) return null;
      var slug = String(page.title || titulo).replace(/ /g, '_');
      return {
        titulo: page.title,
        texto: recortar(page.extract, 720),
        url: 'https://' + wikiHost(idioma) + '/wiki/' + encodeURIComponent(slug)
      };
    });
  }

  function consultarTermino(termino, idioma) {
    return buscarTitulo(termino, idioma).then(function (titulo) {
      if (!titulo) return null;
      return extractoDe(titulo, idioma);
    });
  }

  function consultarCadena(lista, idioma, indice) {
    if (indice >= lista.length) return Promise.resolve(null);
    return consultarTermino(lista[indice], idioma).then(function (hit) {
      if (hit) return hit;
      return consultarCadena(lista, idioma, indice + 1);
    });
  }

  function enlaceFuenteExterna(url, textoEscapado) {
    return '<a class="enlace-md-externo" href="' + escapar(url)
      + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="enlace-md-icono" aria-hidden="true">↗</span>'
      + '<span>' + textoEscapado + '</span></a>';
  }

  var Definiciones = {
    iniciar: function () { leerDisco(); },

    clave: function (postura, idioma) {
      return (idioma || 'es') + '|' + (postura && postura.id ? postura.id : '');
    },

    obtener: function (postura, idioma) {
      if (!postura || postura.is_unnamed || !postura.label) {
        return Promise.resolve({ estado: 'vacia' });
      }
      var id = this.clave(postura, idioma);
      if (cache[id]) return Promise.resolve(cache[id]);
      if (inflight[id]) return inflight[id];

      var lista = candidatos(postura.label);
      if (!lista.length) {
        var vacia = { estado: 'vacia' };
        cache[id] = vacia;
        return Promise.resolve(vacia);
      }

      inflight[id] = consultarCadena(lista, idioma, 0).then(function (hit) {
        var valor = hit
          ? { estado: 'ok', titulo: hit.titulo, texto: hit.texto, url: hit.url }
          : { estado: 'vacia' };
        cache[id] = valor;
        guardarDisco();
        delete inflight[id];
        return valor;
      }, function () {
        delete inflight[id];
        return { estado: 'offline' };
      });
      return inflight[id];
    },

    /* Rellena un contenedor ya pintado; si el nodo se sustituyó, no escribe. */
    pintarEn: function (elemento, postura, idioma) {
      if (!elemento) return;
      var I = Arbol.I18n;
      var marca = postura && postura.id;
      elemento.setAttribute('data-def', marca || '');
      elemento.innerHTML = '<em>' + (I ? I.t('definicionBuscando') : '…') + '</em>';
      this.obtener(postura, idioma).then(function (def) {
        if (!elemento.isConnected) return;
        if (elemento.getAttribute('data-def') !== String(marca || '')) return;
        if (def.estado === 'ok') {
          var etiqueta = escapar(I ? I.t('fuenteWikipedia') : 'Wikipedia')
            + (def.titulo ? ' — ' + escapar(def.titulo) : '');
          elemento.innerHTML = '<p>' + escapar(def.texto) + '</p>'
            + (def.url
              ? '<p class="def-fuente">' + enlaceFuenteExterna(def.url, etiqueta) + '</p>'
              : '');
        } else if (def.estado === 'offline') {
          elemento.textContent = I ? I.t('definicionOffline') : '';
        } else {
          elemento.textContent = I ? I.t('definicionVacia') : '';
        }
      });
    }
  };

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  leerDisco();
  Arbol.Definiciones = Definiciones;

})(window);
