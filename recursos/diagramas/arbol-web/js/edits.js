/* Contribuciones locales: nombrar posturas, añadir preguntas y respuestas.
   El documento canónico no se toca. Las operaciones viven en localStorage y
   se aplican encima del JSON generado. El botón de exportar escribe Markdown
   con la misma sintaxis que recursos/posturas-creencias.md. */

(function (global) {
  'use strict';

  var Arbol = global.Arbol || (global.Arbol = {});
  var CLAVE_EDITS = 'arbol-posturas/edits/v1';
  var CLAVES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  function clonar(valor) {
    return JSON.parse(JSON.stringify(valor));
  }

  function estadoVacio() {
    return { version: 1, ops: [], siguienteP: 1, siguienteQ: 1 };
  }

  function cargar() {
    var crudo = null;
    try { crudo = global.localStorage.getItem(CLAVE_EDITS); } catch (error) { return estadoVacio(); }
    if (!crudo) return estadoVacio();
    try {
      var guardado = JSON.parse(crudo);
      if (!guardado || !Array.isArray(guardado.ops)) return estadoVacio();
      return {
        version: 1,
        ops: guardado.ops,
        siguienteP: Number(guardado.siguienteP) || 1,
        siguienteQ: Number(guardado.siguienteQ) || 1
      };
    } catch (error) {
      return estadoVacio();
    }
  }

  function guardar(edits) {
    try {
      global.localStorage.setItem(CLAVE_EDITS, JSON.stringify(edits));
    } catch (error) { /* modo privado o cuota llena */ }
  }

  function olvidar() {
    try { global.localStorage.removeItem(CLAVE_EDITS); } catch (error) { /* nada */ }
  }

  function siguienteClave(pregunta) {
    var usadas = {};
    (pregunta.answers || []).forEach(function (respuesta) { usadas[respuesta.key] = true; });
    var i;
    for (i = 0; i < CLAVES.length; i++) {
      if (!usadas[CLAVES.charAt(i)]) return CLAVES.charAt(i);
    }
    return 'A' + (pregunta.answers || []).length;
  }

  /* Una postura puede pertenecer a varias tradiciones y una tradición reunir
     varias posturas. Se acumulan alias y adhesiones de todas ellas y, como en
     el generador, la tradición sale tentativa solo si todas sus adhesiones lo
     son: basta una firme para que el vínculo se considere firme. */
  function reconstruirIndice(postures) {
    var index = {};
    var adhesiones = {};
    Object.keys(postures).forEach(function (pid) {
      (postures[pid].traditions || []).forEach(function (tradicion) {
        var name = tradicion.name;
        if (!name) return;
        if (!index[name]) {
          index[name] = {
            canonical_name: name,
            aliases: [],
            posture_ids: [],
            tentative: false
          };
          adhesiones[name] = [];
        }
        (tradicion.aliases || []).forEach(function (alias) {
          if (index[name].aliases.indexOf(alias) === -1) index[name].aliases.push(alias);
        });
        if (index[name].posture_ids.indexOf(pid) === -1) {
          index[name].posture_ids.push(pid);
        }
        adhesiones[name].push(!!tradicion.is_tentative);
      });
    });
    Object.keys(index).forEach(function (name) {
      index[name].tentative = adhesiones[name].every(function (tentativa) {
        return tentativa;
      });
    });
    return index;
  }

  function marcarLocal(entidad) {
    if (entidad) entidad.is_local = true;
  }

  function sincronizarPregunta(pregunta) {
    if (!pregunta) return;
    var formal = pregunta.formal_text || '';
    var coloquial = pregunta.colloquial_hint || null;
    pregunta.full_text = coloquial ? formal + ' (' + coloquial + ')' : formal;
    pregunta.is_convergence = (pregunta.origin_posture_ids || []).length > 1;
    marcarLocal(pregunta);
  }

  function quitarEjeDePostura(postura, qid) {
    if (!postura) return;
    postura.question_axes = (postura.question_axes || []).filter(function (id) {
      return id !== qid;
    });
    marcarLocal(postura);
  }

  function añadirEjeAPostura(postura, qid) {
    if (!postura) return;
    postura.question_axes = postura.question_axes || [];
    if (postura.question_axes.indexOf(qid) === -1) postura.question_axes.push(qid);
    marcarLocal(postura);
  }

  function quitarOrigenDePregunta(pregunta, pid) {
    if (!pregunta) return;
    pregunta.origin_posture_ids = (pregunta.origin_posture_ids || []).filter(function (id) {
      return id !== pid;
    });
    sincronizarPregunta(pregunta);
  }

  function añadirOrigenAPregunta(pregunta, pid) {
    if (!pregunta) return;
    pregunta.origin_posture_ids = pregunta.origin_posture_ids || [];
    if (pregunta.origin_posture_ids.indexOf(pid) === -1) {
      pregunta.origin_posture_ids.push(pid);
    }
    sincronizarPregunta(pregunta);
  }

  function asegurarRaiz(datos, pid) {
    datos.root_postures = datos.root_postures || [];
    if (pid && datos.root_postures.indexOf(pid) === -1) datos.root_postures.push(pid);
  }

  function quitarRaiz(datos, pid) {
    datos.root_postures = (datos.root_postures || []).filter(function (id) {
      return id !== pid;
    });
  }

  function itemTradicion(s) {
    s = String(s || '').trim();
    if (!s) return null;
    var tentativa = /\?$/.test(s);
    var nombre = s.replace(/\?+$/, '').trim();
    if (!nombre) return null;
    return { name: nombre, is_tentative: tentativa, is_note: false };
  }

  function parseTradiciones(texto) {
    if (Array.isArray(texto)) {
      return texto.map(function (item) {
        if (item && typeof item === 'object') {
          return itemTradicion(item.name + (item.is_tentative ? '?' : ''));
        }
        return itemTradicion(item);
      }).filter(Boolean);
    }
    var raw = String(texto || '').trim();
    if (!raw) return [];
    if (raw.charAt(0) === '[') {
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return parseTradiciones(arr);
      } catch (e) { /* texto plano */ }
    }
    return raw.split(/[,;/]+/).map(itemTradicion).filter(Boolean);
  }

  function parseNotas(texto) {
    return String(texto || '').split(/\s*[·\n|]\s*/).map(function (s) {
      return s.trim();
    }).filter(Boolean);
  }

  function parseEnlaces(texto) {
    return String(texto || '').split(/[,;\n]+/).map(function (parte) {
      var s = parte.trim();
      if (!s) return null;
      var destino = s.replace(/^\[\[|\]\]$/g, '').trim();
      return { label: destino, target: destino };
    }).filter(Boolean);
  }

  function posturaAlcanzaPregunta(datos, pid, qid, vistosP, vistosQ) {
    vistosP = vistosP || {};
    vistosQ = vistosQ || {};
    if (!pid || vistosP[pid]) return false;
    vistosP[pid] = true;
    var postura = datos.postures[pid];
    if (!postura) return false;
    var ejes = postura.question_axes || [];
    var i;
    for (i = 0; i < ejes.length; i++) {
      if (ejes[i] === qid) return true;
      if (preguntaAlcanzaPregunta(datos, ejes[i], qid, vistosP, vistosQ)) return true;
    }
    return false;
  }

  function preguntaAlcanzaPregunta(datos, desdeQ, qid, vistosP, vistosQ) {
    vistosQ = vistosQ || {};
    vistosP = vistosP || {};
    if (!desdeQ || vistosQ[desdeQ]) return false;
    vistosQ[desdeQ] = true;
    var pregunta = datos.questions[desdeQ];
    if (!pregunta) return false;
    var respuestas = pregunta.answers || [];
    var i;
    for (i = 0; i < respuestas.length; i++) {
      if (posturaAlcanzaPregunta(datos, respuestas[i].target_posture_id, qid, vistosP, vistosQ)) {
        return true;
      }
    }
    return false;
  }

  function preguntaAlcanzaPostura(datos, qid, pid, vistosP, vistosQ) {
    vistosQ = vistosQ || {};
    vistosP = vistosP || {};
    if (!qid || vistosQ[qid]) return false;
    vistosQ[qid] = true;
    var pregunta = datos.questions[qid];
    if (!pregunta) return false;
    var respuestas = pregunta.answers || [];
    var i;
    for (i = 0; i < respuestas.length; i++) {
      var dest = respuestas[i].target_posture_id;
      if (dest === pid) return true;
      if (posturaAlcanzaPostura(datos, dest, pid, vistosP, vistosQ)) return true;
    }
    return false;
  }

  function posturaAlcanzaPostura(datos, desde, objetivo, vistosP, vistosQ) {
    vistosP = vistosP || {};
    vistosQ = vistosQ || {};
    if (!desde || vistosP[desde]) return false;
    if (desde === objetivo) return true;
    vistosP[desde] = true;
    var postura = datos.postures[desde];
    if (!postura) return false;
    var ejes = postura.question_axes || [];
    var i;
    for (i = 0; i < ejes.length; i++) {
      if (preguntaAlcanzaPostura(datos, ejes[i], objetivo, vistosP, vistosQ)) return true;
    }
    return false;
  }

  function seriaCicloRespuesta(datos, questionId, postureId) {
    if (!datos || !questionId || !postureId) return false;
    return posturaAlcanzaPregunta(datos, postureId, questionId);
  }

  function seriaCicloEje(datos, postureId, questionId) {
    if (!datos || !postureId || !questionId) return false;
    return preguntaAlcanzaPostura(datos, questionId, postureId);
  }

  function entradasPostura(datos, pid) {
    var n = 0;
    Object.keys(datos.questions || {}).forEach(function (qid) {
      (datos.questions[qid].answers || []).forEach(function (respuesta) {
        if (respuesta.target_posture_id === pid) n++;
      });
    });
    if ((datos.root_postures || []).indexOf(pid) !== -1) n++;
    return n;
  }

  function aplicarOp(datos, op, edits) {
    if (op.op === 'rename') {
      var postura = datos.postures[op.postureId];
      if (!postura) return;
      postura.label = op.label;
      postura.is_unnamed = !op.label || op.label === '?';
      postura.is_suggested = !postura.is_unnamed && /\*$/.test(op.label);
      marcarLocal(postura);
      return;
    }
    if (op.op === 'setQuestion') {
      var preguntaSet = datos.questions[op.id];
      if (!preguntaSet) return;
      if (Object.prototype.hasOwnProperty.call(op, 'formal')) {
        preguntaSet.formal_text = String(op.formal || '');
      }
      if (Object.prototype.hasOwnProperty.call(op, 'colloquial')) {
        var col = String(op.colloquial || '').trim();
        preguntaSet.colloquial_hint = col || null;
      }
      sincronizarPregunta(preguntaSet);
      return;
    }
    if (op.op === 'setPostureMeta') {
      var meta = datos.postures[op.postureId];
      if (!meta) return;
      if (Object.prototype.hasOwnProperty.call(op, 'traditions')) {
        meta.traditions = parseTradiciones(op.traditions);
      }
      if (Object.prototype.hasOwnProperty.call(op, 'notes')) {
        meta.notes = parseNotas(op.notes);
      }
      if (Object.prototype.hasOwnProperty.call(op, 'wikilinks')) {
        meta.wikilinks = parseEnlaces(op.wikilinks);
      }
      marcarLocal(meta);
      return;
    }
    if (op.op === 'setAnswer') {
      var preguntaAns = datos.questions[op.questionId];
      if (!preguntaAns) return;
      (preguntaAns.answers || []).forEach(function (respuesta) {
        if (respuesta.key !== op.key) return;
        if (Object.prototype.hasOwnProperty.call(op, 'label')) {
          respuesta.label = String(op.label || '');
        }
        if (Object.prototype.hasOwnProperty.call(op, 'gloss')) {
          respuesta.gloss = String(op.gloss || '').trim() || null;
        }
        respuesta.full_label = componerFullLabel(respuesta.label, respuesta.gloss);
      });
      marcarLocal(preguntaAns);
      return;
    }
    if (op.op === 'addQuestion') {
      var origen = datos.postures[op.postureId];
      if (!origen || datos.questions[op.id]) return;
      var formal = op.formal || '';
      var coloquial = op.colloquial || null;
      datos.questions[op.id] = {
        id: op.id,
        formal_text: formal,
        colloquial_hint: coloquial,
        full_text: coloquial ? formal + ' (' + coloquial + ')' : formal,
        source_line: 0,
        origin_posture_ids: [op.postureId],
        is_convergence: false,
        answers: [],
        wikilinks: [],
        is_local: true
      };
      origen.question_axes = (origen.question_axes || []).concat([op.id]);
      marcarLocal(origen);
      return;
    }
    if (op.op === 'addAnswer') {
      var pregunta = datos.questions[op.questionId];
      if (!pregunta || datos.postures[op.postureId]) return;
      var nombre = Object.prototype.hasOwnProperty.call(op, 'postureLabel')
        ? (op.postureLabel || '?') : '?';
      var sinNombre = !nombre || nombre === '?';
      var etiqueta = Object.prototype.hasOwnProperty.call(op, 'answerLabel')
        ? String(op.answerLabel || '') : 'Sí';
      datos.postures[op.postureId] = {
        id: op.postureId,
        label: sinNombre ? '?' : nombre,
        is_unnamed: sinNombre,
        is_suggested: !sinNombre && /\*$/.test(nombre),
        is_uncertain: false,
        traditions: [],
        notes: [],
        wikilinks: [],
        question_axes: [],
        is_local: true
      };
      pregunta.answers = (pregunta.answers || []).concat([{
        key: op.key,
        label: etiqueta,
        full_label: componerFullLabel(etiqueta, op.gloss),
        gloss: op.gloss || null,
        target_posture_id: op.postureId,
        source_line: 0
      }]);
      marcarLocal(pregunta);
      return;
    }
    if (op.op === 'rewireAnswer') {
      var preguntaOrigen = datos.questions[op.questionId];
      if (!preguntaOrigen) return;
      var answers = preguntaOrigen.answers || [];
      var idx = -1;
      answers.forEach(function (respuesta, i) {
        if (respuesta.key === op.key) idx = i;
      });
      if (idx < 0) return;
      var ans = answers[idx];
      if (op.newQuestionId && op.newQuestionId !== op.questionId) {
        var destQ = datos.questions[op.newQuestionId];
        if (!destQ) return;
        if (seriaCicloRespuesta(datos, destQ.id, ans.target_posture_id)) return;
        answers.splice(idx, 1);
        preguntaOrigen.answers = answers;
        marcarLocal(preguntaOrigen);
        ans.key = siguienteClave(destQ);
        destQ.answers = (destQ.answers || []).concat([ans]);
        marcarLocal(destQ);
      }
      if (op.newPostureId && op.newPostureId !== ans.target_posture_id) {
        if (!datos.postures[op.newPostureId]) return;
        var qidActual = op.newQuestionId || op.questionId;
        if (seriaCicloRespuesta(datos, qidActual, op.newPostureId)) return;
        var viejoDest = ans.target_posture_id;
        ans.target_posture_id = op.newPostureId;
        marcarLocal(datos.questions[qidActual]);
        if (op.huérfanoComoRaiz && viejoDest && entradasPostura(datos, viejoDest) === 0) {
          asegurarRaiz(datos, viejoDest);
        }
        if ((datos.root_postures || []).indexOf(op.newPostureId) !== -1
            && (datos.root_postures || []).length > 1) {
          quitarRaiz(datos, op.newPostureId);
        }
      }
      return;
    }
    if (op.op === 'rewireAxis') {
      var qEje = datos.questions[op.questionId];
      var from = datos.postures[op.fromPostureId];
      if (!qEje || !from) return;
      if (op.toPostureId && op.toPostureId !== op.fromPostureId) {
        var to = datos.postures[op.toPostureId];
        if (!to) return;
        if (seriaCicloEje(datos, to.id, qEje.id)) return;
        quitarEjeDePostura(from, qEje.id);
        añadirEjeAPostura(to, qEje.id);
        quitarOrigenDePregunta(qEje, from.id);
        añadirOrigenAPregunta(qEje, to.id);
        if (op.huérfanoComoRaiz && entradasPostura(datos, from.id) === 0
          && !(from.question_axes || []).length) {
          asegurarRaiz(datos, from.id);
        }
      }
      if (op.toQuestionId && op.toQuestionId !== op.questionId) {
        var q2 = datos.questions[op.toQuestionId];
        if (!q2) return;
        if (seriaCicloEje(datos, from.id, q2.id)) return;
        quitarEjeDePostura(from, qEje.id);
        añadirEjeAPostura(from, q2.id);
        quitarOrigenDePregunta(qEje, from.id);
        añadirOrigenAPregunta(q2, from.id);
      }
      return;
    }
    if (op.op === 'ensureRoot') {
      asegurarRaiz(datos, op.postureId);
      return;
    }
    if (op.op === 'removeSubtree') {
      var qids = op.questionIds || [];
      var pids = op.postureIds || [];
      qids.forEach(function (qid) {
        var qDel = datos.questions[qid];
        if (!qDel) return;
        (qDel.origin_posture_ids || []).forEach(function (pid) {
          if (datos.postures[pid]) quitarEjeDePostura(datos.postures[pid], qid);
        });
        delete datos.questions[qid];
      });
      pids.forEach(function (pid) {
        Object.keys(datos.questions).forEach(function (qid) {
          var qRest = datos.questions[qid];
          qRest.answers = (qRest.answers || []).filter(function (respuesta) {
            return respuesta.target_posture_id !== pid;
          });
          quitarOrigenDePregunta(qRest, pid);
        });
        quitarRaiz(datos, pid);
        delete datos.postures[pid];
      });
    }
  }

  function aplicar(canon, edits) {
    var datos = clonar(canon);
    (edits.ops || []).forEach(function (op) { aplicarOp(datos, op, edits); });
    datos.traditions_index = reconstruirIndice(datos.postures);
    datos.has_local_edits = !!(edits.ops && edits.ops.length);
    return datos;
  }

  function empujar(edits, op) {
    edits.ops.push(op);
    guardar(edits);
    return edits;
  }

  function mismaOpCampo(a, b) {
    if (!a || !b || a.op !== b.op) return false;
    if (a.op === 'rename') return a.postureId === b.postureId;
    if (a.op === 'setQuestion') return a.id === b.id;
    if (a.op === 'setPostureMeta') {
      return a.postureId === b.postureId
        && Object.keys(a).sort().join() === Object.keys(b).sort().join();
    }
    if (a.op === 'setAnswer') return a.questionId === b.questionId && a.key === b.key;
    return false;
  }

  function empujarOReemplazar(edits, op) {
    var last = edits.ops[edits.ops.length - 1];
    if (last && mismaOpCampo(last, op)) edits.ops[edits.ops.length - 1] = op;
    else edits.ops.push(op);
    guardar(edits);
    return edits;
  }

  function nombrarPostura(edits, postureId, label) {
    return empujarOReemplazar(edits, {
      op: 'rename', postureId: postureId, label: String(label || '').trim()
    });
  }

  function fijarPregunta(edits, id, formal, colloquial) {
    var op = { op: 'setQuestion', id: id };
    if (formal !== undefined) op.formal = String(formal || '');
    if (colloquial !== undefined) op.colloquial = String(colloquial || '');
    return empujarOReemplazar(edits, op);
  }

  function fijarMetaPostura(edits, postureId, campo, valor) {
    var op = { op: 'setPostureMeta', postureId: postureId };
    op[campo] = valor;
    return empujarOReemplazar(edits, op);
  }

  function fijarRespuesta(edits, questionId, key, label, gloss) {
    var op = {
      op: 'setAnswer', questionId: questionId, key: key, label: String(label || '')
    };
    if (gloss !== undefined) op.gloss = gloss;
    return empujarOReemplazar(edits, op);
  }

  function agregarPregunta(edits, postureId, formal, colloquial) {
    var id = 'QU' + (edits.siguienteQ++);
    empujar(edits, {
      op: 'addQuestion',
      id: id,
      postureId: postureId,
      formal: String(formal || '').trim(),
      colloquial: String(colloquial || '').trim() || null
    });
    return id;
  }

  function agregarRespuesta(edits, datos, questionId, answerLabel, postureLabel) {
    var pregunta = datos.questions[questionId];
    if (!pregunta) return null;
    var id = 'PU' + (edits.siguienteP++);
    empujar(edits, {
      op: 'addAnswer',
      questionId: questionId,
      postureId: id,
      key: siguienteClave(pregunta),
      answerLabel: String(answerLabel || 'Sí').trim() || 'Sí',
      postureLabel: String(postureLabel || '?').trim() || '?'
    });
    return id;
  }

  function agregarPosturaVacia(edits, datos, questionId) {
    var pregunta = datos.questions[questionId];
    if (!pregunta) return null;
    var id = 'PU' + (edits.siguienteP++);
    var key = siguienteClave(pregunta);
    empujar(edits, {
      op: 'addAnswer',
      questionId: questionId,
      postureId: id,
      key: key,
      answerLabel: '',
      postureLabel: '?'
    });
    return { postureId: id, questionId: questionId, key: key };
  }

  function extraerYCrearEje(edits, postureId) {
    var id = 'QU' + (edits.siguienteQ++);
    empujar(edits, {
      op: 'addQuestion',
      id: id,
      postureId: postureId,
      formal: '',
      colloquial: null
    });
    return id;
  }

  function reengancharRespuesta(edits, questionId, key, cambios) {
    empujar(edits, {
      op: 'rewireAnswer',
      questionId: questionId,
      key: key,
      newQuestionId: cambios.newQuestionId || null,
      newPostureId: cambios.newPostureId || null,
      huérfanoComoRaiz: !!cambios.huérfanoComoRaiz
    });
  }

  function reengancharEje(edits, questionId, fromPostureId, cambios) {
    empujar(edits, {
      op: 'rewireAxis',
      questionId: questionId,
      fromPostureId: fromPostureId,
      toPostureId: cambios.toPostureId || null,
      toQuestionId: cambios.toQuestionId || null,
      huérfanoComoRaiz: !!cambios.huérfanoComoRaiz
    });
  }

  function alcanceBorrado(grafo, nodoId) {
    var resultado = { nodos: [], postureIds: [], questionIds: [] };
    if (!grafo || !nodoId) return resultado;
    var alcanzables = new Set();
    var pila = (grafo.raices || []).filter(function (id) { return id !== nodoId; });
    while (pila.length) {
      var id = pila.pop();
      if (!id || id === nodoId || alcanzables.has(id)) continue;
      alcanzables.add(id);
      var n = grafo.nodos.get(id);
      if (!n) continue;
      (n.salidas || []).forEach(function (arista) {
        if (arista.tipo === 'control') return;
        pila.push(arista.hasta);
      });
    }
    grafo.nodos.forEach(function (nodo, id) {
      if (nodo.esControl) return;
      if (id !== nodoId && alcanzables.has(id)) return;
      resultado.nodos.push(id);
      if (nodo.posturaId && resultado.postureIds.indexOf(nodo.posturaId) === -1) {
        resultado.postureIds.push(nodo.posturaId);
      }
      if (nodo.preguntaId && resultado.questionIds.indexOf(nodo.preguntaId) === -1) {
        resultado.questionIds.push(nodo.preguntaId);
      }
    });
    return resultado;
  }

  function borrarSubarbol(edits, alcance) {
    empujar(edits, {
      op: 'removeSubtree',
      postureIds: (alcance && alcance.postureIds) || [],
      questionIds: (alcance && alcance.questionIds) || []
    });
  }

  function quedariaHuerfanaPostura(datos, pid, omitAnswer) {
    var n = 0;
    Object.keys(datos.questions || {}).forEach(function (qid) {
      (datos.questions[qid].answers || []).forEach(function (respuesta) {
        if (omitAnswer && omitAnswer.questionId === qid && omitAnswer.key === respuesta.key) {
          return;
        }
        if (respuesta.target_posture_id === pid) n++;
      });
    });
    return n === 0;
  }

  function etiquetaFuente(postura) {
    if (!postura) return '?';
    var texto = postura.is_unnamed ? '?' : (postura.label || '?');
    var grupos = [];
    (postura.traditions || []).forEach(function (tradicion) {
      grupos.push(tradicion.name + (tradicion.is_tentative ? '?' : ''));
    });
    (postura.notes || []).forEach(function (nota) { grupos.push(nota); });
    if (grupos.length) texto += ' {' + grupos.join(' / ') + '}';
    (postura.wikilinks || []).forEach(function (enlace) {
      var destino = enlace.target || enlace.label;
      if (destino) texto += ' [[' + destino + ']]';
    });
    return texto;
  }

  function textoPregunta(pregunta) {
    var formal = pregunta.formal_text || pregunta.full_text || '';
    if (pregunta.colloquial_hint) return formal + ' (' + pregunta.colloquial_hint + ')';
    return formal;
  }

  function componerFullLabel(label, gloss) {
    var corto = String(label || '').replace(/\s+$/g, '');
    var extra = String(gloss || '').trim();
    if (!corto) return extra;
    if (!extra) return corto;
    if (/^[,;(]/.test(extra)) return corto + extra;
    return corto + ', ' + extra;
  }

  function etiquetaRespuesta(respuesta) {
    if (respuesta.full_label) return respuesta.full_label.replace(/:\s*$/, '');
    return componerFullLabel(respuesta.label, respuesta.gloss);
  }

  function aMarkdown(datos) {
    var lineas = [
      '## Propuesta de árbol (generada desde el visor)',
      '',
      'Fecha: ' + new Date().toISOString().slice(0, 10),
      'Origen: visor interactivo. Revisar antes de integrar en posturas-creencias.md.',
      '',
      '## Árbol de Decisión:'
    ];
    var emitidas = {};

    function emitirPostura(pid, indent) {
      var postura = datos.postures[pid];
      if (!postura) return;
      (postura.question_axes || []).forEach(function (qid) {
        if (emitidas[qid]) return;
        emitidas[qid] = true;
        emitirPregunta(qid, indent);
      });
    }

    function emitirPregunta(qid, indent) {
      var pregunta = datos.questions[qid];
      if (!pregunta) return;
      var origenes = (pregunta.origin_posture_ids || []).map(function (pid) {
        return etiquetaFuente(datos.postures[pid]);
      }).join(' & ');
      lineas.push(indent + '- ' + origenes + ' -> ' + textoPregunta(pregunta));
      (pregunta.answers || []).forEach(function (respuesta) {
        var destino = datos.postures[respuesta.target_posture_id];
        lineas.push(indent + '  - ' + etiquetaRespuesta(respuesta) + ': ' + etiquetaFuente(destino));
        emitirPostura(respuesta.target_posture_id, indent + '    ');
      });
    }

    (datos.root_postures || []).forEach(function (pid) { emitirPostura(pid, ''); });
    return lineas.join('\n') + '\n';
  }

  Arbol.Edits = {
    CLAVE: CLAVE_EDITS,
    cargar: cargar,
    guardar: guardar,
    olvidar: olvidar,
    vacio: estadoVacio,
    aplicar: aplicar,
    nombrarPostura: nombrarPostura,
    fijarPregunta: fijarPregunta,
    fijarMetaPostura: fijarMetaPostura,
    fijarRespuesta: fijarRespuesta,
    agregarPregunta: agregarPregunta,
    agregarRespuesta: agregarRespuesta,
    agregarPosturaVacia: agregarPosturaVacia,
    extraerYCrearEje: extraerYCrearEje,
    reengancharRespuesta: reengancharRespuesta,
    reengancharEje: reengancharEje,
    alcanceBorrado: alcanceBorrado,
    borrarSubarbol: borrarSubarbol,
    seriaCicloRespuesta: seriaCicloRespuesta,
    seriaCicloEje: seriaCicloEje,
    quedariaHuerfanaPostura: quedariaHuerfanaPostura,
    valorTradiciones: function (postura) {
      return (postura.traditions || []).map(function (t) {
        return t.name + (t.is_tentative ? '?' : '');
      }).filter(Boolean).join(', ');
    },
    valorNotas: function (postura) {
      return (postura.notes || []).join(' · ');
    },
    valorEnlaces: function (postura) {
      return (postura.wikilinks || []).map(function (e) {
        return e.label || e.target;
      }).filter(Boolean).join(', ');
    },
    aMarkdown: aMarkdown
  };

})(window);
