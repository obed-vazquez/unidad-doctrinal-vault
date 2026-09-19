/* Modo Edición: composición, pintado y controles exclusivos de esta vista.
   Se carga como script clásico y no altera el resto de los recorridos. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var NS = 'http://www.w3.org/2000/svg';
  var XHTML = 'http://www.w3.org/1999/xhtml';

  var ANCHO_DEF = 380;
  var ANCHO_MIN = 240;
  var ANCHO_MAX = 640;
  var PAD_X = 14;
  var PAD_INF = 12;
  var ALTO_BANDA = 32;
  var ALTO_PIE = 30;
  var ALTO_SECCION = 18;
  var GAP = 8;
  var ANCHO_ICONO_RAMA = 26;
  var GAP_ICONO_RAMA = 4;
  var ALTO_CONTROL_MAS = 48;
  var ANCHO_CONTROL_MAS = 48;
  var ANCHO_CONTROL_EJE = 48;
  var ALTO_CONTROL_EJE = 48;
  var PAD_REGION_TOP = 16;
  var PAD_REGION_BOT = 10;
  var PAD_REGION_X = 8;
  var UMBRAL_LOD = 0.74;
  var F_CAMPO = '400 12.5px "Segoe UI", system-ui, sans-serif';
  var LH_CAMPO = 18;

  var ALIAS = {
    traditions: 'Religiones',
    notes: 'Notas',
    wikilinks: 'Enlaces',
    formal_text: 'Pregunta formal',
    colloquial_hint: 'Pregunta coloquial'
  };

  function etiquetaCampo(campo) {
    if (campo === 'traditions') return tUI('aliasReligiones', 'Religiones');
    if (campo === 'notes') return tUI('aliasNotas', 'Notas');
    if (campo === 'wikilinks') return tUI('aliasEnlaces', 'Enlaces');
    if (campo === 'formal_text') return tUI('aliasFormal', 'Pregunta formal');
    if (campo === 'colloquial_hint') return tUI('aliasColoquial', 'Pregunta coloquial');
    return ALIAS[campo] || campo;
  }

  var CAMPOS_POSTURA = ['traditions'];
  var CAMPOS_PREGUNTA = ['colloquial_hint'];

  var focoPendiente = null;
  var wrapAlFrente = null;
  var seguimientoEtiquetas = false;
  var omitirRestaurar = false;
  var campoActivo = null;
  var popupActivo = null;
  var reenganche = null;
  var resizeActivo = null;
  var anclasSesion = {};
  var enlacePadre = null;
  var UMBRAL_DESLIZ_PX = 36;

  function lay() { return Arbol.Layout; }

  function tUI(clave, respaldo) {
    if (!(Arbol.I18n && Arbol.I18n.t)) return respaldo;
    var texto = Arbol.I18n.t(clave);
    return (!texto || texto === clave) ? respaldo : texto;
  }

  function dato(clave, original) {
    return (Arbol.I18n && Arbol.I18n.dato) ? Arbol.I18n.dato(clave, original) : original;
  }

  function plano(texto) {
    return Arbol.Formato ? Arbol.Formato.plano(texto) : texto;
  }

  function crearSVG(nombre, atributos, clase) {
    var el = document.createElementNS(NS, nombre);
    if (clase) el.setAttribute('class', clase);
    if (atributos) {
      Object.keys(atributos).forEach(function (a) {
        el.setAttribute(a, atributos[a]);
      });
    }
    return el;
  }

  function textoSVG(contenido, x, y, clase) {
    var el = crearSVG('text', { x: x, y: y }, clase);
    el.textContent = contenido == null ? '' : contenido;
    return el;
  }

  /* Chevron(es) de los botones de expandir/colapsar: la misma geometría de
     "chevron-down"/"chevrons-down" de Lucide (lucide.dev, MIT) —un ícono de
     librería reconocible, no una figura improvisada— referenciada como una
     cadena de coordenadas fija en su rejilla de 24×24, sin cargar la
     librería ni ninguna dependencia nueva. Mismo criterio que la papelera
     (pintarPapelera) y el resize (pintarResize): trazos a mano en vez de
     depender del glifo de una fuente. Apunta hacia abajo cuando invita a
     abrir y hacia arriba cuando la acción vigente es «ya está abierto, pulsa
     para cerrar» (se voltea con un `scale(1,-1)`, sin recalcular puntos). */
  var CHEVRON_D = 'M6 9l6 6 6-6';
  var CHEVRON_DOBLE_D = 'M7 6l5 5 5-5M7 13l5 5 5-5';
  var CHEVRON_ESCALA = 0.68;

  function chevronD(doble) {
    return doble ? CHEVRON_DOBLE_D : CHEVRON_D;
  }

  function chevronTransform(cx, cy, arriba) {
    var s = CHEVRON_ESCALA;
    return 'translate(' + cx + ',' + cy + ') scale(' + s + ',' + (arriba ? -s : s) + ') translate(-12,-12)';
  }

  function cajaSuperior(ancho, alto, radio) {
    return 'M 0 ' + radio
      + ' A ' + radio + ' ' + radio + ' 0 0 1 ' + radio + ' 0'
      + ' H ' + (ancho - radio)
      + ' A ' + radio + ' ' + radio + ' 0 0 1 ' + ancho + ' ' + radio
      + ' V ' + alto + ' H 0 Z';
  }

  function valorCampo(postura, pregunta, campo) {
    if (campo === 'traditions') return Arbol.Edits.valorTradiciones(postura || {});
    if (campo === 'notes') return Arbol.Edits.valorNotas(postura || {});
    if (campo === 'wikilinks') return Arbol.Edits.valorEnlaces(postura || {});
    if (campo === 'formal_text' && pregunta) {
      return dato('q.' + pregunta.id + '.formal', pregunta.formal_text || '');
    }
    if (campo === 'colloquial_hint' && pregunta) {
      return pregunta.colloquial_hint
        ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint) : '';
    }
    return '';
  }

  function campoPoblado(postura, pregunta, campo) {
    return !!String(valorCampo(postura, pregunta, campo) || '').trim();
  }

  function claveCampos(nodo) {
    if (nodo.posturaId) return 'p:' + nodo.posturaId;
    if (nodo.preguntaId) return 'q:' + nodo.preguntaId;
    return nodo.id;
  }

  function mapaDe(contexto, nombre) {
    if (contexto && contexto[nombre]) return contexto[nombre];
    if (contexto && contexto.estado && contexto.estado[nombre]) return contexto.estado[nombre];
    return {};
  }

  function forzadosDe(contexto, clave) {
    var lista = (mapaDe(contexto, 'editCampos')[clave]) || [];
    return lista.slice();
  }

  var medidorCampo = null;
  var cacheAltoCampo = new Map();

  function asegurarMedidorCampo() {
    if (medidorCampo && medidorCampo.isConnected) return medidorCampo;
    medidorCampo = document.createElement('textarea');
    medidorCampo.className = 'edit-campo-input';
    medidorCampo.setAttribute('aria-hidden', 'true');
    medidorCampo.tabIndex = -1;
    medidorCampo.style.cssText = 'position:fixed;left:-9999px;top:0;height:auto;min-height:0;'
      + 'overflow:hidden;visibility:hidden;pointer-events:none;';
    document.body.appendChild(medidorCampo);
    return medidorCampo;
  }

  var _perfAltoMs = 0, _perfAltoMiss = 0; // TEMP-PERF

  function altoDeTexto(valor, ancho) {
    var texto = (valor == null || String(valor) === '') ? ' ' : String(valor);
    var clave = ancho + '\0' + texto;
    var hit = cacheAltoCampo.get(clave);
    if (hit != null) return hit;
    var _t0 = performance.now(); // TEMP-PERF
    var el = asegurarMedidorCampo();
    el.style.width = Math.max(40, ancho) + 'px';
    el.value = texto;
    el.style.height = '0px';
    var h = Math.max(42, el.scrollHeight + 6);
    el.style.height = 'auto';
    if (cacheAltoCampo.size > 4000) cacheAltoCampo.clear();
    cacheAltoCampo.set(clave, h);
    _perfAltoMs += performance.now() - _t0; _perfAltoMiss++; // TEMP-PERF
    return h;
  }

  function anchoNodo(nodo, contexto) {
    var tam = mapaDe(contexto, 'editTamanos')[nodo.id];
    var w = tam && tam.w ? tam.w : ANCHO_DEF;
    return Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, w));
  }

  /* -------------------------------------------------------- composición -- */

  function componer(nodo, contexto) {
    if (nodo.tipo === 'control-mas') {
      return {
        ancho: ANCHO_CONTROL_MAS, alto: ALTO_CONTROL_MAS,
        partes: [{ k: 'controlMas', y: 0, alto: ALTO_CONTROL_MAS }],
        padX: 0
      };
    }
    if (nodo.tipo === 'control-eje') {
      return {
        ancho: ANCHO_CONTROL_EJE, alto: ALTO_CONTROL_EJE,
        partes: [{ k: 'controlEje', y: 0, alto: ALTO_CONTROL_EJE }],
        padX: 0
      };
    }

    var partes = [];
    var ancho = anchoNodo(nodo, contexto);
    var anchoInterno = ancho - PAD_X * 2;
    var postura = nodo.postura;
    var pregunta = nodo.pregunta;
    var y = 0;
    var datos = contexto.datos;
    var clave = claveCampos(nodo);
    var forzados = forzadosDe(contexto, clave);

    var rotulo = '';
    var titulo = '';
    var esPostura = !!postura;
    if (postura) {
      var nEjes = (postura.question_axes || []).length;
      rotulo = nodo.tipo === 'postura' && nEjes > 1
        ? tUI('posturaVarios', 'POSTURA · VARIOS EJES')
        : (postura.is_root ? tUI('origen', 'ORIGEN') : tUI('postura', 'POSTURA'));
      titulo = postura.is_unnamed ? '' : lay().rotuloPostura(postura);
    } else if (pregunta) {
      var origenes = (pregunta.origin_posture_ids || []).map(function (pid) {
        return lay().rotuloPostura(datos.postures[pid]);
      });
      rotulo = pregunta.is_convergence
        ? tUI('convergencia', 'CONVERGENCIA') : tUI('eje', 'EJE');
      titulo = origenes.join('  &  ');
    }

    partes.push({
      k: 'editBanda', y: 0, alto: ALTO_BANDA,
      rotulo: rotulo,
      titulo: titulo,
      placeholder: tUI('placeholderNombre', 'Nombre de la postura…'),
      posturaId: postura ? postura.id : null,
      esPostura: esPostura,
      // Rótulo del lienzo SVG: sin marcas de énfasis (ver js/formato.js).
      lodTitulo: esPostura
        ? (titulo || tUI('unnamed', '(sin nombre)'))
        : plano(pregunta && pregunta.colloquial_hint
          ? dato('q.' + pregunta.id + '.coloquial', pregunta.colloquial_hint)
          : (pregunta ? dato('q.' + pregunta.id + '.formal', pregunta.formal_text || '') : titulo))
    });
    y = ALTO_BANDA + 10;

    if (postura) {
      CAMPOS_POSTURA.forEach(function (campo) {
        var visible = campoPoblado(postura, null, campo) || forzados.indexOf(campo) !== -1;
        if (!visible) return;
        var valor = valorCampo(postura, null, campo);
        var alto = altoDeTexto(valor, anchoInterno);
        partes.push({
          k: 'editCampo', y: y, alto: alto, campo: campo,
          etiqueta: etiquetaCampo(campo), valor: valor,
          posturaId: postura.id, preguntaId: null, ancho: anchoInterno,
          nombres: campo === 'traditions' ? nombresDeTradiciones(postura) : null
        });
        y += alto + GAP;
      });
    }

    if (postura && pregunta && nodo.tipo === 'tarjeta') {
      var regionY = y;
      var idxRegion = partes.length;
      partes.push({
        k: 'editRegion', y: regionY, alto: 0,
        etiqueta: tUI('ejeIntegrado', 'Eje integrado')
      });
      var innerY = regionY + PAD_REGION_TOP;
      var anchoRegion = anchoInterno - PAD_REGION_X * 2;
      innerY = empujarCamposPregunta(partes, pregunta, anchoRegion, innerY, forzados, true,
        PAD_X + PAD_REGION_X);
      partes[idxRegion].alto = innerY - regionY + PAD_REGION_BOT;
      y = regionY + partes[idxRegion].alto + GAP;
    } else if (pregunta) {
      y = empujarCamposPregunta(partes, pregunta, anchoInterno, y, forzados, false, PAD_X);
    }

    y += 6;
    var faltantes = camposFaltantes(postura, pregunta, nodo, forzados);
    var tieneSalidasReales = (nodo.salidas || []).some(function (a) {
      return a.tipo !== 'control';
    });
    /* Los dos botones (nivel y todo) comparten el mismo estado abierto/
       cerrado: no hay una bandera aparte que pueda desincronizarse de lo
       que se ve en pantalla (ver spec, corrección posterior). */
    var expandido = !!(contexto.expandidos && contexto.expandidos.has(nodo.id));
    var tam = mapaDe(contexto, 'editTamanos')[nodo.id];
    var altoContenido = Math.round(y + ALTO_PIE + PAD_INF);
    var altoMin = tam && tam.h ? tam.h : 0;
    var alto = Math.max(altoContenido, altoMin);
    var pieY = alto - PAD_INF - ALTO_PIE;

    partes.push({
      k: 'editPie', y: pieY, alto: ALTO_PIE,
      campos: faltantes,
      clave: clave,
      expandido: expandido,
      expandidoTotal: expandido,
      nodoId: nodo.id,
      xDerecha: anchoInterno - 26,
      anchoInterno: anchoInterno,
      tieneAgregar: faltantes.length > 0,
      tieneRama: tieneSalidasReales
    });
    partes.push({ k: 'editPapelera', y: 6, nodoId: nodo.id });
    if (postura) {
      partes.push({
        k: 'editConverger', y: 6, nodoId: nodo.id,
        tipoConverger: 'postura', posturaId: postura.id
      });
    } else if (pregunta) {
      partes.push({
        k: 'editConverger', y: 6, nodoId: nodo.id,
        tipoConverger: 'pregunta', preguntaId: pregunta.id
      });
    }
    partes.push({
      k: 'editResize', y: alto - 16, ancho: ancho, nodoId: nodo.id,
      hMin: altoContenido
    });
    partes.push({
      k: 'editLod', ancho: ancho, alto: alto,
      texto: (partes[0] && partes[0].lodTitulo) || titulo || rotulo
    });

    return { ancho: ancho, alto: alto, padX: PAD_X, partes: partes };
  }

  function empujarCamposPregunta(partes, pregunta, anchoInterno, y, forzados, integrado, xCampo) {
    var formal = valorCampo(null, pregunta, 'formal_text');
    var altoF = altoDeTexto(formal, anchoInterno);
    partes.push({
      k: 'editCampo', y: y, alto: altoF, campo: 'formal_text',
      etiqueta: etiquetaCampo('formal_text'), valor: formal,
      posturaId: null, preguntaId: pregunta.id, ancho: anchoInterno,
      x: xCampo, integrado: integrado
    });
    y += altoF + GAP;
    var colVisible = campoPoblado(null, pregunta, 'colloquial_hint')
      || forzados.indexOf('colloquial_hint') !== -1;
    if (colVisible) {
      var col = valorCampo(null, pregunta, 'colloquial_hint');
      var altoC = altoDeTexto(col, anchoInterno);
      partes.push({
        k: 'editCampo', y: y, alto: altoC, campo: 'colloquial_hint',
        etiqueta: etiquetaCampo('colloquial_hint'), valor: col,
        posturaId: null, preguntaId: pregunta.id, ancho: anchoInterno,
        x: xCampo, integrado: integrado
      });
      y += altoC + GAP;
    }
    return y;
  }

  function camposFaltantes(postura, pregunta, nodo, forzados) {
    var out = [];
    if (postura) {
      CAMPOS_POSTURA.forEach(function (campo) {
        if (!campoPoblado(postura, null, campo) && forzados.indexOf(campo) === -1) {
          out.push(campo);
        }
      });
    }
    if (pregunta && !campoPoblado(null, pregunta, 'colloquial_hint')
      && forzados.indexOf('colloquial_hint') === -1) {
      out.push('colloquial_hint');
    }
    return out;
  }

  /* ------------------------------------------------------------ pintado -- */

  function pintarParte(grupo, parte, ancho, padX, nodo) {
    if (parte.k === 'editBanda') pintarBanda(grupo, parte, ancho, padX);
    else if (parte.k === 'editCampo') pintarCampo(grupo, parte, padX);
    else if (parte.k === 'editPie') pintarPie(grupo, parte, padX);
    else if (parte.k === 'editRegion') pintarRegion(grupo, parte, ancho);
    else if (parte.k === 'editPapelera') pintarPapelera(grupo, parte, ancho);
    else if (parte.k === 'editConverger') pintarConverger(grupo, parte);
    else if (parte.k === 'editResize') pintarResize(grupo, parte);
    else if (parte.k === 'editLod') pintarLod(grupo, parte);
    else if (parte.k === 'controlMas') pintarControlMas(grupo, ancho);
    else if (parte.k === 'controlEje') pintarControlEje(grupo, parte, ancho, padX);
  }

  function pintarBanda(grupo, parte, ancho, padX) {
    grupo.appendChild(crearSVG('path',
      { d: cajaSuperior(ancho, parte.alto, 12) }, 'nodo-encabezado-fondo'));
    grupo.appendChild(crearSVG('line',
      { x1: 0, y1: parte.alto, x2: ancho, y2: parte.alto }, 'nodo-separador'));

    var fo = document.createElementNS(NS, 'foreignObject');
    fo.setAttribute('x', padX);
    fo.setAttribute('y', 0);
    fo.setAttribute('width', Math.max(60, ancho - padX * 2 - 28));
    fo.setAttribute('height', parte.alto);
    fo.setAttribute('class', 'edit-fo edit-banda-fo');
    var wrap = document.createElement('div');
    wrap.setAttribute('xmlns', XHTML);
    wrap.className = 'edit-banda-wrap';
    var leyenda = document.createElement('span');
    leyenda.className = 'edit-banda-leyenda';
    leyenda.textContent = parte.rotulo || '';
    wrap.appendChild(leyenda);
    if (parte.esPostura && parte.posturaId) {
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-titulo-input';
      input.value = parte.titulo;
      input.placeholder = parte.placeholder;
      input.setAttribute('data-edit-titulo', parte.posturaId);
      wrap.appendChild(input);
      engancharEscape(input);
      leyenda.addEventListener('click', function () { input.focus(); });
    } else {
      var nombre = document.createElement('span');
      nombre.className = 'edit-banda-nombre';
      nombre.textContent = parte.titulo || '';
      wrap.appendChild(nombre);
    }
    fo.appendChild(wrap);
    grupo.appendChild(fo);
  }

  function pintarRegion(grupo, parte, ancho) {
    var g = crearSVG('g', {
      'data-y': parte.y,
      'data-alto': parte.alto,
      'data-etiqueta': parte.etiqueta || ''
    }, 'edit-region');
    colocarRegion(g, 8, parte.y, ancho - 16, parte.alto, parte.etiqueta || '');
    grupo.appendChild(g);
  }

  function pathRectConMuesca(x, y, w, h, r, gapL, gapR) {
    r = Math.min(r, w / 2, h / 2);
    gapL = Math.max(x + r + 2, gapL);
    gapR = Math.min(x + w - r - 2, gapR);
    if (gapR <= gapL + 4) {
      return 'M ' + (x + r) + ' ' + y
        + ' H ' + (x + w - r)
        + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r)
        + ' V ' + (y + h - r)
        + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h)
        + ' H ' + (x + r)
        + ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r)
        + ' V ' + (y + r)
        + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y
        + ' Z';
    }
    return 'M ' + gapR + ' ' + y
      + ' H ' + (x + w - r)
      + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w) + ' ' + (y + r)
      + ' V ' + (y + h - r)
      + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + w - r) + ' ' + (y + h)
      + ' H ' + (x + r)
      + ' A ' + r + ' ' + r + ' 0 0 1 ' + x + ' ' + (y + h - r)
      + ' V ' + (y + r)
      + ' A ' + r + ' ' + r + ' 0 0 1 ' + (x + r) + ' ' + y
      + ' H ' + gapL;
  }

  function colocarRegion(g, x, y, w, h, etiqueta) {
    var r = 8;
    var L = lay();
    var fuente = '600 9px ' + L.PILA;
    var tw = L.medir(etiqueta, fuente) + 10;
    var gapL = x + 12;
    var gapR = gapL + tw;
    var fondo = g.querySelector('.edit-region-fondo');
    if (!fondo) {
      fondo = crearSVG('rect', {}, 'edit-region-fondo');
      g.appendChild(fondo);
    }
    fondo.setAttribute('x', x);
    fondo.setAttribute('y', y);
    fondo.setAttribute('width', Math.max(0, w));
    fondo.setAttribute('height', Math.max(0, h));
    fondo.setAttribute('rx', r);
    var borde = g.querySelector('.edit-region-borde');
    if (!borde) {
      borde = crearSVG('path', {}, 'edit-region-borde');
      g.appendChild(borde);
    }
    borde.setAttribute('d', pathRectConMuesca(x, y, w, h, r, gapL, gapR));
    var texto = g.querySelector('.edit-region-label');
    if (!texto) {
      texto = textoSVG('', 0, 0, 'edit-region-label');
      texto.setAttribute('text-anchor', 'start');
      texto.setAttribute('dominant-baseline', 'middle');
      g.appendChild(texto);
    }
    texto.textContent = etiqueta;
    texto.setAttribute('x', gapL + 5);
    texto.setAttribute('y', y);
  }

  function pintarCampo(grupo, parte, padX) {
    var fo = document.createElementNS(NS, 'foreignObject');
    fo.setAttribute('x', parte.x != null ? parte.x : padX);
    fo.setAttribute('y', parte.y);
    fo.setAttribute('width', parte.ancho);
    fo.setAttribute('height', parte.alto);
    fo.setAttribute('class', 'edit-fo');
    var div = document.createElement('div');
    div.setAttribute('xmlns', XHTML);
    div.className = 'edit-campo' + (parte.valor ? ' tiene-valor' : '')
      + (parte.integrado ? ' integrado' : '');
    if (parte.campo === 'traditions') {
      pintarChipsReligiones(div, parte);
    } else {
      var area = document.createElement('textarea');
      area.className = 'edit-campo-input';
      area.rows = 1;
      area.value = parte.valor || '';
      area.placeholder = ' ';
      area.setAttribute('data-edit-campo', parte.campo);
      if (parte.posturaId) area.setAttribute('data-edit-postura', parte.posturaId);
      if (parte.preguntaId) area.setAttribute('data-edit-pregunta', parte.preguntaId);
      engancharEscape(area);
      var label = document.createElement('label');
      label.className = 'edit-campo-label';
      label.textContent = parte.etiqueta;
      div.appendChild(area);
      div.appendChild(label);
    }
    fo.appendChild(div);
    grupo.appendChild(fo);
  }

  function nombresDeTradiciones(postura) {
    return ((postura && postura.traditions) || []).map(function (t) {
      return t.name + (t.is_tentative ? '?' : '');
    }).filter(Boolean);
  }

  function parseChips(valor) {
    return String(valor || '').split(/[,;/]+/).map(function (parte) {
      return parte.trim();
    }).filter(Boolean);
  }

  function crearChip(nombre) {
    var chip = document.createElement('span');
    chip.className = 'edit-chip';
    chip.setAttribute('data-valor', nombre);
    var texto = document.createElement('span');
    texto.className = 'edit-chip-texto';
    texto.textContent = nombre;
    var quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'edit-chip-quitar';
    quitar.setAttribute('aria-label', 'Quitar');
    quitar.textContent = '×';
    chip.appendChild(texto);
    chip.appendChild(quitar);
    return chip;
  }

  function serializarChips(wrap) {
    var nombres = [];
    Array.prototype.forEach.call(wrap.querySelectorAll('.edit-chip'), function (chip) {
      var v = chip.getAttribute('data-valor');
      if (v) nombres.push(v);
    });
    var input = wrap.querySelector('.edit-chip-input');
    var typing = input ? String(input.value || '').trim() : '';
    if (typing) nombres.push(typing);
    return JSON.stringify(nombres);
  }

  function pintarChipsReligiones(div, parte) {
    div.classList.add('tiene-valor');
    var wrap = document.createElement('div');
    wrap.className = 'edit-chips';
    var iniciales = (parte.nombres && parte.nombres.length)
      ? parte.nombres
      : parseChips(parte.valor);
    iniciales.forEach(function (nombre) {
      wrap.appendChild(crearChip(nombre));
    });
    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-chip-input';
    input.setAttribute('data-edit-campo', parte.campo);
    if (parte.posturaId) input.setAttribute('data-edit-postura', parte.posturaId);
    input.setAttribute('aria-label', parte.etiqueta);
    wrap.appendChild(input);
    engancharEscape(input);
    var label = document.createElement('label');
    label.className = 'edit-campo-label';
    label.textContent = parte.etiqueta;
    div.appendChild(wrap);
    div.appendChild(label);

    function emitir() {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    function comprometer() {
      var crudo = String(input.value || '').trim();
      if (!crudo) return;
      wrap.insertBefore(crearChip(crudo), input);
      input.value = '';
      emitir();
    }
    function extraerCompletos() {
      var crudo = String(input.value || '');
      if (!/[,;]/.test(crudo)) return false;
      var partes = crudo.split(/[,;]+/);
      var resto = /[,;]\s*$/.test(crudo) ? '' : partes.pop();
      var hubo = false;
      partes.forEach(function (p) {
        p = String(p || '').trim();
        if (!p) return;
        wrap.insertBefore(crearChip(p), input);
        hubo = true;
      });
      input.value = resto == null ? '' : String(resto).replace(/^\s+/, '');
      return hubo;
    }
    input.addEventListener('keydown', function (evento) {
      if (evento.key === 'Enter') {
        evento.preventDefault();
        evento.stopPropagation();
        var hubo = extraerCompletos();
        var resto = String(input.value || '').trim();
        comprometer();
        if (hubo && !resto) emitir();
      } else if (evento.key === 'Backspace' && !input.value) {
        var chips = wrap.querySelectorAll('.edit-chip');
        var ultimo = chips[chips.length - 1];
        if (ultimo) {
          ultimo.parentNode.removeChild(ultimo);
          emitir();
        }
      }
    });
    input.addEventListener('input', function () {
      if (extraerCompletos()) emitir();
    });
    input.addEventListener('compositionend', function () {
      if (extraerCompletos()) emitir();
    });
    wrap.addEventListener('pointerdown', function (evento) {
      if (evento.target.closest && evento.target.closest('.edit-chip-quitar')) {
        evento.preventDefault();
      }
    });
    wrap.addEventListener('click', function (evento) {
      var btn = evento.target.closest ? evento.target.closest('.edit-chip-quitar') : null;
      if (!btn) {
        if (evento.target === wrap) input.focus();
        return;
      }
      evento.preventDefault();
      evento.stopPropagation();
      var chip = btn.closest('.edit-chip');
      if (chip && chip.parentNode) chip.parentNode.removeChild(chip);
      input.focus();
      emitir();
    });
  }

  function valorWidget(el) {
    if (!el) return '';
    var wrap = el.closest ? el.closest('.edit-chips') : null;
    if (wrap) return serializarChips(wrap);
    return el.value;
  }

  function pintarPie(grupo, parte, padX) {
    var g = crearSVG('g', {
      transform: 'translate(0,' + parte.y + ')',
      'data-y': parte.y
    }, 'edit-pie-grupo edit-sigue-alto');
    if (parte.tieneAgregar) {
      var reserva = parte.tieneRama ? (ANCHO_ICONO_RAMA * 2 + GAP_ICONO_RAMA + 10) : 0;
      var anchoAg = parte.anchoInterno - reserva;
      var ag = crearSVG('g', {
        'data-edit-control': 'agregar',
        'data-edit-campos': parte.campos.join(','),
        'data-edit-clave': parte.clave || ''
      }, 'edit-agregar');
      ag.appendChild(crearSVG('rect', {
        x: padX, y: 0, width: anchoAg, height: parte.alto, rx: 8
      }, 'edit-agregar-caja'));
      ag.appendChild(textoSVG('+', padX + 16, parte.alto / 2, 'edit-agregar-mas'));
      ag.appendChild(textoSVG(tUI('agregarCampo', 'Agregar campo'),
        padX + 28, parte.alto / 2, 'edit-agregar-texto'));
      g.appendChild(ag);
    }
    if (parte.tieneRama) {
      /* «Todo» va en el extremo derecho de la tarjeta (el sitio más buscado
         para la acción más fuerte); el nivel simple queda a su izquierda. */
      var xNivel = parte.xDerecha - ANCHO_ICONO_RAMA - GAP_ICONO_RAMA;
      var rama = crearSVG('g', {
        'data-edit-control': 'rama',
        'data-edit-expandir': parte.nodoId,
        'data-control': 'expandir'
      }, 'edit-rama' + (parte.expandido ? ' expandido' : ''));
      rama.appendChild(crearSVG('rect', {
        x: padX + xNivel, y: 2,
        width: ANCHO_ICONO_RAMA, height: 26, rx: 6
      }, 'edit-rama-caja'));
      rama.appendChild(crearSVG('path', {
        d: chevronD(false), transform: chevronTransform(padX + xNivel + 13, 15, parte.expandido)
      }, 'edit-rama-icono'));
      g.appendChild(rama);

      var ramaTodo = crearSVG('g', {
        'data-edit-control': 'ramaTodo',
        'data-edit-expandir-todo': parte.nodoId,
        'data-control': 'expandir-todo'
      }, 'edit-rama-todo' + (parte.expandidoTotal ? ' expandido' : ''));
      ramaTodo.appendChild(crearSVG('rect', {
        x: padX + parte.xDerecha, y: 2,
        width: ANCHO_ICONO_RAMA, height: 26, rx: 6
      }, 'edit-rama-todo-caja'));
      ramaTodo.appendChild(crearSVG('path', {
        d: chevronD(true), transform: chevronTransform(padX + parte.xDerecha + 13, 15, parte.expandidoTotal)
      }, 'edit-rama-todo-icono'));
      g.appendChild(ramaTodo);
    }
    grupo.appendChild(g);
  }

  function pintarLod(grupo, parte) {
    var g = crearSVG('g', {}, 'edit-lod-titulo');
    g.setAttribute('data-texto', parte.texto || '');
    rellenarLod(g, parte.texto || '', parte.ancho, parte.alto);
    grupo.appendChild(g);
  }

  function rellenarLod(g, texto, ancho, alto) {
    while (g.firstChild) g.removeChild(g.firstChild);
    var encaje = encajarTituloLod(texto, ancho, alto);
    var i;
    for (i = 0; i < encaje.lineas.length; i++) {
      var nodoTexto = textoSVG(encaje.lineas[i], ancho / 2,
        encaje.y0 + i * encaje.lh, 'edit-lod-linea');
      nodoTexto.setAttribute('text-anchor', 'middle');
      nodoTexto.setAttribute('font-size', String(encaje.size));
      nodoTexto.setAttribute('font-weight', '700');
      g.appendChild(nodoTexto);
    }
  }

  function partirLineasLod(texto, fuente, anchoMax) {
    var L = lay();
    var palabras = String(texto || '').split(/\s+/).filter(Boolean);
    if (!palabras.length) return [''];
    var lineas = [];
    var actual = '';

    function trocear(palabra) {
      var out = [];
      var resto = palabra;
      while (resto && L.medir(resto, fuente) > anchoMax) {
        var lo = 1;
        var hi = resto.length;
        while (lo < hi) {
          var mid = Math.ceil((lo + hi) / 2);
          if (L.medir(resto.slice(0, mid), fuente) <= anchoMax) lo = mid;
          else hi = mid - 1;
        }
        if (lo < 1) lo = 1;
        out.push(resto.slice(0, lo));
        resto = resto.slice(lo);
      }
      if (resto) out.push(resto);
      return out.length ? out : [palabra];
    }

    palabras.forEach(function (palabra) {
      var piezas = L.medir(palabra, fuente) > anchoMax ? trocear(palabra) : [palabra];
      piezas.forEach(function (pieza) {
        var candidata = actual ? actual + ' ' + pieza : pieza;
        if (actual && L.medir(candidata, fuente) > anchoMax) {
          lineas.push(actual);
          actual = pieza;
        } else {
          actual = candidata;
        }
      });
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  function encajarTituloLod(texto, ancho, alto) {
    var pad = 12;
    var maxW = Math.max(16, ancho - pad * 2);
    var maxH = Math.max(16, alto - pad * 2);
    var L = lay();
    var hi = Math.min(maxW * 0.28, maxH * 0.34, 36);
    var lo = 7;
    var mejor = { size: lo, lineas: partirLineasLod(texto, '700 ' + lo + 'px ' + L.PILA, maxW) };
    var n;
    for (n = 0; n < 18; n++) {
      var size = (lo + hi) / 2;
      var fuente = '700 ' + size + 'px ' + L.PILA;
      var lineas = partirLineasLod(texto, fuente, maxW);
      var lh = size * 1.15;
      if (lineas.length * lh <= maxH + 0.5) {
        mejor = { size: size, lineas: lineas, lh: lh };
        lo = size;
      } else {
        hi = size;
      }
    }
    if (!mejor.lh) mejor.lh = mejor.size * 1.15;
    mejor.y0 = pad + (maxH - mejor.lineas.length * mejor.lh) / 2 + mejor.lh / 2;
    return mejor;
  }

  function pintarPapelera(grupo, parte, ancho) {
    var g = crearSVG('g', {
      transform: 'translate(8,' + parte.y + ')',
      'data-edit-borrar': parte.nodoId,
      'data-edit-control': 'borrar'
    }, 'edit-papelera');
    g.appendChild(crearSVG('rect', { x: 0, y: 0, width: 22, height: 20, rx: 6 }, 'papelera-caja'));
    g.appendChild(crearSVG('path', {
      d: 'M 6 7 H 16 M 8 7 V 15 M 11 7 V 15 M 14 7 V 15 M 8.5 5 H 13.5'
    }, 'papelera-icono'));
    grupo.appendChild(g);
  }

  /* Dispara el gesto de convergencia (R1/R2 de specs/convergencias.md): en
     una pregunta, "sumar postura de origen"; en una postura, "converger con
     pregunta existente". Mismo glifo (git-merge de Lucide, MIT) en ambas,
     porque es la misma operación de datos vista desde cada extremo. */
  function pintarConverger(grupo, parte) {
    var g = crearSVG('g', {
      transform: 'translate(36,' + parte.y + ')',
      'data-edit-converger': parte.nodoId,
      'data-edit-converger-tipo': parte.tipoConverger,
      'data-edit-control': 'converger'
    }, 'edit-converger');
    g.appendChild(crearSVG('rect', { x: 0, y: 0, width: 22, height: 20, rx: 6 }, 'converger-caja'));
    var icono = crearSVG('g', {
      transform: 'translate(11,10) scale(0.6) translate(-12,-12)'
    }, 'converger-icono');
    icono.appendChild(crearSVG('circle', { cx: 18, cy: 18, r: 3 }));
    icono.appendChild(crearSVG('circle', { cx: 6, cy: 6, r: 3 }));
    icono.appendChild(crearSVG('path', { d: 'M6 21V9a9 9 0 0 0 9 9' }));
    g.appendChild(icono);
    grupo.appendChild(g);
  }

  function pintarResize(grupo, parte) {
    var g = crearSVG('g', {
      transform: 'translate(0,' + parte.y + ')',
      'data-y': parte.y,
      'data-h-min': parte.hMin || 80,
      'data-edit-control': 'resize',
      'data-edit-resize': parte.nodoId
    }, 'edit-resize edit-sigue-alto');
    g.appendChild(crearSVG('path', {
      d: 'M ' + (parte.ancho - 13) + ' 13 L ' + (parte.ancho - 3) + ' 3'
        + ' M ' + (parte.ancho - 9) + ' 13 L ' + (parte.ancho - 3) + ' 7'
    }, 'edit-resize-icono'));
    g.appendChild(crearSVG('rect', {
      x: parte.ancho - 16, y: 0, width: 16, height: 16
    }, 'edit-resize-hit'));
    grupo.appendChild(g);
  }

  function pintarControlMas(grupo, ancho) {
    var pos = crearSVG('g', {
      transform: 'translate(' + (ancho / 2) + ',' + (ancho / 2) + ')'
    }, 'control-mas-pos');
    var visual = crearSVG('g', {}, 'control-mas-visual');
    visual.appendChild(crearSVG('circle', { cx: 0, cy: 0, r: ancho / 2 - 1 }, 'control-mas-caja'));
    visual.appendChild(textoSVG('+', 0, 0, 'control-mas-plus'));
    pos.appendChild(visual);
    grupo.appendChild(pos);
  }

  function pintarControlEje(grupo, parte, ancho) {
    var pos = crearSVG('g', {
      transform: 'translate(' + (ancho / 2) + ',' + (ancho / 2) + ')'
    }, 'control-eje-pos');
    var visual = crearSVG('g', {}, 'control-eje-visual');
    visual.appendChild(crearSVG('circle', { cx: 0, cy: 0, r: ancho / 2 - 2 }, 'control-eje-caja'));
    visual.appendChild(textoSVG('+', 0, 0, 'control-eje-plus'));
    pos.appendChild(visual);
    grupo.appendChild(pos);
  }

  /* ---------------------------------------------- etiqueta de arista ---- */

  var medidorEtiqueta = null;
  var F_ETIQUETA = '400 11px ';

  function fuenteEtiqueta() {
    return F_ETIQUETA + lay().PILA;
  }

  function asegurarCapaEtiquetas() {
    var capa = document.getElementById('capa-etiquetas');
    if (capa) return capa;
    var mundo = document.getElementById('mundo');
    if (!mundo) return null;
    capa = crearSVG('g', { id: 'capa-etiquetas' });
    var asas = document.getElementById('capa-asas');
    if (asas) mundo.insertBefore(capa, asas);
    else mundo.appendChild(capa);
    return capa;
  }

  function foDeArista(aristaId, grupo) {
    var capa = document.getElementById('capa-etiquetas');
    if (capa) {
      var lista = capa.querySelectorAll('.edit-arista-fo');
      var i;
      for (i = 0; i < lista.length; i++) {
        if (lista[i].getAttribute('data-arista-fo') === aristaId) return lista[i];
      }
    }
    return grupo ? grupo.querySelector('.edit-arista-fo') : null;
  }

  function quitarEtiquetaArista(aristaId) {
    var fo = foDeArista(aristaId, null);
    if (fo) fo.remove();
  }

  function vaciarEtiquetasArista() {
    var capa = document.getElementById('capa-etiquetas');
    if (capa) while (capa.firstChild) capa.removeChild(capa.firstChild);
  }

  function asegurarMedidorEtiqueta() {
    if (medidorEtiqueta && medidorEtiqueta.isConnected) return medidorEtiqueta;
    medidorEtiqueta = document.createElement('div');
    medidorEtiqueta.setAttribute('aria-hidden', 'true');
    medidorEtiqueta.style.cssText = 'position:fixed;left:-9999px;top:0;height:auto;min-height:0;'
      + 'max-height:none;overflow:hidden;visibility:hidden;pointer-events:none;'
      + 'white-space:pre-wrap;overflow-wrap:break-word;word-break:break-word;'
      + 'box-sizing:border-box;padding:1px 4px;margin:0;'
      + 'font:' + fuenteEtiqueta() + ';line-height:15px;font-weight:400;';
    document.body.appendChild(medidorEtiqueta);
    return medidorEtiqueta;
  }

  var _perfEtiqMs = 0, _perfEtiqMiss = 0; // TEMP-PERF

  function altoBloqueEtiqueta(texto, ancho, glosa) {
    var _t0 = performance.now(); // TEMP-PERF
    var el = asegurarMedidorEtiqueta();
    el.style.font = glosa ? ('400 10px ' + lay().PILA) : fuenteEtiqueta();
    el.style.lineHeight = glosa ? '13px' : '15px';
    el.style.padding = glosa ? '0 4px 2px' : '1px 4px';
    el.style.width = Math.max(20, Math.ceil(ancho)) + 'px';
    el.textContent = texto || ' ';
    var _r = Math.max(glosa ? 13 : 17, el.scrollHeight);
    _perfEtiqMs += performance.now() - _t0; _perfEtiqMiss++; // TEMP-PERF
    return _r;
  }

  function _perfReset() { // TEMP-PERF
    _perfAltoMs = 0; _perfAltoMiss = 0; _perfEtiqMs = 0; _perfEtiqMiss = 0;
  }
  function _perfGet() { // TEMP-PERF
    return { altoMs: _perfAltoMs, altoMiss: _perfAltoMiss, etiqMs: _perfEtiqMs, etiqMiss: _perfEtiqMiss };
  }

  /* Respuestas muy cercanas se tapan la etiqueta entre sí: la que está bajo el
     puntero pasa al frente y se resalta. Va delegado en document porque los
     nodos de etiqueta se recrean en cada render, y porque traer el fo al
     frente mueve el nodo bajo el cursor y rompe el enter/leave del propio
     elemento (por eso antes el brillo se quedaba pegado al salir). */
  function limpiarEtiquetaAlFrente() {
    if (!wrapAlFrente) return;
    wrapAlFrente.classList.remove('al-frente');
    wrapAlFrente = null;
  }

  function seguirEtiquetaBajoPuntero(destino) {
    var wrap = destino && destino.closest ? destino.closest('.edit-arista-wrap') : null;
    if (wrap === wrapAlFrente) return;
    limpiarEtiquetaAlFrente();
    if (!wrap) return;
    var fo = wrap.closest('foreignObject');
    if (fo && fo.contains(document.activeElement)) return;
    wrap.classList.add('al-frente');
    wrapAlFrente = wrap;
    if (fo && fo.parentNode) fo.parentNode.appendChild(fo);
  }

  function asegurarSeguimientoEtiquetas() {
    if (seguimientoEtiquetas) return;
    seguimientoEtiquetas = true;
    document.addEventListener('pointerover', function (evento) {
      seguirEtiquetaBajoPuntero(evento.target);
    }, true);
    document.addEventListener('pointerleave', function () {
      limpiarEtiquetaAlFrente();
    }, true);
  }

  function medidasEtiquetaArista(label, gloss, vacia, enVivo) {
    var L = lay();
    var fuente = fuenteEtiqueta();
    var lh = 15;
    var padX = 8;
    var ratio = 1.65;
    var corto = String(label || '').replace(/\s+$/g, '');
    var extra = String(gloss || '').replace(/\s+$/g, '');
    if (vacia || (!corto && !extra)) return { ancho: 20, alto: 20, altoC: 0, altoG: 0 };
    var mostrarExtra = !!extra || !!enVivo;
    var ancho;
    var altoC;
    var altoG;
    var i;
    if (enVivo) {
      var renglones = (corto || ' ').split('\n');
      var maxW = 0;
      renglones.forEach(function (ln) {
        maxW = Math.max(maxW, L.medir(ln || ' ', fuente));
      });
      ancho = Math.max(32, Math.ceil(maxW) + padX + 22);
      altoC = renglones.length * lh + 2;
      if (!mostrarExtra) return { ancho: ancho, alto: altoC + 2, altoC: altoC, altoG: 0 };
      if (extra) {
        ancho = Math.max(ancho, 96);
        altoG = altoBloqueEtiqueta(extra, ancho, true);
      } else {
        ancho = Math.max(ancho, 120);
        altoG = 16;
      }
      return { ancho: ancho, alto: altoC + altoG, altoC: altoC, altoG: altoG };
    }
    if (!extra) {
      var una = L.medir(corto.replace(/\n/g, ' '), fuente);
      if (corto.indexOf('\n') < 0 && una + padX <= 140) {
        ancho = Math.max(28, Math.ceil(una) + padX + 6);
        altoC = altoBloqueEtiqueta(corto, ancho, false);
        if (ancho < altoC * ratio) ancho = Math.ceil(altoC * ratio);
        return { ancho: ancho, alto: altoC, altoC: altoC, altoG: 0 };
      }
    }
    var unaG = extra ? L.medir(extra.replace(/\n/g, ' '), '400 10px ' + L.PILA) : 0;
    var unaC = L.medir(corto.replace(/\n/g, ' ') || ' ', fuente);
    // Estimación de ancho cuadrado a partir del área total de texto (label +
    // glosa): antes esto usaba siempre el ancho de una sola línea de la
    // respuesta como piso, así que una respuesta larga sin glosa nunca
    // llegaba a partirse en varios renglones. El bucle de abajo corrige la
    // estimación si aun así queda desproporcionada.
    var area = unaC * lh + unaG * 13;
    ancho = Math.max(48, Math.ceil(Math.sqrt(ratio * area)) + padX + 6);
    altoC = altoBloqueEtiqueta(corto || ' ', ancho, false);
    altoG = extra ? altoBloqueEtiqueta(extra, ancho, true) : 0;
    for (i = 0; i < 8 && (altoC + altoG) > ancho / ratio; i++) {
      ancho = Math.min(320, Math.max(ancho + 18, Math.ceil((altoC + altoG) * ratio)));
      altoC = altoBloqueEtiqueta(corto || ' ', ancho, false);
      altoG = extra ? altoBloqueEtiqueta(extra, ancho, true) : 0;
    }
    if (ancho < (altoC + altoG) * 1.15) ancho = Math.ceil((altoC + altoG) * 1.15);
    return { ancho: ancho, alto: altoC + altoG, altoC: altoC, altoG: altoG };
  }

  function colocarEtiquetaArista(fo, caja, mx, my, tam) {
    if (caja) {
      caja.setAttribute('x', mx - tam.ancho / 2);
      caja.setAttribute('y', my - tam.alto / 2);
      caja.setAttribute('width', tam.ancho);
      caja.setAttribute('height', tam.alto);
      caja.setAttribute('rx', 2);
      caja.setAttribute('ry', 2);
    }
    if (fo) {
      fo.setAttribute('width', tam.ancho);
      fo.setAttribute('height', tam.alto);
      fo.setAttribute('x', mx - tam.ancho / 2);
      fo.setAttribute('y', my - tam.alto / 2);
    }
  }

  function corregirAnchoVivo(fo, caja, mx, my, tam) {
    var input = fo && fo.querySelector('.edit-arista-input');
    if (!input) return tam;
    var extra = input.scrollWidth - input.clientWidth;
    if (extra > 1) {
      tam = { ancho: tam.ancho + extra + 10, alto: tam.alto };
      colocarEtiquetaArista(fo, caja, mx, my, tam);
    }
    return tam;
  }

  function valoresVivosArista(fo, arista) {
    var input = fo && fo.querySelector('.edit-arista-input');
    var glosa = fo && fo.querySelector('.edit-arista-glosa');
    return {
      label: input ? String(input.value || '') : String((arista && arista.etiqueta) || ''),
      gloss: glosa ? String(glosa.value || '') : String((arista && arista.glosa) || '')
    };
  }

  function pintarEtiquetaArista(grupo, arista, mx, my) {
    var etiquetaSvg = grupo.querySelector('.arista-etiqueta-texto');
    if (etiquetaSvg) etiquetaSvg.setAttribute('display', 'none');
    var caja = grupo.querySelector('.arista-etiqueta-caja');
    var textoEtiqueta = String(arista.etiqueta || '');
    var textoGlosa = String(arista.glosa || '');
    var vacia = !textoEtiqueta.trim() && !textoGlosa.trim();
    var forzar = !!(focoPendiente && focoPendiente.arista === arista.id);
    var foExistente = foDeArista(arista.id, grupo);
    var sigueEditando = (campoActivo && foExistente && foExistente.contains(campoActivo))
      || (foExistente && foExistente.contains(document.activeElement)
        && /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName));
    var tam = medidasEtiquetaArista(textoEtiqueta, textoGlosa,
      vacia && !forzar && !sigueEditando, !!sigueEditando);
    var atenuada = grupo.classList.contains('atenuada');

    if (foExistente && sigueEditando) {
      var vivo = valoresVivosArista(foExistente, arista);
      tam = medidasEtiquetaArista(vivo.label, vivo.gloss,
        !vivo.label.trim() && !vivo.gloss.trim(), true);
      colocarEtiquetaArista(foExistente, caja, mx, my, tam);
      corregirAnchoVivo(foExistente, caja, mx, my, tam);
      foExistente.classList.toggle('atenuada', atenuada);
      return;
    }
    if (foExistente) foExistente.remove();
    colocarEtiquetaArista(null, caja, mx, my, tam);

    var capa = asegurarCapaEtiquetas();
    var fo = document.createElementNS(NS, 'foreignObject');
    fo.setAttribute('class', 'edit-fo edit-arista-fo' + (atenuada ? ' atenuada' : ''));
    fo.setAttribute('data-arista-fo', arista.id);
    colocarEtiquetaArista(fo, caja, mx, my, tam);
    var wrap = document.createElement('div');
    wrap.setAttribute('xmlns', XHTML);
    wrap.className = 'edit-arista-wrap'
      + (vacia ? ' vacia' : '')
      + (textoGlosa.trim() ? ' con-glosa' : '');
    var input = document.createElement('textarea');
    input.rows = 1;
    input.className = 'edit-arista-input';
    input.value = textoEtiqueta.replace(/\s+$/g, '');
    input.setAttribute('data-edit-arista', arista.id);
    input.setAttribute('data-edit-parte', 'label');
    input.setAttribute('data-edit-pregunta', arista.preguntaId || '');
    input.setAttribute('data-edit-clave', arista.clave || '');
    input.setAttribute('aria-label', tUI('respuestaEnLinea', 'Respuesta'));
    // rows=1 no crece con el contenido: sin esto, una respuesta larga sin
    // aclaración queda recortada a un renglón aunque la caja ya mida más.
    input.style.height = Math.max(15, tam.altoC || 0) + 'px';
    var glosa = document.createElement('textarea');
    glosa.rows = 1;
    glosa.className = 'edit-arista-glosa';
    glosa.value = textoGlosa.replace(/\s+$/g, '');
    glosa.placeholder = tUI('aclaracionRespuesta', 'Aclaración');
    glosa.setAttribute('data-edit-arista', arista.id);
    glosa.setAttribute('data-edit-parte', 'glosa');
    glosa.setAttribute('data-edit-pregunta', arista.preguntaId || '');
    glosa.setAttribute('data-edit-clave', arista.clave || '');
    glosa.setAttribute('aria-label', tUI('aclaracionRespuesta', 'Aclaración'));
    glosa.style.height = Math.max(13, tam.altoG || 0) + 'px';
    var mas = document.createElement('span');
    mas.className = 'edit-arista-ghost';
    mas.setAttribute('aria-hidden', 'true');
    mas.textContent = '+';
    wrap.appendChild(input);
    wrap.appendChild(glosa);
    wrap.appendChild(mas);
    asegurarSeguimientoEtiquetas();
    function redimensionarVivo() {
      var escrito = valoresVivosArista(fo, arista);
      wrap.classList.toggle('vacia', !escrito.label.trim() && !escrito.gloss.trim());
      wrap.classList.toggle('con-glosa', !!escrito.gloss.trim());
      var vivoTam = medidasEtiquetaArista(escrito.label, escrito.gloss,
        !escrito.label.trim() && !escrito.gloss.trim(), true);
      colocarEtiquetaArista(fo, caja, mx, my, vivoTam);
      corregirAnchoVivo(fo, caja, mx, my, vivoTam);
    }
    input.addEventListener('input', redimensionarVivo);
    glosa.addEventListener('input', redimensionarVivo);
    input.addEventListener('focus', function () {
      wrap.classList.add('escribiendo');
      input.style.height = '';
      glosa.style.height = '';
      redimensionarVivo();
    });
    glosa.addEventListener('focus', function () {
      wrap.classList.add('escribiendo');
      input.style.height = '';
      glosa.style.height = '';
      redimensionarVivo();
    });
    input.addEventListener('blur', function () { wrap.classList.remove('escribiendo'); });
    glosa.addEventListener('blur', function () { wrap.classList.remove('escribiendo'); });
    engancharEscape(input);
    engancharEscape(glosa);
    fo.appendChild(wrap);
    if (capa) capa.appendChild(fo);
    else grupo.appendChild(fo);
    // El alto se estima con un div medidor, pero quien envuelve de verdad es
    // el textarea y no corta en los mismos puntos: aquí el DOM real manda y
    // corrige lo que la estimación dejó corto. Antes esto exigía que la caja
    // ya midiera más de 22px, así que las de uno o dos renglones —las que se
    // comían palabras— nunca se corregían.
    global.requestAnimationFrame(function () {
      if (vacia || !fo.isConnected || fo.querySelector(':focus')) return;
      var extraInput = Math.max(0, input.scrollHeight - input.clientHeight);
      var extraGlosa = Math.max(0, glosa.scrollHeight - glosa.clientHeight);
      var extraH = extraInput + extraGlosa;
      if (extraH < 1) return;
      var altoActual = parseFloat(fo.getAttribute('height')) || 0;
      if (extraInput > 0) input.style.height = (input.clientHeight + extraInput) + 'px';
      if (extraGlosa > 0) glosa.style.height = (glosa.clientHeight + extraGlosa) + 'px';
      colocarEtiquetaArista(fo, caja, mx, my, {
        ancho: parseFloat(fo.getAttribute('width')),
        alto: altoActual + extraH
      });
    });
  }

  /* ---------------------------------------------- asas de reenganche ---- */

  function asegurarCapaAsas(vista) {
    var capa = document.getElementById('capa-asas');
    if (capa) return capa;
    capa = crearSVG('g', { id: 'capa-asas' });
    vista.mundo.appendChild(capa);
    return capa;
  }

  function dibujarAsas(vista) {
    var capa = asegurarCapaAsas(vista);
    var prev = capa.querySelector('.arista-reenganche-preview');
    while (capa.firstChild) capa.removeChild(capa.firstChild);
    if (!vista.contexto || vista.contexto.divulgacion !== 'edicion') {
      if (prev) capa.appendChild(prev);
      return;
    }
    var contexto = vista.contexto;
    contexto.aristasIds.forEach(function (aristaId) {
      var arista = contexto.grafo.aristas.get(aristaId);
      if (!arista || arista.tipo === 'control') return;
      var extremos = vista.anclas(arista.desde, arista.hasta, arista);
      if (!extremos) return;
      capa.appendChild(asa(arista, 'desde', extremos.desde));
      capa.appendChild(asa(arista, 'hasta', extremos.hasta));
      /* Controles de la línea de eje, en el lienzo y no dentro de la tarjeta
         (R4 y addendum de specs/convergencias.md): junto al punto de unión
         con la postura, la «x» que quita esa unión; junto al punto donde la
         flecha entra a la pregunta, el «+» que suma otra liga hacia arriba.
         Ambos aparecen por cercanía del cursor, no de forma permanente. */
      if (arista.tipo === 'eje') {
        capa.appendChild(botonQuitarEje(arista, extremos.desde, 14));
        capa.appendChild(botonSumarOrigen(arista, extremos.hasta, 14));
        /* La misma «x» también abajo, junto al «+» y al otro lado de la
           línea: quitar la unión debe poder hacerse desde cualquiera de sus
           dos extremos (addendum de specs/convergencias.md). */
        capa.appendChild(botonQuitarEje(arista, extremos.hasta, -14));
      }
    });
    if (prev) capa.appendChild(prev);
    if (ultimoPunteroLienzo) {
      actualizarProximidadLienzo(ultimoPunteroLienzo.x, ultimoPunteroLienzo.y, vista);
    }
  }

  function asa(arista, extremo, punto) {
    var g = crearSVG('g', {
      transform: 'translate(' + punto.x + ',' + punto.y + ')',
      'data-edit-asa': arista.id,
      'data-edit-extremo': extremo,
      'data-tipo': arista.tipo
    }, 'reenganche-asa');
    g.appendChild(crearSVG('circle', { r: 10 }, 'reenganche-asa-hit'));
    g.appendChild(crearSVG('circle', { r: 4.5 }, 'reenganche-asa-disco'));
    return g;
  }

  /* Sitio de un control pegado a un extremo de línea: se corre a lo largo de
     la normal (aleja de la tarjeta, siguiendo la línea) y luego de lado, para
     no taparla ni pisar el asa de reenganche. */
  function puntoControlLienzo(punto, avance, lado) {
    var nx = punto.nx || 0;
    var ny = punto.ny || 0;
    if (!nx && !ny) return { x: punto.x + lado, y: punto.y - avance };
    return {
      x: punto.x + nx * avance - ny * lado,
      y: punto.y + ny * avance + nx * lado
    };
  }

  function botonQuitarEje(arista, punto, lado) {
    var sitio = puntoControlLienzo(punto, 20, lado);
    var g = crearSVG('g', {
      transform: 'translate(' + sitio.x + ',' + sitio.y + ')',
      'data-cx': sitio.x,
      'data-cy': sitio.y,
      'data-edit-quitar-eje': arista.id,
      'data-edit-control': 'quitarEje'
    }, 'control-lienzo edit-quitar-eje');
    var visual = crearSVG('g', {}, 'control-lienzo-visual');
    visual.appendChild(crearSVG('circle', { r: 9 }, 'quitar-eje-caja'));
    visual.appendChild(crearSVG('path', {
      d: 'M -3 -3 L 3 3 M 3 -3 L -3 3'
    }, 'quitar-eje-icono'));
    g.appendChild(visual);
    return g;
  }

  /* Addendum de specs/convergencias.md: el gesto principal para converger sale
     de la propia flecha que llega a la pregunta — «+» = suma otra postura de
     origen hacia arriba. Lleva el mismo data-edit-converger que el control de
     la tarjeta, así que reusa su despacho (el id del nodo pregunta). */
  function botonSumarOrigen(arista, punto, lado) {
    var sitio = puntoControlLienzo(punto, 20, lado);
    var g = crearSVG('g', {
      transform: 'translate(' + sitio.x + ',' + sitio.y + ')',
      'data-cx': sitio.x,
      'data-cy': sitio.y,
      'data-edit-converger': arista.hasta,
      'data-edit-converger-tipo': 'pregunta',
      'data-edit-control': 'converger'
    }, 'control-lienzo edit-liga-mas');
    var visual = crearSVG('g', {}, 'control-lienzo-visual');
    visual.appendChild(crearSVG('circle', { r: 9 }, 'liga-mas-caja'));
    visual.appendChild(crearSVG('path', {
      d: 'M -3.6 0 H 3.6 M 0 -3.6 V 3.6'
    }, 'liga-mas-icono'));
    g.appendChild(visual);
    return g;
  }

  /* Los controles del lienzo (x y +) no viven dentro de una tarjeta, así que
     no pueden aparecer con el hover de una tarjeta ni esperar a que el cursor
     los pise: se revelan cuando el puntero se acerca. */
  var RADIO_PROXIMIDAD_PX = 90;
  var UMBRAL_ARRASTRE_CONVERGER = 6;
  var ultimoPunteroLienzo = null;
  var proximidadRAF = null;
  var arrastreConverger = null;

  function actualizarProximidadLienzo(clienteX, clienteY, vista) {
    var capa = document.getElementById('capa-asas');
    if (!capa || !vista || !vista.contexto || vista.contexto.divulgacion !== 'edicion') return;
    var lista = capa.querySelectorAll('.control-lienzo');
    if (!lista.length) return;
    var mundo = vista.aMundo(clienteX, clienteY);
    var k = (vista.camara && vista.camara.k) || 1;
    var radio = RADIO_PROXIMIDAD_PX / k;
    var radio2 = radio * radio;
    var i;
    for (i = 0; i < lista.length; i++) {
      var el = lista[i];
      var cx = parseFloat(el.getAttribute('data-cx'));
      var cy = parseFloat(el.getAttribute('data-cy'));
      if (isNaN(cx) || isNaN(cy)) continue;
      var dx = cx - mundo.x;
      var dy = cy - mundo.y;
      el.classList.toggle('cerca', dx * dx + dy * dy <= radio2);
    }
  }

  function seguirProximidad(evento, vista) {
    if (!vista || !vista.contexto || vista.contexto.divulgacion !== 'edicion') return;
    ultimoPunteroLienzo = { x: evento.clientX, y: evento.clientY };
    if (proximidadRAF) return;
    proximidadRAF = global.requestAnimationFrame(function () {
      proximidadRAF = null;
      if (!ultimoPunteroLienzo) return;
      actualizarProximidadLienzo(ultimoPunteroLienzo.x, ultimoPunteroLienzo.y, vista);
    });
  }

  function olvidarProximidad() {
    ultimoPunteroLienzo = null;
    var capa = document.getElementById('capa-asas');
    if (!capa) return;
    Array.prototype.forEach.call(capa.querySelectorAll('.control-lienzo.cerca'),
      function (el) { el.classList.remove('cerca'); });
  }

  /* ----------------------------------------------------- detección UI -- */

  function esEventoDeEdicion(evento) {
    if (!evento || !evento.target) return false;
    var el = evento.target;
    if (el.classList && (el.classList.contains('edit-titulo-input')
        || el.classList.contains('edit-campo-input')
        || el.classList.contains('edit-chip-input')
        || el.classList.contains('edit-arista-input')
        || el.classList.contains('edit-arista-glosa')
        || el.classList.contains('edit-arista-ghost')
        || el.classList.contains('edit-chip-quitar'))) return true;
    if (el.closest && (el.closest('.edit-fo') || el.closest('.edit-agregar')
        || el.closest('.edit-rama') || el.closest('.edit-rama-todo')
        || el.closest('.edit-papelera') || el.closest('.edit-converger')
        || el.closest('.control-lienzo')
        || el.closest('.edit-resize') || el.closest('.reenganche-asa')
        || el.closest('.tipo-control-mas') || el.closest('.tipo-control-eje'))) {
      return true;
    }
    return false;
  }

  function esTeclaEscape(evento) {
    return evento.key === 'Escape' || evento.key === 'Esc' || evento.code === 'Escape';
  }

  function esClaseCampo(el) {
    if (!el || !el.classList) return false;
    return el.classList.contains('edit-titulo-input')
      || el.classList.contains('edit-campo-input')
      || el.classList.contains('edit-chip-input')
      || el.classList.contains('edit-arista-input')
      || el.classList.contains('edit-arista-glosa');
  }

  function camposEdicion() {
    var raiz = document.getElementById('aplicacion');
    if (!raiz) return [];
    return Array.prototype.slice.call(raiz.querySelectorAll(
      '.edit-titulo-input, .edit-campo-input, .edit-chip-input, .edit-arista-input, .edit-arista-glosa'
    ));
  }

  function hayCampoEnFoco() {
    if (campoActivo && document.contains(campoActivo)) return true;
    var activo = document.activeElement;
    if (activo && /^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName) && esClaseCampo(activo)) {
      return true;
    }
    try {
      return camposEdicion().some(function (el) {
        return el.matches && el.matches(':focus');
      });
    } catch (e) {
      return false;
    }
  }

  function esClicEnCampo(evento) {
    var t = evento && evento.target;
    if (!t) return false;
    if (esClaseCampo(t) || (t.tagName === 'TEXTAREA' && esClaseCampo(t))) return true;
    if (t.classList && t.classList.contains('edit-chip-quitar')) return true;
    if (t.closest && t.closest('.edit-chip-quitar')) return true;
    return false;
  }

  function insertarSaltoLinea(el) {
    var start = el.selectionStart;
    var end = el.selectionEnd;
    var v = String(el.value || '');
    if (typeof start !== 'number') {
      el.value = v + '\n';
    } else {
      el.value = v.slice(0, start) + '\n' + v.slice(end == null ? start : end);
      try { el.setSelectionRange(start + 1, start + 1); } catch (e) { /* nada */ }
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function engancharEscape(el) {
    if (!el || el._editEsc) return;
    el._editEsc = true;
    el.addEventListener('keydown', function (evento) {
      if (esTeclaEscape(evento)) {
        evento.preventDefault();
        evento.stopPropagation();
        if (typeof evento.stopImmediatePropagation === 'function') evento.stopImmediatePropagation();
        quitarFocoCampos();
        return;
      }
      if (evento.key === 'Tab') {
        quitarFocoCampos();
        return;
      }
      if (evento.key !== 'Enter') return;
      if (evento.altKey || evento.ctrlKey) {
        if (el.tagName === 'TEXTAREA') {
          evento.preventDefault();
          evento.stopPropagation();
          insertarSaltoLinea(el);
        }
        return;
      }
      if (evento.shiftKey) return;
      if (el.classList && el.classList.contains('edit-chip-input')
          && String(el.value || '').trim()) {
        return;
      }
      evento.preventDefault();
      evento.stopPropagation();
      if (typeof evento.stopImmediatePropagation === 'function') evento.stopImmediatePropagation();
      quitarFocoCampos();
    });
  }

  function quitarFocoCampos() {
    var habia = hayCampoEnFoco();
    soltarFoco();
    camposEdicion().forEach(function (el) {
      try { el.blur(); } catch (e) { /* nada */ }
    });
    var svg = document.getElementById('lienzo');
    if (svg) {
      if (!svg.hasAttribute('tabindex')) svg.setAttribute('tabindex', '-1');
      try { svg.focus({ preventScroll: true }); } catch (e) {
        try { svg.focus(); } catch (e2) { /* nada */ }
      }
    }
    return habia;
  }

  function registrarEscapeGlobal() {
    if (registrarEscapeGlobal._hecho) return;
    registrarEscapeGlobal._hecho = true;
    global.addEventListener('keydown', function (evento) {
      if (!esTeclaEscape(evento)) return;
      var app = document.getElementById('aplicacion');
      if (!app || !app.classList.contains('modo-edicion-activo')) return;
      if (evento.target && evento.target.closest && evento.target.closest('#dialogo')) return;
      var cerro = popupCamposAbierto();
      if (cerro) cerrarPopupCampos();
      var enCampo = hayCampoEnFoco();
      if (!cerro && !enCampo) return;
      evento.preventDefault();
      evento.stopPropagation();
      if (typeof evento.stopImmediatePropagation === 'function') evento.stopImmediatePropagation();
      if (enCampo) quitarFocoCampos();
    }, true);
  }

  function registrarClicFuera() {
    if (registrarClicFuera._hecho) return;
    registrarClicFuera._hecho = true;
    document.addEventListener('pointerdown', function (evento) {
      var app = document.getElementById('aplicacion');
      if (!app || !app.classList.contains('modo-edicion-activo')) return;
      if (evento.target && evento.target.closest && evento.target.closest('#dialogo')) return;
      if (esClicEnCampo(evento)) return;
      if (!hayCampoEnFoco()) return;
      quitarFocoCampos();
    }, true);
  }

  function aplicarLod(k) {
    var app = document.getElementById('aplicacion');
    if (!app) return;
    var activo = app.classList.contains('modo-edicion-activo');
    app.classList.toggle('edit-lod', activo && k < UMBRAL_LOD);
  }

  function marcarModo(activo) {
    var app = document.getElementById('aplicacion');
    if (!app) return;
    app.classList.toggle('modo-edicion-activo', !!activo);
    if (activo) {
      registrarEscapeGlobal();
      registrarClicFuera();
    }
    if (!activo) {
      app.classList.remove('edit-lod');
      cerrarPopupCampos();
      cancelarEnlacePadre(false);
      var capa = document.getElementById('capa-asas');
      if (capa) while (capa.firstChild) capa.removeChild(capa.firstChild);
      vaciarEtiquetasArista();
    }
    ordenarCapas(!!activo);
  }

  /* ------------------------------------------------ popup agregar campo -- */

  function abrirPopupCampos(campos, x, y, alElegir) {
    cerrarPopupCampos();
    var popup = document.getElementById('edit-popup-campos');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'edit-popup-campos';
      document.getElementById('aplicacion').appendChild(popup);
    }
    popup.innerHTML = '';
    popup.classList.remove('oculto');
    popup.style.left = x + 'px';
    popup.style.top = y + 'px';
    campos.forEach(function (campo) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = etiquetaCampo(campo);
      btn.addEventListener('click', function () {
        cerrarPopupCampos();
        if (alElegir) alElegir(campo);
      });
      popup.appendChild(btn);
    });
    function fuera(evento) {
      if (!popup.contains(evento.target)) {
        cerrarPopupCampos();
        document.removeEventListener('pointerdown', fuera, true);
      }
    }
    global.setTimeout(function () {
      document.addEventListener('pointerdown', fuera, true);
    }, 10);
    popup._fuera = fuera;
    popupActivo = popup;
  }

  function popupCamposAbierto() {
    var popup = document.getElementById('edit-popup-campos');
    return !!(popup && !popup.classList.contains('oculto'));
  }

  function cerrarPopupCampos() {
    var popup = document.getElementById('edit-popup-campos');
    if (popup) {
      popup.classList.add('oculto');
      if (popup._fuera) {
        document.removeEventListener('pointerdown', popup._fuera, true);
        popup._fuera = null;
      }
    }
    popupActivo = null;
  }

  function guardarFoco(el) {
    if (omitirRestaurar || !el || !el.getAttribute) return;
    campoActivo = el;
    focoPendiente = {
      titulo: el.getAttribute('data-edit-titulo'),
      campo: el.getAttribute('data-edit-campo'),
      postura: el.getAttribute('data-edit-postura'),
      pregunta: el.getAttribute('data-edit-pregunta'),
      arista: el.getAttribute('data-edit-arista'),
      parte: el.getAttribute('data-edit-parte'),
      start: el.selectionStart,
      end: el.selectionEnd
    };
  }

  function soltarFoco() {
    focoPendiente = null;
    campoActivo = null;
    omitirRestaurar = true;
  }

  function restaurarFoco() {
    if (omitirRestaurar) {
      omitirRestaurar = false;
      focoPendiente = null;
      campoActivo = null;
      return;
    }
    var spec = focoPendiente;
    if (!spec) return;
    var el = null;
    if (spec.titulo) {
      el = document.querySelector('[data-edit-titulo="' + spec.titulo + '"]');
    } else if (spec.arista) {
      el = document.querySelector('[data-edit-arista="' + spec.arista + '"]'
        + (spec.parte ? '[data-edit-parte="' + spec.parte + '"]' : ''));
    } else if (spec.campo) {
      var sel = '[data-edit-campo="' + spec.campo + '"]';
      if (spec.postura) sel += '[data-edit-postura="' + spec.postura + '"]';
      if (spec.pregunta) sel += '[data-edit-pregunta="' + spec.pregunta + '"]';
      el = document.querySelector(sel);
    }
    if (el && el.focus) {
      el.focus();
      campoActivo = el;
      try {
        if (spec.seleccionarTodo && el.setSelectionRange) {
          var len = String(el.value || '').length;
          el.setSelectionRange(0, len);
        } else if (typeof spec.start === 'number' && el.setSelectionRange) {
          el.setSelectionRange(spec.start, spec.end == null ? spec.start : spec.end);
        }
      } catch (e) { /* nada */ }
      focoPendiente = null;
    }
  }

  function pedirFocoArista(aristaId, seleccionarTodo) {
    omitirRestaurar = false;
    focoPendiente = {
      arista: aristaId, start: 0, end: 0, seleccionarTodo: !!seleccionarTodo
    };
  }

  /* ---------------------------------------------- tooltips de ayuda ---- */

  function tooltipDeNodo(nodo, datos) {
    if (!nodo) return null;
    if (nodo.postura && datos && (nodo.postura.question_axes || []).some(function (qid) {
      var q = datos.questions[qid];
      return q && q.is_convergence;
    })) {
      return '<h4>' + escapar(tUI('posturaConvergente', 'Pregunta compartida')) + '</h4><p>'
        + escapar(tUI('posturaConvergenteDesc',
          'Uno de los ejes de esta postura lleva a una pregunta que también origina otra(s) postura(s).'))
        + '</p>';
    }
    if (nodo.tipo === 'control-mas') {
      return '<h4>+</h4><p>' + escapar(tUI('nuevoNodoDesc',
        'Crea una postura vacía como respuesta de esta pregunta. La etiqueta de la respuesta se edita en la línea.')) + '</p>';
    }
    if (nodo.tipo === 'control-eje') {
      return '<h4>' + escapar(tUI('nuevoEje', 'Nuevo eje')) + '</h4><p>'
        + escapar(tUI('nuevoEjeDesc',
          'Añade un eje de pregunta. Si la pregunta estaba integrada en la tarjeta, se extrae y el padre queda como postura.'))
        + '</p>';
    }
    if (nodo.tipo === 'tarjeta' && nodo.pregunta) {
      return '<h4>' + escapar(tUI('ejeIntegrado', 'Eje integrado')) + '</h4><p>'
        + escapar(tUI('ejeIntegradoDesc',
          'Esta tarjeta une una postura y su única pregunta. Al añadir un segundo eje, se parten en nodos distintos.'))
        + '</p>';
    }
    return null;
  }

  function tooltipDeControl(control) {
    if (!control) return null;
    var tipo = control.getAttribute('data-edit-control')
      || control.getAttribute('data-control');
    if (tipo === 'agregar') {
      return '<h4>+</h4><p>' + escapar(tUI('agregarCampoDesc',
        'Elige un campo que aún no está en la tarjeta para rellenarlo.')) + '</p>';
    }
    if (tipo === 'rama' || tipo === 'expandir') {
      return '<h4>' + escapar(tUI('mostrarRamas', 'Mostrar ramas')) + '</h4><p>'
        + escapar(tUI('ramasCompactasDesc', 'Muestra u oculta los hijos de esta tarjeta.'))
        + '</p>';
    }
    if (tipo === 'ramaTodo') {
      var activoTodo = control.classList && control.classList.contains('expandido');
      var tituloTodo = activoTodo ? tUI('colapsarRamasTodo', 'Colapsar todo')
        : tUI('expandirRamasTodo', 'Expandir todo');
      return '<h4>' + escapar(tituloTodo) + '</h4><p>'
        + escapar(tUI('ramasTodoDesc', 'Muestra u oculta todo el subárbol de esta tarjeta de una vez.'))
        + '</p>';
    }
    if (tipo === 'borrar') {
      return '<h4>' + escapar(tUI('eliminarNodo', 'Eliminar nodo')) + '</h4><p>'
        + escapar(tUI('eliminarNodoDesc',
          'Borra esta tarjeta y la rama que cuelga de ella, si no se alcanza por otro camino.'))
        + '</p>';
    }
    if (tipo === 'converger') {
      var esPreguntaConv = control.getAttribute('data-edit-converger-tipo') === 'pregunta';
      var tituloConv = esPreguntaConv ? tUI('sumarOrigen', 'Sumar postura de origen')
        : tUI('convergerPregunta', 'Converger con pregunta existente');
      var descConv = esPreguntaConv
        ? tUI('sumarOrigenDesc', 'Une esta pregunta a otra postura de origen: se vuelve compartida.')
        : tUI('convergerPreguntaDesc', 'Une esta postura, como origen adicional, a una pregunta que ya existe.');
      return '<h4>' + escapar(tituloConv) + '</h4><p>' + escapar(descConv) + '</p>';
    }
    if (tipo === 'quitarEje') {
      return '<h4>' + escapar(tUI('quitarUnion', 'Quitar unión')) + '</h4><p>'
        + escapar(tUI('quitarUnionDesc', 'Quita esta postura como origen de la pregunta. Las demás uniones quedan intactas.'))
        + '</p>';
    }
    var campo = control.getAttribute && control.getAttribute('data-edit-campo');
    if (campo) {
      return '<h4>' + escapar(etiquetaCampo(campo)) + '</h4><p>'
        + escapar(ayudaDeCampo(campo)) + '</p>';
    }
    return null;
  }

  function ayudaDeCampo(campo) {
    if (campo === 'traditions') {
      return tUI('ayudaReligiones',
        'Religiones, tradiciones o sistemas que sostienen esta postura. Separa con comas. Un ? marca adhesión tentativa.');
    }
    if (campo === 'notes') {
      return tUI('ayudaNotas', 'Notas históricas o aclaraciones del documento.');
    }
    if (campo === 'wikilinks') {
      return tUI('ayudaEnlaces', 'Enlaces a notas del vault, uno por coma.');
    }
    if (campo === 'formal_text') {
      return tUI('ayudaFormal', 'Pregunta formal: el enunciado canónico del eje.');
    }
    if (campo === 'colloquial_hint') {
      return tUI('ayudaColoquial', 'Versión coloquial, más corta, de la misma pregunta.');
    }
    return '';
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ------------------------------------- anclas en el perímetro ---- */

  function tAncla(aristaId, extremo) {
    var g = anclasSesion[aristaId];
    if (!g || g[extremo] == null) return null;
    return g[extremo];
  }

  function fijarTAncla(aristaId, extremo, t) {
    if (!anclasSesion[aristaId]) anclasSesion[aristaId] = {};
    anclasSesion[aristaId][extremo] = ((t % 1) + 1) % 1;
  }

  function olvidarAncla(aristaId) {
    if (aristaId) delete anclasSesion[aristaId];
  }

  function longitudPerimetro(caja) {
    return 2 * ((caja && caja.ancho) + (caja && caja.alto) || 0);
  }

  function tDeLado(caja, lado) {
    var w = caja.ancho;
    var h = caja.alto;
    var L = 2 * (w + h);
    if (L <= 0) return 0;
    if (lado === 'arriba') return (w / 2) / L;
    if (lado === 'derecha') return (w + h / 2) / L;
    if (lado === 'abajo') return (w + h + w / 2) / L;
    return (2 * w + h + h / 2) / L;
  }

  function puntoEnPerimetro(pos, caja, t) {
    var w = caja.ancho;
    var h = caja.alto;
    var L = 2 * (w + h);
    var d = (((t % 1) + 1) % 1) * (L || 1);
    var x = pos.x;
    var y = pos.y;
    if (d <= w) return { x: x + d, y: y, nx: 0, ny: -1 };
    d -= w;
    if (d <= h) return { x: x + w, y: y + d, nx: 1, ny: 0 };
    d -= h;
    if (d <= w) return { x: x + w - d, y: y + h, nx: 0, ny: 1 };
    d -= w;
    return { x: x, y: y + h - d, nx: -1, ny: 0 };
  }

  function proyectarBorde(pos, caja, mx, my) {
    var x = pos.x;
    var y = pos.y;
    var w = caja.ancho;
    var h = caja.alto;
    var dentro = mx >= x && mx <= x + w && my >= y && my <= y + h;
    var px;
    var py;
    if (!dentro) {
      px = Math.max(x, Math.min(x + w, mx));
      py = Math.max(y, Math.min(y + h, my));
    } else {
      var dT = my - y;
      var dB = y + h - my;
      var dL = mx - x;
      var dR = x + w - mx;
      var m = Math.min(dT, dB, dL, dR);
      if (m === dT) { px = mx; py = y; }
      else if (m === dB) { px = mx; py = y + h; }
      else if (m === dL) { px = x; py = my; }
      else { px = x + w; py = my; }
    }
    return { x: px, y: py, dentro: dentro };
  }

  function tDePunto(pos, caja, mx, my) {
    var w = caja.ancho;
    var h = caja.alto;
    var L = 2 * (w + h);
    if (L <= 0) return 0;
    var p = proyectarBorde(pos, caja, mx, my);
    var x = pos.x;
    var y = pos.y;
    var eps = 1.5;
    if (Math.abs(p.y - y) <= eps) return Math.max(0, Math.min(w, p.x - x)) / L;
    if (Math.abs(p.x - (x + w)) <= eps) return (w + Math.max(0, Math.min(h, p.y - y))) / L;
    if (Math.abs(p.y - (y + h)) <= eps) return (w + h + Math.max(0, Math.min(w, x + w - p.x))) / L;
    return (2 * w + h + Math.max(0, Math.min(h, y + h - p.y))) / L;
  }

  function distBordePantalla(vista, pos, caja, mx, my) {
    var p = proyectarBorde(pos, caja, mx, my);
    var dx = mx - p.x;
    var dy = my - p.y;
    var distMundo = Math.sqrt(dx * dx + dy * dy);
    if (p.dentro) return 0;
    return distMundo * (vista.camara && vista.camara.k ? vista.camara.k : 1);
  }

  function ladoDeNormal(pt) {
    if (!pt) return 'abajo';
    if (pt.ny < -0.5) return 'arriba';
    if (pt.ny > 0.5) return 'abajo';
    if (pt.nx > 0.5) return 'derecha';
    return 'izquierda';
  }

  function aplicarOffsetsAncla(arista, extremos, vista) {
    if (!arista || !extremos || !vista) return extremos;
    var g = anclasSesion[arista.id];
    if (!g) return extremos;
    function aplicar(extremo, id) {
      if (g[extremo] == null) return;
      var pos = vista.posiciones.get(id);
      var caja = vista.contexto && vista.contexto.disposicion.get(id);
      if (!pos || !caja) return;
      extremos[extremo] = puntoEnPerimetro(pos, caja, g[extremo]);
    }
    aplicar('desde', arista.desde);
    aplicar('hasta', arista.hasta);
    return extremos;
  }

  function ordenarCapas(encima) {
    var mundo = document.getElementById('mundo');
    if (!mundo) return;
    var nodos = document.getElementById('capa-nodos');
    var aristas = document.getElementById('capa-aristas');
    var etiquetas = document.getElementById('capa-etiquetas');
    var asas = document.getElementById('capa-asas');
    if (!nodos || !aristas) return;
    if (encima) {
      mundo.insertBefore(nodos, aristas);
      if (etiquetas) mundo.appendChild(etiquetas);
      if (asas) mundo.appendChild(asas);
    } else {
      mundo.insertBefore(aristas, nodos);
      if (etiquetas) mundo.appendChild(etiquetas);
      if (asas) mundo.appendChild(asas);
    }
  }

  function quitarPreview(vista) {
    var capa = document.getElementById('capa-asas');
    if (!capa) capa = vista && vista.mundo && vista.mundo.querySelector('#capa-asas');
    if (!capa) return;
    var prev = capa.querySelector('.arista-reenganche-preview');
    if (prev) prev.remove();
  }

  function dibujarPreview(vista, desde, hasta, invalido, copia) {
    var capa = asegurarCapaAsas(vista);
    var prev = capa.querySelector('.arista-reenganche-preview');
    if (!prev) {
      prev = crearSVG('path', {}, 'arista-reenganche-preview');
    }
    var x0 = desde.x;
    var y0 = desde.y;
    var x1 = hasta.x;
    var y1 = hasta.y;
    var dist = Math.sqrt((x1 - x0) * (x1 - x0) + (y1 - y0) * (y1 - y0));
    var tiron = Math.max(28, Math.min(150, dist * 0.42));
    var nx0 = desde.nx != null ? desde.nx : 0;
    var ny0 = desde.ny != null ? desde.ny : 0;
    var nx1 = hasta.nx != null ? hasta.nx : 0;
    var ny1 = hasta.ny != null ? hasta.ny : 0;
    if (!nx0 && !ny0 && dist) {
      ny0 = (y1 - y0) / dist;
      nx0 = (x1 - x0) / dist;
    }
    if (!nx1 && !ny1 && dist) {
      ny1 = (y0 - y1) / dist;
      nx1 = (x0 - x1) / dist;
    }
    prev.setAttribute('d', 'M ' + x0 + ' ' + y0
      + ' C ' + (x0 + nx0 * tiron) + ' ' + (y0 + ny0 * tiron)
      + ', ' + (x1 + nx1 * tiron) + ' ' + (y1 + ny1 * tiron)
      + ', ' + x1 + ' ' + y1);
    prev.classList.toggle('invalido', !!invalido);
    prev.classList.toggle('copia', !!copia && !invalido);
    capa.appendChild(prev);
  }

  function puntoAnclaNodo(vista, nodoId, haciaX, haciaY) {
    var pos = vista.posiciones.get(nodoId);
    var caja = vista.contexto && vista.contexto.disposicion.get(nodoId);
    if (!pos || !caja) return null;
    return puntoEnPerimetro(pos, caja, tDePunto(pos, caja, haciaX, haciaY));
  }

  function puntoSuperiorNodo(vista, nodoId) {
    var pos = vista.posiciones.get(nodoId);
    var caja = vista.contexto && vista.contexto.disposicion.get(nodoId);
    if (!pos || !caja) return null;
    return { x: pos.x + caja.ancho / 2, y: pos.y };
  }

  /* ---------------------------------------------- reenganche / resize -- */

  function iniciarReenganche(evento, vista) {
    if (enlacePadre) return false;
    var asaEl = evento.target && evento.target.closest
      ? evento.target.closest('.reenganche-asa') : null;
    if (!asaEl) return false;
    var arista = vista.contexto.grafo.aristas.get(asaEl.getAttribute('data-edit-asa'));
    if (!arista || arista.tipo === 'control') return false;
    var extremo = asaEl.getAttribute('data-edit-extremo');
    var nodoLocalId = extremo === 'desde' ? arista.desde : arista.hasta;
    var pos = vista.posiciones.get(nodoLocalId);
    var caja = vista.contexto.disposicion.get(nodoLocalId);
    var t0 = tAncla(arista.id, extremo);
    if (t0 == null && pos && caja) {
      var auto = vista.anclas(arista.desde, arista.hasta, arista);
      var pt = auto && auto[extremo];
      t0 = pt ? tDePunto(pos, caja, pt.x, pt.y) : tDeLado(caja, extremo === 'desde' ? 'abajo' : 'arriba');
    }
    reenganche = {
      arista: arista,
      extremo: extremo,
      vista: vista,
      nodoLocalId: nodoLocalId,
      tOriginal: t0,
      teniaOffset: tAncla(arista.id, extremo) != null,
      modo: 'slide'
    };
    vista.svg.classList.add('deslizando-ancla');
    return true;
  }

  function clasificarArrastre(evento, vista) {
    var mundo = vista.aMundo(evento.clientX, evento.clientY);
    var pos = vista.posiciones.get(reenganche.nodoLocalId);
    var caja = vista.contexto.disposicion.get(reenganche.nodoLocalId);
    var nodo = nodoBajo(evento, vista);
    if (!pos || !caja) return { modo: 'rewire', mundo: mundo, nodo: nodo };
    var dist = distBordePantalla(vista, pos, caja, mundo.x, mundo.y);
    if (dist <= UMBRAL_DESLIZ_PX || (nodo && nodo.id === reenganche.nodoLocalId)) {
      return { modo: 'slide', mundo: mundo, nodo: nodo, pos: pos, caja: caja };
    }
    return { modo: 'rewire', mundo: mundo, nodo: nodo };
  }

  function moverReenganche(evento, vista) {
    if (!reenganche) return false;
    var info = clasificarArrastre(evento, vista);
    reenganche.modo = info.modo;
    if (info.modo === 'slide') {
      quitarPreview(vista);
      marcarDestinos(vista, null, false);
      vista.svg.classList.remove('reenganchando');
      vista.svg.classList.add('deslizando-ancla');
      var t = tDePunto(info.pos, info.caja, info.mundo.x, info.mundo.y);
      fijarTAncla(reenganche.arista.id, reenganche.extremo, t);
      if (vista.dibujarAristas) vista.dibujarAristas();
      dibujarAsas(vista);
      return true;
    }
    if (reenganche.teniaOffset) {
      fijarTAncla(reenganche.arista.id, reenganche.extremo, reenganche.tOriginal);
    } else if (anclasSesion[reenganche.arista.id]) {
      delete anclasSesion[reenganche.arista.id][reenganche.extremo];
    }
    vista.svg.classList.remove('deslizando-ancla');
    vista.svg.classList.add('reenganchando');
    var fijoId = reenganche.extremo === 'desde' ? reenganche.arista.hasta : reenganche.arista.desde;
    var fijo = vista.posiciones.get(fijoId);
    var cajaFijo = vista.contexto.disposicion.get(fijoId);
    var origen = { x: info.mundo.x, y: info.mundo.y, nx: 0, ny: 0 };
    if (fijo && cajaFijo) {
      var tFijo = tAncla(reenganche.arista.id, reenganche.extremo === 'desde' ? 'hasta' : 'desde');
      origen = tFijo != null
        ? puntoEnPerimetro(fijo, cajaFijo, tFijo)
        : puntoEnPerimetro(fijo, cajaFijo, tDePunto(fijo, cajaFijo, info.mundo.x, info.mundo.y));
    }
    var valido = info.nodo && esObjetivoValido(reenganche.arista, reenganche.extremo, info.nodo,
      vista.contexto.datos);
    var libre = { x: info.mundo.x, y: info.mundo.y, nx: 0, ny: 0 };
    if (info.nodo && info.nodo.id !== reenganche.nodoLocalId) {
      var anclaDest = puntoAnclaNodo(vista, info.nodo.id, origen.x, origen.y);
      if (anclaDest) libre = anclaDest;
    }
    marcarDestinos(vista, info.nodo, valido);
    if (vista.dibujarAristas) vista.dibujarAristas();
    dibujarAsas(vista);
    /* R3 de specs/convergencias.md: con Ctrl (Win/Linux) o ⌥ Alt (Mac)
       sostenido, arrastrar el asa de origen de un eje copia la unión en vez
       de moverla. Acotado a eje+desde: es el único punto que identifica
       "qué postura origina esta pregunta", el concepto que se está
       copiando. El modificador puede alternarse en cualquier momento del
       arrastre; lo que cuenta es su estado al soltar (ver soltarReenganche). */
    reenganche.permiteCopia = reenganche.arista.tipo === 'eje' && reenganche.extremo === 'desde';
    reenganche.copia = reenganche.permiteCopia && (evento.ctrlKey || evento.altKey);
    dibujarPreview(vista, origen, libre, info.nodo ? !valido : false, reenganche.copia);
    return true;
  }

  function soltarReenganche(evento, vista, alReenganchar, alCopiarEje) {
    if (!reenganche) return false;
    var info = clasificarArrastre(evento, vista);
    var arista = reenganche.arista;
    var extremo = reenganche.extremo;
    var modo = info.modo;
    var tOrig = reenganche.tOriginal;
    var tenia = reenganche.teniaOffset;
    var permiteCopia = arista.tipo === 'eje' && extremo === 'desde';
    var copia = permiteCopia && (evento.ctrlKey || evento.altKey);
    reenganche = null;
    vista.svg.classList.remove('reenganchando', 'deslizando-ancla');
    quitarPreview(vista);
    marcarDestinos(vista, null, false);
    if (modo === 'slide') {
      var pos = info.pos || vista.posiciones.get(arista[extremo === 'desde' ? 'desde' : 'hasta']);
      var caja = info.caja || vista.contexto.disposicion.get(arista[extremo === 'desde' ? 'desde' : 'hasta']);
      if (pos && caja) {
        fijarTAncla(arista.id, extremo, tDePunto(pos, caja, info.mundo.x, info.mundo.y));
      }
      if (vista.dibujarAristas) vista.dibujarAristas();
      dibujarAsas(vista);
      return true;
    }
    if (tenia) fijarTAncla(arista.id, extremo, tOrig);
    else if (anclasSesion[arista.id]) delete anclasSesion[arista.id][extremo];
    var nodo = info.nodo;
    if (!nodo) {
      /* Copiar y soltar en el vacío no hace nada (R3): a diferencia de
         mover, no hay original que desconectar. */
      if (copia) {
        if (vista.dibujarAristas) vista.dibujarAristas();
        dibujarAsas(vista);
        return true;
      }
      olvidarAncla(arista.id);
      if (vista.opciones && vista.opciones.alDesconectar) {
        vista.opciones.alDesconectar(arista, extremo);
      }
      return true;
    }
    if (!esObjetivoValido(arista, extremo, nodo, vista.contexto.datos)) {
      if (vista.dibujarAristas) vista.dibujarAristas();
      dibujarAsas(vista);
      return true;
    }
    if (copia) {
      if (vista.dibujarAristas) vista.dibujarAristas();
      dibujarAsas(vista);
      if (alCopiarEje) alCopiarEje(arista, nodo);
      return true;
    }
    olvidarAncla(arista.id);
    if (alReenganchar) alReenganchar(arista, extremo, nodo);
    return true;
  }

  /* ---------------------------------------------- ligar padre huérfano -- */

  function hayEnlacePadre() {
    return !!enlacePadre;
  }

  function iniciarEnlacePadre(vista, spec) {
    cancelarEnlacePadre(true);
    enlacePadre = spec || {};
    enlacePadre.vista = vista;
    var app = document.getElementById('aplicacion');
    if (app) app.classList.add('enlazando-padre');
    if (vista && vista.svg) vista.svg.classList.add('enlazando-padre');
    function mover(evento) {
      if (!enlacePadre || !enlacePadre.vista) return;
      var origen = puntoSuperiorNodo(enlacePadre.vista, enlacePadre.nodoId);
      if (!origen) return;
      var mundo = enlacePadre.vista.aMundo(evento.clientX, evento.clientY);
      var nodo = nodoBajo(evento, enlacePadre.vista);
      var valido = nodo && esPadreValidoEnlace(nodo);
      var libre = { x: mundo.x, y: mundo.y, nx: 0, ny: 0 };
      if (nodo && nodo.id !== enlacePadre.nodoId) {
        var ancla = puntoAnclaNodo(enlacePadre.vista, nodo.id, origen.x, origen.y);
        if (ancla) libre = ancla;
      }
      dibujarPreview(enlacePadre.vista, origen, libre, nodo ? !valido : false);
      marcarDestinos(enlacePadre.vista, nodo, valido);
    }
    function tecla(evento) {
      if (!enlacePadre) return;
      if (evento.key === 'Escape' || evento.key === 'Esc' || evento.code === 'Escape') {
        evento.preventDefault();
        evento.stopPropagation();
        if (typeof evento.stopImmediatePropagation === 'function') evento.stopImmediatePropagation();
        cancelarEnlacePadre(false);
      }
    }
    function bloqueo(evento) {
      if (!enlacePadre) return;
      if (evento.target && evento.target.closest && evento.target.closest('#aviso')) return;
      if (evento.target && evento.target.closest && evento.target.closest('#lienzo')) return;
      evento.preventDefault();
      evento.stopPropagation();
    }
    document.addEventListener('pointermove', mover, true);
    document.addEventListener('keydown', tecla, true);
    document.addEventListener('pointerdown', bloqueo, true);
    enlacePadre._mover = mover;
    enlacePadre._tecla = tecla;
    enlacePadre._bloqueo = bloqueo;
  }

  function esPadreValidoEnlace(nodo) {
    if (!enlacePadre || !nodo || nodo.esControl) return false;
    if (nodo.id === enlacePadre.nodoId) return false;
    var datos = enlacePadre.vista && enlacePadre.vista.contexto
      ? enlacePadre.vista.contexto.datos : null;
    if (!datos) return false;
    if (enlacePadre.tipo === 'postura') {
      if (!nodo.preguntaId) return false;
      return !Arbol.Edits.seriaCicloRespuesta(datos, nodo.preguntaId, enlacePadre.posturaId);
    }
    if (enlacePadre.tipo === 'pregunta') {
      if (!nodo.posturaId || nodo.tipo === 'pregunta') return false;
      var preguntaOrigen = datos.questions[enlacePadre.preguntaId];
      if (preguntaOrigen && (preguntaOrigen.origin_posture_ids || []).indexOf(nodo.posturaId) !== -1) {
        return false;
      }
      return !Arbol.Edits.seriaCicloEje(datos, nodo.posturaId, enlacePadre.preguntaId);
    }
    /* R2: converger desde la postura — el destino debe ser una pregunta que
       todavía no sea uno de sus ejes (si ya lo es, es la misma exclusión de
       duplicados que la rama "pregunta", vista en sentido inverso). */
    if (enlacePadre.tipo === 'ejePostura') {
      if (nodo.tipo !== 'pregunta' || !nodo.preguntaId) return false;
      var posturaOrigen = datos.postures[enlacePadre.posturaId];
      if (posturaOrigen && (posturaOrigen.question_axes || []).indexOf(nodo.preguntaId) !== -1) {
        return false;
      }
      return !Arbol.Edits.seriaCicloEje(datos, enlacePadre.posturaId, nodo.preguntaId);
    }
    return false;
  }

  /* Arma el gesto desde el propio control «+», para que además de clic-clic
     funcione como arrastre: mantener pulsado y soltar sobre una postura liga,
     soltar en el vacío deja el gesto armado (como si solo se hubiera hecho
     clic). Ver addendum de specs/convergencias.md. */
  function iniciarArrastreConverger(evento, vista) {
    if (enlacePadre) return false;
    var el = evento.target && evento.target.closest
      ? evento.target.closest('[data-edit-converger]') : null;
    if (!el || !vista.opciones || !vista.opciones.alIniciarConvergencia) return false;
    /* Primero armar, después marcar el arrastre: armar pasa por
       cancelarEnlacePadre, que limpia la marca. Al revés, el pointerup de
       este mismo clic dejaba de reconocerse como «el clic que armó» y el
       gesto se cancelaba solo. */
    vista.opciones.alIniciarConvergencia(el.getAttribute('data-edit-converger'));
    if (!enlacePadre) return false;
    arrastreConverger = { inicio: { x: evento.clientX, y: evento.clientY } };
    return true;
  }

  function clicEnlacePadre(evento, vista) {
    if (!enlacePadre) return false;
    var arrastre = arrastreConverger;
    arrastreConverger = null;
    var movido = !!arrastre && (Math.abs(evento.clientX - arrastre.inicio.x)
      + Math.abs(evento.clientY - arrastre.inicio.y)) >= UMBRAL_ARRASTRE_CONVERGER;
    var nodo = nodoBajo(evento, vista || enlacePadre.vista);
    if (!nodo || !esPadreValidoEnlace(nodo)) {
      /* El pointerup que arma el gesto cae sobre el propio control: no es un
         destino fallido, solo el final del clic que lo activó. */
      if (arrastre && !movido) return true;
      if (!nodo) {
        /* Arrastrar y soltar en el vacío no cancela: queda armado, igual que
           si se hubiera hecho clic. Un clic suelto en el vacío sí cancela. */
        if (movido) return true;
        if (enlacePadre.onInvalido) enlacePadre.onInvalido();
        if (enlacePadre.cancelarEnVacio) cancelarEnlacePadre(true);
        return true;
      }
      if (enlacePadre.onInvalido) enlacePadre.onInvalido();
      return true;
    }
    var exito = enlacePadre.onExito;
    var spec = {
      tipo: enlacePadre.tipo,
      posturaId: enlacePadre.posturaId,
      preguntaId: enlacePadre.preguntaId,
      label: enlacePadre.label,
      gloss: enlacePadre.gloss,
      nodo: nodo
    };
    cancelarEnlacePadre(true);
    if (exito) exito(spec);
    return true;
  }

  function cancelarEnlacePadre(silencio) {
    var prev = enlacePadre;
    arrastreConverger = null;
    if (!prev) return;
    if (prev._mover) document.removeEventListener('pointermove', prev._mover, true);
    if (prev._tecla) document.removeEventListener('keydown', prev._tecla, true);
    if (prev._bloqueo) document.removeEventListener('pointerdown', prev._bloqueo, true);
    if (prev.vista) {
      quitarPreview(prev.vista);
      marcarDestinos(prev.vista, null, false);
      if (prev.vista.svg) prev.vista.svg.classList.remove('enlazando-padre');
    }
    var app = document.getElementById('aplicacion');
    if (app) app.classList.remove('enlazando-padre');
    enlacePadre = null;
    if (!silencio && prev.onCancelar) prev.onCancelar();
  }

  function nodoBajo(evento, vista) {
    var bajo = document.elementFromPoint(evento.clientX, evento.clientY);
    var g = bajo && bajo.closest ? bajo.closest('.nodo') : null;
    if (!g) return null;
    var id = g.getAttribute('data-id');
    var nodo = vista.contexto.grafo.nodos.get(id);
    if (!nodo || nodo.esControl) return null;
    return nodo;
  }

  function esObjetivoValido(arista, extremo, nodo, datos) {
    if (!nodo || nodo.esControl) return false;
    if (extremo === 'hasta' && nodo.id === arista.hasta) return false;
    if (extremo === 'desde' && nodo.id === arista.desde) return false;
    if (arista.tipo === 'respuesta') {
      if (extremo === 'hasta') {
        if (!nodo.posturaId) return false;
        return !Arbol.Edits.seriaCicloRespuesta(datos, arista.preguntaId, nodo.posturaId);
      }
      if (!nodo.preguntaId) return false;
      var destPid = destinoDeArista(arista, datos);
      return !Arbol.Edits.seriaCicloRespuesta(datos, nodo.preguntaId, destPid);
    }
    if (arista.tipo === 'eje') {
      var fromPid = pidDeNodoId(arista.desde);
      if (extremo === 'desde') {
        if (!nodo.posturaId || nodo.tipo === 'pregunta') return false;
        return !Arbol.Edits.seriaCicloEje(datos, nodo.posturaId, arista.preguntaId);
      }
      if (nodo.tipo !== 'pregunta' || !nodo.preguntaId) return false;
      return !Arbol.Edits.seriaCicloEje(datos, fromPid, nodo.preguntaId);
    }
    return false;
  }

  function pidDeNodoId(id) {
    if (!id) return null;
    if (id.indexOf('B:') === 0 || id.indexOf('T:') === 0) return id.slice(2);
    return null;
  }

  function destinoDeArista(arista, datos) {
    var q = datos.questions[arista.preguntaId];
    if (!q) return null;
    var a = (q.answers || []).filter(function (r) { return r.key === arista.clave; })[0];
    return a ? a.target_posture_id : null;
  }

  function marcarDestinos(vista, nodo, valido) {
    vista.nodosDOM.forEach(function (g) {
      g.classList.remove('edit-destino-valido', 'edit-destino-invalido');
    });
    if (!nodo) return;
    var g = vista.nodosDOM.get(nodo.id);
    if (g) g.classList.add(valido ? 'edit-destino-valido' : 'edit-destino-invalido');
  }

  function iniciarResize(evento, vista) {
    var el = evento.target && evento.target.closest
      ? evento.target.closest('[data-edit-resize]') : null;
    if (!el) return false;
    var id = el.getAttribute('data-edit-resize');
    var caja = vista.contexto.disposicion.get(id);
    if (!caja) return false;
    var grupo = vista.nodosDOM.get(id);
    var hMinAttr = parseFloat(el.getAttribute('data-h-min'));
    var hMin = !isNaN(hMinAttr) ? Math.max(64, hMinAttr) : 80;
    resizeActivo = {
      id: id,
      inicio: { x: evento.clientX, y: evento.clientY },
      w: caja.ancho,
      h: caja.alto,
      hMin: hMin,
      k: vista.camara.k,
      vista: vista
    };
    if (grupo) grupo.classList.add('edit-resizing');
    return true;
  }

  function previsualizarResize() {
    var r = resizeActivo;
    if (!r || !r.vista) return;
    var g = r.vista.nodosDOM.get(r.id);
    if (!g) return;
    var w = r.nw;
    var h = r.nh;
    var cuerpo = g.querySelector('.nodo-cuerpo');
    if (!cuerpo) return;
    var caja = cuerpo.querySelector('.nodo-caja');
    var sombra = cuerpo.querySelector('.nodo-sombra');
    var anillo = cuerpo.querySelector('.nodo-anillo');
    var brillo = cuerpo.querySelector('.nodo-brillo');
    if (caja) { caja.setAttribute('width', w); caja.setAttribute('height', h); }
    if (sombra) { sombra.setAttribute('width', w); sombra.setAttribute('height', h); }
    if (anillo) {
      anillo.setAttribute('width', w + 7);
      anillo.setAttribute('height', h + 7);
    }
    if (brillo) {
      brillo.setAttribute('width', w + 12);
      brillo.setAttribute('height', h + 12);
    }
    var dy = h - r.h;
    Array.prototype.forEach.call(cuerpo.querySelectorAll('.edit-sigue-alto'), function (el) {
      var y0 = parseFloat(el.getAttribute('data-y'));
      if (isNaN(y0)) return;
      el.setAttribute('transform', 'translate(0,' + (y0 + dy) + ')');
    });
    var lod = cuerpo.querySelector('.edit-lod-titulo');
    if (lod) {
      rellenarLod(lod, lod.getAttribute('data-texto') || '', w, h);
    }
    var encabezado = cuerpo.querySelector('.nodo-encabezado-fondo');
    if (encabezado) encabezado.setAttribute('d', cajaSuperior(w, ALTO_BANDA, 12));
    var sep = cuerpo.querySelector('.nodo-separador');
    if (sep) sep.setAttribute('x2', w);
    var papelera = cuerpo.querySelector('.edit-papelera');
    if (papelera) papelera.setAttribute('transform', 'translate(' + (w - 30) + ',6)');
    var pie = cuerpo.querySelector('.edit-pie-grupo');
    if (pie) {
      var cajaAg = pie.querySelector('.edit-agregar-caja');
      var rama = pie.querySelector('.edit-rama');
      if (cajaAg) {
        var xAg = parseFloat(cajaAg.getAttribute('x'));
        if (isNaN(xAg)) xAg = PAD_X;
        var reservaRamas = rama ? (ANCHO_ICONO_RAMA * 2 + GAP_ICONO_RAMA + 10) : 0;
        cajaAg.setAttribute('width', Math.max(40, w - xAg - PAD_X - reservaRamas));
      }
      var ramaTodo = pie.querySelector('.edit-rama-todo');
      var ramaTodoCaja = pie.querySelector('.edit-rama-todo-caja');
      if (ramaTodoCaja) {
        var xTodo = w - PAD_X - ANCHO_ICONO_RAMA;
        ramaTodoCaja.setAttribute('x', xTodo);
        var iconoRamaTodo = pie.querySelector('.edit-rama-todo-icono');
        if (iconoRamaTodo) {
          iconoRamaTodo.setAttribute('transform',
            chevronTransform(xTodo + 13, 15, ramaTodo && ramaTodo.classList.contains('expandido')));
        }
      }
      var ramaCaja = pie.querySelector('.edit-rama-caja');
      if (ramaCaja) {
        var xRama = w - PAD_X - ANCHO_ICONO_RAMA * 2 - GAP_ICONO_RAMA;
        ramaCaja.setAttribute('x', xRama);
        var iconoRama = pie.querySelector('.edit-rama-icono');
        if (iconoRama) {
          iconoRama.setAttribute('transform',
            chevronTransform(xRama + 13, 15, rama && rama.classList.contains('expandido')));
        }
      }
    }
    var resizeEl = cuerpo.querySelector('.edit-resize');
    if (resizeEl) {
      var iconoR = resizeEl.querySelector('.edit-resize-icono');
      if (iconoR) {
        iconoR.setAttribute('d', 'M ' + (w - 13) + ' 13 L ' + (w - 3) + ' 3'
          + ' M ' + (w - 9) + ' 13 L ' + (w - 3) + ' 7');
      }
      var hit = resizeEl.querySelector('.edit-resize-hit');
      if (hit) hit.setAttribute('x', w - 16);
    }
    var region = cuerpo.querySelector('.edit-region');
    if (region) {
      var ry = parseFloat(region.getAttribute('data-y'));
      var rh = parseFloat(region.getAttribute('data-alto'));
      if (!isNaN(ry) && !isNaN(rh)) {
        colocarRegion(region, 8, ry, w - 16, rh, region.getAttribute('data-etiqueta') || '');
      }
    }
    Array.prototype.forEach.call(cuerpo.querySelectorAll('.edit-fo'), function (fo) {
      if (fo.classList && fo.classList.contains('edit-region-fo')) return;
      var x = parseFloat(fo.getAttribute('x'));
      if (isNaN(x)) x = PAD_X;
      fo.setAttribute('width', Math.max(40, w - x - PAD_X));
    });
    var cajaLayout = r.vista.contexto.disposicion.get(r.id);
    if (cajaLayout) {
      cajaLayout.ancho = w;
      cajaLayout.alto = h;
    }
  }

  function moverResize(evento) {
    if (!resizeActivo) return false;
    var dx = (evento.clientX - resizeActivo.inicio.x) / resizeActivo.k;
    var dy = (evento.clientY - resizeActivo.inicio.y) / resizeActivo.k;
    resizeActivo.nw = Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, resizeActivo.w + dx));
    resizeActivo.nh = Math.max(resizeActivo.hMin || 80, resizeActivo.h + dy);
    previsualizarResize();
    if (resizeActivo.vista) {
      if (resizeActivo.vista.dibujarAristas) resizeActivo.vista.dibujarAristas();
      dibujarAsas(resizeActivo.vista);
    }
    return true;
  }

  function soltarResize(alRedimensionar) {
    if (!resizeActivo) return false;
    var r = resizeActivo;
    var g = r.vista && r.vista.nodosDOM.get(r.id);
    if (g) g.classList.remove('edit-resizing');
    resizeActivo = null;
    if (r.nw && r.nh && alRedimensionar) alRedimensionar(r.id, r.nw, r.nh);
    return true;
  }

  function hayGesto() {
    return !!(reenganche || resizeActivo || enlacePadre);
  }

  function cancelarGestos(vista) {
    if (resizeActivo && resizeActivo.vista) {
      var g = resizeActivo.vista.nodosDOM.get(resizeActivo.id);
      if (g) g.classList.remove('edit-resizing');
    }
    reenganche = null;
    resizeActivo = null;
    if (vista && vista.svg) {
      vista.svg.classList.remove('reenganchando', 'deslizando-ancla');
    }
    quitarPreview(vista);
    if (vista) marcarDestinos(vista, null, false);
  }

  Arbol.EditMode = {
    ALIAS: ALIAS,
    UMBRAL_LOD: UMBRAL_LOD,
    componer: componer,
    pintarParte: pintarParte,
    pintarEtiquetaArista: pintarEtiquetaArista,
    _perfReset: _perfReset, // TEMP-PERF
    _perfGet: _perfGet, // TEMP-PERF
    quitarEtiquetaArista: quitarEtiquetaArista,
    dibujarAsas: dibujarAsas,
    seguirProximidad: seguirProximidad,
    olvidarProximidad: olvidarProximidad,
    esEventoDeEdicion: esEventoDeEdicion,
    aplicarLod: aplicarLod,
    marcarModo: marcarModo,
    abrirPopupCampos: abrirPopupCampos,
    cerrarPopupCampos: cerrarPopupCampos,
    popupCamposAbierto: popupCamposAbierto,
    guardarFoco: guardarFoco,
    soltarFoco: soltarFoco,
    restaurarFoco: restaurarFoco,
    pedirFocoArista: pedirFocoArista,
    tooltipDeNodo: tooltipDeNodo,
    tooltipDeControl: tooltipDeControl,
    iniciarReenganche: iniciarReenganche,
    moverReenganche: moverReenganche,
    soltarReenganche: soltarReenganche,
    esObjetivoValido: esObjetivoValido,
    iniciarResize: iniciarResize,
    moverResize: moverResize,
    soltarResize: soltarResize,
    hayGesto: hayGesto,
    cancelarGestos: cancelarGestos,
    hayEnlacePadre: hayEnlacePadre,
    iniciarEnlacePadre: iniciarEnlacePadre,
    iniciarArrastreConverger: iniciarArrastreConverger,
    clicEnlacePadre: clicEnlacePadre,
    cancelarEnlacePadre: cancelarEnlacePadre,
    aplicarOffsetsAncla: aplicarOffsetsAncla,
    olvidarAncla: olvidarAncla,
    ordenarCapas: ordenarCapas,
    claveCampos: claveCampos,
    valorWidget: valorWidget,
    quitarFocoCampos: quitarFocoCampos
  };

})(window);
