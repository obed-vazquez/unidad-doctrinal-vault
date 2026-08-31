/* Modo Cuestionario: una pregunta a la vez, con contexto útil y reporte final. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var raiz = null;
  var deps = null;
  var mostrandoReporte = false;
  var historialPreguntas = [];
  var revelarAdelantos = false;
  var preguntaElegida = null;
  var modoSeleccion = false;
  var UMBRAL_SELECTOR = 4;
  var UMBRAL_PROMPT_SIMPLIFICADA = 2;
  var CLAVE_PROMPT_SIMPLIFICADO = 'arbol-cuestionario-prompt-simplificado';

  function leerPromptSimplificadoRespondido() {
    try {
      return global.localStorage.getItem(CLAVE_PROMPT_SIMPLIFICADO) === '1';
    } catch (error) {
      return false;
    }
  }

  function marcarPromptSimplificadoRespondido() {
    promptSimplificadoRespondido = true;
    try {
      global.localStorage.setItem(CLAVE_PROMPT_SIMPLIFICADO, '1');
    } catch (error) { /* nada */ }
  }

  var promptSimplificadoRespondido = leerPromptSimplificadoRespondido();

  function t(clave, vars) {
    return Arbol.I18n ? Arbol.I18n.t(clave, vars) : clave;
  }

  function dato(clave, original) {
    return Arbol.I18n ? Arbol.I18n.dato(clave, original) : original;
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rotuloPostura(postura) {
    if (!postura) return '';
    if (Arbol.Layout && Arbol.Layout.rotuloPostura) {
      return Arbol.Layout.rotuloPostura(postura);
    }
    return postura.label || '';
  }

  function urlNota(enlace) {
    if (!enlace) return null;
    if (deps && deps.urlMDRender) return deps.urlMDRender(enlace);
    if (enlace.href) return enlace.href;
    return null;
  }

  function pieEnlaceExterno(enlace, etiqueta) {
    var destino = urlNota(enlace);
    if (!destino) return '';
    return '<a class="enlace-md-externo" href="' + escapar(destino)
      + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="enlace-md-icono" aria-hidden="true">↗</span>'
      + '<span>' + escapar(etiqueta || t('quizAnalisisAbrir')) + '</span></a>';
  }

  function tarjetaMarkdown(enlace, etiquetaPie) {
    if (!enlace) return '';
    if (Arbol.Markdown && Arbol.Markdown.tarjeta) {
      return Arbol.Markdown.tarjeta(enlace, {
        pie: pieEnlaceExterno(enlace, etiquetaPie)
      });
    }
    var destino = urlNota(enlace);
    var titulo = enlace.label || enlace.target || '';
    if (destino) {
      return '<a class="enlace-md-externo" href="' + escapar(destino)
        + '" target="_blank" rel="noopener noreferrer">'
        + '<span class="enlace-md-icono" aria-hidden="true">↗</span>'
        + '<span>' + escapar(titulo) + '</span></a>';
    }
    return '<p class="quiz-ficha-meta">[[' + escapar(titulo) + ']]</p>';
  }

  function hidratarMarkdown() {
    if (Arbol.Markdown && Arbol.Markdown.pintarCola) {
      Arbol.Markdown.pintarCola(raiz);
    }
  }

  function preguntasPendientes(estado) {
    if (Arbol.Creencias
      && Arbol.Creencias.enModoDefinitoriasCuestionario(estado)) {
      var pids = Arbol.Creencias.posturasConPreguntaEnCuestionario(estado) || [];
      return Arbol.Creencias.preguntasDefinitorias(
        estado.grafo, estado.datos, pids);
    }
    var grafo = estado.grafo;
    var respuestas = estado.respuestasEfectivas();
    var visibles = Arbol.nodosVisibles(grafo, respuestas, 'limpio', estado.expandidos,
      null, estado.ramasSinRespuesta);
    var pendientes = [];
    var vistos = new Set();
    visibles.forEach(function (id) {
      var nodo = grafo.nodos.get(id);
      if (!nodo || !nodo.preguntaId || !nodo.pregunta) return;
      if (respuestas[nodo.preguntaId] != null) return;
      if (estado.ramasSinRespuesta && estado.ramasSinRespuesta[nodo.preguntaId]) return;
      if (vistos.has(nodo.preguntaId)) return;
      vistos.add(nodo.preguntaId);
      pendientes.push(nodo);
    });
    pendientes.sort(function (a, b) {
      return Number(String(a.preguntaId).slice(1)) - Number(String(b.preguntaId).slice(1));
    });
    return pendientes;
  }

  function nodoPendientePorId(pendientes, qid) {
    if (!qid) return null;
    for (var i = 0; i < pendientes.length; i++) {
      if (pendientes[i].preguntaId === qid) return pendientes[i];
    }
    return null;
  }

  function debeUsarModoSimplificado(pendientes) {
    return !!(modoSeleccion && pendientes && pendientes.length > 0);
  }

  function debeMostrarPromptSimplificada(estado, pendientes) {
    if (promptSimplificadoRespondido) return false;
    if (!pendientes || pendientes.length <= UMBRAL_PROMPT_SIMPLIFICADA) return false;
    if (estado.panelAbierto) return false;
    if (modoSeleccion) return false;
    return true;
  }

  function registrarRespuestaPrompt(pendientes, aceptar) {
    marcarPromptSimplificadoRespondido();
    if (aceptar) {
      modoSeleccion = true;
      preguntaElegida = null;
    } else {
      modoSeleccion = false;
      preguntaElegida = null;
    }
  }

  function textoCortoPregunta(pregunta) {
    if (!pregunta) return '';
    var coloquial = pregunta.colloquial_hint
      ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
      : '';
    var formal = dato('q.' + pregunta.id + '.formal', pregunta.formal_text);
    var texto = coloquial || formal || pregunta.id;
    if (texto.length > 140) texto = texto.slice(0, 137) + '…';
    return texto;
  }

  function etiquetaRama(nodo, datos) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    if (!ids.length) return t('quizRamaAbierta');
    return ids.map(function (pid) {
      return rotuloPostura(datos.postures[pid]) || pid;
    }).join(' · ');
  }

  function tradicionesDePostura(postura, datos) {
    var nombres = [];
    var indice = datos && datos.traditions_index;
    (postura && postura.traditions || []).forEach(function (tradicion) {
      if (!tradicion.name || (indice && !indice[tradicion.name])) return;
      if (nombres.indexOf(tradicion.name) === -1) nombres.push(tradicion.name);
    });
    return nombres;
  }

  function posturaTieneNombre(postura) {
    if (!postura || postura.is_root || postura.is_unnamed) return false;
    var etiqueta = String(postura.label || '').trim();
    if (!etiqueta || etiqueta === '?') return false;
    if (/^sin[-\s]?nombre$/i.test(etiqueta)) return false;
    return true;
  }

  function padreEnCamino(estado, nodo, camino) {
    if (!nodo || !nodo.entradas || !nodo.entradas.length) return null;
    var i;
    for (i = 0; i < nodo.entradas.length; i++) {
      var padreId = nodo.entradas[i].desde;
      if (camino && camino.has(padreId)) return estado.grafo.nodos.get(padreId);
    }
    return estado.grafo.nodos.get(nodo.entradas[0].desde) || null;
  }

  /* Sube por el recorrido hasta la postura con nombre más cercana. */
  function posturaNombradaCercana(estado, nodoInicio, camino) {
    var actual = nodoInicio;
    var vistos = new Set();
    while (actual && !vistos.has(actual.id)) {
      vistos.add(actual.id);
      if (posturaTieneNombre(actual.postura)) {
        return { nodo: actual, postura: actual.postura };
      }
      actual = padreEnCamino(estado, actual, camino);
    }
    return null;
  }

  function hojasDelCamino(estado) {
    var camino = estado.caminoElegido();
    if (!camino || !camino.size) return [];
    var hojas = [];
    camino.forEach(function (id) {
      var nodo = estado.grafo.nodos.get(id);
      if (!nodo) return;
      var tieneHijoEnCamino = (nodo.salidas || []).some(function (arista) {
        return camino.has(arista.hasta);
      });
      if (!tieneHijoEnCamino) hojas.push(nodo);
    });
    return hojas;
  }

  function posturasDelCamino(estado) {
    var camino = estado.caminoElegido();
    var lista = [];
    var vistos = new Set();
    camino.forEach(function (id) {
      var nodo = estado.grafo.nodos.get(id);
      if (!nodo || !posturaTieneNombre(nodo.postura)) return;
      if (vistos.has(nodo.posturaId)) return;
      vistos.add(nodo.posturaId);
      lista.push({ nodo: nodo, postura: nodo.postura });
    });
    return lista;
  }

  /* Una postura nombrada por cada hoja alcanzada (o su ancestro nombrado).
     Con el panel abierto en cuestionario solo cuentan las posturas marcadas,
     no ancestros nombrados del camino virtual. */
  function posturasEspecificas(estado) {
    if (estado.panelAbierto && estado.posturasSueltas.length) {
      return estado.posturasSueltas.map(function (pid) {
        var nodoId = estado.grafo.idDePostura(pid);
        var nodo = estado.grafo.nodos.get(nodoId);
        var postura = estado.datos.postures[pid];
        if (!nodo || !postura || !posturaTieneNombre(postura)) return null;
        return { nodo: nodo, postura: postura };
      }).filter(Boolean);
    }
    if (estado.divulgacion === 'cuestionario' && estado.posturasExploradasCuestionario
      && estado.posturasExploradasCuestionario.length) {
      return estado.posturasExploradasCuestionario.map(function (pid) {
        var nodoId = estado.grafo.idDePostura(pid);
        var nodo = estado.grafo.nodos.get(nodoId);
        var postura = estado.datos.postures[pid];
        if (!nodo || !postura || !posturaTieneNombre(postura)) return null;
        return { nodo: nodo, postura: postura };
      }).filter(Boolean);
    }
    var camino = estado.caminoElegido();
    var hojas = hojasDelCamino(estado);
    var lista = [];
    var vistos = new Set();
    hojas.forEach(function (hoja) {
      var item = posturaNombradaCercana(estado, hoja, camino);
      if (!item || vistos.has(item.postura.id)) return;
      vistos.add(item.postura.id);
      lista.push(item);
    });
    return lista;
  }

  function coincidenciasTradicion(estado, nombre) {
    var indice = estado.datos.traditions_index[nombre];
    if (!indice) return { comunes: 0, total: 0, porcentaje: 0 };
    var resolucion = Arbol.Busqueda.resolver(estado.grafo, estado.datos, {
      tipo: 'tradicion',
      id: nombre,
      nombre: nombre,
      posturaIds: indice.posture_ids || [],
      tentativa: !!indice.tentative,
      respuestas: {}
    });
    var propias = estado.respuestasEfectivas();
    var comunes = 0;
    var total = 0;
    Object.keys(resolucion.respuestas || {}).forEach(function (qid) {
      total++;
      if (propias[qid] && propias[qid] === resolucion.respuestas[qid]) comunes++;
    });
    return {
      comunes: comunes,
      total: total,
      porcentaje: total ? Math.round((comunes / total) * 100) : 0
    };
  }

  function pintarOrigenes(nodo, datos) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    if (!ids.length) return '';
    return '<div class="quiz-origenes"><span class="quiz-etiqueta">'
      + escapar(t('quizDesde')) + '</span> '
      + ids.map(function (pid) {
        var p = datos.postures[pid];
        return '<strong>' + escapar(rotuloPostura(p) || pid) + '</strong>';
      }).join(' · ')
      + '</div>';
  }

  function pintarAnalisis(pregunta) {
    var enlaces = (pregunta && pregunta.wikilinks) || [];
    var html = '<section class="quiz-tarjeta quiz-analisis">'
      + '<h3>' + escapar(t('quizAnalisis')) + '</h3>';
    if (!enlaces.length) {
      html += '<p class="quiz-vacio">' + escapar(t('quizAnalisisVacio')) + '</p></section>';
      return html;
    }
    html += '<div class="quiz-docs">';
    enlaces.forEach(function (enlace) {
      html += tarjetaMarkdown(enlace, t('quizAnalisisAbrir'));
    });
    html += '</div></section>';
    return html;
  }

  function pintarAclaraciones(nodo, datos) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    var vistos = {};
    var tarjetas = [];
    function agregar(enlace) {
      if (!enlace) return;
      var clave = enlace.vault_path || enlace.href || enlace.target || '';
      if (!clave || vistos[clave]) return;
      vistos[clave] = true;
      tarjetas.push(enlace);
    }
    ids.forEach(function (pid) {
      var postura = datos.postures[pid];
      if (!postura) return;
      (postura.wikilinks || []).forEach(agregar);
    });
    ((nodo.pregunta && nodo.pregunta.answers) || []).forEach(function (respuesta) {
      var destino = datos.postures[respuesta.target_posture_id];
      if (!destino) return;
      (destino.wikilinks || []).forEach(agregar);
    });
    var html = '<section class="quiz-tarjeta quiz-aclaraciones">'
      + '<h3>' + escapar(t('quizAclaraciones')) + '</h3>';
    if (!tarjetas.length) {
      html += '<p class="quiz-vacio">' + escapar(t('quizAclaracionesVacio'))
        + '</p></section>';
      return html;
    }
    html += '<div class="quiz-docs">';
    tarjetas.forEach(function (enlace) {
      html += tarjetaMarkdown(enlace, t('quizAclaracionAbrir'));
    });
    html += '</div></section>';
    return html;
  }

  function pintarRespuestas(nodo, estado) {
    var pregunta = nodo.pregunta;
    var pesos = Arbol.pesoDeRespuestas(estado.grafo);
    var html = '<section class="quiz-respuestas"><h3>'
      + escapar(t('quizRespuestas')) + '</h3><div class="quiz-opciones">';
    (pregunta.answers || []).forEach(function (respuesta) {
      var etiqueta = dato('q.' + pregunta.id + '.' + respuesta.key + '.label', respuesta.label);
      var glosa = respuesta.gloss
        ? dato('q.' + pregunta.id + '.' + respuesta.key + '.gloss', respuesta.gloss)
        : '';
      var destino = estado.datos.postures[respuesta.target_posture_id];
      var tradiciones = tradicionesDePostura(destino, estado.datos);
      var peso = pesos[pregunta.id + ':' + respuesta.key] || 0;
      var textoTradiciones = tradiciones.length
        ? tradiciones.join(' · ')
        : t('quizSinTradicion');
      var textoPeso = peso ? t('quizPesoRama', { n: String(peso) }) : '';
      html += '<button type="button" class="quiz-opcion" data-pregunta="'
        + escapar(pregunta.id) + '" data-clave="'
        + escapar(respuesta.key) + '">'
        + '<span class="quiz-opcion-etiqueta">' + escapar(etiqueta) + '</span>'
        + (glosa ? '<span class="quiz-opcion-glosa">' + escapar(glosa) + '</span>' : '')
        + '<span class="quiz-opcion-destino">'
        + '<span class="quiz-campo-rotulo">' + escapar(t('quizPosturaDestino')) + ':</span> '
        + '<span class="quiz-spoiler" aria-hidden="' + (revelarAdelantos ? 'false' : 'true') + '">'
        + '<strong>' + escapar(rotuloPostura(destino) || '—') + '</strong>'
        + '</span></span>'
        + '<span class="quiz-opcion-meta">'
        + '<span class="quiz-opcion-fila">'
        + '<span class="quiz-campo-rotulo">' + escapar(t('quizTradicionesSi')) + ':</span> '
        + '<span class="quiz-spoiler" aria-hidden="' + (revelarAdelantos ? 'false' : 'true') + '">'
        + escapar(textoTradiciones)
        + '</span></span>'
        + (textoPeso
          ? '<span class="quiz-opcion-peso">'
            + '<span class="quiz-campo-rotulo">' + escapar(t('quizPesoRamaRotulo')) + ':</span> '
            + '<span class="quiz-spoiler" aria-hidden="'
            + (revelarAdelantos ? 'false' : 'true') + '">'
            + escapar(textoPeso)
            + '</span></span>'
          : '')
        + '</span></button>';
    });
    if (!estado.panelAbierto) {
      html += '<button type="button" class="quiz-opcion quiz-opcion-sin-respuesta" data-accion="sin-respuesta" data-pregunta="'
        + escapar(pregunta.id) + '">'
        + '<span class="quiz-opcion-etiqueta">' + escapar(t('quizSinRespuesta')) + '</span>'
        + '<span class="quiz-opcion-glosa">' + escapar(t('quizSinRespuestaNota')) + '</span>'
        + '</button>';
    }
    html += '</div></section>';
    return html;
  }

  function pintarDefiniciones(nodo, estado) {
    var ids = (nodo.pregunta && nodo.pregunta.origin_posture_ids) || [];
    if (!ids.length && nodo.posturaId) ids = [nodo.posturaId];
    var html = '<section class="quiz-tarjeta quiz-contexto"><h3>'
      + escapar(t('quizDefinicion')) + '</h3>';
    var alguno = false;
    ids.forEach(function (pid) {
      var postura = estado.datos.postures[pid];
      if (!postura || postura.is_unnamed || postura.is_root) return;
      alguno = true;
      html += '<div class="quiz-def">'
        + '<h4>' + escapar(rotuloPostura(postura)) + '</h4>'
        + '<div class="quiz-def-cuerpo" data-def="' + escapar(pid) + '"></div></div>';
    });
    if (!alguno) {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinTradicion')) + '</p>';
    }
    html += '</section>';
    return html;
  }

  function pintarCabecera(estado, extras) {
    var respondidas = Object.keys(estado.respuestas).length;
    var vistaPrevia = !!(Arbol.Creencias
      && Arbol.Creencias.enModoDefinitoriasCuestionario(estado));
    var paso = vistaPrevia ? respondidas + 1 : historialPreguntas.length + 1;
    var pendientes = (extras && extras.pendientes) || [];
    var html = '<header class="quiz-cabecera">'
      + '<div class="quiz-cabecera-textos">'
      + '<p class="quiz-progreso">' + escapar(t('quizProgreso', {
        actual: String(paso),
        respondidas: String(respondidas)
      })) + '</p>';
    if (pendientes.length > 1) {
      html += '<p class="quiz-ramas-abiertas">'
        + escapar(t('quizRamasAbiertas', { n: String(pendientes.length) }))
        + '</p>';
    }
    html += '</div><div class="quiz-acciones-top">'
      + '<label class="quiz-revelar" title="' + escapar(t('quizRevelarTitle')) + '">'
      + '<input type="checkbox" data-accion="revelar"'
      + (revelarAdelantos ? ' checked' : '') + '>'
      + '<span>' + escapar(t('quizRevelar')) + '</span>'
      + '</label>'
      + '<label class="quiz-revelar" title="' + escapar(t('quizModoSeleccionTitle')) + '">'
      + '<input type="checkbox" data-accion="modo-seleccion"'
      + (modoSeleccion ? ' checked' : '') + '>'
      + '<span>' + escapar(t('quizModoSeleccion')) + '</span>'
      + '</label>';
    if (extras && extras.cambiarRama) {
      html += '<button type="button" class="quiz-btn fantasma" data-accion="cambiar-rama">'
        + escapar(t('quizCambiarRama')) + '</button>';
    }
    if (historialPreguntas.length) {
      html += '<button type="button" class="quiz-btn fantasma" data-accion="atras">'
        + escapar(t('quizAtras')) + '</button>';
    }
    html += '<button type="button" class="quiz-btn fantasma" data-accion="arbol">'
      + escapar(t('quizSaltarArbol')) + '</button>'
      + '</div></header>';
    if (pendientes.length > UMBRAL_SELECTOR && !modoSeleccion) {
      html += '<div class="quiz-aviso-ramas">'
        + '<p>' + escapar(t('quizAvisoMuchasRamas', { n: String(pendientes.length) })) + '</p>'
        + '</div>';
    }
    return html;
  }

  function pintarBloquePregunta(estado, nodo, indice, total) {
    var pregunta = nodo.pregunta;
    var coloquial = pregunta.colloquial_hint
      ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
      : '';
    var formal = dato('q.' + pregunta.id + '.formal', pregunta.formal_text);
    var html = '<article class="quiz-bloque" id="quiz-q-' + escapar(pregunta.id) + '">'
      + '<div class="quiz-lienzo">'
      + '<main class="quiz-foco">'
      + (total > 1
        ? '<p class="quiz-paso">' + escapar(t('quizRamaN', { n: String(indice + 1) })) + '</p>'
        : '<p class="quiz-paso">' + escapar(t('quizPaso', {
          n: String(historialPreguntas.length + 1)
        })) + '</p>')
      + pintarOrigenes(nodo, estado.datos)
      + (coloquial
        ? '<h2 class="quiz-coloquial">' + escapar(coloquial) + '</h2>'
          + '<p class="quiz-formal">' + escapar(formal) + '</p>'
        : '<h2 class="quiz-coloquial">' + escapar(formal) + '</h2>')
      + pintarRespuestas(nodo, estado)
      + '</main>'
      + '<aside class="quiz-lateral">'
      + pintarAnalisis(pregunta)
      + pintarAclaraciones(nodo, estado.datos)
      + pintarDefiniciones(nodo, estado)
      + '</aside>'
      + '</div></article>';
    return html;
  }

  function clasesEscena(extras) {
    var clases = ['quiz-escena'];
    if (revelarAdelantos) clases.push('revelar-adelantos');
    if (extras && extras.varias) clases.push('quiz-escena--varias');
    if (extras && extras.muchas) clases.push('quiz-escena--muchas');
    return clases.join(' ');
  }

  function pintarSelectorRamas(estado, pendientes) {
    mostrandoReporte = false;
    var html = '<div class="' + clasesEscena() + '">'
      + pintarCabecera(estado, { pendientes: pendientes })
      + '<div class="quiz-selector">'
      + '<p class="quiz-paso">' + escapar(t('quizVariasRamas')) + '</p>'
      + '<h1 class="quiz-coloquial">' + escapar(t('quizEligeRama')) + '</h1>'
      + '<p class="quiz-formal">' + escapar(t('quizEligeRamaNota')) + '</p>'
      + '<div class="quiz-ramas">';
    pendientes.forEach(function (nodo, indice) {
      html += '<button type="button" class="quiz-rama" data-elegir-pregunta="'
        + escapar(nodo.preguntaId) + '">'
        + '<span class="quiz-rama-indice">'
        + escapar(t('quizRamaN', { n: String(indice + 1) }))
        + '</span>'
        + '<span class="quiz-rama-origen">' + escapar(etiquetaRama(nodo, estado.datos))
        + '</span>'
        + '<span class="quiz-rama-pregunta">' + escapar(textoCortoPregunta(nodo.pregunta))
        + '</span>'
        + '</button>';
    });
    html += '</div></div></div>';
    raiz.innerHTML = html;
    delete raiz.dataset.pregunta;
  }

  function pintarPromptVistaSimplificada(estado, pendientes) {
    mostrandoReporte = false;
    var html = '<div class="' + clasesEscena() + ' quiz-escena--prompt">'
      + pintarCabecera(estado, { pendientes: pendientes })
      + '<section class="quiz-prompt-simplificada" role="dialog" aria-labelledby="quiz-prompt-titulo">'
      + '<p class="quiz-paso">' + escapar(t('quizVariasRamas')) + '</p>'
      + '<h1 class="quiz-coloquial" id="quiz-prompt-titulo">'
      + escapar(t('quizPromptSimplificadaTitulo'))
      + '</h1>'
      + '<p class="quiz-formal">' + escapar(t('quizPromptSimplificadaNota')) + '</p>'
      + '<div class="quiz-prompt-acciones">'
      + '<button type="button" class="quiz-btn primario" data-accion="vista-simplificada-si">'
      + escapar(t('quizPromptSimplificadaSi')) + '</button>'
      + '<button type="button" class="quiz-btn fantasma" data-accion="vista-simplificada-no">'
      + escapar(t('quizPromptSimplificadaNo')) + '</button>'
      + '</div></section></div>';
    raiz.innerHTML = html;
    delete raiz.dataset.pregunta;
  }

  function pintarPreguntasAbiertas(estado, pendientes) {
    mostrandoReporte = false;
    preguntaElegida = null;
    var n = pendientes.length;
    var html = '<div class="' + clasesEscena({
      varias: n > 1,
      muchas: n > 3
    }) + '">'
      + pintarCabecera(estado, { pendientes: pendientes })
      + '<div class="quiz-bloques">';
    pendientes.forEach(function (nodo, indice) {
      html += pintarBloquePregunta(estado, nodo, indice, n);
    });
    html += '</div></div>';
    raiz.innerHTML = html;
    delete raiz.dataset.pregunta;
    if (deps && deps.pintarDefiniciones) deps.pintarDefiniciones(raiz);
    hidratarMarkdown();
  }

  function pintarPregunta(estado, nodo, pendientes) {
    mostrandoReporte = false;
    raiz.innerHTML = '<div class="' + clasesEscena() + '">'
      + pintarCabecera(estado, {
        pendientes: pendientes,
        cambiarRama: false
      })
      + '<div class="quiz-bloques">'
      + pintarBloquePregunta(estado, nodo, 0, 1)
      + '</div></div>';
    if (deps && deps.pintarDefiniciones) deps.pintarDefiniciones(raiz);
    hidratarMarkdown();
    raiz.dataset.pregunta = nodo.pregunta.id;
  }

  function pintarEscena(estado) {
    var pendientes = preguntasPendientes(estado);
    if (!pendientes.length) {
      preguntaElegida = null;
      mostrandoReporte = true;
      pintarReporte(estado);
      return;
    }
    if (debeMostrarPromptSimplificada(estado, pendientes)) {
      pintarPromptVistaSimplificada(estado, pendientes);
      return;
    }
    if (debeUsarModoSimplificado(pendientes)) {
      preguntaElegida = null;
      pintarPregunta(estado, pendientes[0], pendientes);
      return;
    }
    pintarPreguntasAbiertas(estado, pendientes);
  }

  function insigniasDePostura(postura) {
    var insignias = [];
    if (!postura) return insignias;
    if (postura.is_suggested) insignias.push(t('quizTerminoSugerido'));
    if (postura.is_uncertain) insignias.push(t('quizDenominacionDuda'));
    return insignias;
  }

  function llegadaAPostura(estado, nodo) {
    var camino = estado.caminoElegido();
    if (!nodo || !nodo.entradas) return null;
    var i;
    for (i = 0; i < nodo.entradas.length; i++) {
      var arista = nodo.entradas[i];
      if (!camino.has(arista.desde)) continue;
      if (arista.tipo !== 'respuesta' && arista.tipo !== 'eje') continue;
      var desde = estado.grafo.nodos.get(arista.desde);
      var pregunta = arista.preguntaId && estado.datos.questions[arista.preguntaId];
      if (!pregunta && desde && desde.pregunta) pregunta = desde.pregunta;
      var respuesta = null;
      if (pregunta && arista.clave) {
        (pregunta.answers || []).some(function (r) {
          if (r.key === arista.clave) { respuesta = r; return true; }
          return false;
        });
      }
      var padreNombrado = posturaNombradaCercana(estado, desde, camino);
      if (padreNombrado && nodo.postura
        && padreNombrado.postura.id === nodo.postura.id) {
        padreNombrado = null;
      }
      return {
        desde: desde,
        pregunta: pregunta,
        respuesta: respuesta,
        padreNombrado: padreNombrado,
        tipo: arista.tipo
      };
    }
    return null;
  }

  function pintarEnlacesPostura(postura) {
    var enlaces = (postura && postura.wikilinks) || [];
    if (!enlaces.length) return '';
    var html = '<div class="quiz-ficha-enlaces quiz-docs">'
      + '<h4>' + escapar(t('quizAclaraciones')) + '</h4>';
    enlaces.forEach(function (enlace) {
      html += tarjetaMarkdown(enlace, t('quizAclaracionAbrir'));
    });
    html += '</div>';
    return html;
  }

  function pintarRelacionPostura(estado, item) {
    var llegada = llegadaAPostura(estado, item.nodo);
    var partes = [];
    if (llegada && llegada.padreNombrado) {
      partes.push(t('quizRelacionDesde', {
        postura: rotuloPostura(llegada.padreNombrado.postura)
      }));
    }
    if (llegada && llegada.pregunta) {
      var formal = dato('q.' + llegada.pregunta.id + '.formal', llegada.pregunta.formal_text);
      var coloquial = llegada.pregunta.colloquial_hint
        ? dato('q.' + llegada.pregunta.id + '.coloquial', llegada.pregunta.colloquial_hint)
        : '';
      var preguntaTxt = coloquial || formal;
      if (llegada.respuesta) {
        var et = dato(
          'q.' + llegada.pregunta.id + '.' + llegada.respuesta.key + '.label',
          llegada.respuesta.label
        );
        partes.push(t('quizRelacionRespuesta', {
          respuesta: et,
          pregunta: preguntaTxt
        }));
      } else {
        partes.push(t('quizRelacionPregunta', { pregunta: preguntaTxt }));
      }
    }
    if (!partes.length) return '';
    return '<div class="quiz-ficha-relacion">'
      + '<h4>' + escapar(t('quizRelacion')) + '</h4>'
      + partes.map(function (p) {
        return '<p>' + escapar(p) + '</p>';
      }).join('')
      + '</div>';
  }

  function pintarFichaPostura(estado, item, clase) {
    var postura = item.postura;
    var trads = tradicionesDePostura(postura, estado.datos);
    var insignias = insigniasDePostura(postura);
    var notas = (postura.notes || []).filter(Boolean);
    var html = '<article class="' + (clase || 'quiz-hero-postura') + '">'
      + '<h2>' + escapar(rotuloPostura(postura)) + '</h2>';
    if (insignias.length) {
      html += '<p class="quiz-ficha-insignias">' + escapar(insignias.join(' · ')) + '</p>';
    }
    if (trads.length) {
      html += '<p class="quiz-hero-trads">'
        + '<span class="quiz-campo-rotulo">' + escapar(t('sostenidaPor')) + ':</span> '
        + trads.map(function (nombre) {
          return '<button type="button" class="quiz-enlace quiz-trad-enlace" data-accion="explorar-tradicion" data-tradicion="'
            + escapar(nombre) + '">' + escapar(nombre) + '</button>';
        }).join(' · ')
        + '</p>';
    }
    html += pintarRelacionPostura(estado, item);
    html += '<div class="quiz-ficha-definicion">'
      + '<h4>' + escapar(t('definicion')) + '</h4>'
      + '<div class="quiz-def-cuerpo" data-def="' + escapar(postura.id) + '"></div>'
      + '</div>';
    if (notas.length) {
      html += '<div class="quiz-ficha-notas">'
        + '<h4>' + escapar(t('notasHistoricas')) + '</h4>'
        + '<p>' + escapar(notas.join(' · ')) + '</p>'
        + '</div>';
    }
    html += pintarEnlacesPostura(postura);
    html += '<div class="quiz-ficha-acciones">'
      + '<button type="button" class="quiz-btn primario" data-accion="explorar-postura" data-postura="'
      + escapar(postura.id) + '">'
      + escapar(t('quizExplorarPostura')) + '</button>'
      + '</div>';
    html += '</article>';
    return html;
  }

  function pintarReporte(estado) {
    var especificas = posturasEspecificas(estado);
    var idsEspecificas = {};
    especificas.forEach(function (item) {
      if (item && item.postura) idsEspecificas[item.postura.id] = true;
    });
    var camino = posturasDelCamino(estado).filter(function (item) {
      return item && item.postura && !idsEspecificas[item.postura.id];
    });
    var tradicionesExactas = [];
    especificas.forEach(function (item) {
      tradicionesDePostura(item.postura, estado.datos).forEach(function (nombre) {
        if (tradicionesExactas.indexOf(nombre) === -1) tradicionesExactas.push(nombre);
      });
    });
    var cercanas = [];
    Object.keys(estado.datos.traditions_index || {}).forEach(function (nombre) {
      if (tradicionesExactas.indexOf(nombre) !== -1) return;
      var score = coincidenciasTradicion(estado, nombre);
      if (score.comunes < 2) return;
      cercanas.push({ nombre: nombre, score: score });
    });
    cercanas.sort(function (a, b) {
      return b.score.porcentaje - a.score.porcentaje || b.score.comunes - a.score.comunes;
    });
    cercanas = cercanas.slice(0, 6);

    var html = '<div class="quiz-escena quiz-reporte">'
      + '<header class="quiz-cabecera">'
      + '<p class="quiz-progreso">' + escapar(t('quizReporteTitulo')) + '</p>'
      + '</header>'
      + '<div class="quiz-reporte-cuerpo">'
      + '<p class="quiz-reporte-intro">' + escapar(t('quizReporteIntro')) + '</p>'
      + '<div class="quiz-reporte-columnas">'
      + '<div class="quiz-reporte-principal">';

    html += '<section class="quiz-especificas"><h3 class="quiz-etiqueta">'
      + escapar(t('quizPosturasEspecificas')) + '</h3>';
    if (especificas.length) {
      html += '<div class="quiz-especificas-lista">';
      especificas.forEach(function (item) {
        html += pintarFichaPostura(estado, item, 'quiz-hero-postura');
      });
      html += '</div>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinPosturaNombrada')) + '</p>';
    }
    html += '</section>';

    html += '<section class="quiz-tarjeta"><h3>'
      + escapar(t('quizReligionesEncaje')) + '</h3>';
    if (tradicionesExactas.length) {
      html += '<ul class="quiz-chips">'
        + tradicionesExactas.map(function (n) {
          return '<li><button type="button" class="quiz-chip-btn" data-accion="explorar-tradicion" data-tradicion="'
            + escapar(n) + '" title="' + escapar(t('quizExplorarTradicion')) + '">'
            + escapar(n) + '</button></li>';
        }).join('')
        + '</ul>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinReligion')) + '</p>';
    }
    html += '</section>';

    html += '<section class="quiz-tarjeta"><h3>'
      + escapar(t('quizReligionesCercanas')) + '</h3>';
    if (cercanas.length) {
      html += '<ul class="quiz-cercanas">';
      cercanas.forEach(function (item) {
        html += '<li><div><strong>' + escapar(item.nombre) + '</strong>'
          + '<span>' + escapar(t('quizCoincidencias')) + ': '
          + item.score.comunes + '/' + item.score.total
          + ' (' + item.score.porcentaje + '%)</span></div>'
          + '<div class="quiz-barra"><span style="width:'
          + item.score.porcentaje + '%"></span></div>'
          + '<button type="button" class="quiz-btn-mini" data-accion="explorar-tradicion" data-tradicion="'
          + escapar(item.nombre) + '">'
          + escapar(t('quizExplorarTradicion')) + '</button></li>';
      });
      html += '</ul>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinReligion')) + '</p>';
    }
    html += '</section>';

    html += '<div class="quiz-reporte-acciones">'
      + '<button type="button" class="quiz-btn" data-accion="reiniciar-quiz">'
      + escapar(t('quizOtraVez')) + '</button>'
      + '</div>'
      + '</div>'; // principal

    html += '<aside class="quiz-reporte-lateral">'
      + '<section class="quiz-tarjeta quiz-camino-section"><h3>'
      + escapar(t('quizPosturasCamino')) + '</h3>';
    if (camino.length) {
      html += '<div class="quiz-camino-fichas">';
      camino.forEach(function (item, indice) {
        html += '<div class="quiz-camino-ficha">'
          + '<p class="quiz-paso">' + escapar(t('quizPasoCamino', { n: String(indice + 1) })) + '</p>'
          + pintarFichaPostura(estado, item, 'quiz-camino-cuerpo')
          + '</div>';
      });
      html += '</div>';
    } else {
      html += '<p class="quiz-vacio">' + escapar(t('quizSinPosturaNombrada')) + '</p>';
    }
    html += '</section></aside>'
      + '</div></div></div>'; // columnas, cuerpo, escena

    raiz.innerHTML = html;
    if (deps && deps.pintarDefiniciones) deps.pintarDefiniciones(raiz);
    hidratarMarkdown();
  }

  function aplicarRevelacion() {
    if (!raiz) return;
    var escena = raiz.querySelector('.quiz-escena');
    if (escena) escena.classList.toggle('revelar-adelantos', revelarAdelantos);
    Array.prototype.forEach.call(raiz.querySelectorAll('.quiz-spoiler'), function (el) {
      el.setAttribute('aria-hidden', revelarAdelantos ? 'false' : 'true');
    });
    var control = raiz.querySelector('[data-accion="revelar"]');
    if (control) control.checked = revelarAdelantos;
  }

  function alCambiar(evento) {
    if (!evento.target) return;
    var accion = evento.target.getAttribute('data-accion');
    if (accion === 'revelar') {
      revelarAdelantos = !!evento.target.checked;
      aplicarRevelacion();
      return;
    }
    if (accion === 'modo-seleccion') {
      modoSeleccion = !!evento.target.checked;
      preguntaElegida = null;
      if (modoSeleccion) marcarPromptSimplificadoRespondido();
      if (deps && deps.estado) pintarEscena(deps.estado);
      return;
    }
  }

  function alClick(evento) {
    if (!deps || !deps.estado) return;
    if (evento.target && evento.target.closest
      && evento.target.closest('.quiz-revelar')) {
      evento.stopPropagation();
      return;
    }
    var estado = deps.estado;
    if (estado.panelAbierto) {
      var opcionBloqueada = evento.target.closest
        ? evento.target.closest('.quiz-opcion') : null;
      if (opcionBloqueada) return;
    }
    var sinRespuesta = evento.target.closest
      ? evento.target.closest('[data-accion="sin-respuesta"]') : null;
    if (sinRespuesta) {
      var qidSin = sinRespuesta.getAttribute('data-pregunta') || raiz.dataset.pregunta;
      if (!qidSin) return;
      historialPreguntas.push(qidSin);
      preguntaElegida = null;
      estado.marcarSinRespuesta(qidSin);
      return;
    }
    var elegir = evento.target.closest ? evento.target.closest('[data-elegir-pregunta]') : null;
    if (elegir) {
      preguntaElegida = elegir.getAttribute('data-elegir-pregunta');
      mostrandoReporte = false;
      pintarEscena(estado);
      return;
    }
    var opcion = evento.target.closest ? evento.target.closest('.quiz-opcion') : null;
    if (opcion) {
      var clave = opcion.getAttribute('data-clave');
      var qid = opcion.getAttribute('data-pregunta') || raiz.dataset.pregunta;
      if (!qid || !clave) return;
      historialPreguntas.push(qid);
      preguntaElegida = null;
      estado.responder(qid, clave);
      return;
    }
    var boton = evento.target.closest ? evento.target.closest('[data-accion]') : null;
    if (!boton) return;
    var accion = boton.getAttribute('data-accion');
    if (accion === 'cambiar-rama') {
      preguntaElegida = null;
      pintarEscena(estado);
      return;
    }
    if (accion === 'vista-simplificada-si') {
      var pendientesPrompt = preguntasPendientes(estado);
      registrarRespuestaPrompt(pendientesPrompt, true);
      pintarEscena(estado);
      return;
    }
    if (accion === 'vista-simplificada-no') {
      var pendientesRechazo = preguntasPendientes(estado);
      registrarRespuestaPrompt(pendientesRechazo, false);
      pintarEscena(estado);
      return;
    }
    if (accion === 'atras') {
      var anterior = historialPreguntas.pop();
      preguntaElegida = null;
      if (anterior) {
        if (estado.ramasSinRespuesta && estado.ramasSinRespuesta[anterior]) {
          delete estado.ramasSinRespuesta[anterior];
          estado.emitir('respuesta');
        } else {
          estado.borrarRespuesta(anterior);
        }
      }
      return;
    }
    if (accion === 'arbol') {
      if (deps.fijarRecorrido) deps.fijarRecorrido('indagatorio');
      return;
    }
    if (accion === 'explorar-postura') {
      var pid = boton.getAttribute('data-postura');
      if (pid && deps.explorarEnArbol) deps.explorarEnArbol({ posturaId: pid });
      return;
    }
    if (accion === 'explorar-tradicion') {
      var trad = boton.getAttribute('data-tradicion');
      if (trad && deps.explorarEnArbol) deps.explorarEnArbol({ tradicion: trad });
      return;
    }
    if (accion === 'reiniciar-quiz') {
      historialPreguntas = [];
      preguntaElegida = null;
      modoSeleccion = false;
      mostrandoReporte = false;
      Object.keys(estado.respuestas).forEach(function (qid) {
        delete estado.respuestas[qid];
      });
      estado.ramasSinRespuesta = {};
      estado.superpuestas = {};
      estado.rutasExploradas = {};
      estado.posturasExploradasCuestionario = [];
      estado.emitir('respuesta');
    }
  }

  function sembrarHistorial(estado) {
    if (historialPreguntas.length) return;
    var respuestas = estado.respuestasEfectivas();
    var orden = Object.keys(respuestas).sort(function (a, b) {
      return Number(String(a).slice(1)) - Number(String(b).slice(1));
    });
    historialPreguntas = orden.slice();
  }

  var _marcaSeleccionPanel = '';

  var Cuestionario = {
    montar: function (opciones) {
      deps = opciones || {};
      raiz = document.getElementById('modo-cuestionario');
      if (!raiz) {
        raiz = document.createElement('div');
        raiz.id = 'modo-cuestionario';
        raiz.hidden = true;
        document.getElementById('aplicacion').appendChild(raiz);
      }
      raiz.addEventListener('click', alClick);
      raiz.addEventListener('change', alCambiar);
    },

    sincronizar: function (estado) {
      if (!raiz) return;
      var activo = estado.divulgacion === 'cuestionario';
      document.body.classList.toggle('en-cuestionario', activo);
      document.body.classList.toggle('quiz-panel-creencias', activo && estado.panelAbierto);
      raiz.hidden = !activo;
      raiz.setAttribute('aria-hidden', activo ? 'false' : 'true');
      if (!activo) return;
      var marcaPanel = estado.panelAbierto
        ? estado.posturasSueltas.slice().sort().join(',')
        : (estado.posturasExploradasCuestionario || []).slice().sort().join('|');
      if (marcaPanel !== _marcaSeleccionPanel) {
        preguntaElegida = null;
        modoSeleccion = false;
        _marcaSeleccionPanel = marcaPanel;
      }
      sembrarHistorial(estado);
      var pendientes = preguntasPendientes(estado);
      if (mostrandoReporte && !pendientes.length) {
        pintarReporte(estado);
        return;
      }
      mostrandoReporte = false;
      pintarEscena(estado);
    },

    reiniciarHistorial: function () {
      historialPreguntas = [];
      preguntaElegida = null;
      modoSeleccion = false;
      mostrandoReporte = false;
    }
  };

  Arbol.Cuestionario = Cuestionario;

})(window);
