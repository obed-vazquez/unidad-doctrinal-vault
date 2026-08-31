/* Visor Markdown embebido: carga notas del vault, las renderiza con marked
   y las pinta en contenedores de la propia página (sin salir a mdrenderer).

   En file:// Chrome bloquea fetch a otros archivos locales. El conversor
   escribe datos/notas.cache.js → window.__ARBOL_NOTAS__. En file:// solo
   usamos esa bolsa (y opcionalmente raw de GitHub); nunca fetch local. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var cache = {};
  var inflight = {};
  var ramaGithub = 'main';

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function t(clave, vars) {
    return Arbol.I18n ? Arbol.I18n.t(clave, vars) : clave;
  }

  function esHttp() {
    return !!(global.location && /^https?:$/i.test(global.location.protocol));
  }

  function prepararMarkdown(crudo) {
    var texto = String(crudo || '');
    texto = texto.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g,
      function (_, destino, alias) {
        return alias || destino;
      });
    texto = texto.replace(/\\([-*_>#.`[\]()])/g, '$1');
    return texto;
  }

  function renderizar(markdown) {
    var limpio = prepararMarkdown(markdown);
    var api = global.marked;
    var parse = api && (api.parse || (typeof api === 'function' ? api : null));
    var html = '';
    if (typeof parse === 'function') {
      try {
        if (api.setOptions) api.setOptions({ gfm: true, breaks: true });
        html = parse.call(api, limpio);
      } catch (error) { /* caemos al pre */ }
    }
    if (!html) html = '<pre class="md-fallback">' + escapar(limpio) + '</pre>';
    return externalizarEnlacesHtml(html);
  }

  function externalizarEnlacesHtml(html) {
    return String(html || '').replace(/<a\b([^>]*)>/gi, function (coincidencia, attrs) {
      if (/\btarget\s*=/i.test(attrs)) return coincidencia;
      if (!/\bhref\s*=/i.test(attrs)) return coincidencia;
      var rel = /\brel\s*=/i.test(attrs) ? '' : ' rel="noopener noreferrer"';
      return '<a' + attrs + ' target="_blank"' + rel + '>';
    });
  }

  function externalizarEnlaces(elemento) {
    if (!elemento || !elemento.querySelectorAll) return;
    Array.prototype.forEach.call(elemento.querySelectorAll('a[href]'), function (enlace) {
      enlace.setAttribute('target', '_blank');
      enlace.setAttribute('rel', 'noopener noreferrer');
    });
  }

  function escaparCss(valor) {
    if (global.CSS && typeof global.CSS.escape === 'function') {
      return global.CSS.escape(valor);
    }
    return String(valor).replace(/([^a-zA-Z0-9_-])/g, '\\$1');
  }

  function codificarSegmentos(ruta) {
    return String(ruta || '').split('/').map(function (seg) {
      if (!seg || seg === '.' || seg === '..') return seg;
      return encodeURIComponent(seg);
    }).join('/');
  }

  function urlGithubRaw(vaultPath) {
    if (!vaultPath) return null;
    return 'https://raw.githubusercontent.com/obed-vazquez/unidad-doctrinal-vault/'
      + 'refs/heads/' + ramaGithub + '/' + codificarSegmentos(vaultPath);
  }

  function absolutizar(ruta) {
    if (!ruta) return null;
    if (/^https?:\/\//i.test(ruta)) return ruta;
    try {
      return new URL(ruta, global.document.baseURI).href;
    } catch (error) {
      return ruta;
    }
  }

  function nombreArchivo(ruta) {
    var limpio = String(ruta || '').split('#')[0].split('?')[0];
    var partes = limpio.replace(/\\/g, '/').split('/');
    return partes[partes.length - 1] || '';
  }

  function desdeCacheLocal(enlace) {
    var bolsa = global.__ARBOL_NOTAS__;
    if (!bolsa || typeof bolsa !== 'object') return null;
    var claves = [
      enlace.vault_path,
      enlace.href,
      enlace.target && String(enlace.target).split('#')[0].split('|')[0].trim(),
      enlace.label,
      nombreArchivo(enlace.vault_path),
      nombreArchivo(enlace.href)
    ];
    var i;
    for (i = 0; i < claves.length; i++) {
      var clave = claves[i];
      if (clave && Object.prototype.hasOwnProperty.call(bolsa, clave)
        && typeof bolsa[clave] === 'string') {
        return bolsa[clave];
      }
    }
    return null;
  }

  function candidatosDe(enlace) {
    var lista = [];
    if (!enlace) return lista;

    // En file:// no intentamos rutas locales: Chrome las bloquea con CORS y
    // solo ensucian la consola. La vía local es __ARBOL_NOTAS__.
    if (esHttp()) {
      if (enlace.href) {
        lista.push(absolutizar(codificarSegmentos(enlace.href)));
        lista.push(absolutizar(enlace.href));
      }
      if (enlace.vault_path) {
        lista.push(absolutizar(codificarSegmentos('../../../' + enlace.vault_path)));
        lista.push(absolutizar('../../../' + enlace.vault_path));
      }
    }

    if (enlace.vault_path) {
      var raw = urlGithubRaw(enlace.vault_path);
      if (raw) lista.push(raw);
    }
    return lista.filter(function (u, i, arr) {
      return u && arr.indexOf(u) === i && !/^file:/i.test(u);
    });
  }

  function claveDe(enlace) {
    if (!enlace) return '';
    return enlace.vault_path || enlace.href || enlace.target || enlace.label || '';
  }

  function okDesdeTexto(texto, fuente) {
    return {
      estado: 'ok',
      markdown: texto,
      html: renderizar(texto),
      fuente: fuente || 'cache'
    };
  }

  function cargar(enlace) {
    var clave = claveDe(enlace);
    if (!clave) {
      return Promise.resolve({ estado: 'vacia', html: '', markdown: '' });
    }
    if (cache[clave]) return Promise.resolve(cache[clave]);
    if (inflight[clave]) return inflight[clave];

    var embebido = desdeCacheLocal(enlace);
    if (typeof embebido === 'string') {
      var valorCache = okDesdeTexto(embebido, 'embebido');
      cache[clave] = valorCache;
      return Promise.resolve(valorCache);
    }

    var urls = candidatosDe(enlace);
    if (!urls.length) {
      var falloLocal = {
        estado: global.__ARBOL_NOTAS__ ? 'error' : 'error',
        html: '',
        markdown: ''
      };
      cache[clave] = falloLocal;
      return Promise.resolve(falloLocal);
    }

    inflight[clave] = (function intentar(i) {
      if (i >= urls.length) {
        var fallo = { estado: 'error', html: '', markdown: '' };
        cache[clave] = fallo;
        delete inflight[clave];
        return Promise.resolve(fallo);
      }
      return fetch(urls[i], { cache: 'force-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      }).then(function (texto) {
        var valor = okDesdeTexto(texto, urls[i]);
        cache[clave] = valor;
        delete inflight[clave];
        return valor;
      }, function () {
        return intentar(i + 1);
      });
    })(0);

    return inflight[clave];
  }

  function pintarEn(elemento, enlace, opciones) {
    if (!elemento) return Promise.resolve();
    var opts = opciones || {};
    var marca = claveDe(enlace);
    elemento.setAttribute('data-md', marca);
    elemento.classList.add('md-cuerpo', 'md-cargando');
    elemento.innerHTML = '<p class="md-estado"><em>'
      + escapar(t('mdCargando')) + '</em></p>';

    return cargar(enlace).then(function (doc) {
      if (!elemento.isConnected) return;
      if (elemento.getAttribute('data-md') !== marca) return;
      elemento.classList.remove('md-cargando');
      if (doc.estado === 'ok') {
        elemento.innerHTML = doc.html;
        externalizarEnlaces(elemento);
        if (opts.fragmento) {
          var ancla = String(opts.fragmento).replace(/^#/, '');
          var destino = elemento.querySelector('#' + escaparCss(ancla))
            || elemento.querySelector('[name="' + ancla.replace(/"/g, '') + '"]');
          if (destino && destino.scrollIntoView) {
            global.setTimeout(function () {
              destino.scrollIntoView({ block: 'start', behavior: 'smooth' });
            }, 40);
          }
        }
        return;
      }
      if (doc.estado === 'vacia') {
        elemento.innerHTML = '<p class="md-estado">'
          + escapar(t('mdVacio')) + '</p>';
        return;
      }
      elemento.innerHTML = '<p class="md-estado">'
        + escapar(t('mdError')) + '</p>';
    });
  }

  function pintarCola(raiz) {
    if (!raiz) return;
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-md-enlace]'),
      function (caja) {
        var crudo = caja.getAttribute('data-md-enlace');
        var enlace;
        try { enlace = JSON.parse(crudo); } catch (error) { enlace = null; }
        if (!enlace) return;
        var fragmento = caja.getAttribute('data-md-frag') || '';
        pintarEn(caja, enlace, { fragmento: fragmento });
      });
  }

  function tarjetaDocumento(enlace, extras) {
    if (!enlace) return '';
    var titulo = enlace.label || enlace.target || t('mdDocumento');
    var frag = String(enlace.target || '').split('#')[1] || '';
    var payload = {
      target: enlace.target || null,
      label: enlace.label || null,
      href: enlace.href || null,
      vault_path: enlace.vault_path || null
    };
    var html = '<details class="md-tarjeta" open>'
      + '<summary>'
      + '<span class="md-tarjeta-titulo">' + escapar(titulo) + '</span>'
      + '<span class="md-tarjeta-hint">' + escapar(t('mdExpandir')) + '</span>'
      + '</summary>'
      + '<div class="md-cuerpo" data-md-enlace="'
      + escapar(JSON.stringify(payload)) + '"'
      + (frag ? ' data-md-frag="' + escapar(frag) + '"' : '')
      + '></div>';
    if (extras && extras.pie) {
      html += '<div class="md-tarjeta-pie">' + extras.pie + '</div>';
    }
    html += '</details>';
    return html;
  }

  Arbol.Markdown = {
    cargar: cargar,
    externalizarEnlaces: externalizarEnlaces,
    externalizarEnlacesHtml: externalizarEnlacesHtml,
    renderizar: renderizar,
    pintarEn: pintarEn,
    pintarCola: pintarCola,
    tarjeta: tarjetaDocumento,
    candidatos: candidatosDe
  };

})(window);
