(function () {
  "use strict";

  var T = window.I18N;

  // Se llenan al cargar los datos (ver indexar()).
  var D = null;
  var E = null;
  var EJES_ORDEN = [];
  var POSTURA_IDS = [];
  var CRITERIO_IDS = [];
  var POSTURA_BY_ID = {};
  var CRITERIO_BY_ID = {};

  var LS_ESTADO = "tablaInspiracion.estado.v1";
  var LS_TEMA = "tablaInspiracion.tema.v1";

  var SVG_PIN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M14.6 2.6a1 1 0 0 1 1.4 0l5.4 5.4a1 1 0 0 1 0 1.4l-1.1 1.1a3.5 3.5 0 0 1-4 .7l-2 2 .5 4.6a1 1 0 0 1-.3.8l-1.1 1.1a1 1 0 0 1-1.4 0L8 16.3l-4.3 4.3-1.4-1.4L6.6 15l-3.4-3.4a1 1 0 0 1 0-1.4l1.1-1.1a1 1 0 0 1 .8-.3l4.6.5 2-2a3.5 3.5 0 0 1 .7-4z"/></svg>';
  var SVG_OCULTAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4 17.6 5 12 10.6z"/></svg>';
  var SVG_ANCHO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8.4 6.6 3 12l5.4 5.4 1.4-1.4L6.8 13H11v-2H6.8l3-3zm7.2 0-1.4 1.4 3 3H13v2h4.2l-3 3 1.4 1.4L21 12z"/></svg>';

  var ANCHO_MIN = 120;
  var ANCHO_MAX = 900;
  var CLAVE_IDENTIDAD = "#identidad";

  var ejeSeleccion = {};
  var avisoTimer = null;
  var ultimaPosturasVis = [];
  var ultimaCriteriosVis = [];
  var estado = null;

  // ---------- utilidades ----------

  function ordenar(subset, canonico) {
    var set = {};
    subset.forEach(function (id) { set[id] = true; });
    return canonico.filter(function (id) { return set[id]; });
  }

  function conjuntoVacio(obj) {
    for (var k in obj) { if (obj.hasOwnProperty(k) && obj[k]) return false; }
    return true;
  }

  function debounce(fn, ms) {
    var t = null;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  function leerVarCss(nombre) {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(nombre)) || 0;
  }

  function $(id) { return document.getElementById(id); }

  function crear(tag, clase, texto) {
    var el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function botonIcono(svg, titulo, clases) {
    var b = crear("button", "th-btn" + (clases ? " " + clases : ""));
    b.type = "button";
    b.innerHTML = svg;
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    return b;
  }

  // ---------- estado ----------

  function estadoPorDefecto() {
    return {
      posturas: POSTURA_IDS.slice(),
      criterios: CRITERIO_IDS.slice(),
      fijosCriterios: [],
      fijosPosturas: [],
      anchosCriterios: {},
      anchosPosturas: {},
      volteada: false,
      densidad: "compacta",
      soloDif: false,
      idioma: "es"
    };
  }

  // Los anchos viajan como "id:px,id:px". Se descartan ids desconocidos y
  // medidas fuera de rango para que una URL manipulada no rompa la vista.
  function limpiarAnchos(val, canonico) {
    var salida = {};
    if (!val || typeof val !== "object") return salida;
    Object.keys(val).forEach(function (id) {
      if (id !== CLAVE_IDENTIDAD && canonico.indexOf(id) < 0) return;
      var px = Math.round(parseFloat(val[id]));
      if (!isFinite(px) || px < ANCHO_MIN || px > ANCHO_MAX) return;
      salida[id] = px;
    });
    return salida;
  }

  function anchosDesdeTexto(texto) {
    var mapa = {};
    if (!texto) return mapa;
    texto.split(",").forEach(function (par) {
      var corte = par.lastIndexOf(":");
      if (corte <= 0) return;
      mapa[par.slice(0, corte)] = par.slice(corte + 1);
    });
    return mapa;
  }

  function anchosATexto(mapa) {
    return Object.keys(mapa).map(function (id) { return id + ":" + mapa[id]; }).join(",");
  }

  function mapaAnchos() {
    return estado.volteada ? estado.anchosPosturas : estado.anchosCriterios;
  }

  function limpiarLista(val, canonico) {
    if (!Array.isArray(val)) return null;
    var set = {};
    val.forEach(function (id) { if (canonico.indexOf(id) >= 0) set[id] = true; });
    return canonico.filter(function (id) { return set[id]; });
  }

  function sanear(bruto) {
    var def = estadoPorDefecto();
    if (!bruto || typeof bruto !== "object") return def;

    var posturasLimpio = limpiarLista(bruto.posturas, POSTURA_IDS);
    var criteriosLimpio = limpiarLista(bruto.criterios, CRITERIO_IDS);
    var posturas = posturasLimpio === null ? def.posturas : posturasLimpio;
    var criterios = criteriosLimpio === null ? def.criterios : criteriosLimpio;

    return {
      posturas: posturas,
      criterios: criterios,
      fijosCriterios: (limpiarLista(bruto.fijosCriterios, CRITERIO_IDS) || []).filter(function (id) { return criterios.indexOf(id) >= 0; }),
      fijosPosturas: (limpiarLista(bruto.fijosPosturas, POSTURA_IDS) || []).filter(function (id) { return posturas.indexOf(id) >= 0; }),
      anchosCriterios: limpiarAnchos(bruto.anchosCriterios, CRITERIO_IDS),
      anchosPosturas: limpiarAnchos(bruto.anchosPosturas, POSTURA_IDS),
      volteada: !!bruto.volteada,
      densidad: bruto.densidad === "comoda" ? "comoda" : "compacta",
      soloDif: !!bruto.soloDif,
      idioma: bruto.idioma === "en" ? "en" : "es"
    };
  }

  function cargarLocal() {
    try {
      var raw = localStorage.getItem(LS_ESTADO);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function guardarLocal() {
    try { localStorage.setItem(LS_ESTADO, JSON.stringify(estado)); } catch (e) { /* no-op */ }
  }

  function leerEstadoInicial() {
    var sp;
    try { sp = new URLSearchParams(location.search); } catch (e) { sp = null; }
    if (sp && (sp.has("p") || sp.has("c") || sp.has("v") || sp.has("d") || sp.has("l") || sp.has("x"))) {
      return sanear({
        posturas: sp.has("p") ? sp.get("p").split(",") : [],
        criterios: sp.has("c") ? sp.get("c").split(",") : CRITERIO_IDS.slice(),
        fijosCriterios: sp.has("fc") ? sp.get("fc").split(",") : [],
        fijosPosturas: sp.has("fp") ? sp.get("fp").split(",") : [],
        anchosCriterios: anchosDesdeTexto(sp.get("wc")),
        anchosPosturas: anchosDesdeTexto(sp.get("wp")),
        volteada: sp.get("v") === "1",
        densidad: sp.get("d"),
        soloDif: sp.get("x") === "1",
        idioma: sp.get("l")
      });
    }
    var local = cargarLocal();
    return local ? sanear(local) : estadoPorDefecto();
  }

  function estadoAQueryString() {
    var sp = new URLSearchParams();
    sp.set("p", estado.posturas.join(","));
    sp.set("c", estado.criterios.join(","));
    if (estado.fijosCriterios.length) sp.set("fc", estado.fijosCriterios.join(","));
    if (estado.fijosPosturas.length) sp.set("fp", estado.fijosPosturas.join(","));
    if (Object.keys(estado.anchosCriterios).length) sp.set("wc", anchosATexto(estado.anchosCriterios));
    if (Object.keys(estado.anchosPosturas).length) sp.set("wp", anchosATexto(estado.anchosPosturas));
    sp.set("v", estado.volteada ? "1" : "0");
    sp.set("d", estado.densidad);
    sp.set("x", estado.soloDif ? "1" : "0");
    sp.set("l", estado.idioma);
    return sp.toString();
  }

  function construirUrlCompartible() {
    return location.href.split("#")[0].split("?")[0] + "?" + estadoAQueryString();
  }

  function persistir() {
    guardarLocal();
    try { history.replaceState(null, "", location.pathname + "?" + estadoAQueryString()); } catch (e) { /* no-op */ }
  }

  // ---------- avisos, modales, popover ----------

  function mostrarAviso(msg) {
    var el = $("aviso");
    el.textContent = msg;
    el.classList.add("visible");
    clearTimeout(avisoTimer);
    avisoTimer = setTimeout(function () { el.classList.remove("visible"); }, 2400);
  }

  function copiarFallback(texto) {
    var ta = crear("textarea");
    ta.value = texto;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); mostrarAviso(T[estado.idioma].compartirCopiado); } catch (e) { /* no-op */ }
    document.body.removeChild(ta);
  }

  function copiar(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () { mostrarAviso(T[estado.idioma].compartirCopiado); },
        function () { copiarFallback(texto); }
      );
    } else {
      copiarFallback(texto);
    }
  }

  // Muestra la postura completa —incluidos los criterios ocultos en la tabla— y
  // resalta el criterio de la celda que se pulsó.
  function abrirModalCelda(posturaId, criterioId) {
    var postura = POSTURA_BY_ID[posturaId];
    $("modal-supra").textContent = postura.corto[estado.idioma];
    $("modal-titulo").textContent = postura[estado.idioma];

    var cont = $("modal-ficha");
    cont.innerHTML = "";
    var resaltada = null;

    D.grupos.forEach(function (grupo) {
      var ids = CRITERIO_IDS.filter(function (id) { return CRITERIO_BY_ID[id].grupo === grupo.id; });
      if (!ids.length) return;
      var seccion = crear("section", "ficha-grupo");
      seccion.appendChild(crear("h4", null, grupo[estado.idioma]));
      ids.forEach(function (cid) {
        var esFoco = cid === criterioId;
        var fila = crear("div", "ficha-fila" + (esFoco ? " resaltada" : ""));
        fila.appendChild(crear("div", "etiqueta-criterio", CRITERIO_BY_ID[cid][estado.idioma]));
        var val = crear("div", "valor-criterio");
        val.appendChild(valorCompleto(posturaId, cid));
        fila.appendChild(val);
        if (esFoco) resaltada = fila;
        seccion.appendChild(fila);
      });
      cont.appendChild(seccion);
    });

    $("modal-celda").classList.remove("oculto");
    if (resaltada) {
      requestAnimationFrame(function () {
        resaltada.scrollIntoView({ block: "center", inline: "nearest" });
      });
    }
  }

  function cerrarPopover() {
    $("popover-criterios").hidden = true;
    $("btn-criterios").setAttribute("aria-expanded", "false");
  }

  function alternarPopover() {
    var pop = $("popover-criterios");
    var abierto = !pop.hidden;
    pop.hidden = abierto;
    $("btn-criterios").setAttribute("aria-expanded", abierto ? "false" : "true");
  }

  // ---------- datos derivados ----------

  function textoCelda(posturaId, criterioId, idioma) {
    var celda = POSTURA_BY_ID[posturaId].celdas[criterioId];
    return celda.badge ? E[celda.badge][idioma] : celda[idioma];
  }

  // 'coincide' cuando todas las posturas visibles dicen literalmente lo mismo,
  // 'difiere' cuando no, 'neutro' cuando hay menos de dos posturas que comparar.
  function estadoCriterio(criterioId, posturasVis) {
    if (posturasVis.length < 2) return "neutro";
    var primero = textoCelda(posturasVis[0], criterioId, estado.idioma);
    for (var i = 1; i < posturasVis.length; i++) {
      if (textoCelda(posturasVis[i], criterioId, estado.idioma) !== primero) return "difiere";
    }
    return "coincide";
  }

  function criteriosVisiblesFiltrados(posturasVis) {
    var base = CRITERIO_IDS.filter(function (id) { return estado.criterios.indexOf(id) >= 0; });
    if (!estado.soloDif || posturasVis.length < 2) return base;
    return base.filter(function (id) { return estadoCriterio(id, posturasVis) === "difiere"; });
  }

  // Cuántos criterios encendidos ocultaría el modo "solo diferencias". Con las 10
  // posturas a la vista suele ser 0: todas difieren en todo, y el botón parecía roto.
  function cuentaCoincidencias(posturasVis) {
    if (posturasVis.length < 2) return 0;
    return CRITERIO_IDS.filter(function (id) {
      return estado.criterios.indexOf(id) >= 0 && estadoCriterio(id, posturasVis) === "coincide";
    }).length;
  }

  // Las columnas fijadas se muestran primero, pegadas a la de identidad. Sin esto,
  // `position: sticky` solo las clava al llegar a ellas y las columnas intermedias
  // pasan por debajo: fijar una columna lejana no se sentía como fijarla.
  function columnasFijadasVisibles(criteriosVis, posturasVis) {
    return estado.volteada
      ? estado.fijosPosturas.filter(function (id) { return posturasVis.indexOf(id) >= 0; })
      : estado.fijosCriterios.filter(function (id) { return criteriosVis.indexOf(id) >= 0; });
  }

  function ordenColumnas(criteriosVis, posturasVis) {
    var fijadas = columnasFijadasVisibles(criteriosVis, posturasVis);
    var todas = estado.volteada ? posturasVis : criteriosVis;
    return fijadas.concat(todas.filter(function (id) { return fijadas.indexOf(id) < 0; }));
  }

  function hayAmbosLados(posturasVis) {
    return posturasVis.some(function (id) { return POSTURA_BY_ID[id].teopneustia; }) &&
           posturasVis.some(function (id) { return !POSTURA_BY_ID[id].teopneustia; });
  }

  // ---------- acciones ----------

  function togglePostura(id) {
    var puesto = estado.posturas.indexOf(id) >= 0;
    estado.posturas = puesto
      ? estado.posturas.filter(function (x) { return x !== id; })
      : ordenar(estado.posturas.concat([id]), POSTURA_IDS);
    if (puesto) estado.fijosPosturas = estado.fijosPosturas.filter(function (x) { return x !== id; });
    render();
  }

  function toggleCriterio(id) {
    var puesto = estado.criterios.indexOf(id) >= 0;
    estado.criterios = puesto
      ? estado.criterios.filter(function (x) { return x !== id; })
      : ordenar(estado.criterios.concat([id]), CRITERIO_IDS);
    if (puesto) estado.fijosCriterios = estado.fijosCriterios.filter(function (x) { return x !== id; });
    render();
  }

  function toggleGrupo(grupoId) {
    var idsGrupo = CRITERIO_IDS.filter(function (id) { return CRITERIO_BY_ID[id].grupo === grupoId; });
    var todosVisibles = idsGrupo.every(function (id) { return estado.criterios.indexOf(id) >= 0; });
    if (todosVisibles) {
      estado.criterios = estado.criterios.filter(function (id) { return idsGrupo.indexOf(id) < 0; });
      estado.fijosCriterios = estado.fijosCriterios.filter(function (id) { return idsGrupo.indexOf(id) < 0; });
    } else {
      estado.criterios = ordenar(estado.criterios.concat(idsGrupo), CRITERIO_IDS);
    }
    render();
  }

  function puedeFijarMas(conteoNuevo) {
    var contenedor = $("contenedor-tabla");
    var disponible = contenedor.clientWidth > 0 ? contenedor.clientWidth : Math.max(window.innerWidth - 60, 320);
    var colMin = leerVarCss(estado.densidad === "comoda" ? "--col-min-comoda" : "--col-min-compacta");
    return leerVarCss("--col-identidad") + conteoNuevo * colMin + colMin <= disponible;
  }

  function togglePin(kind, id) {
    var lista = kind === "criterio" ? estado.fijosCriterios : estado.fijosPosturas;
    var canonico = kind === "criterio" ? CRITERIO_IDS : POSTURA_IDS;
    var avisoEl = $("aviso-fijos");
    if (lista.indexOf(id) >= 0) {
      lista = lista.filter(function (x) { return x !== id; });
      avisoEl.hidden = true;
    } else if (puedeFijarMas(lista.length + 1)) {
      lista = ordenar(lista.concat([id]), canonico);
      avisoEl.hidden = true;
    } else {
      avisoEl.textContent = T[estado.idioma].noCabenFijos;
      avisoEl.hidden = false;
      mostrarAviso(T[estado.idioma].noCabenFijos);
      return;
    }
    if (kind === "criterio") estado.fijosCriterios = lista; else estado.fijosPosturas = lista;
    render();
  }

  function toggleEje(eje, valor) {
    if (ejeSeleccion[eje][valor]) delete ejeSeleccion[eje][valor];
    else ejeSeleccion[eje][valor] = true;

    var nuevas = POSTURA_IDS.filter(function (id) {
      var p = POSTURA_BY_ID[id];
      return EJES_ORDEN.every(function (ax) {
        if (conjuntoVacio(ejeSeleccion[ax])) return true;
        return p.eje[ax] !== null && !!ejeSeleccion[ax][p.eje[ax]];
      });
    });
    estado.posturas = nuevas;
    estado.fijosPosturas = estado.fijosPosturas.filter(function (id) { return nuevas.indexOf(id) >= 0; });
    render();
  }

  // ---------- controles superiores ----------

  function renderChipsPosturas() {
    var t = T[estado.idioma];
    $("et-posturas").textContent = t.etPosturas;
    $("contador-posturas").textContent = t.deA(estado.posturas.length, POSTURA_IDS.length);
    $("btn-posturas-todas").textContent = t.todas;
    $("btn-posturas-ninguna").textContent = t.ninguna;

    var cont = $("chips-posturas");
    cont.innerHTML = "";
    POSTURA_IDS.forEach(function (id) {
      var postura = POSTURA_BY_ID[id];
      var encendida = estado.posturas.indexOf(id) >= 0;
      var chip = crear("button", "chip" + (postura.teopneustia ? "" : " fuera"));
      chip.type = "button";
      chip.setAttribute("aria-pressed", encendida ? "true" : "false");
      chip.title = postura[estado.idioma];
      chip.appendChild(crear("i", "chip-punto"));
      chip.appendChild(crear("span", null, postura.corto[estado.idioma]));
      chip.addEventListener("click", function () { togglePostura(id); });
      cont.appendChild(chip);
    });
  }

  function renderEjes() {
    var t = T[estado.idioma];
    $("et-ejes").textContent = t.etEjes;
    $("nota-ejes").textContent = t.notaEjes;

    var cont = $("ejes-filtro");
    cont.innerHTML = "";
    EJES_ORDEN.forEach(function (eje) {
      var grupo = crear("div", "eje-grupo");
      grupo.appendChild(crear("span", "eje-nombre", CRITERIO_BY_ID[eje][estado.idioma]));
      var seg = crear("div", "segmentado");
      seg.setAttribute("role", "group");
      D.ejes[eje].forEach(function (opcion) {
        var b = crear("button", "marcado-acento", opcion[estado.idioma]);
        b.type = "button";
        b.setAttribute("aria-pressed", ejeSeleccion[eje][opcion.valor] ? "true" : "false");
        b.addEventListener("click", function () { toggleEje(eje, opcion.valor); });
        seg.appendChild(b);
      });
      grupo.appendChild(seg);
      cont.appendChild(grupo);
    });
  }

  function renderPopoverCriterios() {
    var t = T[estado.idioma];
    $("lbl-criterios").textContent = t.criterios;
    $("pop-titulo").textContent = t.criterios;
    $("contador-criterios").textContent = t.deA(estado.criterios.length, CRITERIO_IDS.length);
    $("btn-criterios-todos").textContent = t.mostrarTodos;
    $("btn-criterios-ninguno").textContent = t.ocultarTodos;

    var cont = $("popover-grupos");
    cont.innerHTML = "";
    D.grupos.forEach(function (grupo) {
      var idsGrupo = CRITERIO_IDS.filter(function (id) { return CRITERIO_BY_ID[id].grupo === grupo.id; });
      var todosVisibles = idsGrupo.every(function (id) { return estado.criterios.indexOf(id) >= 0; });

      var caja = crear("div", "pop-grupo");
      var cab = crear("div", "pop-grupo-cabecera");
      cab.appendChild(crear("span", "pop-grupo-nombre", grupo[estado.idioma]));
      var btn = crear("button", "mini-boton", todosVisibles ? t.grupoTodoOff : t.grupoTodoOn);
      btn.type = "button";
      btn.addEventListener("click", function () { toggleGrupo(grupo.id); });
      cab.appendChild(btn);
      caja.appendChild(cab);

      idsGrupo.forEach(function (id) {
        var encendido = estado.criterios.indexOf(id) >= 0;
        var fila = crear("label", "pop-fila" + (encendido ? " encendida" : ""));
        var sw = crear("span", "switch");
        var chk = crear("input");
        chk.type = "checkbox";
        chk.checked = encendido;
        chk.addEventListener("change", function () { toggleCriterio(id); });
        sw.appendChild(chk);
        sw.appendChild(crear("span", "switch-pista"));
        sw.appendChild(crear("span", "switch-bolita"));
        fila.appendChild(sw);
        fila.appendChild(crear("span", "pop-fila-texto", CRITERIO_BY_ID[id][estado.idioma]));
        caja.appendChild(fila);
      });
      cont.appendChild(caja);
    });
  }

  function renderBarraVista() {
    var t = T[estado.idioma];
    var btnVoltear = $("btn-voltear");
    $("lbl-voltear").textContent = estado.volteada ? t.voltearActivo : t.voltear;
    btnVoltear.title = t.voltearTitulo;
    btnVoltear.setAttribute("aria-pressed", estado.volteada ? "true" : "false");

    var segC = $("seg-compacta");
    var segK = $("seg-comoda");
    segC.textContent = t.densidadCompacta;
    segK.textContent = t.densidadComoda;
    segC.setAttribute("aria-pressed", estado.densidad === "compacta" ? "true" : "false");
    segK.setAttribute("aria-pressed", estado.densidad === "comoda" ? "true" : "false");
    $("seg-densidad").title = t.densidadTitulo;

    var btnDif = $("btn-diferencias");
    $("lbl-diferencias").textContent = t.soloDiferencias;
    var pocas = estado.posturas.length < 2;
    btnDif.setAttribute("aria-pressed", estado.soloDif && !pocas ? "true" : "false");
    btnDif.disabled = pocas;

    var posturasVis = POSTURA_IDS.filter(function (id) { return estado.posturas.indexOf(id) >= 0; });
    var coincidencias = cuentaCoincidencias(posturasVis);
    var pastilla = $("contador-coincidencias");
    pastilla.hidden = pocas || coincidencias === 0;
    pastilla.textContent = coincidencias;
    btnDif.title = pocas
      ? t.soloDiferenciasNota
      : (coincidencias === 0 ? t.sinCoincidencias : t.ocultarCoincidencias(coincidencias));

    $("lbl-coinciden").textContent = t.leyendaCoinciden;
    $("lbl-difieren").textContent = t.leyendaDifieren;
  }

  // ---------- tabla ----------

  // El color de la etiqueta lo decide el dato (etiquetas[].tono), no el código.
  function etiquetaElemento(clave) {
    var et = E[clave];
    return crear("span", "etiqueta etiqueta-tono-" + et.tono, et[estado.idioma]);
  }

  function celdaContenido(posturaId, criterioId) {
    var celda = POSTURA_BY_ID[posturaId].celdas[criterioId];
    if (celda.badge) return etiquetaElemento(celda.badge);
    var span = crear("span", "celda-texto" + (estado.densidad === "compacta" ? " recortable" : ""), celda[estado.idioma]);
    if (estado.densidad === "compacta") span.title = T[estado.idioma].abrirCompleto;
    return span;
  }

  function valorCompleto(posturaId, criterioId) {
    var celda = POSTURA_BY_ID[posturaId].celdas[criterioId];
    if (celda.badge) return etiquetaElemento(celda.badge);
    return crear("span", "celda-texto", celda[estado.idioma]);
  }

  function puntoEstado(estadoCrit) {
    if (estadoCrit === "neutro") return null;
    return crear("i", "punto th-punto " + (estadoCrit === "coincide" ? "punto-coincide" : "punto-difiere"));
  }

  // ---------- ancho de columna ----------

  function celdasDeColumna(clave) {
    var tabla = $("tabla");
    if (clave === CLAVE_IDENTIDAD) return tabla.querySelectorAll(".col-identidad");
    var attr = estado.volteada ? "data-postura" : "data-criterio";
    return tabla.querySelectorAll("[" + attr + '="' + clave + '"]');
  }

  function aplicarAnchoColumna(clave, px) {
    var celdas = celdasDeColumna(clave);
    for (var i = 0; i < celdas.length; i++) {
      celdas[i].style.width = px + "px";
      celdas[i].style.minWidth = px + "px";
      celdas[i].style.maxWidth = px + "px";
    }
  }

  function aplicarAnchos() {
    var mapa = mapaAnchos();
    Object.keys(mapa).forEach(function (clave) { aplicarAnchoColumna(clave, mapa[clave]); });
  }

  function asaAncho(clave) {
    var asa = crear("span", "asa-ancho");
    asa.title = T[estado.idioma].ajustarAncho;
    asa.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var celdas = celdasDeColumna(clave);
      if (!celdas.length) return;
      var inicial = celdas[0].getBoundingClientRect().width;
      var x0 = e.clientX;
      var ultimo = null;

      document.body.classList.add("redimensionando");
      try { asa.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }

      function mover(ev) {
        ultimo = Math.max(ANCHO_MIN, Math.min(ANCHO_MAX, Math.round(inicial + (ev.clientX - x0))));
        aplicarAnchoColumna(clave, ultimo);
      }
      function soltar() {
        asa.removeEventListener("pointermove", mover);
        asa.removeEventListener("pointerup", soltar);
        asa.removeEventListener("pointercancel", soltar);
        document.body.classList.remove("redimensionando");
        if (ultimo === null) return;
        mapaAnchos()[clave] = ultimo;
        render();
      }
      asa.addEventListener("pointermove", mover);
      asa.addEventListener("pointerup", soltar);
      asa.addEventListener("pointercancel", soltar);
    });
    return asa;
  }

  function botonLiberarAncho(clave) {
    if (mapaAnchos()[clave] === undefined) return null;
    var btn = botonIcono(SVG_ANCHO, T[estado.idioma].liberarAncho, "activo");
    btn.addEventListener("click", function () {
      delete mapaAnchos()[clave];
      render();
    });
    return btn;
  }

  function construirTablaNormal(tabla, posturasVis, criteriosVis) {
    var t = T[estado.idioma];
    var thead = document.createElement("thead");

    var filaGrupos = crear("tr", "fila-grupos");
    var esquina = crear("th", "col-identidad");
    esquina.rowSpan = 2;
    var internoEsquina = crear("div", "th-interno");
    internoEsquina.appendChild(crear("span", "th-titulo rotulo-esquina", t.etPosturas));
    var accionesEsquina = crear("div", "th-acciones");
    var liberarEsquina = botonLiberarAncho(CLAVE_IDENTIDAD);
    if (liberarEsquina) accionesEsquina.appendChild(liberarEsquina);
    internoEsquina.appendChild(accionesEsquina);
    esquina.appendChild(internoEsquina);
    esquina.appendChild(asaAncho(CLAVE_IDENTIDAD));
    filaGrupos.appendChild(esquina);

    var fijadas = columnasFijadasVisibles(criteriosVis, posturasVis);
    var cols = ordenColumnas(criteriosVis, posturasVis);
    var resto = cols.slice(fijadas.length);

    if (fijadas.length) {
      var thFijadas = document.createElement("th");
      thFijadas.colSpan = fijadas.length;
      thFijadas.appendChild(crear("span", "grupo-rotulo", t.fijadas));
      filaGrupos.appendChild(thFijadas);
    }
    D.grupos.forEach(function (grupo) {
      var idsGrupoVis = resto.filter(function (id) { return CRITERIO_BY_ID[id].grupo === grupo.id; });
      if (!idsGrupoVis.length) return;
      var th = document.createElement("th");
      th.colSpan = idsGrupoVis.length;
      th.appendChild(crear("span", "grupo-rotulo", grupo[estado.idioma]));
      filaGrupos.appendChild(th);
    });
    thead.appendChild(filaGrupos);

    var filaCriterios = document.createElement("tr");
    cols.forEach(function (id) {
      var th = document.createElement("th");
      th.setAttribute("data-criterio", id);
      var estadoCrit = estadoCriterio(id, posturasVis);
      if (estadoCrit !== "neutro") th.classList.add("estado-" + estadoCrit);

      var interno = crear("div", "th-interno");
      var punto = puntoEstado(estadoCrit);
      if (punto) interno.appendChild(punto);
      interno.appendChild(crear("span", "th-titulo", CRITERIO_BY_ID[id][estado.idioma]));

      var acciones = crear("div", "th-acciones");
      var fijado = estado.fijosCriterios.indexOf(id) >= 0;
      var btnPin = botonIcono(SVG_PIN, fijado ? t.quitarFijado : t.fijarColumna, fijado ? "activo" : null);
      btnPin.addEventListener("click", function () { togglePin("criterio", id); });
      acciones.appendChild(btnPin);
      var btnLiberar = botonLiberarAncho(id);
      if (btnLiberar) acciones.appendChild(btnLiberar);
      var btnOcultar = botonIcono(SVG_OCULTAR, t.ocultarCriterio);
      btnOcultar.addEventListener("click", function () { toggleCriterio(id); });
      acciones.appendChild(btnOcultar);
      interno.appendChild(acciones);

      th.appendChild(interno);
      th.appendChild(asaAncho(id));
      filaCriterios.appendChild(th);
    });
    thead.appendChild(filaCriterios);
    tabla.appendChild(thead);

    var tbody = document.createElement("tbody");
    var ambos = hayAmbosLados(posturasVis);
    posturasVis.forEach(function (pid, idx) {
      var postura = POSTURA_BY_ID[pid];
      if (ambos && !postura.teopneustia && (idx === 0 || POSTURA_BY_ID[posturasVis[idx - 1]].teopneustia)) {
        var filaCorte = crear("tr", "fila-corte");
        var tdCorte = crear("td", null, t.corteTeopneustia);
        tdCorte.colSpan = cols.length + 1;
        filaCorte.appendChild(tdCorte);
        tbody.appendChild(filaCorte);
      }
      var tr = document.createElement("tr");
      var tdNombre = crear("td", "col-identidad");
      tdNombre.setAttribute("data-postura", pid);
      var interno = crear("div", "identidad-interno");
      interno.appendChild(crear("span", null, postura[estado.idioma]));
      var acciones = crear("div", "th-acciones");
      var btnQuitar = botonIcono(SVG_OCULTAR, t.apagarPostura);
      btnQuitar.addEventListener("click", function () { togglePostura(pid); });
      acciones.appendChild(btnQuitar);
      interno.appendChild(acciones);
      tdNombre.appendChild(interno);
      tr.appendChild(tdNombre);

      cols.forEach(function (cid) {
        var td = document.createElement("td");
        td.setAttribute("data-postura", pid);
        td.setAttribute("data-criterio", cid);
        td.appendChild(celdaContenido(pid, cid));
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tabla.appendChild(tbody);
  }

  function construirTablaVolteada(tabla, posturasVis, criteriosVis) {
    var t = T[estado.idioma];
    var cols = ordenColumnas(criteriosVis, posturasVis);
    var ambos = hayAmbosLados(posturasVis);
    // El corte se marca sobre el orden que se muestra, no sobre el canónico.
    var primerFuera = -1;
    if (ambos) {
      for (var i = 0; i < cols.length; i++) {
        if (!POSTURA_BY_ID[cols[i]].teopneustia) { primerFuera = i; break; }
      }
    }

    var thead = document.createElement("thead");
    var filaCab = document.createElement("tr");
    var esquina = crear("th", "col-identidad");
    var internoEsquina = crear("div", "th-interno");
    internoEsquina.appendChild(crear("span", "th-titulo rotulo-esquina", t.criterios));
    var accionesEsquina = crear("div", "th-acciones");
    var liberarEsquina = botonLiberarAncho(CLAVE_IDENTIDAD);
    if (liberarEsquina) accionesEsquina.appendChild(liberarEsquina);
    internoEsquina.appendChild(accionesEsquina);
    esquina.appendChild(internoEsquina);
    esquina.appendChild(asaAncho(CLAVE_IDENTIDAD));
    filaCab.appendChild(esquina);
    cols.forEach(function (pid, idx) {
      var th = document.createElement("th");
      th.setAttribute("data-postura", pid);
      if (idx === primerFuera) th.classList.add("col-corte");

      var interno = crear("div", "th-interno");
      interno.appendChild(crear("span", "th-titulo", POSTURA_BY_ID[pid][estado.idioma]));
      var acciones = crear("div", "th-acciones");
      var fijada = estado.fijosPosturas.indexOf(pid) >= 0;
      var btnPin = botonIcono(SVG_PIN, fijada ? t.quitarFijado : t.fijarColumna, fijada ? "activo" : null);
      btnPin.addEventListener("click", function () { togglePin("postura", pid); });
      acciones.appendChild(btnPin);
      var btnLiberar = botonLiberarAncho(pid);
      if (btnLiberar) acciones.appendChild(btnLiberar);
      var btnQuitar = botonIcono(SVG_OCULTAR, t.apagarPostura);
      btnQuitar.addEventListener("click", function () { togglePostura(pid); });
      acciones.appendChild(btnQuitar);
      interno.appendChild(acciones);

      th.appendChild(interno);
      th.appendChild(asaAncho(pid));
      filaCab.appendChild(th);
    });
    thead.appendChild(filaCab);
    tabla.appendChild(thead);

    var tbody = document.createElement("tbody");
    D.grupos.forEach(function (grupo) {
      var idsGrupoVis = criteriosVis.filter(function (id) { return CRITERIO_BY_ID[id].grupo === grupo.id; });
      if (!idsGrupoVis.length) return;
      var filaGrupo = crear("tr", "fila-grupo-volteada");
      var tdGrupo = crear("td", null, grupo[estado.idioma]);
      tdGrupo.colSpan = cols.length + 1;
      filaGrupo.appendChild(tdGrupo);
      tbody.appendChild(filaGrupo);

      idsGrupoVis.forEach(function (cid) {
        var tr = document.createElement("tr");
        var estadoCrit = estadoCriterio(cid, posturasVis);
        var tdEtq = crear("td", "col-identidad" + (estadoCrit !== "neutro" ? " estado-" + estadoCrit : ""));
        tdEtq.setAttribute("data-criterio", cid);

        var interno = crear("div", "identidad-interno");
        var punto = puntoEstado(estadoCrit);
        if (punto) interno.appendChild(punto);
        interno.appendChild(crear("span", null, CRITERIO_BY_ID[cid][estado.idioma]));
        var acciones = crear("div", "th-acciones");
        var btnOcultar = botonIcono(SVG_OCULTAR, t.ocultarCriterio);
        btnOcultar.addEventListener("click", function () { toggleCriterio(cid); });
        acciones.appendChild(btnOcultar);
        interno.appendChild(acciones);
        tdEtq.appendChild(interno);
        tr.appendChild(tdEtq);

        cols.forEach(function (pid, idx) {
          var td = document.createElement("td");
          td.setAttribute("data-postura", pid);
          td.setAttribute("data-criterio", cid);
          if (idx === primerFuera) td.classList.add("col-corte");
          td.appendChild(celdaContenido(pid, cid));
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    });
    tabla.appendChild(tbody);
  }

  function renderFichas(posturasVis, criteriosVis) {
    var cont = $("contenedor-fichas");
    cont.innerHTML = "";
    var ambos = hayAmbosLados(posturasVis);
    posturasVis.forEach(function (pid, idx) {
      var postura = POSTURA_BY_ID[pid];
      var primerFuera = ambos && !postura.teopneustia && (idx === 0 || POSTURA_BY_ID[posturasVis[idx - 1]].teopneustia);
      var ficha = crear("div", "ficha" + (primerFuera ? " ficha-corte" : ""));
      ficha.appendChild(crear("h3", null, postura[estado.idioma]));

      D.grupos.forEach(function (grupo) {
        var idsGrupoVis = criteriosVis.filter(function (id) { return CRITERIO_BY_ID[id].grupo === grupo.id; });
        if (!idsGrupoVis.length) return;
        var bloque = crear("div", "ficha-grupo");
        bloque.appendChild(crear("h4", null, grupo[estado.idioma]));
        idsGrupoVis.forEach(function (cid) {
          var fila = crear("div", "ficha-fila");
          fila.appendChild(crear("div", "etiqueta-criterio", CRITERIO_BY_ID[cid][estado.idioma]));
          var val = crear("div", "valor-criterio");
          val.setAttribute("data-postura", pid);
          val.setAttribute("data-criterio", cid);
          val.appendChild(celdaContenido(pid, cid));
          fila.appendChild(val);
          bloque.appendChild(fila);
        });
        ficha.appendChild(bloque);
      });
      cont.appendChild(ficha);
    });
  }

  function aplicarFijado() {
    var tabla = $("tabla");
    if (!tabla) return;

    var previas = tabla.querySelectorAll(".col-fija, .ultima-fija");
    for (var i = 0; i < previas.length; i++) {
      previas[i].classList.remove("col-fija");
      previas[i].classList.remove("ultima-fija");
      previas[i].style.left = "";
    }

    var identCell = tabla.querySelector(".col-identidad");
    var identWidth = identCell ? identCell.getBoundingClientRect().width : leerVarCss("--col-identidad");

    // Mismo orden que usó ordenColumnas() al construir la tabla.
    var pinnedIds = columnasFijadasVisibles(ultimaCriteriosVis, ultimaPosturasVis);
    var attr = estado.volteada ? "data-postura" : "data-criterio";

    // La franja separadora vive en la última columna fija; sin fijadas, en la de identidad.
    var identidades = tabla.querySelectorAll(".col-identidad");
    for (var n = 0; n < identidades.length; n++) {
      identidades[n].classList.toggle("sin-separador", pinnedIds.length > 0);
    }

    var offset = identWidth;
    pinnedIds.forEach(function (id, indice) {
      var celdas = tabla.querySelectorAll("[" + attr + '="' + id + '"]');
      var ancho = 0;
      for (var j = 0; j < celdas.length; j++) {
        celdas[j].classList.add("col-fija");
        if (indice === pinnedIds.length - 1) celdas[j].classList.add("ultima-fija");
        celdas[j].style.left = offset + "px";
        if (j === 0) ancho = celdas[j].getBoundingClientRect().width;
      }
      offset += ancho;
    });

    // Las dos filas del encabezado son sticky: la segunda arranca donde termina la primera.
    if (!estado.volteada) {
      var filaGrupos = tabla.querySelector("thead tr.fila-grupos");
      var filaCriterios = tabla.querySelector("thead tr:not(.fila-grupos)");
      if (filaGrupos && filaCriterios) {
        var alto = filaGrupos.getBoundingClientRect().height;
        var ths = filaCriterios.querySelectorAll("th");
        for (var k = 0; k < ths.length; k++) ths[k].style.top = alto + "px";
      }
    }
  }

  function renderTabla() {
    var t = T[estado.idioma];
    var tabla = $("tabla");
    var posturasVis = POSTURA_IDS.filter(function (id) { return estado.posturas.indexOf(id) >= 0; });

    $("texto-aviso-vacio").textContent = t.posturasApagadasAviso;
    $("btn-volver-todas").textContent = t.volverATodas;

    if (posturasVis.length === 0) {
      $("aviso-vacio").hidden = false;
      $("contenedor-tabla").hidden = true;
      $("contenedor-fichas").innerHTML = "";
      ultimaPosturasVis = [];
      ultimaCriteriosVis = [];
      return;
    }
    $("aviso-vacio").hidden = true;
    $("contenedor-tabla").hidden = false;

    var criteriosVis = criteriosVisiblesFiltrados(posturasVis);
    ultimaPosturasVis = posturasVis;
    ultimaCriteriosVis = criteriosVis;

    tabla.innerHTML = "";
    tabla.className = "densidad-" + estado.densidad;
    if (estado.volteada) construirTablaVolteada(tabla, posturasVis, criteriosVis);
    else construirTablaNormal(tabla, posturasVis, criteriosVis);

    renderFichas(posturasVis, criteriosVis);
    // El orden importa: los offsets del fijado se miden sobre los anchos ya aplicados.
    requestAnimationFrame(function () {
      aplicarAnchos();
      aplicarFijado();
    });
  }

  // ---------- textos fijos ----------

  function renderCabecera() {
    var t = T[estado.idioma];
    document.documentElement.setAttribute("lang", estado.idioma);
    document.title = t.tituloPagina;
    $("titulo-pagina").textContent = t.tituloPagina;
    $("subtitulo-pagina").textContent = t.subtitulo;

    $("lbl-guia").textContent = t.guia;
    $("btn-guia").title = t.guiaTitulo;
    $("lbl-compartir").textContent = t.compartir;
    $("btn-idioma").textContent = t.idiomaBoton;
    $("btn-idioma").title = t.idiomaTitulo;
    $("btn-tema").title = t.temaTitulo;
    $("btn-tema").setAttribute("aria-label", t.temaTitulo);

    $("guia-titulo").textContent = t.guiaTitulo;
    $("tit-ejes").textContent = t.seccionEjesTitulo;
    $("nota-ejes-largo").textContent = t.ejesNota;
    $("guia-cerrar").title = t.cerrar;
    $("modal-cerrar").title = t.cerrar;

    var lista = $("lista-ejes");
    lista.innerHTML = "";
    [t.ejeAlcance, t.ejeObjeto, t.ejeMetodo, t.ejePrefijo].forEach(function (texto) {
      lista.appendChild(crear("li", null, texto));
    });
  }

  function render() {
    renderCabecera();
    renderChipsPosturas();
    renderEjes();
    renderPopoverCriterios();
    renderBarraVista();
    renderTabla();
    persistir();
  }

  // ---------- tema ----------

  function aplicarTema(tema, guardar) {
    document.documentElement.setAttribute("data-tema", tema);
    if (guardar) {
      try { localStorage.setItem(LS_TEMA, tema); } catch (e) { /* no-op */ }
    }
  }

  function cargarTema() {
    var tema = "oscuro";
    try {
      var guardado = localStorage.getItem(LS_TEMA);
      if (guardado === "claro" || guardado === "oscuro") tema = guardado;
    } catch (e) { /* no-op */ }
    aplicarTema(tema, false);
  }

  // ---------- eventos ----------

  function wireEventos() {
    $("btn-guia").addEventListener("click", function () { $("modal-guia").classList.remove("oculto"); });
    $("guia-cerrar").addEventListener("click", function () { $("modal-guia").classList.add("oculto"); });
    $("modal-guia").addEventListener("click", function (e) {
      if (e.target.id === "modal-guia") $("modal-guia").classList.add("oculto");
    });

    $("btn-compartir").addEventListener("click", function () { copiar(construirUrlCompartible()); });
    $("btn-idioma").addEventListener("click", function () {
      estado.idioma = estado.idioma === "es" ? "en" : "es";
      render();
    });
    $("btn-tema").addEventListener("click", function () {
      var actual = document.documentElement.getAttribute("data-tema");
      aplicarTema(actual === "oscuro" ? "claro" : "oscuro", true);
      renderCabecera();
    });

    $("btn-posturas-todas").addEventListener("click", function () {
      estado.posturas = POSTURA_IDS.slice();
      render();
    });
    $("btn-posturas-ninguna").addEventListener("click", function () {
      estado.posturas = [];
      estado.fijosPosturas = [];
      render();
    });
    $("btn-volver-todas").addEventListener("click", function () {
      estado.posturas = POSTURA_IDS.slice();
      render();
    });

    $("btn-criterios").addEventListener("click", function (e) {
      e.stopPropagation();
      alternarPopover();
    });
    $("popover-criterios").addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { cerrarPopover(); });
    $("btn-criterios-todos").addEventListener("click", function () {
      estado.criterios = CRITERIO_IDS.slice();
      render();
    });
    $("btn-criterios-ninguno").addEventListener("click", function () {
      estado.criterios = [];
      estado.fijosCriterios = [];
      render();
    });

    $("btn-voltear").addEventListener("click", function () {
      estado.volteada = !estado.volteada;
      render();
    });
    $("seg-densidad").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("button[data-densidad]") : null;
      if (!b) return;
      estado.densidad = b.getAttribute("data-densidad");
      render();
    });
    $("btn-diferencias").addEventListener("click", function () {
      var posturasVis = POSTURA_IDS.filter(function (id) { return estado.posturas.indexOf(id) >= 0; });
      if (!estado.soloDif && cuentaCoincidencias(posturasVis) === 0) {
        mostrarAviso(T[estado.idioma].sinCoincidencias);
        return;
      }
      estado.soloDif = !estado.soloDif;
      render();
    });

    $("tabla").addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest(".th-btn")) return;
      var td = e.target.closest ? e.target.closest("td[data-postura][data-criterio]") : null;
      if (!td) return;
      abrirModalCelda(td.getAttribute("data-postura"), td.getAttribute("data-criterio"));
    });
    $("contenedor-fichas").addEventListener("click", function (e) {
      var val = e.target.closest ? e.target.closest(".valor-criterio") : null;
      if (!val) return;
      abrirModalCelda(val.getAttribute("data-postura"), val.getAttribute("data-criterio"));
    });

    $("modal-cerrar").addEventListener("click", function () { $("modal-celda").classList.add("oculto"); });
    $("modal-celda").addEventListener("click", function (e) {
      if (e.target.id === "modal-celda") $("modal-celda").classList.add("oculto");
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      $("modal-celda").classList.add("oculto");
      $("modal-guia").classList.add("oculto");
      cerrarPopover();
    });

    // La tabla crece a lo ancho, no a lo alto: si no queda nada por recorrer en
    // vertical, la rueda del ratón desplaza horizontalmente.
    $("contenedor-tabla").addEventListener("wheel", function (e) {
      if (e.deltaY === 0 || e.ctrlKey) return;
      var c = $("contenedor-tabla");
      if (c.scrollHeight > c.clientHeight + 1) return;
      if (c.scrollWidth <= c.clientWidth + 1) return;
      c.scrollLeft += e.deltaY;
      e.preventDefault();
    }, { passive: false });

    window.addEventListener("resize", debounce(aplicarFijado, 150));
  }

  // ---------- carga de datos ----------

  function indexar(datos) {
    D = datos;
    E = datos.etiquetas;
    EJES_ORDEN = Object.keys(datos.ejes);
    POSTURA_IDS = datos.posturas.map(function (p) { return p.id; });
    CRITERIO_IDS = datos.criterios.map(function (c) { return c.id; });
    POSTURA_BY_ID = {};
    datos.posturas.forEach(function (p) { POSTURA_BY_ID[p.id] = p; });
    CRITERIO_BY_ID = {};
    datos.criterios.forEach(function (c) { CRITERIO_BY_ID[c.id] = c; });
    ejeSeleccion = {};
    EJES_ORDEN.forEach(function (eje) { ejeSeleccion[eje] = {}; });
  }

  function mostrarErrorCarga(mensaje) {
    $("aviso-vacio").hidden = false;
    $("contenedor-tabla").hidden = true;
    $("texto-aviso-vacio").textContent = mensaje;
    $("btn-volver-todas").hidden = true;
  }

  function iniciar() {
    cargarTema();
    if (!window.TABLA_DATOS) {
      mostrarErrorCarga("No se cargaron los datos: falta datos/tabla-inspiracion.js.");
      return;
    }
    indexar(window.TABLA_DATOS);
    estado = leerEstadoInicial();
    wireEventos();
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
