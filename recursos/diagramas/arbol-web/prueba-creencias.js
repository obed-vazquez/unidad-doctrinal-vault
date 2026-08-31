/* Comprobación sin navegador del panel de creencias: qué abre la selección,
   qué conserva cada recorrido y cómo se busca una postura por su pregunta.

   Se ejecuta con `node prueba-creencias.js` desde recursos/diagramas/arbol-web/.
   Cubre los casos de specs/pruebas-creencias-opcionales.md que no dependen del
   DOM; los que sí (colores del resaltado, encuadre de la cámara, clics del
   cuestionario) siguen siendo verificación manual con ese documento. */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const datos = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'datos', 'posturas-creencias.json'), 'utf8')
);

const almacen = new Map();
const ventana = {
  localStorage: {
    getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
    setItem: (k, v) => almacen.set(k, String(v))
  },
  matchMedia: () => ({ matches: false }),
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {}
};
ventana.window = ventana;

const documento = {
  createElement(nombre) {
    if (nombre !== 'canvas') return {};
    return {
      getContext: () => ({
        font: '',
        measureText: (texto) => ({ width: texto.length * 7.1 })
      })
    };
  }
};

ventana.location = { search: '', pathname: '/index.html', href: 'file:///index.html' };
ventana.history = { replaceState() {} };

const contexto = vm.createContext(Object.assign(ventana, {
  document: documento,
  console,
  URLSearchParams, encodeURIComponent, decodeURIComponent,
  Map, Set, Math, JSON, Object, Array, String, Number, Boolean, isFinite,
  RegExp, Error, Infinity, Date
}));

['js/state.js', 'js/edits.js', 'js/layout.js', 'js/search.js', 'js/creencias.js']
  .forEach((archivo) => {
    vm.runInContext(fs.readFileSync(path.join(__dirname, archivo), 'utf8'), contexto, {
      filename: archivo
    });
  });

const Arbol = contexto.Arbol;
const Busqueda = Arbol.Busqueda;
const Creencias = Arbol.Creencias;
const grafo = Arbol.construirGrafo(datos);

const fallos = [];
function comprobar(nombre, condicion, detalle) {
  if (condicion) {
    console.log('  ok   ' + nombre);
  } else {
    console.log('  FALLA ' + nombre + (detalle ? ' → ' + detalle : ''));
    fallos.push(nombre);
  }
}

/* ---------------------------------------------------------- sujetos ------ */

const posturas = Busqueda.listaPosturasSueltas(datos, grafo);
const tradiciones = Busqueda.listaTradiciones(datos);

function postura(pid) {
  return posturas.filter((p) => p.posturaIds[0] === pid)[0];
}
function tradicion(nombre) {
  return tradiciones.filter((t) => t.nombre === nombre)[0];
}
const nodoDe = (pid) => grafo.idDePostura(pid);

// Postura A y B son hermanas: mismo camino salvo la última respuesta.
const POSTURA_A = postura('P98');   // Diotelitismo
const POSTURA_B = postura('P97');   // Monotelitismo / monotelismo
const POSTURA_C = postura('P75');   // Gracia Irresistible, por otra rama
const POSTURA_D = postura('P89');   // Docetismo
const RELIGION_A = tradicion('Nestorianismo');
const RELIGION_B = tradicion('Judaísmo rabínico/talmúdico');

console.log('\n== Sujetos de prueba ==');
comprobar('los seis sujetos del documento existen en el corpus',
  !!(POSTURA_A && POSTURA_B && POSTURA_C && POSTURA_D && RELIGION_A && RELIGION_B));

/* ------------------------------- la pregunta que lleva a la postura ------ */

console.log('\n== Pregunta y respuesta que definen una postura ==');

const entradaA = Creencias.entradaDePostura(grafo, datos, 'P98');
comprobar('la entrada de Diotelitismo es la pregunta de Getsemaní',
  entradaA && entradaA.pregunta.id === 'Q50', entradaA && entradaA.pregunta.id);
comprobar('con la respuesta que efectivamente lleva a ella',
  entradaA && entradaA.clave === 'B' && entradaA.respuesta.key === 'B',
  entradaA && entradaA.clave);

/* El caso que delataba el defecto: P96 plantea la pregunta de Getsemaní, pero
   la que lleva HASTA P96 es la anterior. Antes se tomaba la que plantea. */
const entradaP96 = Creencias.entradaDePostura(grafo, datos, 'P96');
comprobar('una postura que plantea pregunta propia se indexa por la que lleva a ella',
  entradaP96 && entradaP96.pregunta.id === 'Q49',
  entradaP96 && entradaP96.pregunta.id);

comprobar('la respuesta devuelta siempre pertenece a la pregunta devuelta',
  posturas.every((p) => {
    const e = Creencias.entradaDePostura(grafo, datos, p.posturaIds[0]);
    if (!e || !e.respuesta) return true;
    return (e.pregunta.answers || []).some((r) => r.key === e.respuesta.key);
  }));

/* ------------------------------------------------ búsqueda por pregunta -- */

console.log('\n== Búsqueda por pregunta y por respuesta ==');

const porGetsemani = Busqueda.filtrar(posturas, 'getseman').map((p) => p.posturaIds[0]);
comprobar('buscar la pregunta devuelve las posturas que esa pregunta abre',
  porGetsemani.indexOf('P97') !== -1 && porGetsemani.indexOf('P98') !== -1,
  porGetsemani.join(','));
comprobar('y no la postura que la formula',
  porGetsemani.indexOf('P96') === -1, porGetsemani.join(','));

const porRaiz = Busqueda.filtrar(posturas, 'universo fue causado').map((p) => p.posturaIds[0]);
comprobar('buscar la pregunta raíz encuentra Creacionismo',
  porRaiz.indexOf('P1') !== -1, porRaiz.join(','));

const porRespuesta = Busqueda.filtrar(posturas, 'solo apariencia').map((p) => p.posturaIds[0]);
comprobar('buscar el texto de una respuesta devuelve solo su destino',
  porRespuesta.length === 1 && porRespuesta[0] === 'P89', porRespuesta.join(','));

comprobar('la búsqueda ignora acentos y mayúsculas',
  Busqueda.filtrar(posturas, 'GETSEMANÍ').length === porGetsemani.length);

comprobar('un texto que no existe no devuelve nada',
  Busqueda.filtrar(posturas, 'xyzxyz-no-existe').length === 0);

comprobar('las religiones se buscan por nombre, no por pregunta',
  Busqueda.filtrar(tradiciones, 'Nestorianismo').length === 1
  && Busqueda.filtrar(tradiciones, 'getseman').length === 0);

/* -------------------------------------------------- posturas sin nombre -- */

console.log('\n== Posturas sin nombre ==');

comprobar('entran en la lista para poder buscarlas',
  posturas.some((p) => p.sinNombre));
comprobar('el panel no las enseña mientras no se busque nada',
  Busqueda.visiblesEnPanel(posturas, '', []).every((p) => !p.sinNombre));
comprobar('al buscar sí aparecen',
  Busqueda.visiblesEnPanel(Busqueda.filtrar(posturas, 'getseman'), 'getseman', [])
    .length === porGetsemani.length);

const unaSinNombre = posturas.filter((p) => p.sinNombre)[0];
comprobar('una vez marcada sigue a la vista aunque se borre la búsqueda',
  Busqueda.visiblesEnPanel(posturas, '', [unaSinNombre.posturaIds[0]])
    .some((p) => p.posturaIds[0] === unaSinNombre.posturaIds[0]));
comprobar('y al desmarcarla vuelve a ocultarse',
  !Busqueda.visiblesEnPanel(posturas, '', [])
    .some((p) => p.posturaIds[0] === unaSinNombre.posturaIds[0]));
comprobar('se distinguen entre sí por la pregunta que lleva a ellas',
  posturas.filter((p) => p.sinNombre)
    .every((p) => !!Creencias.entradaDePostura(grafo, datos, p.posturaIds[0])));

/* ------------------------------------------------- apertura del panel ---- */

console.log('\n== Lo que el panel abre en el árbol ==');

const aperturaA = Creencias.apertura(grafo, datos, [POSTURA_A]);
const aperturaReligionA = Creencias.apertura(grafo, datos, [RELIGION_A]);

comprobar('la apertura de una postura llega hasta su nodo',
  aperturaA.nodos.has(nodoDe('P98')));
comprobar('y trae las respuestas de todo su camino',
  Object.keys(aperturaA.respuestas).length === 13,
  String(Object.keys(aperturaA.respuestas).length));

const soloRaiz = Arbol.nodosVisibles(grafo, {}, 'indagatorio', null, null);
comprobar('sin panel, el indagatorio arranca solo con la raíz',
  soloRaiz.size === 1, 'visibles=' + soloRaiz.size);

/* El defecto H-5: marcar una religión no volvía visibles sus nodos en los
   recorridos que se dibujan a partir de las respuestas. */
const conReligion = Arbol.nodosVisibles(grafo, {}, 'indagatorio', null, aperturaReligionA);
comprobar('marcar una religión abre el árbol hasta su postura en indagatorio',
  conReligion.has(nodoDe('P93')), 'visibles=' + conReligion.size);
comprobar('y también en limpio',
  Arbol.nodosVisibles(grafo, {}, 'limpio', null, aperturaReligionA).has(nodoDe('P93')));

comprobar('en el cuestionario las religiones no aportan resaltado',
  Creencias.resaltadoDeTradiciones(grafo, datos, [RELIGION_A], 'cuestionario').size === 0);
comprobar('fuera del cuestionario el resaltado cubre el camino entero',
  Creencias.resaltadoDeTradiciones(grafo, datos, [RELIGION_A], 'indagatorio')
    .has(nodoDe('P93')));

const coincidentesPostura = Creencias.nodosCoincidentes(grafo, [POSTURA_A]);
comprobar('la postura marcada coincide con su tarjeta en el árbol',
  coincidentesPostura.size === 1 && coincidentesPostura.has(nodoDe('P98')));
const coincidentesReligion = Creencias.nodosCoincidentes(grafo, [RELIGION_A]);
comprobar('la religión marcada coincide con la tarjeta de su postura',
  coincidentesReligion.size >= 1 && coincidentesReligion.has(nodoDe('P93')));

/* ------------------------------ cada recorrido conserva su regla --------- */

console.log('\n== El panel suma sin romper el recorrido ==');

const indagatorioA = Arbol.nodosVisibles(grafo, {}, 'indagatorio', null, aperturaA);
comprobar('el indagatorio sigue revelando el hermano de cada respuesta',
  indagatorioA.has(nodoDe('P97')), 'no apareció Monotelitismo');
comprobar('y lo deja atenuado, no como parte de la ruta',
  Arbol.nodosDeshabilitados(grafo, {}, indagatorioA, aperturaA).has(nodoDe('P97')));
comprobar('sin atenuar nunca los nodos de la propia ruta',
  !Arbol.nodosDeshabilitados(grafo, {}, indagatorioA, aperturaA).has(nodoDe('P98')));

const limpioA = Arbol.nodosVisibles(grafo, {}, 'limpio', null, aperturaA);
comprobar('el limpio sigue enseñando una sola rama por pregunta',
  limpioA.has(nodoDe('P98')) && !limpioA.has(nodoDe('P97')));

const expandidos = new Set();
const exploracionA = Arbol.nodosVisibles(grafo, {}, 'exploracion', expandidos, aperturaA);
comprobar('en exploración la apertura abre la ruta sin tocar lo expandido',
  exploracionA.has(nodoDe('P98')) && expandidos.size === 0);

const exploracionReligion = Arbol.nodosVisibles(grafo, {}, 'exploracion', new Set(), aperturaReligionA);
comprobar('en exploración una religión deja visibles sus nodos (no los oculta)',
  exploracionReligion.has(nodoDe('P93')), 'visibles=' + exploracionReligion.size);

/* Dos posturas contrapuestas: las dos ramas quedan a la vista. */
const aperturaAB = Creencias.apertura(grafo, datos, [POSTURA_A, POSTURA_B]);
const indagatorioAB = Arbol.nodosVisibles(grafo, {}, 'indagatorio', null, aperturaAB);
comprobar('dos posturas contrarias abren sus dos ramas',
  indagatorioAB.has(nodoDe('P97')) && indagatorioAB.has(nodoDe('P98')));

/* ------------------------ cuestionario: solo preguntas definitorias ------- */

console.log('\n== Cuestionario: varias posturas en el panel ==');

function idsPreguntasDefinitorias(posturaIds) {
  var ids = new Set();
  posturaIds.forEach(function (pid) {
    var entrada = Creencias.entradaDePostura(grafo, datos, pid);
    if (entrada && entrada.pregunta) ids.add(entrada.pregunta.id);
  });
  return ids;
}

const definitoriasA = idsPreguntasDefinitorias(['P98']);
comprobar('una postura muestra solo su pregunta definitoria (no ancestros)',
  definitoriasA.size === 1 && definitoriasA.has('Q50'), Array.from(definitoriasA).join(','));

const definitoriasAB = idsPreguntasDefinitorias(['P97', 'P98']);
comprobar('dos posturas hermanas comparten una sola pregunta definitoria',
  definitoriasAB.size === 1 && definitoriasAB.has('Q50'), Array.from(definitoriasAB).join(','));

const definitoriasAC = idsPreguntasDefinitorias(['P98', 'P75']);
comprobar('dos posturas de ramas distintas muestran sus dos preguntas definitorias',
  definitoriasAC.size === 2
  && definitoriasAC.has('Q50') && definitoriasAC.has('Q39'),
  Array.from(definitoriasAC).join(','));

const definitoriasMonopro = idsPreguntasDefinitorias(['P94']);
comprobar('Monoprosopismo: solo Q48, no las preguntas ancestro del camino',
  definitoriasMonopro.size === 1 && definitoriasMonopro.has('Q48'),
  Array.from(definitoriasMonopro).join(','));

comprobar('en el nodo raíz no hay postura seleccionable (solo Existencia)',
  !!(datos.postures.PR1 && datos.postures.PR1.is_root));

const estadoQ1Contestada = {
  grafo: grafo,
  datos: datos,
  divulgacion: 'cuestionario',
  panelAbierto: true,
  posturasSueltas: ['P1'],
  posturasExploradasCuestionario: [],
  respuestas: { Q1: 'A' }
};
comprobar('Creacionismo con Q1 ya respondida no activa vista previa',
  !Creencias.enModoDefinitoriasCuestionario(estadoQ1Contestada));
comprobar('Creacionismo con Q1 ya respondida no cuenta como pendiente en el quiz',
  !(Creencias.posturasConPreguntaEnCuestionario(estadoQ1Contestada) || []).length);
comprobar('Creacionismo sigue marcado en el panel aunque Q1 ya esté respondida',
  estadoQ1Contestada.posturasSueltas.indexOf('P1') !== -1);

const resolucionP98 = Busqueda.resolver(grafo, datos, POSTURA_A);
const entradaP98 = Creencias.entradaDePostura(grafo, datos, 'P98');
const rutasSinDefinitoria = {};
Object.keys(resolucionP98.respuestas).forEach(function (qid) {
  if (qid !== entradaP98.pregunta.id) rutasSinDefinitoria[qid] = resolucionP98.respuestas[qid];
});
const visiblesQuiz = Arbol.nodosVisibles(grafo, rutasSinDefinitoria, 'limpio', null);
let q50Pendiente = false;
visiblesQuiz.forEach(function (id) {
  var n = grafo.nodos.get(id);
  if (n && n.preguntaId === entradaP98.pregunta.id
    && rutasSinDefinitoria[n.preguntaId] == null) q50Pendiente = true;
});
comprobar('Explorar en cuestionario deja pendiente la pregunta definitoria',
  q50Pendiente);

const pendientesExplorado = Creencias.preguntasDefinitorias(grafo, datos, ['P94']);
comprobar('tras Explorar Monoprosopismo solo se muestra su pregunta definitoria',
  pendientesExplorado.length === 1 && pendientesExplorado[0].preguntaId === 'Q48',
  pendientesExplorado.map(function (n) { return n.preguntaId; }).join(','));

const POSTURA_MONO = postura('P94');
const resolucionP94 = Busqueda.resolver(grafo, datos, POSTURA_MONO);
const entradaP94 = Creencias.entradaDePostura(grafo, datos, 'P94');
const rutasMonopro = {};
Object.keys(resolucionP94.respuestas).forEach(function (qid) {
  if (qid !== entradaP94.pregunta.id) rutasMonopro[qid] = resolucionP94.respuestas[qid];
});
const estadoExplorado = {
  grafo: grafo,
  datos: datos,
  divulgacion: 'cuestionario',
  panelAbierto: false,
  posturasSueltas: [],
  posturasExploradasCuestionario: ['P94'],
  rutasExploradas: rutasMonopro,
  respuestas: {}
};
comprobar('Monoprosopismo explorado activa modo definitorias',
  Creencias.enModoDefinitoriasCuestionario(estadoExplorado));
const defsExplorado = Creencias.preguntasDefinitorias(
  grafo, datos, Creencias.posturasConPreguntaEnCuestionario(estadoExplorado));
let limpioPendientes = 0;
Arbol.nodosVisibles(grafo, rutasMonopro, 'limpio', null).forEach(function (id) {
  var n = grafo.nodos.get(id);
  if (n && n.preguntaId && rutasMonopro[n.preguntaId] == null) limpioPendientes++;
});
comprobar('el escaneo limpio mostraría convergencias extra (regresión)',
  limpioPendientes > 1, 'pendientes=' + limpioPendientes);
comprobar('pero modo definitorias sigue mostrando solo Q48',
  defsExplorado.length === 1 && defsExplorado[0].preguntaId === 'Q48',
  defsExplorado.map(function (n) { return n.preguntaId; }).join(','));

const aperturaAC = Creencias.apertura(grafo, datos, [POSTURA_A, POSTURA_C]);
comprobar('dos posturas de ramas distintas abren las dos',
  aperturaAC.nodos.has(nodoDe('P98')) && aperturaAC.nodos.has(nodoDe('P75')));

/* -------------------------------- el panel no reescribe nada del usuario - */

console.log('\n== El panel no toca lo que el usuario respondió ==');

const respuestasUsuario = { Q1: 'A', Q2: 'A' };
const antes = JSON.stringify(respuestasUsuario);
Arbol.nodosVisibles(grafo, respuestasUsuario, 'indagatorio', null, aperturaA);
comprobar('dibujar con la apertura no modifica las respuestas',
  JSON.stringify(respuestasUsuario) === antes);

const expandidosPrevios = new Set(['T:PR1']);
Arbol.nodosVisibles(grafo, {}, 'exploracion', expandidosPrevios, aperturaA);
comprobar('ni la expansión guardada del recorrido',
  expandidosPrevios.size === 1 && expandidosPrevios.has('T:PR1'));

/* Cerrar el panel es dejar de pasar la apertura: el árbol vuelve solo. */
comprobar('al cerrar el panel el árbol vuelve a su estado base',
  Arbol.nodosVisibles(grafo, {}, 'indagatorio', null, null).size === soloRaiz.size);

/* --------------------------------------------------------- predicados --- */

console.log('\n== Dónde opera cada control ==');

comprobar('las religiones quedan fuera del cuestionario',
  !Creencias.religionesDisponibles('cuestionario'));
comprobar('y operan en todos los demás recorridos',
  ['indagatorio', 'limpio', 'exploracion', 'completo', 'edicion']
    .every((r) => Creencias.religionesDisponibles(r)));

comprobar('«Explorar todas» está deshabilitado en el cuestionario',
  !Creencias.explorarTodasDisponible('cuestionario'));
comprobar('y habilitado en el resto',
  ['indagatorio', 'limpio', 'exploracion', 'completo', 'edicion']
    .every((r) => Creencias.explorarTodasDisponible(r)));

comprobar('el panel solo pinta si está abierto y hay algo marcado',
  !Creencias.afectaArbol(false, [RELIGION_A], [])
  && !Creencias.afectaArbol(true, [], [])
  && Creencias.afectaArbol(true, [], ['P98']));

/* ------------------------------------------ expansión por recorrido ------ */

console.log('\n== Cajones de expansión ==');

const Estado = Arbol.Estado;
Estado.datos = datos;
Estado.grafo = grafo;
Estado._oyentes = [];
Estado.respuestas = {};
Estado.superpuestas = {};
Estado.rutasExploradas = {};
Estado.aperturaCreencias = null;
Estado.expandidosPorRecorrido = {};
Estado.expandidos = new Set();
Estado.divulgacion = 'exploracion';

Estado.expandidos = new Set(['T:PR1']);
Estado.sincronizarExpandidosGuardados();
Estado.fijarDivulgacion('limpio');
Estado.fijarDivulgacion('indagatorio');
comprobar('indagatorio, limpio y exploración comparten expansión',
  Estado.expandidos.has('T:PR1'), Array.from(Estado.expandidos).join(','));

Estado.fijarDivulgacion('completo');
Estado.expandidos = new Set(['T:P1']);
Estado.sincronizarExpandidosGuardados();
Estado.fijarDivulgacion('edicion');
comprobar('árbol completo y edición no se prestan la suya',
  !Estado.expandidos.has('T:P1'), Array.from(Estado.expandidos).join(','));

Estado.fijarDivulgacion('completo');
comprobar('y cada uno recupera la propia al volver',
  Estado.expandidos.has('T:P1'), Array.from(Estado.expandidos).join(','));

Estado.fijarDivulgacion('exploracion');
comprobar('el cajón compartido sigue intacto tras pasar por los separados',
  Estado.expandidos.has('T:PR1'), Array.from(Estado.expandidos).join(','));

/* --------------------------------------- las ramas fijadas sobreviven ---- */

console.log('\n== Ramas fijadas por «Explorar» ==');

Estado.expandidos = new Set();
Estado.expandidosPorRecorrido = {};
Estado.divulgacion = 'indagatorio';
Estado.rutasExploradas = Creencias.apertura(grafo, datos, [POSTURA_A]).respuestas;

comprobar('la rama fijada se ve sin que el usuario respondiera nada',
  Estado.visibles().has(nodoDe('P98')));

Estado.divulgacion = 'cuestionario';
comprobar('y sigue rigiendo dentro del cuestionario',
  Object.keys(Estado.respuestasEfectivas()).length === 13,
  String(Object.keys(Estado.respuestasEfectivas()).length));

Estado.divulgacion = 'limpio';
comprobar('en limpio dibuja su rama y no la hermana',
  Estado.visibles().has(nodoDe('P98')) && !Estado.visibles().has(nodoDe('P97')));

Estado.aperturaCreencias = Creencias.apertura(grafo, datos, [RELIGION_B]);
const conAmbas = Estado.visibles();
Estado.aperturaCreencias = null;
comprobar('cerrar el panel no colapsa la rama fijada',
  conAmbas.has(nodoDe('P11')) && Estado.visibles().has(nodoDe('P98'))
  && !Estado.visibles().has(nodoDe('P11')));

/* ---------------- «Sin respuesta» tras «Explorar» en cuestionario -------- */

console.log('\n== «Sin respuesta» tras «Explorar» en cuestionario ==');

function preguntasPendientesQuiz(estado) {
  var resp = estado.respuestasEfectivas();
  var vis = Arbol.nodosVisibles(grafo, resp, 'limpio', estado.expandidos,
    null, estado.ramasSinRespuesta);
  var lista = [];
  var vistos = new Set();
  vis.forEach(function (id) {
    var n = grafo.nodos.get(id);
    if (!n || !n.preguntaId) return;
    if (resp[n.preguntaId] != null) return;
    if (estado.ramasSinRespuesta && estado.ramasSinRespuesta[n.preguntaId]) return;
    if (vistos.has(n.preguntaId)) return;
    vistos.add(n.preguntaId);
    lista.push(n.preguntaId);
  });
  return lista.sort();
}

const posturasNino = Busqueda.filtrar(posturas, 'Cuando un niño');
comprobar('la búsqueda «Cuando un niño» devuelve dos posturas sin nombre',
  posturasNino.length === 2
  && posturasNino.every((p) => p.sinNombre)
  && posturasNino.some((p) => p.posturaIds[0] === 'P64')
  && posturasNino.some((p) => p.posturaIds[0] === 'P70'));

Estado.respuestas = {};
Estado.rutasExploradas = {};
Estado.ramasSinRespuesta = {};
Estado.posturasExploradasCuestionario = [];
Estado.divulgacion = 'cuestionario';

const POSTURA_NINO = posturasNino.find((p) => p.posturaIds[0] === 'P64');
const resolucionNino = Busqueda.resolver(grafo, datos, POSTURA_NINO);
const entradaNino = Creencias.entradaDePostura(grafo, datos, 'P64');
const rutasNino = {};
Object.keys(resolucionNino.respuestas).forEach(function (qid) {
  if (qid !== entradaNino.pregunta.id) rutasNino[qid] = resolucionNino.respuestas[qid];
});
Estado.rutasExploradas = rutasNino;
Estado.posturasExploradasCuestionario = ['P64'];

Estado.responder(entradaNino.pregunta.id, entradaNino.clave);
Estado.posturasExploradasCuestionario = Creencias.retirarPosturasContestadas(
  grafo, datos, Estado.posturasExploradasCuestionario, entradaNino.pregunta.id);

const antesSinRespuesta = preguntasPendientesQuiz(Estado);
comprobar('tras responder la definitoria quedan preguntas laterales abiertas',
  antesSinRespuesta.indexOf('Q23') !== -1, antesSinRespuesta.join(','));

Estado.marcarSinRespuesta('Q23');
comprobar('marcar «Sin respuesta» conserva la marca en ramasSinRespuesta',
  !!Estado.ramasSinRespuesta.Q23);
comprobar('marcar «Sin respuesta» no borra respuestas ya elegidas',
  Estado.respuestas[entradaNino.pregunta.id] === entradaNino.clave);
const despuesSinRespuesta = preguntasPendientesQuiz(Estado);
comprobar('marcar «Sin respuesta» elimina esa pregunta de las pendientes',
  despuesSinRespuesta.indexOf('Q23') === -1, despuesSinRespuesta.join(','));
comprobar('la pregunta ya respondida sigue fuera de las pendientes',
  despuesSinRespuesta.indexOf(entradaNino.pregunta.id) === -1);

console.log('\n' + (fallos.length
  ? fallos.length + ' comprobación(es) fallidas: ' + fallos.join(' | ')
  : 'Todas las comprobaciones pasaron.') + '\n');
process.exit(fallos.length ? 1 : 0);
