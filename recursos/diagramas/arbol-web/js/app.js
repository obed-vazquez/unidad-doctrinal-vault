/* Orquestador: carga de datos, ciclo de refresco (visibilidad → medida →
   layout → dibujo), panel lateral, explorador de creencias, Modo de
   Razonamiento y Comparación, atajos de teclado y tema. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol;
  var Estado = Arbol.Estado;
  var Vista = Arbol.Vista;
  var Layout = Arbol.Layout;
  var Busqueda = Arbol.Busqueda;
  var Router = Arbol.Router;
  var Edits = Arbol.Edits;
  var I18n = Arbol.I18n;
  var Definiciones = Arbol.Definiciones;

  var RUTA_JSON = 'datos/posturas-creencias.json';
  var RUTA_RESPALDO = 'datos/posturas-creencias.js';

  var dom = {};
  var datosCanon = null;
  var editsEstado = Edits.vacio();
  var resolucionesActuales = [];
  var entradasComparacion = [];
  var sujetosActuales = [];
  var plegados = {};
  var listaTradiciones = [];
  var listaPosturasSueltas = [];

  /* ------------------------------------------------------------- carga --- */

  function cargarDatos() {
    return fetch(RUTA_JSON, { cache: 'no-store' })
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        return respuesta.json();
      })
      .catch(function () {
        // file:// bloquea fetch por CORS: caemos al gemelo .js que el
        // generador escribe junto al JSON.
        return cargarRespaldo();
      });
  }

  function cargarRespaldo() {
    return new Promise(function (resolver, rechazar) {
      var script = document.createElement('script');
      script.src = RUTA_RESPALDO;
      script.onload = function () {
        if (global.__ARBOL_POSTURAS__) resolver(global.__ARBOL_POSTURAS__);
        else rechazar(new Error('El respaldo no definió __ARBOL_POSTURAS__.'));
      };
      script.onerror = function () {
        rechazar(new Error('No se pudo leer ' + RUTA_RESPALDO));
      };
      document.head.appendChild(script);
    });
  }

  /* ---------------------------------------------------------- utilidades - */

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function t(clave, vars) {
    return I18n && I18n.t ? I18n.t(clave, vars) : clave;
  }

  function dato(clave, original) {
    return I18n && I18n.dato ? I18n.dato(clave, original) : original;
  }

  function recolectarAgregado(nodo) {
    var tradiciones = [];
    var porNombre = {};
    var posturas = [];
    var vistosNodo = new Set();
    var vistosPostura = {};
    function rec(id) {
      if (!id || vistosNodo.has(id)) return;
      vistosNodo.add(id);
      var n = Estado.grafo.nodos.get(id);
      if (!n) return;
      var p = n.postura;
      if (p && !p.is_root) {
        (p.traditions || []).forEach(function (tradicion) {
          if (!tradicion.name || tradicion.is_note) return;
          if (!porNombre[tradicion.name]) {
            porNombre[tradicion.name] = {
              name: tradicion.name,
              is_tentative: !!tradicion.is_tentative
            };
            tradiciones.push(porNombre[tradicion.name]);
          } else if (tradicion.is_tentative) {
            porNombre[tradicion.name].is_tentative = true;
          }
        });
        var etiquetaNom = String(p.label || '').trim();
        var nombrada = !p.is_unnamed && etiquetaNom && etiquetaNom !== '?'
          && !/^sin[-\s]?nombre$/i.test(etiquetaNom);
        if (nombrada && !vistosPostura[p.id]) {
          vistosPostura[p.id] = true;
          posturas.push(p);
        }
      }
      n.salidas.forEach(function (arista) { rec(arista.hasta); });
    }
    rec(nodo.id);
    posturas.sort(function (a, b) {
      return Layout.rotuloPostura(a).localeCompare(Layout.rotuloPostura(b), I18n.idioma || 'es');
    });
    tradiciones.sort(function (a, b) {
      return a.name.localeCompare(b.name, I18n.idioma || 'es');
    });
    return { tradiciones: tradiciones, posturas: posturas };
  }

  function avisar(mensaje) {
    dom.aviso.textContent = mensaje;
    dom.aviso.classList.add('visible');
    global.clearTimeout(avisar._temporizador);
    avisar._temporizador = global.setTimeout(function () {
      dom.aviso.classList.remove('visible');
    }, 2600);
  }

  /* Confirmación modal propia: `window.confirm` bloquea el hilo y desentona
     con el resto de la interfaz. Devuelve una promesa con la decisión. */
  function confirmar(opciones) {
    return new Promise(function (resolver) {
      dom.dialogoTitulo.textContent = opciones.titulo;
      dom.dialogoTexto.innerHTML = opciones.texto;
      dom.dialogoAceptar.textContent = opciones.aceptar || 'Eliminar';
      dom.dialogo.classList.remove('oculto');
      dom.dialogoAceptar.focus();

      function cerrar(decision) {
        dom.dialogo.classList.add('oculto');
        dom.dialogoAceptar.removeEventListener('click', aceptar);
        dom.dialogoCancelar.removeEventListener('click', cancelar);
        dom.dialogo.removeEventListener('click', fuera);
        document.removeEventListener('keydown', tecla);
        resolver(decision);
      }
      function aceptar() { cerrar(true); }
      function cancelar() { cerrar(false); }
      function fuera(evento) { if (evento.target === dom.dialogo) cerrar(false); }
      function tecla(evento) {
        if (evento.key === 'Escape') { evento.stopPropagation(); cerrar(false); }
        if (evento.key === 'Enter') { evento.preventDefault(); cerrar(true); }
      }

      dom.dialogoAceptar.addEventListener('click', aceptar);
      dom.dialogoCancelar.addEventListener('click', cancelar);
      dom.dialogo.addEventListener('click', fuera);
      document.addEventListener('keydown', tecla);
    });
  }

  function descargar(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    global.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function copiar(texto) {
    if (global.navigator.clipboard && global.isSecureContext) {
      global.navigator.clipboard.writeText(texto).then(function () {
        avisar('Copiado al portapapeles.');
      }, function () { copiarPorSeleccion(texto); });
      return;
    }
    copiarPorSeleccion(texto);
  }

  function copiarPorSeleccion(texto) {
    // file:// no es contexto seguro: el portapapeles moderno no está
    // disponible y hay que recurrir a la selección de un textarea oculto.
    var area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', 'readonly');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var listo = false;
    try { listo = document.execCommand('copy'); } catch (error) { listo = false; }
    area.remove();
    avisar(listo ? 'Copiado al portapapeles.' : 'No se pudo copiar automáticamente.');
  }

  /* --------------------------------------------------------- explorador -- */

  function sujetosSeleccionados() {
    var sujetos = [];
    Estado.tradiciones.forEach(function (nombre) {
      var encontrada = listaTradiciones.filter(function (t) { return t.nombre === nombre; })[0];
      if (encontrada) sujetos.push(encontrada);
    });
    Estado.posturasSueltas.forEach(function (pid) {
      var encontrada = listaPosturasSueltas.filter(function (p) {
        return p.posturaIds[0] === pid;
      })[0];
      if (encontrada) sujetos.push(encontrada);
    });
    return sujetos;
  }

  function sujetoUsuario() {
    return {
      tipo: 'usuario',
      id: 'usuario',
      nombre: 'Tu recorrido',
      posturaIds: [],
      tentativa: false,
      respuestas: Estado.respuestas
    };
  }

  function calcularExploracion() {
    var sujetos = sujetosSeleccionados();
    if (Estado.modo !== 'explorador' || !sujetos.length) {
      Estado.superpuestas = {};
      return null;
    }
    var resoluciones = sujetos.map(function (sujeto) {
      return Busqueda.resolver(Estado.grafo, Estado.datos, sujeto);
    });
    var combinado = Busqueda.combinar(resoluciones);
    Estado.superpuestas = combinado.respuestas;

    var destinosTentativos = new Set();
    combinado.aristasTentativas.forEach(function (aristaId) {
      var arista = Estado.grafo.aristas.get(aristaId);
      if (arista) destinosTentativos.add(arista.hasta);
    });

    return {
      nodos: combinado.nodos,
      aristas: combinado.aristas,
      aristasTentativas: combinado.aristasTentativas,
      destinosTentativos: destinosTentativos,
      destinos: combinado.destinos,
      resoluciones: resoluciones,
      sujetos: sujetos
    };
  }

  /* ------------------------------------------------------------ refresco - */

  var caminoActual = null;

  function encuadrarCaminoActual() {
    if (!caminoActual) { Vista.encuadrar(null, true); return; }
    Vista.encuadrar(Array.from(caminoActual.nodos), true);
  }

  function reunirRamaInmediata(id, ids) {
    if (!id || ids.indexOf(id) !== -1) return;
    ids.push(id);
    var nodo = Estado.grafo.nodos.get(id);
    if (!nodo) return;
    nodo.salidas.forEach(function (arista) {
      if (arista.tipo === 'eje') reunirRamaInmediata(arista.hasta, ids);
    });
  }

  function idsAbiertosPorRespuesta(preguntaId, clave) {
    var anfitrionId = Estado.grafo.anfitrionDePregunta(preguntaId);
    var anfitrion = Estado.grafo.nodos.get(anfitrionId);
    var ids = [];
    if (!anfitrion) return ids;
    anfitrion.salidas.forEach(function (arista) {
      if (arista.preguntaId !== preguntaId || arista.clave !== clave) return;
      reunirRamaInmediata(arista.hasta, ids);
    });
    return ids;
  }

  function seguirNodosTrasAbrir(ids) {
    if (!ids || !ids.length) return;
    global.setTimeout(function () {
      Vista.centrarEnIds(ids, true);
    }, 340);
  }

  function refrescar() {
    var exploracion = calcularExploracion();
    caminoActual = exploracion;
    var respuestas = Estado.respuestasEfectivas();
    var visibles = Estado.visibles();
    var aristasIds = Estado.aristasDe(visibles);

    var descendientes = Arbol.descendientesPorNodo(Estado.grafo);
    var pesosRespuesta = Arbol.pesoDeRespuestas(Estado.grafo);
    var contextoMedida = {
      datos: Estado.datos,
      fijados: Estado.fijados,
      divulgacion: Estado.divulgacion,
      expandidos: Estado.expandidos,
      descendientes: descendientes,
      pesosRespuesta: pesosRespuesta,
      caminoUsuario: Estado.caminoElegido()
    };
    var tamanos = new Map();
    visibles.forEach(function (id) {
      var nodo = Estado.grafo.nodos.get(id);
      var respuesta = nodo.preguntaId ? respuestas[nodo.preguntaId] : undefined;
      var compuesto = Layout.componer(nodo, respuesta == null ? null : respuesta, contextoMedida);
      tamanos.set(id, { ancho: compuesto.ancho, alto: compuesto.alto });
    });

    var disposicion = Layout.calcular(Estado.grafo, visibles, aristasIds, tamanos, Estado.fijados);

    var destacadas = new Set(Estado.tradiciones);
    var caminoUsuario = Estado.caminoElegido();

    Vista.render({
      grafo: Estado.grafo,
      datos: Estado.datos,
      fijados: Estado.fijados,
      estado: Estado,
      visibles: visibles,
      aristasIds: aristasIds,
      disposicion: disposicion,
      respuestas: respuestas,
      camino: exploracion,
      caminoUsuario: caminoUsuario,
      deshabilitados: Estado.divulgacion === 'cuestionario'
        ? Arbol.nodosDeshabilitados(Estado.grafo, respuestas, visibles)
        : new Set(),
      tradicionesDestacadas: destacadas,
      divulgacion: Estado.divulgacion,
      expandidos: Estado.expandidos,
      descendientes: descendientes,
      pesosRespuesta: pesosRespuesta
    });

    actualizarBarra(visibles);
    actualizarPanel();
    pintarDefinicionesEn(dom.cuerpoDetalle);
    Router.escribir(Estado);
  }

  /* Pestañas que piden más ancho: las dos que despliegan tablas y listas. */
  var PESTANAS_ANCHAS = { comparar: true, analisis: true };

  function sincronizarMenuRecorrido() {
    if (dom.valorRecorrido) dom.valorRecorrido.textContent = t(Estado.divulgacion);
    if (!dom.menuRecorrido) return;
    Array.prototype.forEach.call(dom.menuRecorrido.querySelectorAll('[data-recorrido]'),
      function (opcion) {
        var activa = opcion.getAttribute('data-recorrido') === Estado.divulgacion;
        opcion.classList.toggle('activo', activa);
        opcion.setAttribute('aria-checked', activa ? 'true' : 'false');
      });
  }

  function actualizarBarra(visibles) {
    var totalNodos = Estado.grafo.nodos.size;
    var respondidas = Object.keys(Estado.respuestasEfectivas()).length;
    dom.contador.textContent = visibles.size + ' de ' + totalNodos + ' nodos · '
      + respondidas + ' de ' + Object.keys(Estado.datos.questions).length + ' preguntas';
    // «Creencias» es el único interruptor del panel: se enciende con él abierto
    // en cualquiera de sus pestañas y se apaga al cerrarlo, también con la ✕.
    dom.btnCreencias.classList.toggle('activo', Estado.panelAbierto);
    dom.btnCreencias.setAttribute('aria-pressed', Estado.panelAbierto ? 'true' : 'false');

    var cuantosResaltados = Estado.resaltados.size;
    dom.conteoResaltados.textContent = String(cuantosResaltados);
    dom.btnResaltados.hidden = cuantosResaltados === 0;
    dom.btnLimpiarResaltados.hidden = cuantosResaltados === 0;
    dom.sepResaltados.hidden = cuantosResaltados === 0;
    dom.panel.classList.toggle('cerrado', !Estado.panelAbierto);
    dom.panel.classList.toggle('ancho',
      !!(Estado.panelAbierto && PESTANAS_ANCHAS[Estado.pestana]));
    sincronizarAltoBarra();
    document.documentElement.style.setProperty('--panel-ancho', Estado.panelAncho + 'px');
    sincronizarMenuRecorrido();
    if (dom.btnCompacto) {
      dom.btnCompacto.classList.toggle('activo', !!Estado.compactoCreencias);
      dom.btnCompacto.setAttribute('aria-pressed', Estado.compactoCreencias ? 'true' : 'false');
    }
    Array.prototype.forEach.call(dom.pestanas, function (boton) {
      boton.classList.toggle('activa', boton.getAttribute('data-pestana') === Estado.pestana);
    });
    Array.prototype.forEach.call(dom.cuerpos, function (cuerpo) {
      cuerpo.classList.toggle('activa', cuerpo.getAttribute('data-cuerpo') === Estado.pestana);
    });
  }

  /* -------------------------------------------------------- panel: ficha - */

  function insigniasDePostura(postura) {
    var insignias = [];
    if (!postura) return insignias;
    if (postura.is_suggested) insignias.push('término sugerido');
    if (postura.is_unnamed) insignias.push('sin nombre documentado');
    if (postura.is_uncertain) insignias.push('denominación en duda');
    return insignias;
  }

  function fichaDeNodo(nodo) {
    if (!nodo) {
      return '<p class="panel-vacio">' + escapar(t('panelVacio')) + '</p>';
    }
    var datos = Estado.datos;
    var respuestas = Estado.respuestasEfectivas();
    var partes = [];

    var tipoRotulo = nodo.tipo === 'pregunta'
      ? (nodo.pregunta.is_convergence ? 'Pregunta convergente' : 'Pregunta de un eje')
      : (nodo.tipo === 'postura' ? 'Postura con varios ejes' : 'Postura y su pregunta');
    partes.push('<span class="ficha-tipo' + (nodo.tipo !== 'tarjeta' ? ' eje' : '') + '">'
      + escapar(tipoRotulo) + '</span>');

    var postura = nodo.postura;
    if (postura) {
      partes.push('<h2 class="ficha-titulo' + (postura.is_unnamed ? ' sin-nombre' : '') + '">'
        + escapar(Layout.rotuloPostura(postura)) + '</h2>');
      var insignias = insigniasDePostura(postura);
      if (insignias.length) {
        partes.push('<p class="panel-nota">' + escapar(insignias.join(' · ')) + '</p>');
      }
    } else if (nodo.pregunta) {
      var origenes = (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
        return Layout.rotuloPostura(datos.postures[pid]);
      });
      partes.push('<h2 class="ficha-titulo">' + escapar(origenes.join(' & ')) + '</h2>');
      if (nodo.pregunta.is_convergence) {
        partes.push('<p class="panel-nota">Punto de convergencia: ' + origenes.length
          + ' posturas distintas desembocan en esta misma pregunta, que se dibuja'
          + ' como un nodo único con varias aristas entrantes.</p>');
      }
    }

    if (nodo.pregunta) {
      var textos = {
        formal: dato('q.' + nodo.pregunta.id + '.formal', nodo.pregunta.formal_text),
        coloquial: nodo.pregunta.colloquial_hint
          ? dato('q.' + nodo.pregunta.id + '.coloquial', nodo.pregunta.colloquial_hint)
          : ''
      };
      if (textos.coloquial) {
        partes.push('<p class="ficha-coloquial">' + escapar(textos.coloquial) + '</p>');
      }
      partes.push('<p class="ficha-formal">' + escapar(textos.formal) + '</p>');
      var elegida = respuestas[nodo.pregunta.id];
      partes.push('<ul class="ficha-opciones">'
        + (nodo.pregunta.answers || []).map(function (respuesta) {
          var destino = datos.postures[respuesta.target_posture_id];
          var etiqueta = dato('q.' + nodo.pregunta.id + '.' + respuesta.key + '.label', respuesta.label);
          var glosa = respuesta.gloss
            ? dato('q.' + nodo.pregunta.id + '.' + respuesta.key + '.gloss', respuesta.gloss)
            : '';
          var peso = pesoDeRama(nodo.pregunta.id, respuesta.key);
          return '<li class="' + (elegida === respuesta.key ? 'elegida' : '') + '">'
            + '<b>' + escapar(etiqueta) + '</b> → '
            + escapar(Layout.rotuloPostura(destino))
            + (peso ? ' <span class="peso-rama' + (peso.densa ? ' densa' : '') + '">↓ '
              + peso.nodos + '</span>' : '')
            + (glosa ? '<span class="glosa">' + escapar(glosa) + '</span>' : '')
            + '</li>';
        }).join('') + '</ul>');
    }

    if (postura && !postura.is_unnamed) {
      partes.push('<h3 class="panel-subtitulo">' + escapar(t('definicion')) + '</h3>');
      partes.push('<div class="ficha-definicion" data-def="' + escapar(postura.id) + '"></div>');
    }

    var agregado = recolectarAgregado(nodo);
    partes.push('<h3 class="panel-subtitulo">' + escapar(t('religionesRama')) + '</h3>');
    if (agregado.tradiciones.length) {
      partes.push('<div class="etiquetas">' + agregado.tradiciones.map(function (tradicion) {
        var activa = Estado.tradiciones.indexOf(tradicion.name) !== -1;
        var nombre = dato('t.' + tradicion.name, tradicion.name);
        return '<span class="etiqueta' + (tradicion.is_tentative ? ' tentativa' : '')
          + (activa ? ' activa' : '') + '" data-tradicion="' + escapar(tradicion.name) + '">'
          + escapar(nombre) + (tradicion.is_tentative ? ' (?)' : '') + '</span>';
      }).join('') + '</div>');
    } else {
      partes.push('<p class="panel-nota">' + escapar(t('ningunaRegistrada')) + '</p>');
    }

    partes.push('<h3 class="panel-subtitulo">' + escapar(t('posturasRama')) + '</h3>');
    if (agregado.posturas.length) {
      partes.push('<div class="etiquetas">' + agregado.posturas.map(function (p) {
        var nombres = tradicionesDePostura(p);
        // Marcada si se eligió ella misma o si entró por su tradición.
        var activa = Estado.posturasSueltas.indexOf(p.id) !== -1
          || (nombres.length > 0 && nombres.every(function (n) {
            return Estado.tradiciones.indexOf(n) !== -1;
          }));
        return '<span class="etiqueta' + (activa ? ' activa' : '') + '" data-postura="'
          + escapar(p.id) + '">' + escapar(Layout.rotuloPostura(p)) + '</span>';
      }).join('') + '</div>');
    } else {
      partes.push('<p class="panel-nota">' + escapar(t('ningunaRegistrada')) + '</p>');
    }

    var entradas = nodo.entradas.filter(function (arista) {
      return arista.tipo === 'respuesta';
    });
    if (entradas.length) {
      partes.push('<h3 class="panel-subtitulo">Cómo se llega aquí</h3>');
      partes.push('<ul class="ficha-opciones">' + entradas.map(function (arista) {
        var origen = Estado.grafo.nodos.get(arista.desde);
        var preguntaOrigen = Estado.datos.questions[arista.preguntaId];
        var elegidaAqui = respuestas[arista.preguntaId] === arista.clave;
        return '<li class="' + (elegidaAqui ? 'elegida' : '') + '">'
          + '<b>' + escapar(arista.etiqueta) + '</b> a «'
          + escapar(preguntaOrigen ? (preguntaOrigen.colloquial_hint
            || preguntaOrigen.formal_text) : arista.preguntaId) + '»'
          + '<span class="glosa">desde '
          + escapar(origen && origen.postura ? Layout.rotuloPostura(origen.postura)
            : arista.desde)
          + (arista.glosa ? ' · ' + escapar(arista.glosa) : '') + '</span></li>';
      }).join('') + '</ul>');
    }

    var ejes = (postura && postura.question_axes) || [];
    if (ejes.length) {
      partes.push('<h3 class="panel-subtitulo">Ejes que abre esta postura</h3>');
      partes.push('<ul class="ficha-opciones">' + ejes.map(function (qid) {
        var eje = datos.questions[qid];
        return '<li>'
          + escapar(eje ? (eje.colloquial_hint || eje.formal_text) : 'Pregunta')
          + (eje && eje.is_convergence
            ? '<span class="glosa">Compartida con otra postura (convergencia).</span>' : '')
          + '</li>';
      }).join('') + '</ul>');
    }

    var notas = (postura && postura.notes) || [];
    if (notas.length) {
      partes.push('<h3 class="panel-subtitulo">Notas del documento</h3>');
      partes.push('<p class="panel-nota">' + escapar(notas.join(' · ')) + '</p>');
    }

    if (nodo.pregunta && nodo.pregunta.full_text !== nodo.pregunta.formal_text) {
      partes.push('<h3 class="panel-subtitulo">Texto original en el documento</h3>');
      partes.push('<p class="panel-nota">' + escapar(nodo.pregunta.full_text) + '</p>');
    }

    var enlaces = (postura && postura.wikilinks) || [];
    enlaces.forEach(function (enlace) {
      if (enlace.href) {
        partes.push('<a class="enlace-nota" href="' + escapar(enlace.href) + '">'
          + escapar(enlace.label) + ' →</a>');
      } else {
        partes.push('<p class="panel-nota">Enlace a nota: [[' + escapar(enlace.target) + ']]</p>');
      }
    });

    partes.push('<dl class="ficha-datos">');
    partes.push('<dt>En el árbol</dt><dd>' + escapar(resumenSituacion(nodo, respuestas)) + '</dd>');
    partes.push('<dt>Profundidad</dt><dd>' + escapar(textoProfundidad(nodo)) + '</dd>');
    var debajo = Arbol.descendientesPorNodo(Estado.grafo).get(nodo.id) || 0;
    partes.push('<dt>Nodos debajo</dt><dd>'
      + (debajo
        ? debajo + (debajo === 1 ? ' nodo cuelga de aquí' : ' nodos cuelgan de aquí')
        : 'ninguno: es una hoja del árbol')
      + '</dd>');
    if (nodo.pregunta) {
      var clave = respuestas[nodo.pregunta.id];
      var elegidaFicha = clave && (nodo.pregunta.answers || []).filter(function (r) {
        return r.key === clave;
      })[0];
      partes.push('<dt>Tu respuesta</dt><dd>'
        + (elegidaFicha
          ? escapar(elegidaFicha.label) + (elegidaFicha.gloss ? ' — ' + escapar(elegidaFicha.gloss) : '')
          : 'todavía sin responder')
        + '</dd>');
    }
    if (postura) {
      var trads = vinculosTradicionDePostura(postura);
      partes.push('<dt>Tradiciones</dt><dd>'
        + (trads.length ? escapar(trads.join(' · ')) : 'ninguna registrada')
        + '</dd>');
      var cuantosEjes = (postura.question_axes || []).length;
      if (cuantosEjes) {
        partes.push('<dt>Preguntas que abre</dt><dd>'
          + cuantosEjes + (cuantosEjes === 1 ? ' eje' : ' ejes') + '</dd>');
      }
    }
    var ramas = nodo.salidas.filter(function (arista) { return arista.tipo === 'respuesta'; }).length;
    if (ramas) {
      partes.push('<dt>Ramas hijas</dt><dd>' + ramas + (ramas === 1 ? ' postura' : ' posturas') + '</dd>');
    }
    if (postura && postura.is_local) {
      partes.push('<dt>Origen</dt><dd>borrador local (aún no está en el documento)</dd>');
    }
    partes.push('<dt>Anclado</dt><dd>'
      + (Object.prototype.hasOwnProperty.call(Estado.fijados, nodo.id)
        ? 'sí (pulsa la chincheta para soltarlo)' : 'no') + '</dd>');
    partes.push('<dt>Resaltado</dt><dd>'
      + (Estado.resaltados.has(nodo.id) ? 'sí (Ctrl + clic para quitarlo)' : 'no') + '</dd>');
    partes.push('</dl>');
    partes.push(fichaDeEdicion(nodo, postura));
    return partes.join('');
  }

  function pasosDesdeRaiz(nodoId) {
    var grafo = Estado.grafo;
    var cola = grafo.raices.map(function (id) { return { id: id, pasos: 0 }; });
    var vistos = new Set();
    while (cola.length) {
      var actual = cola.shift();
      if (vistos.has(actual.id)) continue;
      vistos.add(actual.id);
      if (actual.id === nodoId) return actual.pasos;
      var nodo = grafo.nodos.get(actual.id);
      if (!nodo) continue;
      nodo.salidas.forEach(function (arista) {
        cola.push({ id: arista.hasta, pasos: actual.pasos + 1 });
      });
    }
    return null;
  }

  function textoProfundidad(nodo) {
    var pasos = pasosDesdeRaiz(nodo.id);
    if (pasos == null) return 'fuera del recorrido desde el origen';
    if (pasos === 0) return 'origen del árbol';
    return pasos + (pasos === 1 ? ' paso desde el origen' : ' pasos desde el origen');
  }

  function resumenSituacion(nodo, respuestas) {
    var camino = Estado.caminoElegido();
    var enCamino = camino.has(nodo.id);
    if (nodo.pregunta && respuestas[nodo.pregunta.id] != null) {
      return enCamino ? 'en tu recorrido (ya respondida)' : 'rama que no elegiste';
    }
    if (nodo.pregunta) return 'espera tu respuesta';
    return enCamino ? 'en tu recorrido' : 'visible, fuera de tu recorrido';
  }

  function tooltipDeNodo(nodo) {
    if (!nodo) return null;
    var respuestas = Estado.respuestasEfectivas();
    var partes = [];
    var etiquetaPostura = nodo.postura
      ? Layout.rotuloPostura(nodo.postura)
      : (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
        return Layout.rotuloPostura(Estado.datos.postures[pid]);
      }).join(' & ');

    partes.push('<h4>' + escapar(etiquetaPostura || 'Nodo') + '</h4>');

    if (nodo.pregunta) {
      var coloquial = nodo.pregunta.colloquial_hint
        ? dato('q.' + nodo.pregunta.id + '.coloquial', nodo.pregunta.colloquial_hint)
        : '';
      var formal = dato('q.' + nodo.pregunta.id + '.formal', nodo.pregunta.formal_text);
      if (coloquial) {
        partes.push('<p class="tooltip-coloquial">' + escapar(coloquial) + '</p>');
      }
      partes.push('<p class="tooltip-formal">' + escapar(formal) + '</p>');
      var clave = respuestas[nodo.pregunta.id];
      if (clave) {
        var elegida = (nodo.pregunta.answers || []).filter(function (r) {
          return r.key === clave;
        })[0];
        if (elegida) {
          var et = dato('q.' + nodo.pregunta.id + '.' + clave + '.label', elegida.label);
          var gl = elegida.gloss
            ? dato('q.' + nodo.pregunta.id + '.' + clave + '.gloss', elegida.gloss)
            : '';
          partes.push('<p>Respuesta: <strong>' + escapar(et) + '</strong>'
            + (gl ? ' — ' + escapar(gl) : '') + '</p>');
        }
      }
    }

    // En las tarjetas la banda solo lleva puntos dorados; aquí se leen los
    // nombres, que es lo que hace falta cuando la sostienen varias tradiciones.
    var afiliaciones = nodo.postura ? vinculosTradicionDePostura(nodo.postura) : [];
    if (afiliaciones.length) {
      partes.push('<p class="tooltip-tradiciones">' + escapar(t('sostenidaPor')) + ': '
        + escapar(afiliaciones.join(' · ')) + '</p>');
    }

    if (nodo.postura && !nodo.postura.is_unnamed) {
      partes.push('<h4>' + escapar(t('definicion')) + '</h4>');
      partes.push('<div class="tooltip-definicion" data-def="' + escapar(nodo.postura.id) + '"></div>');
    }
    return partes.join('');
  }

  /* Cuántos nodos abre una respuesta y si es la rama más poblada de su
     pregunta, que es lo que el botón señala con un tono algo más claro. */
  function pesoDeRama(preguntaId, clave) {
    var pregunta = preguntaId && Estado.datos.questions[preguntaId];
    if (!pregunta || !clave) return null;
    var pesos = Arbol.pesoDeRespuestas(Estado.grafo);
    var propio = pesos[preguntaId + ':' + clave] || 0;
    if (!propio) return null;
    var hermanas = (pregunta.answers || []).map(function (respuesta) {
      return pesos[preguntaId + ':' + respuesta.key] || 0;
    });
    var mayor = Math.max.apply(null, hermanas);
    var empatan = hermanas.filter(function (peso) { return peso === mayor; }).length;
    return {
      nodos: propio,
      densa: hermanas.length > 1 && empatan === 1 && propio === mayor
    };
  }

  function tooltipDeControl(control) {
    if (!control) return null;
    var tipo = control.getAttribute('data-control');
    if (tipo === 'opcion') {
      var rotulo = control.getAttribute('data-rotulo') || '';
      var glosa = (control.getAttribute('data-glosa') || '').trim();
      var bloques = ['<h4>' + escapar(rotulo || '…') + '</h4>'];
      if (glosa) {
        var yaEmpieza = glosa.toLowerCase().indexOf(rotulo.toLowerCase()) === 0;
        bloques.push('<p>' + escapar(yaEmpieza ? glosa : rotulo + ', ' + glosa) + '</p>');
      }
      // Explica el «↓ N» del botón y, si toca, por qué está más claro.
      var peso = pesoDeRama(control.getAttribute('data-pregunta'),
        control.getAttribute('data-clave'));
      if (peso) {
        bloques.push('<p class="tooltip-peso">'
          + escapar(t(peso.nodos === 1 ? 'ramaAbreUno' : 'ramaAbre', { n: peso.nodos })
            + (peso.densa ? ' ' + t('ramaMasPoblada') : '')) + '</p>');
      }
      return bloques.join('');
    }
    if (tipo === 'chincheta') {
      return '<h4>' + escapar(t('chincheta')) + '</h4><p>' + escapar(t('chinchetaDesc')) + '</p>';
    }
    if (tipo === 'papelera') {
      return '<h4>' + escapar(t('deshacer')) + '</h4><p>' + escapar(t('deshacerDesc')) + '</p>';
    }
    return null;
  }

  function pintarDefinicionesEn(raiz) {
    if (!raiz || !Definiciones) return;
    Array.prototype.forEach.call(raiz.querySelectorAll('[data-def]'), function (caja) {
      var postura = Estado.datos.postures[caja.getAttribute('data-def')];
      Definiciones.pintarEn(caja, postura, I18n.idioma);
    });
  }

  function fichaDeEdicion(nodo, postura) {
    var bloques = ['<div class="ficha-edicion">'];
    bloques.push('<h3 class="panel-subtitulo">Contribuir (borrador local)</h3>');
    bloques.push('<p class="panel-nota">Los cambios se guardan en este navegador. '
      + 'Exporta el Markdown para proponerlos al equipo de mantenimiento.</p>');
    if (postura) {
    bloques.push('<h3 class="panel-subtitulo">Nombre de la postura</h3>');
    bloques.push('<p class="panel-nota">Una postura puede quedarse como hoja, sin pregunta. '
      + 'La pregunta es opcional y se añade aparte si hace falta seguir ramificando.</p>');
    bloques.push('<input class="campo" data-campo="nombre" placeholder="Nombre de la postura" value="'
      + escapar(postura.is_unnamed ? '' : postura.label) + '">');
    bloques.push('<button type="button" class="mini-boton destacado" data-accion="nombrar" data-postura="'
      + escapar(postura.id) + '">'
      + (postura.is_unnamed ? 'Poner nombre' : 'Guardar nombre') + '</button>');
    bloques.push('<h3 class="panel-subtitulo">Añadir una pregunta (opcional)</h3>');
      bloques.push('<input class="campo" data-campo="formal" placeholder="¿Pregunta formal?">');
      bloques.push('<input class="campo" data-campo="coloquial" placeholder="¿Versión coloquial? (opcional)">');
      bloques.push('<button type="button" class="mini-boton" data-accion="agregar-pregunta" data-postura="'
        + escapar(postura.id) + '">Añadir pregunta</button>');
    }
    if (nodo.pregunta) {
      bloques.push('<h3 class="panel-subtitulo">Nueva respuesta / postura</h3>');
      bloques.push('<input class="campo" data-campo="respuesta" placeholder="Etiqueta (Sí, No, …)">');
      bloques.push('<input class="campo" data-campo="destino" placeholder="Nombre de la postura destino (? si no tiene)">');
      bloques.push('<button type="button" class="mini-boton" data-accion="agregar-respuesta" data-pregunta="'
        + escapar(nodo.pregunta.id) + '">Añadir respuesta</button>');
    }
    if (editsEstado.ops.length) {
      bloques.push('<p class="panel-nota">' + editsEstado.ops.length
        + ' aporte' + (editsEstado.ops.length === 1 ? '' : 's') + ' locales sin integrar.</p>');
      bloques.push('<button type="button" class="mini-boton peligro" data-accion="olvidar-edits">'
        + 'Descartar aportes locales</button>');
    }
    bloques.push('</div>');
    return bloques.join('');
  }

  /* ------------------------------------------------- panel: creencias ---- */

  /* §7.5: ficha completa del sujeto explorado — sus posturas, la naturaleza de
     cada adhesión y las notas históricas que el documento dejó anotadas. */
  function fichaDeSujetos() {
    var sujetos = sujetosSeleccionados();
    if (!sujetos.length) {
      return '<p class="panel-nota">' + escapar(t('seleccionVacia')) + '</p>';
    }

    return '<h3 class="panel-subtitulo">' + escapar(t('seleccionActiva')) + '</h3>' + sujetos.map(function (sujeto) {
      var bloques = [];
      var nombreSujeto = sujeto.tipo === 'tradicion'
        ? dato('t.' + sujeto.nombre, sujeto.nombre)
        : (sujeto.posturaIds[0]
          ? Layout.rotuloPostura(Estado.datos.postures[sujeto.posturaIds[0]])
          : sujeto.nombre);
      bloques.push('<div class="ficha-sujeto">');
      bloques.push('<div class="tradicion-nombre' + (sujeto.tentativa ? ' tentativa' : '') + '">'
        + escapar(nombreSujeto) + '</div>');
      if (sujeto.alias.length) {
        bloques.push('<p class="panel-nota">'
          + escapar(t('tambienAparece', { lista: sujeto.alias.join(' · ') })) + '</p>');
      }
      if (sujeto.tipo === 'postura') {
        var afiliacion = vinculosTradicionDePostura(
          Estado.datos.postures[sujeto.posturaIds[0]] || {});
        bloques.push('<p class="panel-nota">' + escapar(afiliacion.length
          ? t('posturaDeTradicion', { lista: afiliacion.join(' · ') })
          : t('posturaSinTradicion')) + '</p>');
      }

      var notas = [];
      bloques.push('<ul class="ficha-opciones">' + sujeto.posturaIds.map(function (pid) {
        var postura = Estado.datos.postures[pid];
        var adhesion = (postura.traditions || []).filter(function (tr) {
          return tr.name === sujeto.nombre;
        })[0];
        (postura.notes || []).forEach(function (nota) { notas.push(nota); });
        var resolucion = Busqueda.resolver(Estado.grafo, Estado.datos, sujeto);
        var pregunta = textoPreguntaDePostura(pid);
        var glosa = [];
        if (pregunta) glosa.push(pregunta);
        if (adhesion && adhesion.is_tentative) glosa.push(t('adhesionTentativa'));
        glosa.push(t('respuestasHeredadas', { n: Object.keys(resolucion.respuestas).length }));
        return '<li class="elegida" data-nodo="' + escapar(Estado.grafo.idDePostura(pid)) + '">'
          + '<b>' + escapar(Layout.rotuloPostura(postura)) + '</b>'
          + '<span class="glosa">' + escapar(glosa.join(' · ')) + '</span></li>';
      }).join('') + '</ul>');

      if (notas.length) {
        bloques.push('<h3 class="panel-subtitulo">' + escapar(t('notasHistoricas')) + '</h3>');
        bloques.push('<p class="panel-nota">' + escapar(notas.join(' · ')) + '</p>');
      }
      bloques.push('</div>');
      return bloques.join('');
    }).join('');
  }

  function recortarFrase(texto, maximo) {
    texto = String(texto || '').replace(/\s+/g, ' ').trim();
    if (!texto || texto.length <= maximo) return texto;
    var corte = texto.lastIndexOf(' ', maximo);
    if (corte < maximo * 0.55) corte = maximo;
    return texto.slice(0, corte).replace(/[,;:\s¿¡]+$/, '') + '…';
  }

  function preguntaQueDefinePostura(pid) {
    var nodo = Estado.grafo.nodos.get(Estado.grafo.idDePostura(pid));
    if (!nodo) return null;
    if (nodo.pregunta) return nodo.pregunta;
    var i;
    for (i = 0; i < (nodo.entradas || []).length; i++) {
      var qid = nodo.entradas[i].preguntaId;
      if (qid && Estado.datos.questions[qid]) return Estado.datos.questions[qid];
    }
    return null;
  }

  function textoPreguntaDePostura(pid) {
    var pregunta = preguntaQueDefinePostura(pid);
    if (!pregunta) return '';
    if (pregunta.colloquial_hint) {
      return dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint);
    }
    return recortarFrase(dato('q.' + pregunta.id + '.formal', pregunta.formal_text), 88);
  }

  function vinculosTradicionDePostura(postura) {
    return (postura.traditions || []).filter(function (tradicion) {
      return tradicion.name && !tradicion.is_note;
    }).map(function (tradicion) {
      var nombre = dato('t.' + tradicion.name, tradicion.name);
      return tradicion.is_tentative ? nombre + ' (?)' : nombre;
    });
  }

  function pintarListaCreencias() {
    dom.fichaCreencias.innerHTML = fichaDeSujetos();
    var consulta = dom.buscador.value;
    var tradiciones = Busqueda.filtrar(listaTradiciones, consulta);
    var posturas = Busqueda.filtrar(listaPosturasSueltas, consulta);

    var claseLista = 'lista-tarjetas' + (Estado.compactoCreencias ? ' compacto' : '');
    dom.listaTradiciones.className = claseLista;
    dom.listaPosturasSueltas.className = claseLista;

    dom.listaTradiciones.innerHTML = tradiciones.length
      ? tradiciones.map(function (tradicion) {
        var activa = Estado.tradiciones.indexOf(tradicion.nombre) !== -1;
        var meta = [];
        if (tradicion.alias.length) {
          meta.push(t('tambien', { lista: tradicion.alias.join(' · ') }));
        }
        var cuantas = tradicion.posturaIds.length;
        meta.push(t(cuantas === 1 ? 'posturasSostenidas' : 'posturasSostenidasPlural', { n: cuantas }));
        return '<label class="tradicion' + (activa ? ' activa' : '') + '">'
          + '<input type="checkbox" data-tradicion="' + escapar(tradicion.nombre) + '"'
          + (activa ? ' checked' : '') + '>'
          + '<span><span class="tradicion-nombre' + (tradicion.tentativa ? ' tentativa' : '') + '">'
          + escapar(dato('t.' + tradicion.nombre, tradicion.nombre)) + '</span>'
          + '<span class="tradicion-meta">' + escapar(meta.join(' · ')) + '</span></span>'
          + '</label>';
      }).join('')
      : '<p class="panel-nota">' + escapar(t('ningunaTradicion')) + '</p>';

    dom.notaSinAfiliacion.textContent = t('notaSinAfiliacion');

    dom.listaPosturasSueltas.innerHTML = posturas.length
      ? posturas.map(function (postura) {
        var pid = postura.posturaIds[0];
        var activa = Estado.posturasSueltas.indexOf(pid) !== -1;
        var meta = [];
        if (!Estado.compactoCreencias) {
          var pregunta = textoPreguntaDePostura(pid);
          if (pregunta) meta.push(pregunta);
          var vinculos = vinculosTradicionDePostura(Estado.datos.postures[pid] || {});
          if (vinculos.length) meta.push(vinculos.join(' · '));
          if (postura.sugerida) meta.push('término sugerido');
        }
        return '<label class="tradicion' + (activa ? ' activa' : '') + '">'
          + '<input type="checkbox" data-postura="' + escapar(pid) + '"'
          + (activa ? ' checked' : '') + '>'
          + '<span><span class="tradicion-nombre">'
          + escapar(Layout.rotuloPostura(Estado.datos.postures[pid])) + '</span>'
          + (meta.length ? '<span class="tradicion-meta">' + escapar(meta.join(' · ')) + '</span>' : '')
          + '</span></label>';
      }).join('')
      : '<p class="panel-nota">' + escapar(t('ningunaPosturaSuelta')) + '</p>';
  }

  /* -------------------------------------------- panel: razonar y comparar */

  function pintarComparacion() {
    var sujetos = sujetosSeleccionados();
    var resoluciones;

    if (sujetos.length) {
      resoluciones = sujetos.map(function (sujeto) {
        return Busqueda.resolver(Estado.grafo, Estado.datos, sujeto);
      });
    } else {
      var usuario = sujetoUsuario();
      sujetos = [usuario];
      resoluciones = [Busqueda.resolver(Estado.grafo, Estado.datos, usuario)];
    }

    resolucionesActuales = resoluciones;
    sujetosActuales = sujetos;
    entradasComparacion = Busqueda.construirLista(
      Estado.grafo, Estado.datos, resoluciones, Estado.profundidad || 0
    );

    var planas = Busqueda.preguntasUnicas(entradasComparacion);
    var conRespuesta = planas.filter(function (entrada) {
      return entrada.acuerdo !== 'ninguno';
    });
    var divergentes = planas.filter(function (entrada) {
      return entrada.acuerdo === 'divergencia';
    });

    var html = [];
    html.push('<div class="resumen-comparacion">'
      + '<span><b>' + sujetos.length + '</b> sujeto' + (sujetos.length === 1 ? '' : 's') + '</span>'
      + '<span><b>' + conRespuesta.length + '</b> pregunta'
      + (conRespuesta.length === 1 ? '' : 's') + ' con respuesta</span>'
      + '<span><b>' + divergentes.length + '</b> desacuerdo'
      + (divergentes.length === 1 ? '' : 's') + '</span>'
      + '</div>');

    if (sujetos.length > 1) {
      html.push(tablaComparativa(planas, sujetos));
    }

    html.push('<h3 class="panel-subtitulo">Recorrido en forma de lista</h3>');
    var lista = listaAnidada(entradasComparacion);
    html.push(lista || '<p class="panel-nota">Todavía no hay recorrido: responde alguna '
      + 'pregunta del árbol o selecciona una tradición en la pestaña «Creencias».</p>');

    dom.salidaComparar.innerHTML = html.join('');
  }

  function marcaRespuesta(entrada, respuesta, mostrarSujeto) {
    if (respuesta.ausente || !respuesta.clave) {
      return '<span class="respuesta-marca ausente">'
        + (mostrarSujeto ? '<span class="sujeto">' + escapar(respuesta.sujeto.nombre) + '</span>' : '')
        + '—</span>';
    }
    var clase = 'respuesta-marca';
    if (entrada.acuerdo === 'consenso') clase += ' consenso';
    if (entrada.acuerdo === 'divergencia') clase += ' divergencia';
    var titulo = respuesta.glosa || '';
    if (respuesta.ambigua) {
      clase += ' ambigua';
      titulo = 'Ambas ramas desembocan en la misma postura (punto de convergencia), '
        + 'así que el árbol no distingue entre ellas.' + (titulo ? ' — ' + titulo : '');
    }
    return '<span class="' + clase + '" title="' + escapar(titulo) + '">'
      + (mostrarSujeto ? '<span class="sujeto">' + escapar(respuesta.sujeto.nombre) + '</span>' : '')
      + escapar(respuesta.etiqueta) + '</span>';
  }

  function listaAnidada(entradas) {
    var visibles = entradas.filter(function (entrada) {
      return !Estado.soloDesacuerdos || contieneDesacuerdo(entrada);
    });
    if (!visibles.length) return '';
    return '<ul class="lista-razonamiento">' + visibles.map(function (entrada) {
      var plegado = plegados[entrada.nodoId];
      var cuerpo = [];
      cuerpo.push('<div class="paso-cabecera">');
      cuerpo.push('<button type="button" class="paso-plegar" data-plegar="'
        + escapar(entrada.nodoId) + '">' + (plegado ? '▸' : '▾') + '</button>');
      cuerpo.push('<span class="paso-postura">' + escapar(entrada.posturaEtiqueta || '—') + '</span>');
      if (entrada.preguntaId) {
        cuerpo.push('<span class="paso-id">' + escapar(entrada.preguntaId) + '</span>');
      }
      if (entrada.repetido) cuerpo.push('<span class="paso-id">· convergencia ya listada</span>');
      cuerpo.push('</div>');

      if (entrada.coloquial) {
        cuerpo.push('<p class="paso-coloquial">' + escapar(entrada.coloquial) + '</p>');
      }
      if (entrada.formal) {
        cuerpo.push('<p class="paso-formal">' + escapar(entrada.formal) + '</p>');
        cuerpo.push('<div class="paso-respuestas">' + entrada.respuestas.map(function (respuesta) {
          return marcaRespuesta(entrada, respuesta, entrada.respuestas.length > 1);
        }).join('') + '</div>');
      }

      var hijos = listaAnidada(entrada.hijos);
      if (hijos) cuerpo.push(hijos);

      return '<li class="paso' + (plegado ? ' plegado' : '') + '" data-nodo="'
        + escapar(entrada.nodoId) + '">' + cuerpo.join('') + '</li>';
    }).join('') + '</ul>';
  }

  function contieneDesacuerdo(entrada) {
    if (entrada.acuerdo === 'divergencia') return true;
    return entrada.hijos.some(contieneDesacuerdo);
  }

  function tablaComparativa(planas, sujetos) {
    var filas = planas.filter(function (entrada) {
      if (Estado.soloDesacuerdos) return entrada.acuerdo === 'divergencia';
      return entrada.acuerdo !== 'ninguno';
    });
    if (!filas.length) {
      return '<p class="panel-nota">No hay preguntas que comparar con este filtro.</p>';
    }
    return '<h3 class="panel-subtitulo">Comparación por pregunta</h3>'
      + '<table class="tabla-comparativa"><thead><tr><th>Pregunta</th>'
      + sujetos.map(function (sujeto) { return '<th>' + escapar(sujeto.nombre) + '</th>'; }).join('')
      + '</tr></thead><tbody>'
      + filas.map(function (entrada) {
        return '<tr class="' + escapar(entrada.acuerdo) + '">'
          + '<td class="pregunta">' + escapar(entrada.coloquial || entrada.formal)
          + '<small>' + escapar(entrada.posturaEtiqueta) + ' · ' + escapar(entrada.preguntaId)
          + '</small></td>'
          + entrada.respuestas.map(function (respuesta) {
            return '<td>' + marcaRespuesta(entrada, respuesta, false) + '</td>';
          }).join('')
          + '</tr>';
      }).join('')
      + '</tbody></table>';
  }

  function actualizarPanel() {
    var nodo = Estado.seleccionado ? Estado.grafo.nodos.get(Estado.seleccionado) : null;
    dom.fichaDetalle.innerHTML = fichaDeNodo(nodo);
    pintarListaCreencias();
    pintarComparacion();
  }

  /* ----------------------------------------------------------- acciones -- */

  function pedirPoda(preguntaId) {
    var pregunta = Estado.datos.questions[preguntaId];
    if (!pregunta) return;
    var alcance = Estado.alcanceDePoda(preguntaId);
    var descendientes = alcance.descendientes.length;
    var detalle = descendientes
      ? ' Con ella se borran <b>' + descendientes + ' respuesta'
        + (descendientes === 1 ? '' : 's') + '</b> más del subárbol que colgaba de ahí.'
      : ' No hay respuestas más abajo que dependan de ella.';

    confirmar({
      titulo: 'Deshacer esta respuesta',
      texto: '«' + escapar(pregunta.colloquial_hint || pregunta.formal_text) + '»'
        + ' volverá a quedar sin responder.' + detalle
        + ' La rama no reaparecerá al volver a responder.',
      aceptar: 'Podar la rama'
    }).then(function (aceptado) {
      if (!aceptado) return;
      Estado.borrarRespuesta(preguntaId);
      avisar(descendientes
        ? 'Rama podada: ' + (descendientes + 1) + ' respuestas olvidadas.'
        : 'Respuesta deshecha.');
    });
  }

  function trasCambiarSujetos() {
    Estado.modo = Estado.tradiciones.length || Estado.posturasSueltas.length
      ? 'explorador' : 'libre';
    Estado.emitir('creencias');
    // El layout se anima 300 ms; encuadramos el camino cuando ya reposó.
    global.setTimeout(encuadrarCaminoActual, 330);
  }

  function alternarTradicion(nombre) {
    var indice = Estado.tradiciones.indexOf(nombre);
    if (indice === -1) Estado.tradiciones.push(nombre);
    else Estado.tradiciones.splice(indice, 1);
    trasCambiarSujetos();
  }

  function alternarPosturaSuelta(pid) {
    var indice = Estado.posturasSueltas.indexOf(pid);
    if (indice === -1) Estado.posturasSueltas.push(pid);
    else Estado.posturasSueltas.splice(indice, 1);
    trasCambiarSujetos();
  }

  function tradicionesDePostura(postura) {
    var nombres = [];
    var indice = Estado.datos && Estado.datos.traditions_index;
    (postura.traditions || []).forEach(function (tradicion) {
      if (!tradicion.name || !indice || !indice[tradicion.name]) return;
      if (nombres.indexOf(tradicion.name) === -1) nombres.push(tradicion.name);
    });
    return nombres;
  }

  function aporteCreenciasDeNodo(nodo) {
    var postura = nodo && nodo.postura;
    if (!postura) return null;
    var nombres = tradicionesDePostura(postura);
    if (nombres.length) return { tradiciones: nombres, posturasSueltas: [] };
    if (!postura.is_unnamed && !postura.is_root) {
      return { tradiciones: [], posturasSueltas: [postura.id] };
    }
    return null;
  }

  function aporteCreenciasCercano(nodo) {
    var visto = new Set();
    var actual = nodo;
    var camino = Estado.caminoElegido();
    while (actual && !visto.has(actual.id)) {
      visto.add(actual.id);
      var aporte = aporteCreenciasDeNodo(actual);
      if (aporte) return aporte;
      var siguiente = null;
      var i;
      for (i = 0; i < (actual.entradas || []).length; i++) {
        var padreId = actual.entradas[i].desde;
        if (camino.has(padreId)) {
          siguiente = Estado.grafo.nodos.get(padreId);
          break;
        }
      }
      if (!siguiente && actual.entradas && actual.entradas.length) {
        siguiente = Estado.grafo.nodos.get(actual.entradas[0].desde);
      }
      actual = siguiente;
    }
    return null;
  }

  function aplicarAporteCreencias(aporte) {
    if (!aporte) {
      Estado.tradiciones = [];
      Estado.posturasSueltas = [];
      return;
    }
    Estado.tradiciones = aporte.tradiciones.slice();
    Estado.posturasSueltas = aporte.posturasSueltas.slice();
    if (Estado.panelAbierto && Estado.pestana === 'creencias'
      && (Estado.tradiciones.length || Estado.posturasSueltas.length)) {
      Estado.modo = 'explorador';
    }
  }

  function preseleccionarPosturaEnCreencias(nodo) {
    if (!nodo) return;
    aplicarAporteCreencias(aporteCreenciasCercano(nodo));
  }

  function hojasDelRecorrido() {
    var camino = Estado.caminoElegido();
    if (!camino || !camino.size) return [];
    var hojas = [];
    camino.forEach(function (id) {
      var nodo = Estado.grafo.nodos.get(id);
      if (!nodo) return;
      var tieneHijoEnCamino = nodo.salidas.some(function (arista) {
        return camino.has(arista.hasta);
      });
      if (!tieneHijoEnCamino) hojas.push(nodo);
    });
    return hojas;
  }

  function sincronizarHojaCuestionario() {
    if (Estado.divulgacion !== 'cuestionario') return;
    var hojas = hojasDelRecorrido();
    if (!hojas.length) return;
    var tradiciones = [];
    var posturasSueltas = [];
    hojas.forEach(function (hoja) {
      var aporte = aporteCreenciasCercano(hoja);
      if (!aporte) return;
      aporte.tradiciones.forEach(function (nombre) {
        if (tradiciones.indexOf(nombre) === -1) tradiciones.push(nombre);
      });
      aporte.posturasSueltas.forEach(function (pid) {
        if (posturasSueltas.indexOf(pid) === -1) posturasSueltas.push(pid);
      });
    });
    aplicarAporteCreencias({ tradiciones: tradiciones, posturasSueltas: posturasSueltas });
  }

  /* Pulsar la etiqueta de una postura la elige a ella, no a su tradición:
     quien nombra «Diotelitismo» quiere esa postura y no las demás que sostiene
     la Ortodoxia calcedonense. La tradición se elige desde su propia lista. */
  function pulsarPosturaFicha(pid) {
    var postura = Estado.datos.postures[pid];
    if (!postura || postura.is_unnamed || postura.is_root) return;
    var indice = Estado.posturasSueltas.indexOf(pid);
    if (indice === -1) Estado.posturasSueltas.push(pid);
    else Estado.posturasSueltas.splice(indice, 1);
    Estado.modo = Estado.tradiciones.length || Estado.posturasSueltas.length
      ? 'explorador' : 'libre';
    var nodoId = Estado.grafo.idDePostura(pid);
    Estado.seleccionado = nodoId;
    abrirPestana('creencias');
    if (nodoId) Vista.encuadrarNodoYDescendientes(nodoId);
  }

  function abrirPestana(nombre) {
    Estado.pestana = nombre;
    Estado.panelAbierto = true;
    // `vista` sigue siendo lo que viaja en el enlace; la pestaña la gobierna.
    Estado.vista = nombre === 'comparar' ? 'lista' : 'grafo';
    if (nombre === 'creencias'
      && (Estado.tradiciones.length || Estado.posturasSueltas.length)) {
      Estado.modo = 'explorador';
    }
    Estado.emitir('panel');
  }

  function cerrarPanel() {
    Estado.panelAbierto = false;
    Estado.vista = 'grafo';
    Estado.modo = 'libre';
    Estado.emitir('panel');
  }

  function aplicarTema() {
    document.documentElement.setAttribute('data-tema', Estado.tema);
  }

  function actualizarRotuloIdioma() {
    if (dom.rotuloIdioma) {
      dom.rotuloIdioma.textContent = I18n.idioma === 'en' ? 'ES' : 'EN';
    }
  }

  function sincronizarAltoBarra() {
    var barra = document.getElementById('barra');
    if (barra) {
      document.documentElement.style.setProperty('--barra-alto', barra.offsetHeight + 'px');
    }
  }

  /* Cierto entre que el navegador rechaza la reproducción automática con
     sonido y el primer gesto del usuario: la música está pedida pero suena
     en silencio, así que el botón y el enlace no deben darla por apagada. */
  var esperandoGesto = false;

  /* En fase de captura y sobre varios tipos de evento: el lienzo detiene
     algunos pointerdown, y Safari no concede activación con `pointerdown`. */
  var GESTOS = ['pointerdown', 'mousedown', 'touchend', 'keydown', 'click'];

  function actualizarBotonMusica() {
    if (!dom.btnMusica || !dom.audio) return;
    dom.btnMusica.hidden = false;
    var silenciada = !!dom.audio.muted || !!dom.audio.paused || dom.audio.volume === 0;
    dom.btnMusica.classList.toggle('muteado', silenciada && !esperandoGesto);
    dom.btnMusica.setAttribute('aria-pressed', silenciada ? 'true' : 'false');
    // El enlace compartido lleva la música si quedó activa.
    Estado.musica = esperandoGesto || (!dom.audio.muted && dom.audio.volume > 0);
    Router.escribir(Estado);
  }

  function alGesto(evento) {
    var enControles = evento.target && evento.target.closest
      && evento.target.closest('#musica-wrap');
    // Si el gesto es sobre el propio control, su manejador ya decide.
    if (enControles) { olvidarGesto(); return; }
    olvidarGesto();
    if (!dom.audio) return;
    dom.audio.muted = false;
    var p = dom.audio.play();
    if (p && p.catch) p.catch(function () { /* sin activación */ });
    actualizarBotonMusica();
  }

  function esperarGesto() {
    if (esperandoGesto) return;
    esperandoGesto = true;
    GESTOS.forEach(function (tipo) {
      document.addEventListener(tipo, alGesto, true);
    });
  }

  function olvidarGesto() {
    if (!esperandoGesto) return;
    esperandoGesto = false;
    GESTOS.forEach(function (tipo) {
      document.removeEventListener(tipo, alGesto, true);
    });
  }

  function arrancarMusica() {
    if (!dom.audio) return;
    dom.audio.loop = true;
    var pct = dom.volMusica ? Number(dom.volMusica.value) : 10;
    if (!(pct >= 0)) pct = 10;
    dom.audio.volume = Math.max(0, Math.min(1, pct / 100));
    dom.audio.muted = !Estado.musica;
    dom.audio.addEventListener('play', actualizarBotonMusica);
    dom.audio.addEventListener('pause', actualizarBotonMusica);
    actualizarBotonMusica();
    var p = dom.audio.play();
    if (p && p.catch) {
      p.catch(function () {
        if (!Estado.musica) return;
        // Reproducción automática bloqueada: se arranca en silencio, que
        // siempre está permitido, y se desmutea al primer gesto. Así la
        // música entra al instante en vez de esperar a cargar el archivo.
        esperarGesto();
        dom.audio.muted = true;
        var q = dom.audio.play();
        if (q && q.catch) q.catch(function () { /* ni en silencio */ });
        actualizarBotonMusica();
      });
    }
  }

  function lanzarBienvenida() {
    var caja = document.getElementById('bienvenida');
    var texto = document.getElementById('bienvenida-texto');
    var fuente = document.getElementById('bienvenida-fuente');
    if (!caja || !texto) return;
    var frase = I18n.elegirBienvenida ? I18n.elegirBienvenida() : {
      texto: t('bienvenida'),
      fuente: t('bienvenidaFuente')
    };
    texto.textContent = frase.texto;
    if (fuente) fuente.textContent = frase.fuente;
    function terminar() { caja.classList.add('hecha'); }
    function aparcarEnEsquina() {
      var figura = caja.querySelector('figure');
      if (!figura) { caja.classList.add('en-esquina'); return; }
      var barra = document.getElementById('barra');
      var box = figura.getBoundingClientRect();
      var escala = global.innerWidth <= 860 ? 0.5 : 0.42;
      var margen = 16;
      var topDest = (barra ? barra.getBoundingClientRect().bottom : 64) + margen;
      var leftDest = margen + 4;
      var ancho = box.width * escala;
      var alto = box.height * escala;
      if (leftDest + ancho > global.innerWidth - margen) {
        leftDest = Math.max(margen, global.innerWidth - ancho - margen);
      }
      if (topDest + alto > global.innerHeight - margen) {
        topDest = Math.max(margen, global.innerHeight - alto - margen);
      }
      var destCx = leftDest + ancho / 2;
      var destCy = topDest + alto / 2;
      figura.style.setProperty('--bienvenida-dx', (destCx - (box.left + box.width / 2)) + 'px');
      figura.style.setProperty('--bienvenida-dy', (destCy - (box.top + box.height / 2)) + 'px');
      figura.style.setProperty('--bienvenida-k', String(escala));
      caja.classList.add('en-esquina');
    }
    // Un rAF para que el estado inicial (opaco, abajo) pinte antes de entrar;
    // si no, el navegador salta la transición y la cita aparece ya puesta.
    global.requestAnimationFrame(function () {
      caja.classList.add('entra');
    });
    global.setTimeout(aparcarEnEsquina, 2900);
    global.setTimeout(function () { caja.classList.add('sale'); }, 6700);
    global.setTimeout(terminar, 7600);
  }

  var ORDEN_DIVULGACION = ['cuestionario', 'limpio', 'exploracion', 'completo'];

  function ciclarDivulgacion() {
    var indice = ORDEN_DIVULGACION.indexOf(Estado.divulgacion);
    fijarRecorrido(ORDEN_DIVULGACION[(indice + 1) % ORDEN_DIVULGACION.length]);
  }

  function fijarRecorrido(valor) {
    if (!valor || valor === Estado.divulgacion) return;
    Estado.fijarDivulgacion(valor);
    avisar(t('recorridoAviso', { nombre: t(Estado.divulgacion) }));
    if (Estado.divulgacion === 'completo') {
      global.setTimeout(function () { Vista.encuadrar(null, true); }, 340);
    }
  }

  function reconstruirModelo() {
    Estado.datos = Edits.aplicar(datosCanon, editsEstado);
    Estado.grafo = Arbol.construirGrafo(Estado.datos);
    Layout.limpiarCache();
    listaTradiciones = Busqueda.listaTradiciones(Estado.datos);
    listaPosturasSueltas = Busqueda.listaPosturasSueltas(Estado.datos, Estado.grafo);
    Estado.sanear();
    Estado.emitir('edicion');
  }

  function leerCampo(contenedor, nombre) {
    var campo = contenedor.querySelector('[data-campo="' + nombre + '"]');
    return campo ? String(campo.value || '').trim() : '';
  }

  function aplicarEdicion(boton, contenedor) {
    var accion = boton.getAttribute('data-accion');
    if (accion === 'nombrar') {
      var nombre = leerCampo(contenedor, 'nombre');
      if (!nombre) { avisar('Escribe un nombre para la postura.'); return; }
      Edits.nombrarPostura(editsEstado, boton.getAttribute('data-postura'), nombre);
      reconstruirModelo();
      avisar('Nombre guardado en el borrador local.');
      return;
    }
    if (accion === 'agregar-pregunta') {
      var formal = leerCampo(contenedor, 'formal');
      if (!formal) { avisar('Escribe la pregunta formal.'); return; }
      Edits.agregarPregunta(editsEstado, boton.getAttribute('data-postura'),
        formal, leerCampo(contenedor, 'coloquial'));
      reconstruirModelo();
      avisar('Pregunta añadida al borrador local.');
      return;
    }
    if (accion === 'agregar-respuesta') {
      var etiqueta = leerCampo(contenedor, 'respuesta') || 'Sí';
      var destino = leerCampo(contenedor, 'destino') || '?';
      Edits.agregarRespuesta(editsEstado, Estado.datos, boton.getAttribute('data-pregunta'),
        etiqueta, destino);
      reconstruirModelo();
      avisar('Respuesta añadida al borrador local.');
      return;
    }
    if (accion === 'olvidar-edits') {
      confirmar({
        titulo: 'Descartar aportes locales',
        texto: 'Se olvidan las preguntas, nombres y posturas que añadiste en este navegador. '
          + 'El documento canónico no se toca.',
        aceptar: 'Descartar'
      }).then(function (aceptado) {
        if (!aceptado) return;
        Edits.olvidar();
        editsEstado = Edits.vacio();
        reconstruirModelo();
        avisar('Aportes locales descartados.');
      });
    }
  }

  function registrarRedimensionPanel() {
    var arrastre = null;
    dom.panelAsa.addEventListener('pointerdown', function (evento) {
      evento.preventDefault();
      arrastre = { inicioX: evento.clientX, inicioAncho: Estado.panelAncho };
      try { dom.panelAsa.setPointerCapture(evento.pointerId); } catch (error) { /* nada */ }
    });
    dom.panelAsa.addEventListener('pointermove', function (evento) {
      if (!arrastre) return;
      var delta = arrastre.inicioX - evento.clientX;
      var maximo = Math.max(360, Math.round(global.innerWidth * 0.72));
      Estado.panelAncho = Math.max(300, Math.min(maximo, arrastre.inicioAncho + delta));
      document.documentElement.style.setProperty('--panel-ancho', Estado.panelAncho + 'px');
    });
    function soltar() {
      if (!arrastre) return;
      arrastre = null;
      Estado.emitir('panel');
    }
    dom.panelAsa.addEventListener('pointerup', soltar);
    dom.panelAsa.addEventListener('pointercancel', soltar);
  }

  /* ------------------------------------------------------------ eventos -- */

  /* Menús desplegables de la barra (recorrido, exportar): uno abierto a la
     vez, y cualquier clic fuera o Escape los cierra. */
  var menus = [];

  function cerrarMenus() {
    menus.forEach(function (menu) {
      menu.classList.remove('abierto');
      var boton = menu.querySelector('.boton');
      if (boton) boton.setAttribute('aria-expanded', 'false');
    });
  }

  function hayMenuAbierto() {
    return menus.some(function (menu) { return menu.classList.contains('abierto'); });
  }

  function registrarMenu(contenedor, boton, atributo, alElegir) {
    if (!contenedor || !boton) return;
    menus.push(contenedor);
    boton.addEventListener('click', function (evento) {
      evento.stopPropagation();
      var abrir = !contenedor.classList.contains('abierto');
      cerrarMenus();
      contenedor.classList.toggle('abierto', abrir);
      boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    });
    contenedor.addEventListener('click', function (evento) {
      var opcion = evento.target.closest ? evento.target.closest('[' + atributo + ']') : null;
      if (!opcion) return;
      cerrarMenus();
      alElegir(opcion.getAttribute(atributo));
    });
  }

  function registrarEventos() {
    dom.btnAjustar.addEventListener('click', function () { Vista.encuadrar(null, true); });

    dom.btnReorganizar.addEventListener('click', function () {
      Estado.liberarTodos();
      avisar('Posiciones automáticas restauradas.');
    });

    registrarMenu(dom.menuRecorrido, dom.btnRecorrido, 'data-recorrido', fijarRecorrido);

    // Un solo interruptor para el panel: abre en «Creencias» y cierra desde
    // cualquier pestaña.
    dom.btnCreencias.addEventListener('click', function () {
      if (Estado.panelAbierto) { cerrarPanel(); return; }
      if (Estado.tradiciones.length || Estado.posturasSueltas.length) {
        Estado.modo = 'explorador';
      }
      abrirPestana('creencias');
    });

    dom.btnResaltados.addEventListener('click', function () {
      if (!Estado.resaltados.size) return;
      Vista.encuadrar(Array.from(Estado.resaltados), true);
    });

    dom.btnLimpiarResaltados.addEventListener('click', function () {
      Estado.limpiarResaltados();
    });

    function exportar(tipo) {
      if (tipo === 'url') {
        copiar(Router.enlace(Estado));
        return;
      }
      if (tipo === 'md') {
        descargar('propuesta-posturas-creencias.md', Edits.aMarkdown(Estado.datos), 'text/markdown');
        avisar('Markdown generado para enviarlo al equipo de mantenimiento.');
        return;
      }
      if (tipo === 'svg') {
        descargar('arbol-posturas.svg', Vista.exportarSVG(), 'image/svg+xml');
        avisar(t('svgListo'));
        return;
      }
      if (tipo === 'png') {
        Vista.exportarPNG().then(function (blob) {
          var url = URL.createObjectURL(blob);
          var enlace = document.createElement('a');
          enlace.href = url;
          enlace.download = 'arbol-posturas.png';
          document.body.appendChild(enlace);
          enlace.click();
          enlace.remove();
          global.setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
          avisar(t('pngListo'));
        }, function () { avisar(t('exportaFallo')); });
      }
    }

    registrarMenu(dom.menuExportar, dom.btnExportar, 'data-export', exportar);
    // En captura y sobre pointerdown: el lienzo detiene la propagación de
    // algunos clics, y con `click` los menús se quedaban abiertos tras tocar
    // un control de las tarjetas.
    document.addEventListener('pointerdown', function (evento) {
      var dentro = evento.target && evento.target.closest
        && evento.target.closest('.menu-desplegable');
      if (!dentro) cerrarMenus();
    }, true);

    dom.btnIdioma.addEventListener('click', function () {
      I18n.alternar();
    });

    if (dom.btnMusica) {
      var wrapMusica = document.getElementById('musica-wrap');
      var ocultarVol = null;
      if (wrapMusica) {
        wrapMusica.addEventListener('mouseenter', function () {
          global.clearTimeout(ocultarVol);
          wrapMusica.classList.add('vol-abierto');
        });
        wrapMusica.addEventListener('mouseleave', function () {
          global.clearTimeout(ocultarVol);
          ocultarVol = global.setTimeout(function () {
            wrapMusica.classList.remove('vol-abierto');
          }, 380);
        });
      }
      dom.btnMusica.addEventListener('click', function () {
        if (!dom.audio) return;
        if (dom.audio.paused || dom.audio.muted) {
          dom.audio.muted = false;
          var p = dom.audio.play();
          if (p && p.catch) p.catch(function () { /* autoplay */ });
        } else {
          dom.audio.muted = true;
        }
        actualizarBotonMusica();
        dom.btnMusica.blur();
      });
    }
    if (dom.volMusica) {
      dom.volMusica.addEventListener('input', function () {
        if (!dom.audio) return;
        var pct = Number(dom.volMusica.value);
        dom.audio.volume = Math.max(0, Math.min(1, pct / 100));
        if (pct > 0 && dom.audio.muted) {
          dom.audio.muted = false;
          var p = dom.audio.play();
          if (p && p.catch) p.catch(function () { /* autoplay */ });
        }
        actualizarBotonMusica();
      });
    }

    dom.btnTema.addEventListener('click', function () {
      Estado.tema = Estado.tema === 'oscuro' ? 'claro' : 'oscuro';
      aplicarTema();
      Estado.emitir('tema');
    });

    dom.btnReiniciar.addEventListener('click', function () {
      var cuantas = Object.keys(Estado.respuestas).length;
      var cuantosAnclajes = Object.keys(Estado.fijados).length;
      confirmar({
        titulo: 'Reiniciar el árbol',
        texto: 'Se borran <b>' + cuantas + ' respuesta' + (cuantas === 1 ? '' : 's') + '</b>, '
          + '<b>' + Estado.resaltados.size + ' resaltado'
          + (Estado.resaltados.size === 1 ? '' : 's') + '</b> y '
          + '<b>' + cuantosAnclajes + ' anclaje'
          + (cuantosAnclajes === 1 ? '' : 's') + '</b>, también los guardados en '
          + 'este navegador. El tema y el documento no se tocan.',
        aceptar: 'Borrar todo'
      }).then(function (aceptado) {
        if (!aceptado) return;
        Estado.olvidar();
        Estado.reiniciar();
        avisar('Árbol reiniciado.');
        global.setTimeout(function () { Vista.encuadrar(null, true); }, 340);
      });
    });

    dom.panelCerrar.addEventListener('click', cerrarPanel);

    Array.prototype.forEach.call(dom.pestanas, function (boton) {
      boton.addEventListener('click', function () {
        abrirPestana(boton.getAttribute('data-pestana'));
      });
    });

    registrarRedimensionPanel();

    if (dom.btnCompacto) {
      dom.btnCompacto.addEventListener('click', function () {
        Estado.compactoCreencias = !Estado.compactoCreencias;
        Estado.emitir('panel');
      });
    }

    dom.buscador.addEventListener('input', pintarListaCreencias);

    dom.fichaCreencias.addEventListener('click', function (evento) {
      var fila = evento.target.closest ? evento.target.closest('[data-nodo]') : null;
      if (!fila) return;
      var nodoId = fila.getAttribute('data-nodo');
      Estado.pestana = 'creencias';
      Estado.seleccionado = nodoId;
      Estado.emitir('seleccion');
      Vista.encuadrarNodoYDescendientes(nodoId);
    });

    dom.listaTradiciones.addEventListener('change', function (evento) {
      var nombre = evento.target.getAttribute('data-tradicion');
      if (nombre) alternarTradicion(nombre);
    });

    dom.listaPosturasSueltas.addEventListener('change', function (evento) {
      var pid = evento.target.getAttribute('data-postura');
      if (pid) alternarPosturaSuelta(pid);
    });

    dom.btnLimpiarCreencias.addEventListener('click', function () {
      Estado.tradiciones = [];
      Estado.posturasSueltas = [];
      Estado.modo = 'libre';
      Estado.emitir('creencias');
    });

    dom.btnIrComparar.addEventListener('click', function () {
      abrirPestana('comparar');
    });

    [dom.btnAnalizarDetalle, dom.btnAnalizarComparar].forEach(function (boton) {
      if (boton) boton.addEventListener('click', function () { abrirPestana('analisis'); });
    });

    dom.cuerpoDetalle.addEventListener('click', function (evento) {
      var posturaChip = evento.target.closest ? evento.target.closest('[data-postura]') : null;
      if (posturaChip && !posturaChip.getAttribute('data-accion')) {
        pulsarPosturaFicha(posturaChip.getAttribute('data-postura'));
        return;
      }
      var etiqueta = evento.target.closest ? evento.target.closest('[data-tradicion]') : null;
      if (etiqueta && !etiqueta.getAttribute('data-accion')) {
        alternarTradicion(etiqueta.getAttribute('data-tradicion'));
        abrirPestana('creencias');
        return;
      }
      var accion = evento.target.closest ? evento.target.closest('[data-accion]') : null;
      if (!accion) return;
      aplicarEdicion(accion, dom.cuerpoDetalle);
    });

    dom.salidaComparar.addEventListener('click', function (evento) {
      var boton = evento.target.closest ? evento.target.closest('[data-plegar]') : null;
      if (!boton) return;
      var id = boton.getAttribute('data-plegar');
      plegados[id] = !plegados[id];
      pintarComparacion();
    });

    dom.chkDesacuerdos.addEventListener('change', function () {
      Estado.soloDesacuerdos = dom.chkDesacuerdos.checked;
      Estado.emitir('comparar');
    });

    dom.selProfundidad.addEventListener('change', function () {
      Estado.profundidad = Number(dom.selProfundidad.value) || 0;
      Estado.emitir('comparar');
    });

    dom.btnCopiar.addEventListener('click', function () {
      copiar(Busqueda.aTextoPlano(entradasComparacion, sujetosActuales));
    });

    dom.btnCSV.addEventListener('click', function () {
      descargar('razonamiento-posturas.csv',
        Busqueda.aCSV(entradasComparacion, sujetosActuales), 'text/csv');
      avisar('CSV generado.');
    });

    dom.btnJSON.addEventListener('click', function () {
      descargar('razonamiento-posturas.json',
        Busqueda.aJSON(entradasComparacion, sujetosActuales, Estado.datos), 'application/json');
      avisar('JSON generado.');
    });

    global.addEventListener('keydown', function (evento) {
      if (evento.target && /^(INPUT|TEXTAREA|SELECT)$/.test(evento.target.tagName)) return;
      if (evento.ctrlKey || evento.metaKey || evento.altKey) return;
      var tecla = evento.key.toLowerCase();
      if (tecla === 'f') { Vista.encuadrar(null, true); }
      else if (tecla === 'r') { dom.btnReorganizar.click(); }
      else if (tecla === 'a') { ciclarDivulgacion(); }
      else if (tecla === 'c') { dom.btnCreencias.click(); }
      else if (tecla === 't') { dom.btnTema.click(); }
      else if (tecla === 'h' && Estado.resaltados.size) { dom.btnResaltados.click(); }
      else if (evento.key === 'Escape') {
        if (hayMenuAbierto()) cerrarMenus();
        else if (Estado.seleccionado) Estado.seleccionar(null);
        else if (Estado.panelAbierto) cerrarPanel();
      }
    });
  }

  /* --------------------------------------------------------- arranque ---- */

  function recogerDOM() {
    dom = {
      contador: document.getElementById('contador'),
      aviso: document.getElementById('aviso'),
      cargando: document.getElementById('cargando'),
      dialogo: document.getElementById('dialogo'),
      dialogoTitulo: document.getElementById('dialogo-titulo'),
      dialogoTexto: document.getElementById('dialogo-texto'),
      dialogoAceptar: document.getElementById('dialogo-aceptar'),
      dialogoCancelar: document.getElementById('dialogo-cancelar'),
      panel: document.getElementById('panel'),
      panelCerrar: document.getElementById('panel-cerrar'),
      pestanas: document.querySelectorAll('.pestana'),
      cuerpos: document.querySelectorAll('.panel-cuerpo'),
      cuerpoDetalle: document.getElementById('cuerpo-detalle'),
      fichaDetalle: document.getElementById('ficha-detalle'),
      buscador: document.getElementById('buscador-tradiciones'),
      fichaCreencias: document.getElementById('ficha-creencias'),
      listaTradiciones: document.getElementById('lista-tradiciones'),
      listaPosturasSueltas: document.getElementById('lista-posturas-sueltas'),
      notaSinAfiliacion: document.getElementById('nota-sin-afiliacion'),
      salidaComparar: document.getElementById('salida-comparar'),
      chkDesacuerdos: document.getElementById('chk-desacuerdos'),
      selProfundidad: document.getElementById('sel-profundidad'),
      btnAjustar: document.getElementById('btn-ajustar'),
      btnReorganizar: document.getElementById('btn-reorganizar'),
      menuRecorrido: document.getElementById('menu-recorrido'),
      btnRecorrido: document.getElementById('btn-recorrido'),
      valorRecorrido: document.getElementById('valor-recorrido'),
      btnCreencias: document.getElementById('btn-creencias'),
      btnExportar: document.getElementById('btn-exportar'),
      menuExportar: document.getElementById('menu-exportar'),
      btnIdioma: document.getElementById('btn-idioma'),
      rotuloIdioma: document.getElementById('rotulo-idioma'),
      btnMusica: document.getElementById('btn-musica'),
      volMusica: document.getElementById('vol-musica'),
      audio: document.getElementById('audio-fondo'),
      btnTema: document.getElementById('btn-tema'),
      btnReiniciar: document.getElementById('btn-reiniciar'),
      btnResaltados: document.getElementById('btn-resaltados'),
      btnLimpiarResaltados: document.getElementById('btn-limpiar-resaltados'),
      conteoResaltados: document.getElementById('conteo-resaltados'),
      sepResaltados: document.getElementById('sep-resaltados'),
      btnLimpiarCreencias: document.getElementById('btn-limpiar-creencias'),
      btnIrComparar: document.getElementById('btn-ir-comparar'),
      btnAnalizarDetalle: document.getElementById('btn-analizar-detalle'),
      btnAnalizarComparar: document.getElementById('btn-analizar-comparar'),
      btnCompacto: document.getElementById('btn-compacto'),
      panelAsa: document.getElementById('panel-asa'),
      btnCopiar: document.getElementById('btn-copiar'),
      btnCSV: document.getElementById('btn-csv'),
      btnJSON: document.getElementById('btn-json')
    };
  }

  function mostrarError(error) {
    dom.cargando.classList.add('error');
    dom.cargando.querySelector('p').innerHTML =
      'No se pudieron cargar los datos del árbol.<br>'
      + escapar(error && error.message ? error.message : String(error)) + '<br><br>'
      + 'Genera el modelo con <code>Generar-Diagramas.cmd</code> o con '
      + '<code>python scripts/convertir_posturas_creencias.py recursos/posturas-creencias.md</code>, '
      + 'que escribe <code>datos/posturas-creencias.json</code> y su respaldo '
      + '<code>datos/posturas-creencias.js</code>.';
  }

  function iniciar(datos) {
    datosCanon = datos;
    editsEstado = Edits.cargar();
    Estado.datos = Edits.aplicar(datosCanon, editsEstado);
    Estado.grafo = Arbol.construirGrafo(Estado.datos);

    var lectura = Router.leer();
    // El estado vive en localStorage (§8.1), así que sobrevive a recargas y a
    // borrar la consulta de la barra de direcciones. `?limpio=1` lo salta.
    // Si la URL no lleva ningún parámetro, el usuario borró la consulta a mano
    // y espera arrancar de cero: tratamos ese caso como limpio.
    var sinParametros = !global.location.search || global.location.search === '?';
    if (lectura.limpio || sinParametros) Estado.olvidar();
    else Estado.cargar();

    var aplicado = Router.aplicar(lectura, Estado);
    Estado.sanear();
    // «Comparar» no es una pestaña de entrada: se llega a ella desde el panel.
    // Una sesión guardada ahí (o un enlace con vista=lista) abre en «Creencias».
    if (Estado.pestana === 'comparar' || !Estado.pestana) Estado.pestana = 'creencias';
    Estado.vista = 'grafo';
    aplicarTema();

    listaTradiciones = Busqueda.listaTradiciones(datos);
    listaPosturasSueltas = Busqueda.listaPosturasSueltas(datos, Estado.grafo);

    // Un enlace compartido que nombra creencias debe abrir su ficha.
    if ((lectura.tradiciones || lectura.posturas) && Estado.modo === 'explorador') {
      Estado.panelAbierto = true;
      Estado.pestana = 'creencias';
    }

    dom.chkDesacuerdos.checked = Estado.soloDesacuerdos;
    dom.selProfundidad.value = String(Estado.profundidad || 0);

    Vista.iniciar({
      alResponder: function (preguntaId, clave) {
        Estado.responder(preguntaId, clave);
        seguirNodosTrasAbrir(idsAbiertosPorRespuesta(preguntaId, clave));
      },
      alBorrar: pedirPoda,
      alExpandir: function (nodoId) {
        Estado.alternarExpandido(nodoId);
        if (Estado.expandidos.has(nodoId)) {
          global.setTimeout(function () {
            Vista.encuadrarNodoYDescendientes(nodoId);
          }, 340);
        }
      },
      alSeleccionar: function (nodoId) {
        var nodo = nodoId ? Estado.grafo.nodos.get(nodoId) : null;
        preseleccionarPosturaEnCreencias(nodo);
        Estado.seleccionar(nodoId);
      },
      alDobleClic: function (nodoId) {
        var nodo = nodoId ? Estado.grafo.nodos.get(nodoId) : null;
        preseleccionarPosturaEnCreencias(nodo);
        Estado.seleccionado = nodoId;
        Estado.panelAbierto = true;
        Estado.pestana = 'detalle';
        Estado.vista = 'grafo';
        Estado.emitir('seleccion');
        Vista.centrarEnNodo(nodoId);
      },
      alResaltar: function (nodoId) { Estado.alternarResaltado(nodoId); },
      alFijar: function (nodoId, punto) { Estado.fijar(nodoId, punto); },
      alDesanclar: function (nodoId) {
        Estado.desanclar(nodoId);
        avisar('Nodo devuelto a su posición automática.');
      },
      alCambiarCamara: function (camara) { Estado.camara = camara; },
      tooltipHTML: tooltipDeNodo,
      tooltipControl: tooltipDeControl,
      alPintarTooltip: pintarDefinicionesEn,
      margenDerecho: function () {
        return Estado.panelAbierto ? dom.panel.getBoundingClientRect().width + 34 : 40;
      }
    });

    Estado.suscribir(function (motivo) {
      if (motivo === 'respuesta' || motivo === 'divulgacion') {
        sincronizarHojaCuestionario();
      }
      refrescar();
    });
    var recargaIdioma = null;
    I18n.suscribir(function () {
      I18n.aplicarDOM();
      actualizarRotuloIdioma();
      Layout.limpiarCache();
      global.clearTimeout(recargaIdioma);
      recargaIdioma = global.setTimeout(function () {
        refrescar();
      }, 40);
    });
    sincronizarAltoBarra();
    global.addEventListener('resize', sincronizarAltoBarra);
    registrarEventos();

    sincronizarHojaCuestionario();
    refrescar();
    arrancarMusica();

    // La URL manda sobre localStorage, y localStorage sobre el encuadre inicial.
    if (lectura.camara || (Estado.camaraRestaurada && !aplicado.huboCambio)) {
      Vista.fijarCamara(Estado.camara);
    } else {
      Vista.encuadrar(null, false);
    }

    dom.cargando.classList.add('oculto');
  }

  document.addEventListener('DOMContentLoaded', function () {
    recogerDOM();
    I18n.iniciar();
    Definiciones.iniciar();
    actualizarRotuloIdioma();
    lanzarBienvenida();
    cargarDatos().then(iniciar, mostrarError);
  });

})(window);
