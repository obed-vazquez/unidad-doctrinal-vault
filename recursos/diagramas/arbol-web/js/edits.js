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

  function reconstruirIndice(postures) {
    var index = {};
    Object.keys(postures).forEach(function (pid) {
      (postures[pid].traditions || []).forEach(function (tradicion) {
        var name = tradicion.name;
        if (!index[name]) {
          index[name] = {
            canonical_name: name,
            aliases: (tradicion.aliases || []).slice(),
            posture_ids: [],
            tentative: !!tradicion.is_tentative
          };
        }
        if (index[name].posture_ids.indexOf(pid) === -1) {
          index[name].posture_ids.push(pid);
        }
      });
    });
    return index;
  }

  function aplicarOp(datos, op, edits) {
    if (op.op === 'rename') {
      var postura = datos.postures[op.postureId];
      if (!postura) return;
      postura.label = op.label;
      postura.is_unnamed = !op.label || op.label === '?' ;
      postura.is_suggested = !postura.is_unnamed && /\*$/.test(op.label);
      postura.is_local = true;
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
        is_local: true
      };
      origen.question_axes = (origen.question_axes || []).concat([op.id]);
      origen.is_local = true;
      return;
    }
    if (op.op === 'addAnswer') {
      var pregunta = datos.questions[op.questionId];
      if (!pregunta || datos.postures[op.postureId]) return;
      var nombre = op.postureLabel || '?';
      var sinNombre = !nombre || nombre === '?';
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
        label: op.answerLabel || 'Sí',
        full_label: op.answerLabel || 'Sí',
        gloss: op.gloss || null,
        target_posture_id: op.postureId,
        source_line: 0
      }]);
      pregunta.is_local = true;
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

  function nombrarPostura(edits, postureId, label) {
    return empujar(edits, { op: 'rename', postureId: postureId, label: String(label || '').trim() });
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

  function etiquetaRespuesta(respuesta) {
    if (respuesta.full_label) return respuesta.full_label.replace(/:\s*$/, '');
    if (respuesta.gloss) return respuesta.label + ', ' + respuesta.gloss;
    return respuesta.label;
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
    agregarPregunta: agregarPregunta,
    agregarRespuesta: agregarRespuesta,
    aMarkdown: aMarkdown
  };

})(window);
