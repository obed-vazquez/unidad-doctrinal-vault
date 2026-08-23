/* Estado compartible en la barra de direcciones.
   Formato compacto legible: ?path=Q1:A,Q2:B&hl=T:P1,P:Q18&view=auto
   Sobre file:// algunos navegadores rechazan history.replaceState; en ese caso
   la URL no se reescribe pero el botón «Compartir» sigue generando el enlace. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});

  function leer() {
    var parametros = new URLSearchParams(global.location.search);
    var lectura = {
      respuestas: null,
      resaltados: null,
      tradiciones: null,
      posturas: null,
      vista: null,
      modo: null,
      tema: null,
      completo: null,
      divulgacion: null,
      camara: null
    };

    var camino = parametros.get('path');
    if (camino !== null) {
      lectura.respuestas = {};
      camino.split(',').filter(Boolean).forEach(function (par) {
        var partes = par.split(':');
        if (partes.length === 2 && partes[0] && partes[1]) {
          lectura.respuestas[partes[0].trim()] = partes[1].trim();
        }
      });
    }

    var resaltados = parametros.get('hl');
    if (resaltados !== null) {
      lectura.resaltados = resaltados.split(',').map(function (id) { return id.trim(); })
        .filter(Boolean);
    }

    var tradiciones = parametros.get('trad');
    if (tradiciones !== null) {
      lectura.tradiciones = tradiciones.split('|').map(function (nombre) {
        return decodeURIComponent(nombre);
      }).filter(Boolean);
    }

    var posturas = parametros.get('pos');
    if (posturas !== null) {
      lectura.posturas = posturas.split(',').map(function (id) { return id.trim(); })
        .filter(Boolean);
    }

    var vista = parametros.get('view');
    if (vista === 'auto' || vista === 'manual') lectura.vista = vista;
    if (vista === 'lista' || vista === 'grafo') lectura.presentacion = vista;

    var modo = parametros.get('modo');
    if (modo === 'libre' || modo === 'explorador') lectura.modo = modo;

    var tema = parametros.get('tema');
    if (tema === 'claro' || tema === 'oscuro') lectura.tema = tema;

    var presentacion = parametros.get('vista');
    if (presentacion === 'lista' || presentacion === 'grafo') lectura.presentacion = presentacion;

    if (parametros.get('full') !== null) lectura.completo = parametros.get('full') === '1';
    var rec = parametros.get('rec');
    if (rec === 'cuestionario' || rec === 'limpio' || rec === 'exploracion' || rec === 'completo') {
      lectura.divulgacion = rec;
    }

    // `?limpio=1` ignora lo guardado en localStorage para esta carga. Sirve
    // para compartir un enlace que se vea igual en cualquier navegador y para
    // arrancar de cero sin tocar el almacenamiento a mano.
    lectura.limpio = parametros.get('limpio') === '1';

    var lang = parametros.get('lang') || parametros.get('idioma');
    if (lang === 'en' || lang === 'es') lectura.lang = lang;
    lectura.musica = parametros.get('musica') === '1' || parametros.get('music') === '1'
      || parametros.get('audio') === '1';

    var camara = parametros.get('cam');
    if (camara) {
      var numeros = camara.split(',').map(Number);
      if (numeros.length === 3 && numeros.every(function (n) { return isFinite(n); })) {
        lectura.camara = { x: numeros[0], y: numeros[1], k: numeros[2] };
      }
    }

    return lectura;
  }

  function construir(estado, incluirCamara) {
    var parametros = new URLSearchParams();

    var camino = Object.keys(estado.respuestas).sort(function (a, b) {
      return Number(a.slice(1)) - Number(b.slice(1));
    }).map(function (qid) { return qid + ':' + estado.respuestas[qid]; });
    if (camino.length) parametros.set('path', camino.join(','));

    if (estado.resaltados.size) {
      parametros.set('hl', Array.from(estado.resaltados).join(','));
    }
    if (estado.tradiciones.length) {
      parametros.set('trad', estado.tradiciones.map(encodeURIComponent).join('|'));
    }
    if (estado.posturasSueltas.length) {
      parametros.set('pos', estado.posturasSueltas.join(','));
    }
    if (estado.modo !== 'libre') parametros.set('modo', estado.modo);
    if (estado.vista !== 'grafo') parametros.set('vista', estado.vista);
    if (estado.tema !== 'oscuro') parametros.set('tema', estado.tema);
    if (estado.divulgacion && estado.divulgacion !== 'cuestionario') {
      parametros.set('rec', estado.divulgacion);
    }
    if (estado.arbolCompleto || estado.divulgacion === 'completo') parametros.set('full', '1');
    if (estado.musica) parametros.set('musica', '1');
    if (Arbol.I18n && Arbol.I18n.idioma === 'en') parametros.set('lang', 'en');

    var hayAnclajes = Object.keys(estado.fijados).length > 0;
    parametros.set('view', hayAnclajes ? 'manual' : 'auto');

    if (incluirCamara) {
      parametros.set('cam', [
        Math.round(estado.camara.x),
        Math.round(estado.camara.y),
        Math.round(estado.camara.k * 1000) / 1000
      ].join(','));
    }

    return legible(parametros.toString());
  }

  /* `URLSearchParams` escapa «:», «,» y «|», que son legales en una cadena de
     consulta (RFC 3986). Los devolvemos para que el enlace se lea como en la
     especificación: ?path=Q1:A,Q2:B&hl=T:P1,P:Q18&view=auto
     Los nombres de tradición van codificados dos veces, así que sus «%25…»
     no contienen estas secuencias y no se ven afectados. */
  function legible(consulta) {
    return consulta.replace(/%3A/g, ':').replace(/%2C/g, ',').replace(/%7C/g, '|');
  }

  function escribir(estado) {
    var consulta = construir(estado, false);
    var destino = global.location.pathname + (consulta ? '?' + consulta : '');
    try {
      global.history.replaceState(null, '', destino);
    } catch (error) {
      /* file:// en algunos navegadores: se ignora sin romper la sesión. */
    }
  }

  function enlace(estado) {
    var consulta = construir(estado, true);
    var base = global.location.href.split('?')[0].split('#')[0];
    return base + (consulta ? '?' + consulta : '');
  }

  /* Aplica lo leído en la URL sobre el estado ya cargado de localStorage.
     La URL manda: quien comparte un enlace espera ver exactamente esa vista. */
  function aplicar(lectura, estado) {
    var huboCambio = false;
    if (lectura.respuestas) { estado.respuestas = lectura.respuestas; huboCambio = true; }
    if (lectura.resaltados) { estado.resaltados = new Set(lectura.resaltados); huboCambio = true; }
    if (lectura.tradiciones) { estado.tradiciones = lectura.tradiciones; huboCambio = true; }
    if (lectura.posturas) { estado.posturasSueltas = lectura.posturas; huboCambio = true; }
    if (lectura.tradiciones || lectura.posturas) {
      // Un enlace que nombra creencias abre el explorador aunque no lo diga.
      estado.modo = (estado.tradiciones.length || estado.posturasSueltas.length)
        ? 'explorador' : 'libre';
    }
    if (lectura.modo) { estado.modo = lectura.modo; huboCambio = true; }
    if (lectura.tema) { estado.tema = lectura.tema; }
    if (lectura.presentacion) { estado.vista = lectura.presentacion; huboCambio = true; }
    if (lectura.divulgacion) {
      estado.divulgacion = lectura.divulgacion;
      estado.arbolCompleto = lectura.divulgacion === 'completo';
      huboCambio = true;
    } else if (lectura.completo !== null) {
      estado.arbolCompleto = lectura.completo;
      estado.divulgacion = lectura.completo ? 'completo' : 'cuestionario';
      huboCambio = true;
    }
    if (lectura.camara) { estado.camara = lectura.camara; huboCambio = true; }
    if (lectura.musica) estado.musica = true;
    return {
      huboCambio: huboCambio,
      encuadreAutomatico: lectura.vista !== 'manual' && !lectura.camara
    };
  }

  Arbol.Router = {
    leer: leer,
    escribir: escribir,
    enlace: enlace,
    aplicar: aplicar
  };

})(window);
