/* Medición de texto, composición de las cajas y layout jerárquico por niveles
   (Sugiyama simplificado: rangos por camino más largo, orden por mediana y
   coordenadas X por regresión isotónica). Todo en coordenadas de mundo; la
   cámara solo aplica una matriz sobre el <g> raíz, así que el SVG conserva su
   nitidez a cualquier zoom. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});

  var PILA = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

  var F_BANDA = '600 13px ' + PILA;
  var F_TITULO = '700 15px ' + PILA;
  var F_TIPO = '700 9.5px ' + PILA;
  var F_COLOQUIAL = '400 14px ' + PILA;
  var F_FORMAL = 'italic 400 12.5px ' + PILA;
  var F_BOTON = '600 12.5px ' + PILA;
  var F_CHIP = '600 12px ' + PILA;
  var F_TRADICION = '500 11px ' + PILA;
  var F_NOTA = 'italic 400 11.5px ' + PILA;

  var ANCHO_TARJETA = 344;
  var ANCHO_PREGUNTA = 326;
  var ANCHO_BASE_MIN = 176;
  var ANCHO_BASE_MAX = 320;
  var ANCHO_TERMINAL_MIN = 208;

  var PAD_X = 14;
  var PAD_INF = 14;
  var ALTO_BANDA = 32;
  var ALTO_BANDA_EJE = 28;
  var ALTO_TIPO = 18;
  var LH_TITULO = 20;
  var LH_COLOQUIAL = 19;
  var LH_FORMAL = 17;
  var LH_NOTA = 16;
  var ALTO_BOTON = 32;
  var GAP_BOTON = 8;
  var ALTO_CHIP_RESPUESTA = 26;
  var ALTO_CHIP_TRADICION = 22;
  var GAP_CHIP = 6;

  var GAP_X = 40;
  var SEP_RANGO = 82;

  var lienzoMedida = document.createElement('canvas');
  var ctxMedida = lienzoMedida.getContext('2d');
  var cacheAncho = new Map();

  function medir(texto, fuente) {
    var clave = fuente + '::' + texto;
    var guardado = cacheAncho.get(clave);
    if (guardado !== undefined) return guardado;
    ctxMedida.font = fuente;
    var ancho = ctxMedida.measureText(texto).width;
    if (cacheAncho.size < 20000) cacheAncho.set(clave, ancho);
    return ancho;
  }

  function envolver(texto, fuente, anchoMax, maxLineas) {
    if (!texto) return [];
    var palabras = String(texto).split(/\s+/).filter(Boolean);
    var lineas = [];
    var actual = '';
    for (var i = 0; i < palabras.length; i++) {
      var candidata = actual ? actual + ' ' + palabras[i] : palabras[i];
      if (actual && medir(candidata, fuente) > anchoMax) {
        lineas.push(actual);
        actual = palabras[i];
        if (maxLineas && lineas.length === maxLineas) { actual = ''; break; }
      } else {
        actual = candidata;
      }
    }
    if (actual) lineas.push(actual);
    if (maxLineas && lineas.length >= maxLineas) {
      var recortado = lineas.length > maxLineas || actual === '';
      lineas = lineas.slice(0, maxLineas);
      if (recortado || i < palabras.length) {
        var ultima = lineas[lineas.length - 1];
        while (ultima && medir(ultima + '…', fuente) > anchoMax) {
          ultima = ultima.replace(/\s*\S$/, '');
        }
        lineas[lineas.length - 1] = (ultima || '').replace(/[\s,;.]+$/, '') + '…';
      }
    }
    return lineas;
  }

  function recortar(texto, fuente, anchoMax) {
    if (!texto) return '';
    if (medir(texto, fuente) <= anchoMax) return texto;
    var corte = texto;
    while (corte.length > 1 && medir(corte + '…', fuente) > anchoMax) {
      corte = corte.slice(0, -1);
    }
    return corte.replace(/\s+$/, '') + '…';
  }

  function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(maximo, valor));
  }

  function rotuloPostura(postura) {
    if (!postura) return '';
    if (postura.is_unnamed) {
      return (Arbol.I18n && Arbol.I18n.idioma === 'en') ? '(unnamed)' : '(sin nombre)';
    }
    return dato('p.' + postura.id + '.label', postura.label);
  }

  function anchoRotuloTipo(rotulo) {
    return medir(rotulo, F_TIPO) + rotulo.length;
  }

  function reservaDerecha(cuantasTradiciones) {
    return 30 + Math.min(cuantasTradiciones, 4) * 9;
  }

  function empaquetar(elementos, anchoDisponible, gap) {
    var filas = [];
    var fila = [];
    var x = 0;
    elementos.forEach(function (elemento) {
      if (fila.length && x + elemento.ancho > anchoDisponible) {
        filas.push(fila);
        fila = [];
        x = 0;
      }
      elemento.x = x;
      fila.push(elemento);
      x += elemento.ancho + gap;
    });
    if (fila.length) filas.push(fila);
    return filas;
  }

  function partesBotones(pregunta, anchoInterno, y, partes) {
    var botones = (pregunta.answers || []).map(function (respuestaPosible) {
      var texto = dato('q.' + pregunta.id + '.' + respuestaPosible.key + '.label',
        respuestaPosible.label);
      var glosa = respuestaPosible.gloss
        ? dato('q.' + pregunta.id + '.' + respuestaPosible.key + '.gloss', respuestaPosible.gloss)
        : null;
      var ancho = Math.max(58, medir(texto, F_BOTON) + 26);
      return {
        ancho: ancho,
        clave: respuestaPosible.key,
        texto: texto,
        glosa: glosa
      };
    });
    var filas = empaquetar(botones, anchoInterno, GAP_BOTON);
    var altoBotones = filas.length * ALTO_BOTON + Math.max(0, filas.length - 1) * GAP_BOTON;
    partes.push({ k: 'botones', y: y, alto: altoBotones, filas: filas });
    return y + altoBotones;
  }

  function tUI(clave, respaldo) {
    return (Arbol.I18n && Arbol.I18n.t) ? Arbol.I18n.t(clave) : respaldo;
  }

  function dato(clave, original) {
    return (Arbol.I18n && Arbol.I18n.dato) ? Arbol.I18n.dato(clave, original) : original;
  }

  function textosPregunta(pregunta) {
    return {
      formal: dato('q.' + pregunta.id + '.formal', pregunta.formal_text),
      coloquial: pregunta.colloquial_hint
        ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
        : ''
    };
  }

  function partesPreguntaDestacada(pregunta, anchoInterno, y, partes) {
    var textos = textosPregunta(pregunta);
    if (textos.coloquial) {
      var lineasCol = envolver(textos.coloquial, F_COLOQUIAL, anchoInterno, 3);
      partes.push({ k: 'coloquial', y: y, lineas: lineasCol, lh: LH_COLOQUIAL });
      y += lineasCol.length * LH_COLOQUIAL + 5;
    }
    var lineasF = envolver(textos.formal, F_FORMAL, anchoInterno, 7);
    partes.push({ k: 'formal', y: y, lineas: lineasF, lh: LH_FORMAL });
    return y + lineasF.length * LH_FORMAL;
  }

  function parteExpandir(nodo, contexto, anchoInterno, y, partes) {
    if (!nodo.salidas || !nodo.salidas.length) return y;
    var expandido = !!(contexto.expandidos && contexto.expandidos.has(nodo.id));
    var texto = expandido ? tUI('ocultarRamas', '▾ Ocultar ramas')
      : tUI('mostrarRamas', '▸ Mostrar ramas');
    partes.push({
      k: 'expandir', y: y, alto: ALTO_BOTON,
      texto: texto, expandido: expandido, nodoId: nodo.id,
      ancho: Math.min(anchoInterno, Math.max(148, medir(texto, F_BOTON) + 28))
    });
    return y + ALTO_BOTON;
  }

  function componerCuerpoPregunta(pregunta, respuesta, anchoInterno, y, partes, contexto, nodo) {
    var exploracion = contexto && contexto.divulgacion === 'exploracion';
    if (exploracion) {
      y = partesPreguntaDestacada(pregunta, anchoInterno, y, partes);
      y += 10;
      return parteExpandir(nodo, contexto, anchoInterno, y, partes);
    }

    var enRecorrido = !contexto || !contexto.caminoUsuario
      || contexto.divulgacion === 'completo'
      || contexto.caminoUsuario.has(nodo.id);
    if (contexto && contexto.divulgacion === 'cuestionario' && !enRecorrido) {
      var textosFuera = textosPregunta(pregunta);
      var textoFuera = textosFuera.coloquial || textosFuera.formal;
      var lineasFuera = envolver(textoFuera,
        textosFuera.coloquial ? F_COLOQUIAL : F_FORMAL, anchoInterno, 4);
      partes.push({
        k: textosFuera.coloquial ? 'coloquial' : 'formal',
        y: y, lineas: lineasFuera,
        lh: textosFuera.coloquial ? LH_COLOQUIAL : LH_FORMAL
      });
      return y + lineasFuera.length * (textosFuera.coloquial ? LH_COLOQUIAL : LH_FORMAL);
    }

    if (respuesta == null) {
      y = partesPreguntaDestacada(pregunta, anchoInterno, y, partes);
      y += 12;
      return partesBotones(pregunta, anchoInterno, y, partes);
    }

    var textosCortos = textosPregunta(pregunta);
    var usaColoquial = !!textosCortos.coloquial;
    var fuenteCorta = usaColoquial ? F_COLOQUIAL : F_FORMAL;
    var alturaCorta = usaColoquial ? LH_COLOQUIAL : LH_FORMAL;
    var lineasCortas = envolver(
      usaColoquial ? textosCortos.coloquial : textosCortos.formal,
      fuenteCorta, anchoInterno, usaColoquial ? 3 : 2
    );
    partes.push({
      k: usaColoquial ? 'coloquial' : 'formal',
      y: y, lineas: lineasCortas, lh: alturaCorta
    });
    y += lineasCortas.length * alturaCorta + 10;
    return partesBotones(pregunta, anchoInterno, y, partes);
  }

  function componerChipsTradiciones(postura, anchoInterno) {
    return (postura.traditions || []).map(function (tradicion) {
      var texto = recortar(tradicion.name, F_TRADICION, anchoInterno - 18);
      return {
        ancho: medir(texto, F_TRADICION) + 18,
        texto: texto,
        nombre: tradicion.name,
        tentativa: tradicion.is_tentative
      };
    });
  }

  function componer(nodo, respuesta, contexto, anclado) {
    var partes = [];
    var datos = contexto.datos;
    var y = 0;
    var ancho;
    var anchoInterno;
    var sangria = anclado ? 26 : 0;
    var exploracion = contexto && contexto.divulgacion === 'exploracion';

    if (nodo.tipo === 'tarjeta' && nodo.pregunta) {
      ancho = ANCHO_TARJETA;
      anchoInterno = ancho - PAD_X * 2;
      var tradicionesTarjeta = (nodo.postura && nodo.postura.traditions) || [];
      var rotuloTarjeta = nodo.postura && nodo.postura.is_root
        ? tUI('origen', 'ORIGEN') : tUI('postura', 'POSTURA');
      var saltoTarjeta = anchoRotuloTipo(rotuloTarjeta) + 10;
      partes.push({
        k: 'banda', y: 0, alto: ALTO_BANDA,
        texto: recortar(rotuloPostura(nodo.postura), F_BANDA,
          anchoInterno - sangria - saltoTarjeta - reservaDerecha(tradicionesTarjeta.length)),
        rotulo: rotuloTarjeta,
        desplazamiento: saltoTarjeta,
        sangria: sangria,
        sinNombre: !!(nodo.postura && nodo.postura.is_unnamed),
        tradiciones: tradicionesTarjeta
      });
      y = ALTO_BANDA + 12;
      y = componerCuerpoPregunta(nodo.pregunta, respuesta, anchoInterno, y, partes, contexto, nodo);
      y += PAD_INF;

    } else if (nodo.tipo === 'pregunta') {
      ancho = ANCHO_PREGUNTA;
      anchoInterno = ancho - PAD_X * 2;
      var origenes = (nodo.pregunta.origin_posture_ids || []).map(function (pid) {
        return rotuloPostura(datos.postures[pid]);
      });
      var rotuloEje = nodo.pregunta.is_convergence
        ? tUI('convergencia', 'CONVERGENCIA') : tUI('eje', 'EJE');
      var saltoEje = anchoRotuloTipo(rotuloEje) + 10;
      partes.push({
        k: 'banda', y: 0, alto: ALTO_BANDA_EJE,
        texto: recortar(origenes.join('  &  '), F_BANDA,
          anchoInterno - sangria - saltoEje - reservaDerecha(0)),
        rotulo: rotuloEje,
        desplazamiento: saltoEje,
        sangria: sangria,
        convergencia: !!nodo.pregunta.is_convergence,
        sinNombre: false,
        tradiciones: []
      });
      y = ALTO_BANDA_EJE + 12;
      y = componerCuerpoPregunta(nodo.pregunta, respuesta, anchoInterno, y, partes, contexto, nodo);
      y += PAD_INF;

    } else {
      var etiqueta = rotuloPostura(nodo.postura);
      var chips = [];
      var esBase = nodo.tipo === 'postura';
      var maximo = esBase ? ANCHO_BASE_MAX : ANCHO_TARJETA;
      var minimo = esBase ? ANCHO_BASE_MIN : ANCHO_TERMINAL_MIN;
      var anchoDeseado = medir(etiqueta, F_TITULO) + PAD_X * 2;
      if (!esBase && nodo.postura && (nodo.postura.traditions || []).length) {
        anchoDeseado = Math.max(anchoDeseado, 268);
      }
      ancho = limitar(Math.ceil(anchoDeseado), minimo, maximo);
      anchoInterno = ancho - PAD_X * 2;
      y = 12;
      partes.push({
        k: 'tipo', y: y, sangria: sangria,
        texto: esBase ? tUI('posturaVarios', 'POSTURA · VARIOS EJES') : tUI('postura', 'POSTURA')
      });
      y += ALTO_TIPO;
      var lineasTitulo = envolver(etiqueta, F_TITULO, anchoInterno, 4);
      partes.push({
        k: 'titulo', y: y, lineas: lineasTitulo, lh: LH_TITULO,
        sinNombre: !!(nodo.postura && nodo.postura.is_unnamed)
      });
      y += lineasTitulo.length * LH_TITULO;
      chips = componerChipsTradiciones(nodo.postura || {}, anchoInterno);
      if (chips.length) {
        y += 9;
        var filasChips = empaquetar(chips, anchoInterno, GAP_CHIP);
        var altoChips = filasChips.length * ALTO_CHIP_TRADICION
          + (filasChips.length - 1) * GAP_CHIP;
        partes.push({ k: 'chips', y: y, alto: altoChips, filas: filasChips });
        y += altoChips;
      }
      var notas = (nodo.postura && nodo.postura.notes) || [];
      if (notas.length) {
        y += 7;
        var lineasNota = envolver(notas.join(' · '), F_NOTA, anchoInterno, 3);
        partes.push({ k: 'nota', y: y, lineas: lineasNota, lh: LH_NOTA });
        y += lineasNota.length * LH_NOTA;
      }
      if (exploracion && nodo.salidas && nodo.salidas.length) {
        y += 10;
        y = parteExpandir(nodo, contexto, anchoInterno, y, partes);
      }
      y += PAD_INF;
    }

    return { ancho: ancho, alto: Math.round(y), partes: partes, padX: PAD_X };
  }

  var cacheComposicion = new Map();

  function componerConCache(nodo, respuesta, contexto) {
    var anclado = !!(contexto.fijados
      && Object.prototype.hasOwnProperty.call(contexto.fijados, nodo.id));
    var expandido = !!(contexto.expandidos && contexto.expandidos.has(nodo.id));
    var clave = nodo.id + '|' + (respuesta == null ? '' : respuesta)
      + (anclado ? '|a' : '') + '|' + (contexto.divulgacion || '')
      + (expandido ? '|e' : '')
      + '|' + ((nodo.postura && nodo.postura.label) || '')
      + (contexto.caminoUsuario && contexto.caminoUsuario.has(nodo.id) ? '|c' : '')
      + '|' + ((Arbol.I18n && Arbol.I18n.idioma) || 'es');
    var guardado = cacheComposicion.get(clave);
    if (guardado) return guardado;
    var compuesto = componer(nodo, respuesta, contexto, anclado);
    cacheComposicion.set(clave, compuesto);
    return compuesto;
  }

  function limpiarCache() {
    cacheComposicion.clear();
    cacheAncho.clear();
  }

  function regresionIsotonica(deseados) {
    var valores = [];
    var pesos = [];
    var conteos = [];
    for (var i = 0; i < deseados.length; i++) {
      var valor = deseados[i];
      var peso = 1;
      var conteo = 1;
      while (valores.length && valores[valores.length - 1] > valor) {
        var v = valores.pop();
        var p = pesos.pop();
        var c = conteos.pop();
        valor = (valor * peso + v * p) / (peso + p);
        peso += p;
        conteo += c;
      }
      valores.push(valor);
      pesos.push(peso);
      conteos.push(conteo);
    }
    var salida = [];
    for (i = 0; i < valores.length; i++) {
      for (var j = 0; j < conteos[i]; j++) salida.push(valores[i]);
    }
    return salida;
  }

  function colocarFila(fila, deseados, tamanos, posiciones) {
    var desplazamientos = [];
    var acumulado = 0;
    fila.forEach(function (id) {
      desplazamientos.push(acumulado);
      acumulado += tamanos.get(id).ancho + GAP_X;
    });
    var ajustados = deseados.map(function (valor, indice) {
      return valor - desplazamientos[indice];
    });
    var resueltos = regresionIsotonica(ajustados);
    fila.forEach(function (id, indice) {
      posiciones.get(id).x = resueltos[indice] + desplazamientos[indice];
    });
  }

  function mediana(valores) {
    if (!valores.length) return null;
    var orden = valores.slice().sort(function (a, b) { return a - b; });
    var medio = Math.floor(orden.length / 2);
    if (orden.length % 2) return orden[medio];
    return (orden[medio - 1] + orden[medio]) / 2;
  }

  function calcular(grafo, visibles, aristasIds, tamanos, fijados) {
    var salidas = new Map();
    var entradas = new Map();
    visibles.forEach(function (id) { salidas.set(id, []); entradas.set(id, []); });

    aristasIds.forEach(function (aristaId) {
      var arista = grafo.aristas.get(aristaId);
      if (!arista || !salidas.has(arista.desde) || !entradas.has(arista.hasta)) return;
      salidas.get(arista.desde).push(arista.hasta);
      entradas.get(arista.hasta).push(arista.desde);
    });

    var pendientes = new Map();
    entradas.forEach(function (lista, id) { pendientes.set(id, lista.length); });
    var rango = new Map();
    var cola = [];
    grafo.raices.forEach(function (id) {
      if (visibles.has(id) && pendientes.get(id) === 0) cola.push(id);
    });
    visibles.forEach(function (id) {
      if (pendientes.get(id) === 0 && cola.indexOf(id) === -1) cola.push(id);
    });
    cola.forEach(function (id) { rango.set(id, 0); });

    var topologico = [];
    for (var i = 0; i < cola.length; i++) {
      var actual = cola[i];
      topologico.push(actual);
      salidas.get(actual).forEach(function (destino) {
        rango.set(destino, Math.max(rango.get(destino) || 0, rango.get(actual) + 1));
        pendientes.set(destino, pendientes.get(destino) - 1);
        if (pendientes.get(destino) === 0) cola.push(destino);
      });
    }
    visibles.forEach(function (id) {
      if (!rango.has(id)) { rango.set(id, 0); topologico.push(id); }
    });

    var ordenInicial = [];
    var vistos = new Set();
    function recorrer(id) {
      if (vistos.has(id)) return;
      vistos.add(id);
      ordenInicial.push(id);
      salidas.get(id).forEach(recorrer);
    }
    grafo.raices.forEach(function (id) { if (visibles.has(id)) recorrer(id); });
    topologico.forEach(recorrer);

    var maxRango = 0;
    rango.forEach(function (valor) { maxRango = Math.max(maxRango, valor); });
    var porRango = [];
    for (var r = 0; r <= maxRango; r++) porRango.push([]);
    ordenInicial.forEach(function (id) { porRango[rango.get(id)].push(id); });

    function indices(fila) {
      var mapa = new Map();
      fila.forEach(function (id, indice) { mapa.set(id, indice); });
      return mapa;
    }
    for (var paso = 0; paso < 6; paso++) {
      var haciaAbajo = paso % 2 === 0;
      for (var nivel = 1; nivel <= maxRango; nivel++) {
        var r2 = haciaAbajo ? nivel : maxRango - nivel;
        var vecinaFila = porRango[haciaAbajo ? r2 - 1 : r2 + 1];
        if (!vecinaFila || !vecinaFila.length) continue;
        var posicionVecina = indices(vecinaFila);
        var fila = porRango[r2];
        var claves = new Map();
        fila.forEach(function (id, indice) {
          var vecinos = (haciaAbajo ? entradas.get(id) : salidas.get(id))
            .map(function (v) { return posicionVecina.has(v) ? posicionVecina.get(v) : null; })
            .filter(function (v) { return v !== null; });
          var m = mediana(vecinos);
          claves.set(id, m === null ? indice : m);
        });
        fila.sort(function (a, b) {
          var diferencia = claves.get(a) - claves.get(b);
          return diferencia !== 0 ? diferencia : 0;
        });
      }
    }

    var posiciones = new Map();
    visibles.forEach(function (id) { posiciones.set(id, { x: 0, y: 0 }); });

    var alturaRango = porRango.map(function (fila) {
      return fila.reduce(function (maximo, id) {
        return Math.max(maximo, tamanos.get(id).alto);
      }, 0);
    });
    var acumuladoY = 0;
    var yPorRango = alturaRango.map(function (altura) {
      var valor = acumuladoY;
      acumuladoY += altura + SEP_RANGO;
      return valor;
    });
    visibles.forEach(function (id) { posiciones.get(id).y = yPorRango[rango.get(id)]; });

    porRango.forEach(function (fila) {
      var x = 0;
      fila.forEach(function (id) {
        posiciones.get(id).x = x;
        x += tamanos.get(id).ancho + GAP_X;
      });
    });

    for (paso = 0; paso < 12; paso++) {
      var abajo = paso % 2 === 0;
      for (var indiceRango = 0; indiceRango <= maxRango; indiceRango++) {
        var rangoActual = abajo ? indiceRango : maxRango - indiceRango;
        var filaActual = porRango[rangoActual];
        if (!filaActual.length) continue;
        var deseados = filaActual.map(function (id) {
          var vecinos = abajo ? entradas.get(id) : salidas.get(id);
          if (!vecinos.length) return posiciones.get(id).x;
          var suma = vecinos.reduce(function (total, vecino) {
            return total + posiciones.get(vecino).x + tamanos.get(vecino).ancho / 2;
          }, 0);
          return suma / vecinos.length - tamanos.get(id).ancho / 2;
        });
        colocarFila(filaActual, deseados, tamanos, posiciones);
      }
    }

    var raizVisible = grafo.raices.filter(function (id) { return visibles.has(id); })[0];
    if (raizVisible) {
      var desplazamiento = posiciones.get(raizVisible).x + tamanos.get(raizVisible).ancho / 2;
      visibles.forEach(function (id) { posiciones.get(id).x -= desplazamiento; });
    }

    var anclados = topologico.filter(function (id) { return fijados[id]; });
    anclados.forEach(function (id) {
      var actualPos = posiciones.get(id);
      if (!actualPos) return;
      var deltaX = fijados[id].x - actualPos.x;
      var deltaY = fijados[id].y - actualPos.y;
      var conjunto = new Set([id]);
      topologico.forEach(function (candidato) {
        if (conjunto.has(candidato)) return;
        var padres = entradas.get(candidato);
        if (!padres.length || fijados[candidato]) return;
        var todosDentro = padres.every(function (padre) { return conjunto.has(padre); });
        if (todosDentro) conjunto.add(candidato);
      });
      conjunto.forEach(function (miembro) {
        var punto = posiciones.get(miembro);
        punto.x += deltaX;
        punto.y += deltaY;
      });
    });

    var disposicion = new Map();
    visibles.forEach(function (id) {
      var punto = posiciones.get(id);
      var tamano = tamanos.get(id);
      disposicion.set(id, {
        x: Math.round(punto.x),
        y: Math.round(punto.y),
        ancho: tamano.ancho,
        alto: tamano.alto,
        rango: rango.get(id)
      });
    });
    return disposicion;
  }

  Arbol.Layout = {
    PILA: PILA,
    fuentes: {
      banda: F_BANDA, titulo: F_TITULO, tipo: F_TIPO, formal: F_FORMAL,
      coloquial: F_COLOQUIAL, boton: F_BOTON, chip: F_CHIP,
      tradicion: F_TRADICION, nota: F_NOTA
    },
    alturas: {
      chipTradicion: ALTO_CHIP_TRADICION, chipRespuesta: ALTO_CHIP_RESPUESTA,
      boton: ALTO_BOTON, gapBoton: GAP_BOTON, gapChip: GAP_CHIP
    },
    medir: medir,
    envolver: envolver,
    recortar: recortar,
    rotuloPostura: rotuloPostura,
    componer: componerConCache,
    limpiarCache: limpiarCache,
    calcular: calcular
  };

})(window);
