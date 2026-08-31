#!/usr/bin/env python3
"""Convierte el árbol Markdown de posturas doctrinales al visor web y, bajo petición, a diagramas.

Por defecto solo regenera los datos del visor (JSON/JS). Mermaid, DrawDecisionTree,
Graphviz y la imagen se generan con ``--diagramas`` o con cada flag por separado.

El documento fuente describe dos clases de líneas en una lista Markdown:

* ``Respuesta: Postura``
* ``Postura -> Pregunta``

La sangría marca el contexto de cada respuesta. El conversor también tolera
respuestas que, por error editorial, quedaron a la misma profundidad que la
pregunta que responden.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


TREE_HEADER = "## Árbol de Decisión:"
CHOICES = "ABCDEF"
IMAGE_FORMATS = ("svg", "png", "pdf")
DEFAULT_IMAGE_FORMAT = "svg"
DEFAULT_DPI = 300
LABEL_WIDTH = 30

# Los mismos colores que classDef en el Mermaid, para que los tres formatos se
# lean como un solo diagrama.
QUESTION_COLORS = ("#FFF3CD", "#8A6D3B", "#2F250D")
POSTURE_COLORS = ("#E7F1FF", "#2E6DA4", "#102A43")
WIKILINK = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
LIST_ITEM = re.compile(r"^(?P<indent>[ \t]*)-\s+(?P<text>.+?)\s*$")

# --- Modelo de datos del visor web (arbol-web) --------------------------------
JSON_SCHEMA_VERSION = "1.0.0"
WEB_APP_DIRECTORY = "arbol-web"
WEB_DATA_DIRECTORY = "datos"
WEB_DATA_GLOBAL = "__ARBOL_POSTURAS__"
WEB_NOTES_GLOBAL = "__ARBOL_NOTAS__"
WEB_NOTES_FILENAME = "notas.cache.js"
GROUP = re.compile(r"\{([^{}]*)\}")
EMPHASIS = re.compile(r"\*\*(.+?)\*\*", re.DOTALL)
TRAILING_PARENTHESIS = re.compile(r"\s*\([^()]*\)\s*$")
ANSWER_HEAD = re.compile(r"^(s[íi]|no)\b[\s,;:.—–-]*(.*)$", re.IGNORECASE | re.DOTALL)


@dataclass
class SourceItem:
    index: int
    line_number: int
    indent: int
    text: str
    parent: int | None = None
    kind: str = "unknown"
    left: str = ""
    right: str = ""


@dataclass
class Posture:
    id: str
    label: str
    aliases: set[str]
    questions: list[str] = field(default_factory=list)
    # Texto tal como aparece en el Markdown: conserva los [[wikilinks]] y los
    # {grupos} que `label` ya normalizó. Solo lo consume la salida JSON.
    raw: str = ""


@dataclass
class Question:
    id: str
    text: str
    formal_text: str
    source_line: int
    posture_hints: list[str] = field(default_factory=list)
    colloquial_hint: str | None = None
    answers: list["Answer"] = field(default_factory=list)
    # Texto crudo de la línea (con [[wikilinks]]); `text` ya los aplanó.
    raw: str = ""


@dataclass
class Answer:
    label: str
    target_posture: str
    source_line: int


@dataclass
class Model:
    postures: dict[str, Posture] = field(default_factory=dict)
    questions: dict[str, Question] = field(default_factory=dict)
    root_questions: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    _posture_number: int = 0
    _question_number: int = 0

    def add_posture(self, label: str) -> str:
        self._posture_number += 1
        posture_id = f"P{self._posture_number}"
        cleaned = display_text(label)
        self.postures[posture_id] = Posture(
            id=posture_id,
            label=cleaned,
            aliases=alias_keys(cleaned),
            raw=" ".join(label.strip().split()),
        )
        return posture_id

    def add_question(self, text: str, source_line: int) -> str:
        self._question_number += 1
        question_id = f"Q{self._question_number}"
        raw = " ".join(text.strip().split())
        full_text = display_text(text)
        formal_text, colloquial_hint = split_colloquial_question(full_text)
        self.questions[question_id] = Question(
            id=question_id,
            text=full_text,
            formal_text=formal_text,
            source_line=source_line,
            colloquial_hint=colloquial_hint,
            raw=raw,
        )
        return question_id


def display_text(value: str) -> str:
    """Convierte wikilinks de Obsidian a su texto visible y compacta espacios."""

    def replace_wikilink(match: re.Match[str]) -> str:
        return match.group(2) or match.group(1)

    value = WIKILINK.sub(replace_wikilink, value)
    return " ".join(value.strip().split())


def split_colloquial_question(question: str) -> tuple[str, str | None]:
    """Separa el paréntesis coloquial final de la pregunta formal.

    Tras el ``?`` que cierra la pregunta principal, un paréntesis final es la
    versión coloquial (aunque no lleve signos de interrogación). Así se
    conservan aclaraciones formales internas como ``(estado de “pecador”)``.
    """

    match = re.search(r"(\?)\s+\(([^()]+)\)\s*$", question)
    if not match:
        return question, None
    return question[: match.start(1) + 1].rstrip(), match.group(2).strip()


def output_posture_label(label: str) -> str:
    """Representa una postura sin nombre como guion en los diagramas."""

    text = display_text(label)
    if text == "?":
        return "-"
    if text.startswith("? "):
        return "-" + text[1:]
    return text


def alias_keys(label: str) -> set[str]:
    """Devuelve nombres con los que una postura puede volver a referenciarse."""

    normalized = display_text(label)
    without_group = re.sub(r"\s*\{.*?\}\s*$", "", normalized).strip()
    keys = {normalize_name(normalized), normalize_name(without_group)}

    # "Diofisismo / Calcedonianismo (también Miafisismo)" puede ser citado
    # después simplemente como "Diofisismo".
    for part in without_group.split("/"):
        part = re.sub(r"\s*\(.*?\)\s*$", "", part).strip()
        if part:
            keys.add(normalize_name(part))
    return {key for key in keys if key}


def normalize_name(value: str) -> str:
    return re.sub(r"\s+", " ", display_text(value)).strip().casefold()


def split_origins(value: str) -> list[str]:
    return [part.strip() for part in value.split("&") if part.strip()]


def extract_tree_items(markdown: str) -> list[SourceItem]:
    """Extrae solo las líneas de lista que pertenecen al árbol de decisión."""

    in_tree = False
    items: list[SourceItem] = []
    for line_number, line in enumerate(markdown.splitlines(), start=1):
        if line.strip() == TREE_HEADER:
            in_tree = True
            continue
        if in_tree and line.startswith("#"):
            break
        if not in_tree:
            continue

        match = LIST_ITEM.match(line)
        if not match:
            continue
        indent = len(match.group("indent").expandtabs(4))
        items.append(
            SourceItem(
                index=len(items),
                line_number=line_number,
                indent=indent,
                text=match.group("text"),
            )
        )

    if not items:
        raise ValueError(f"No se encontró la sección {TREE_HEADER!r} ni líneas de árbol.")
    return items


def classify_items(items: list[SourceItem]) -> None:
    """Clasifica cada lista y conserva su padre Markdown más cercano."""

    stack: list[int] = []
    for item in items:
        while stack and items[stack[-1]].indent >= item.indent:
            stack.pop()
        item.parent = stack[-1] if stack else None
        stack.append(item.index)

        if "->" in item.text:
            left, right = item.text.split("->", maxsplit=1)
            if left.strip() and right.strip():
                item.kind = "question"
                item.left = left.strip()
                item.right = right.strip()
                continue
        if ":" in item.text:
            left, right = item.text.split(":", maxsplit=1)
            if left.strip() and right.strip():
                item.kind = "answer"
                item.left = left.strip()
                item.right = right.strip()


def ancestor_indexes(item: SourceItem, items: list[SourceItem]) -> Iterable[int]:
    parent = item.parent
    while parent is not None:
        yield parent
        parent = items[parent].parent


def parent_question_index(item: SourceItem, items: list[SourceItem]) -> int | None:
    """Encuentra la pregunta que recibe una respuesta.

    La primera búsqueda respeta la jerarquía Markdown. La segunda repara un
    patrón presente en el documento: una pregunta y sus respuestas comparten
    indebidamente el mismo nivel de sangría.
    """

    for ancestor in ancestor_indexes(item, items):
        if items[ancestor].kind == "question":
            return ancestor

    # Una pregunta a la misma altura sigue abierta mientras no aparezca una
    # línea con menor sangría. Elegimos la más reciente dentro de ese bloque.
    for previous_index in range(item.index - 1, -1, -1):
        previous = items[previous_index]
        if previous.indent < item.indent:
            break
        if previous.kind == "question" and previous.indent == item.indent:
            return previous_index
    return None


def nearest_matching_posture(
    item: SourceItem,
    origin: str,
    items: list[SourceItem],
    answer_targets: dict[int, str],
    model: Model,
) -> str | None:
    key = normalize_name(origin)

    # Para "?" no se reutiliza globalmente: cada hueco pendiente es distinto.
    for ancestor in ancestor_indexes(item, items):
        posture_id = answer_targets.get(ancestor)
        if posture_id and key in model.postures[posture_id].aliases:
            return posture_id

    candidates = [
        posture_id
        for posture_id, posture in model.postures.items()
        if key in posture.aliases
    ]
    if key == "?":
        return None
    return candidates[-1] if candidates else None


def build_model(markdown: str) -> Model:
    items = extract_tree_items(markdown)
    classify_items(items)
    model = Model()
    answer_targets: dict[int, str] = {}
    question_ids: dict[int, str] = {}

    for item in items:
        if item.kind == "answer":
            target_is_root_question = (
                parent_question_index(item, items) is None
                and item.right.lstrip().startswith("¿")
            )
            posture_id = model.add_posture(item.left if target_is_root_question else item.right)
            answer_targets[item.index] = posture_id

            if target_is_root_question:
                root_question_id = model.add_question(item.right, item.line_number)
                question_ids[item.index] = root_question_id
                model.root_questions.append(root_question_id)
                model.questions[root_question_id].posture_hints.append(display_text(item.left))
                model.questions[root_question_id].answers.append(
                    Answer(item.left, posture_id, item.line_number)
                )
                continue

            source_item_index = parent_question_index(item, items)
            if source_item_index is None:
                model.warnings.append(
                    f"Línea {item.line_number}: respuesta sin pregunta origen: {item.text!r}."
                )
                continue
            source_question_id = question_ids.get(source_item_index)
            if source_question_id is None:
                model.warnings.append(
                    f"Línea {item.line_number}: no se pudo resolver la pregunta para {item.text!r}."
                )
                continue
            model.questions[source_question_id].answers.append(
                Answer(display_text(item.left), posture_id, item.line_number)
            )

        elif item.kind == "question":
            question_id = model.add_question(item.right, item.line_number)
            question_ids[item.index] = question_id
            model.questions[question_id].posture_hints.extend(
                display_text(origin) for origin in split_origins(item.left)
            )
            resolved_origins: list[str] = []
            for origin in split_origins(item.left):
                posture_id = nearest_matching_posture(
                    item, origin, items, answer_targets, model
                )
                if posture_id is None:
                    # El primer nodo puede declarar la pregunta raíz sin que
                    # una respuesta previa haya introducido su postura.
                    if item.parent is None:
                        continue
                    posture_id = model.add_posture(origin)
                    model.warnings.append(
                        f"Línea {item.line_number}: se creó la postura {origin!r} sin una respuesta previa."
                    )
                model.postures[posture_id].questions.append(question_id)
                resolved_origins.append(posture_id)

            if not resolved_origins:
                model.root_questions.append(question_id)

        else:
            model.warnings.append(
                f"Línea {item.line_number}: formato no reconocido: {item.text!r}."
            )

    if not model.questions:
        raise ValueError("El árbol no contiene preguntas convertibles.")
    if not model.root_questions:
        # Una fuente sin raíz explícita aún puede visualizarse y ejecutarse.
        model.root_questions.append(next(iter(model.questions)))
        model.warnings.append("No se detectó una raíz; se usó la primera pregunta.")
    return model


def mermaid_label(value: str) -> str:
    return html.escape(display_text(value), quote=True).replace("\n", " ")


def render_mermaid(model: Model, source_name: str) -> str:
    lines = [
        "%% Generado por scripts/convertir_posturas_creencias.py; no editar a mano.",
        f"%% Fuente: {source_name}",
        "flowchart TD",
    ]
    for question in model.questions.values():
        lines.append(f'    {question.id}{{"{mermaid_label(question.text)}"}}')
    for posture in model.postures.values():
        lines.append(f'    {posture.id}["{mermaid_label(output_posture_label(posture.label))}"]')

    for question in model.questions.values():
        for answer in question.answers:
            lines.append(
                f'    {question.id} -->|"{mermaid_label(answer.label)}"| {answer.target_posture}'
            )
    for posture in model.postures.values():
        for question_id in posture.questions:
            lines.append(f"    {posture.id} -.-> {question_id}")

    lines.extend(
        [
            "    classDef question fill:#FFF3CD,stroke:#8A6D3B,color:#2F250D;",
            "    classDef posture fill:#E7F1FF,stroke:#2E6DA4,color:#102A43;",
            "    class " + ",".join(model.questions) + " question;",
            "    class " + ",".join(model.postures) + " posture;",
            "",
        ]
    )
    return "\n".join(lines)


def dag_text(value: str) -> str:
    # El parser de DrawDecisionTree interpreta # como comienzo de comentario.
    return display_text(value).replace("#", "n.º").replace("\n", " ").strip()


def outcome_id(posture_id: str) -> str:
    return f"OUT_{posture_id}"


def render_draw_decision_tree(model: Model, source_name: str) -> str:
    """Renderiza un DSL .dag válido para el editor DrawDecisionTree.

    DrawDecisionTree es un DAG de navegación: una respuesta solo puede tener
    un destino. Si una postura tiene varios ejes (varias preguntas), se crea
    un selector Rn para que todos sigan siendo alcanzables.
    """

    routers: dict[str, str] = {}
    router_answers: dict[str, list[tuple[str, str]]] = {}
    router_number = 0

    for posture in model.postures.values():
        if len(posture.questions) > 1:
            router_number += 1
            router_id = f"R{router_number}"
            routers[posture.id] = router_id
            router_answers[router_id] = [
                (f"Explorar: {model.questions[qid].formal_text}", qid)
                for qid in posture.questions
            ]

    terminal_postures = [
        posture for posture in model.postures.values() if not posture.questions
    ]
    missing_outcomes: dict[str, str] = {}

    def destination(posture_id: str) -> str:
        posture = model.postures[posture_id]
        if len(posture.questions) == 1:
            return posture.questions[0]
        if len(posture.questions) > 1:
            return routers[posture_id]
        return f"[{outcome_id(posture_id)}]"

    question_answer_lists: dict[str, list[tuple[str, str]]] = {}
    for question in model.questions.values():
        routes = [(answer.label, destination(answer.target_posture)) for answer in question.answers]
        if not routes:
            missing_id = f"OUT_SIN_RUTA_{question.id}"
            missing_outcomes[missing_id] = f"Sin ruta documentada desde {question.formal_text}"
            routes = [("Sin ruta documentada", f"[{missing_id}]")]
        question_answer_lists[question.id] = routes

    lines = [
        "# Generado por scripts/convertir_posturas_creencias.py; no editar a mano.",
        "dag: Clasificación de posturas, creencias y doctrinas",
        "version: 1.0.0",
        f"entry: {model.root_questions[0]}",
        "mode: decision",
        "description: Conversión automática del árbol doctrinal Markdown.",
        "tags: teología, filosofía, doctrinas",
        "",
    ]

    for question in model.questions.values():
        lines.extend(
            render_dag_question(
                question.id,
                question.formal_text,
                question_answer_lists[question.id],
                question.posture_hints,
                question.colloquial_hint,
            )
        )
        lines.append("")

    for posture_id, router_id in routers.items():
        posture_label = output_posture_label(model.postures[posture_id].label)
        text = f"La postura «{posture_label}» abre varios ejes. ¿Cuál deseas explorar?"
        lines.extend(render_dag_question(router_id, text, router_answers[router_id], [posture_label]))
        lines.append("")

    for posture in terminal_postures:
        lines.append(f"[{outcome_id(posture.id)}]: {dag_text(output_posture_label(posture.label))}")
        lines.append("  description: Postura terminal extraída del documento fuente.")
        lines.append(f"  code: {outcome_id(posture.id)}")
        lines.append("")
    for missing_id, label in missing_outcomes.items():
        lines.append(f"[{missing_id}]: {dag_text(label)}")
        lines.append("  description: El documento no especifica una respuesta para esta pregunta.")
        lines.append(f"  code: {missing_id}")
        lines.append("")

    # El comentario deja explícita la relación con la fuente y evita una
    # variable no usada cuando se genera la salida.
    lines.insert(1, f"# Fuente: {source_name}")
    return "\n".join(lines)


def render_dag_question(
    question_id: str,
    question_text: str,
    answers: list[tuple[str, str]],
    posture_hints: list[str] | None = None,
    colloquial_hint: str | None = None,
) -> list[str]:
    """Genera preguntas con un máximo de seis opciones por nodo del DSL."""

    result: list[str] = []
    remaining = list(answers)
    page = 1
    current_id = question_id
    while remaining:
        if page == 1 and posture_hints:
            visible_postures = " / ".join(output_posture_label(name) for name in posture_hints)
            current_text = f"{visible_postures} - {question_text}"
        else:
            current_text = question_text if page == 1 else f"Opciones restantes: {question_text}"
        result.append(f"{current_id}: {dag_text(current_text)}")
        if page == 1 and colloquial_hint:
            result.append(f"  hint: {dag_text(colloquial_hint)}")
        current_answers = remaining[:5] if len(remaining) > 6 else remaining
        remaining = remaining[len(current_answers) :]
        for letter, (label, target) in zip(CHOICES, current_answers):
            result.append(f"  {letter}: {dag_text(label)} -> {target}")
        if remaining:
            next_id = f"{question_id}_MAS_{page + 1}"
            result.append(f"  F: Ver más respuestas -> {next_id}")
            current_id = next_id
            page += 1
            result.append("")
    return result


def wrap_label(text: str, width: int = LABEL_WIDTH) -> list[str]:
    """Parte un texto en líneas cortas para que los nodos no queden apaisados."""

    lines: list[str] = []
    current = ""
    for word in display_text(text).split():
        candidate = f"{current} {word}".strip()
        if current and len(candidate) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or ["-"]


def dot_label(text: str, width: int = LABEL_WIDTH) -> str:
    """Escapa un texto y lo reparte en las líneas centradas de un label DOT."""

    escaped = [
        line.replace("\\", "\\\\").replace('"', '\\"')
        for line in wrap_label(text, width)
    ]
    return "\\n".join(escaped)


def render_graphviz(model: Model, source_name: str) -> str:
    """Genera el DOT que `dot` convierte en una imagen jerárquica.

    A diferencia del .dag, aquí no hacen falta selectores: Graphviz dibuja el
    grafo completo, así que una postura con varios ejes conserva sus aristas.
    """

    question_fill, question_border, question_font = QUESTION_COLORS
    posture_fill, posture_border, posture_font = POSTURE_COLORS

    lines = [
        "// Generado por scripts/convertir_posturas_creencias.py; no editar a mano.",
        f"// Fuente: {source_name}",
        "digraph posturas_creencias {",
        '    graph [rankdir=TB, splines=spline, nodesep=0.35, ranksep=0.70,',
        '           bgcolor="transparent", fontname="Segoe UI", fontsize=22,',
        '           labelloc="t", label="Clasificación de posturas, creencias y doctrinas\\n "];',
        '    node  [fontname="Segoe UI", fontsize=11, margin="0.16,0.09"];',
        '    edge  [fontname="Segoe UI", fontsize=9, color="#5A6672", arrowsize=0.7];',
        "",
    ]

    for question in model.questions.values():
        lines.append(
            f'    {question.id} [label="{dot_label(question.text)}", shape=box, '
            f'style="rounded,filled", fillcolor="{question_fill}", '
            f'color="{question_border}", fontcolor="{question_font}"];'
        )
    lines.append("")

    for posture in model.postures.values():
        label = dot_label(output_posture_label(posture.label))
        lines.append(
            f'    {posture.id} [label="{label}", shape=box, style="filled", '
            f'fillcolor="{posture_fill}", color="{posture_border}", '
            f'fontcolor="{posture_font}"];'
        )
    lines.append("")

    for question in model.questions.values():
        for answer in question.answers:
            lines.append(
                f'    {question.id} -> {answer.target_posture} '
                f'[label="{dot_label(answer.label, 18)}"];'
            )
    # La arista punteada replica el `-.->` de Mermaid: la postura abre un eje.
    for posture in model.postures.values():
        for question_id in posture.questions:
            lines.append(
                f'    {posture.id} -> {question_id} '
                f'[style=dashed, color="{posture_border}", arrowhead=empty];'
            )

    lines.extend(["}", ""])
    return "\n".join(lines)


def plain_text(value: str) -> str:
    """Texto listo para la interfaz: sin wikilinks, sin negritas, sin dobles espacios."""

    return display_text(EMPHASIS.sub(r"\1", value))


def strip_groups(value: str) -> str:
    return " ".join(GROUP.sub(" ", value).split())


def capitalize_first(value: str) -> str:
    return value[:1].upper() + value[1:] if value else value


def tradition_aliases(canonical_name: str) -> list[str]:
    """Deriva los alias de búsqueda de un nombre con sinónimos separados por «/».

    En este recurso «/» significa sinonimia, no enumeración: `Islam Suní/Chiita`
    es una sola tradición que puede buscarse como «Islam Suní» o «Islam Chiita».
    """

    base = TRAILING_PARENTHESIS.sub("", canonical_name).strip()
    parts = [part.strip() for part in base.split("/") if part.strip()]
    if len(parts) < 2:
        return []

    prefix = parts[0].split()[:-1]
    aliases = [parts[0]]
    for part in parts[1:]:
        words = part.split()
        aliases.append(" ".join(prefix + words) if len(words) == 1 and prefix else part)

    result: list[str] = []
    for alias in aliases:
        alias = capitalize_first(alias)
        if alias and alias != canonical_name and alias not in result:
            result.append(alias)
    return result


def split_tradition_names(inner: str) -> list[str]:
    """Parte tradiciones separadas por coma, respetando paréntesis.

    En el documento, `{A, B (alias), C}` enumera varias tradiciones; la coma
    dentro de un paréntesis no separa (p. ej. aún no aparece, pero queda cubierto).
    El «/» sigue siendo sinonimia dentro de un mismo nombre.
    """

    parts: list[str] = []
    buffer: list[str] = []
    depth = 0
    for char in inner:
        if char == "(":
            depth += 1
            buffer.append(char)
        elif char == ")":
            depth = max(0, depth - 1)
            buffer.append(char)
        elif char == "," and depth == 0:
            piece = "".join(buffer).strip()
            if piece:
                parts.append(piece)
            buffer = []
        else:
            buffer.append(char)
    piece = "".join(buffer).strip()
    if piece:
        parts.append(piece)
    return parts


def parse_groups(raw_label: str) -> list[dict]:
    """Cada `{...}` lista tradiciones separadas por comas que sostienen la postura.

    No hay un campo de notas aparte. Varios `{...}` en la misma etiqueta se
    concatenan; dentro de cada uno, la coma enumera tradiciones distintas.
    """

    traditions: list[dict] = []
    seen: set[str] = set()
    for match in GROUP.finditer(raw_label):
        inner = plain_text(match.group(1))
        if not inner:
            continue
        for name_raw in split_tradition_names(inner):
            is_tentative = name_raw.endswith("?")
            name = name_raw[:-1].strip() if is_tentative else name_raw
            if not name:
                continue
            canonical = capitalize_first(name)
            key = canonical.casefold()
            if key in seen:
                continue
            seen.add(key)
            traditions.append(
                {
                    "name": canonical,
                    "is_tentative": is_tentative,
                    "is_note": False,
                    "aliases": tradition_aliases(canonical),
                }
            )
    return traditions


def split_answer(label: str) -> tuple[str, str | None]:
    """Separa la respuesta corta (Sí / No) de su glosa aclaratoria."""

    text = plain_text(label)
    match = ANSWER_HEAD.match(text)
    if not match:
        return text, None
    short = "Sí" if match.group(1).lower().startswith("s") else "No"
    rest = match.group(2).strip()
    if rest.startswith("(") and rest.endswith(")"):
        rest = rest[1:-1].strip()
    return short, rest or None


def find_repository_root(source_path: Path) -> Path:
    for candidate in [source_path.resolve(), *source_path.resolve().parents]:
        if (candidate / ".git").exists():
            return candidate
    return source_path.resolve().parent.parent


def resolve_note_path(target: str, repository_root: Path) -> Path | None:
    """Localiza la nota de Obsidian a la que apunta un [[wikilink]]."""

    stem = target.split("#")[0].split("|")[0].strip()
    if not stem:
        return None
    direct = repository_root / f"{stem}.md"
    if direct.is_file():
        return direct
    for candidate in repository_root.rglob(f"{Path(stem).name}.md"):
        if ".git" not in candidate.parts:
            return candidate
    return None


def parse_wikilinks(raw_label: str, repository_root: Path, web_directory: Path) -> list[dict]:
    links: list[dict] = []
    for match in WIKILINK.finditer(raw_label):
        target = match.group(1).strip()
        label = (match.group(2) or match.group(1)).strip()
        note = resolve_note_path(target, repository_root)
        relative_href = None
        vault_path = None
        if note is not None:
            relative_href = Path(os.path.relpath(note, web_directory)).as_posix()
            vault_path = note.relative_to(repository_root).as_posix()
        links.append(
            {
                "target": target,
                "label": label,
                "href": relative_href,
                "vault_path": vault_path,
            }
        )
    return links


def build_web_model(
    model: Model, source_path: Path, json_path: Path
) -> dict:
    """Convierte el modelo interno en el JSON que consume `arbol-web`."""

    repository_root = find_repository_root(source_path)
    web_directory = json_path.resolve().parent.parent

    postures: dict[str, dict] = {}
    for posture_id, posture in model.postures.items():
        traditions = parse_groups(posture.raw)
        label = plain_text(strip_groups(posture.raw))
        postures[posture_id] = {
            "id": posture_id,
            "label": label,
            "is_unnamed": label in {"?", "-", ""},
            "is_suggested": label.endswith("*"),
            "is_uncertain": label.endswith("?") and label != "?",
            "traditions": traditions,
            "notes": [],
            "wikilinks": parse_wikilinks(posture.raw, repository_root, web_directory),
            "question_axes": list(posture.questions),
        }

    origins: dict[str, list[str]] = defaultdict(list)
    for posture_id, posture in model.postures.items():
        for question_id in posture.questions:
            origins[question_id].append(posture_id)

    root_postures: list[str] = []
    synthetic = 0
    for question_id in model.root_questions:
        if origins.get(question_id):
            continue
        hints = model.questions[question_id].posture_hints
        if not hints:
            continue
        synthetic += 1
        synthetic_id = f"PR{synthetic}"
        label = plain_text(strip_groups(hints[0]))
        postures[synthetic_id] = {
            "id": synthetic_id,
            "label": label,
            "is_unnamed": label in {"?", "-", ""},
            "is_suggested": label.endswith("*"),
            "is_uncertain": False,
            "traditions": [],
            "notes": [],
            "wikilinks": [],
            "question_axes": [question_id],
            "is_root": True,
        }
        origins[question_id].append(synthetic_id)
        root_postures.append(synthetic_id)

    questions: dict[str, dict] = {}
    for question_id, question in model.questions.items():
        ordered = order_origins(question, origins.get(question_id, []), model)
        answers = []
        for index, answer in enumerate(question.answers):
            short, gloss = split_answer(answer.label)
            answers.append(
                {
                    "key": CHOICES[index] if index < len(CHOICES) else f"A{index}",
                    "label": short,
                    "full_label": plain_text(answer.label),
                    "gloss": gloss,
                    "target_posture_id": answer.target_posture,
                    "source_line": answer.source_line,
                }
            )
        questions[question_id] = {
            "id": question_id,
            "formal_text": plain_text(strip_groups(question.formal_text)),
            "colloquial_hint": plain_text(question.colloquial_hint)
            if question.colloquial_hint
            else None,
            "full_text": plain_text(strip_groups(question.text)),
            "source_line": question.source_line,
            "origin_posture_ids": ordered,
            "is_convergence": len(ordered) > 1,
            "wikilinks": parse_wikilinks(
                question.raw or question.text, repository_root, web_directory
            ),
            "answers": answers,
        }

    traditions_index = build_traditions_index(postures)

    return {
        "version": JSON_SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "source_document": source_path.name,
        "root_questions": list(model.root_questions),
        "root_postures": root_postures,
        "questions": questions,
        "postures": postures,
        "traditions_index": traditions_index,
        "stats": {
            "questions": len(questions),
            "postures": len(postures),
            "traditions": len(traditions_index),
            "unnamed_postures": sum(1 for p in postures.values() if p["is_unnamed"]),
            "convergences": sum(1 for q in questions.values() if q["is_convergence"]),
            "source_lines": len(source_path.read_text(encoding="utf-8").splitlines()),
        },
    }


def order_origins(question: Question, origin_ids: list[str], model: Model) -> list[str]:
    """Respeta el orden en que el Markdown escribió `A & B -> ¿pregunta?`."""

    if len(origin_ids) < 2:
        return list(origin_ids)
    pending = list(origin_ids)
    ordered: list[str] = []
    for hint in question.posture_hints:
        key = normalize_name(hint)
        for posture_id in list(pending):
            if key in model.postures[posture_id].aliases:
                ordered.append(posture_id)
                pending.remove(posture_id)
                break
    return ordered + pending


def build_traditions_index(postures: dict[str, dict]) -> dict[str, dict]:
    """Índice canónico de tradiciones: cada `{...}` del documento fuente."""

    index: dict[str, dict] = {}
    tentative_flags: dict[str, list[bool]] = defaultdict(list)
    for posture_id, posture in postures.items():
        for tradition in posture["traditions"]:
            name = tradition["name"]
            entry = index.setdefault(
                name,
                {
                    "canonical_name": name,
                    "aliases": list(tradition["aliases"]),
                    "posture_ids": [],
                    "tentative": False,
                },
            )
            for alias in tradition["aliases"]:
                if alias not in entry["aliases"]:
                    entry["aliases"].append(alias)
            if posture_id not in entry["posture_ids"]:
                entry["posture_ids"].append(posture_id)
            tentative_flags[name].append(tradition["is_tentative"])

    for name, flags in tentative_flags.items():
        index[name]["tentative"] = all(flags)
    return {name: index[name] for name in sorted(index, key=str.casefold)}


def render_web_json(web_model: dict) -> str:
    return json.dumps(web_model, ensure_ascii=False, indent=2) + "\n"


def render_web_json_module(web_model: dict, json_name: str) -> str:
    """Copia del JSON como script clásico, para abrir la página con `file://`.

    Los navegadores bloquean `fetch()` sobre `file://`, así que el visor carga
    este archivo cuando la petición al `.json` no está permitida.
    """

    payload = json.dumps(web_model, ensure_ascii=False, indent=2)
    return (
        "/* Generado por scripts/convertir_posturas_creencias.py; no editar a mano. */\n"
        f"/* Copia ejecutable de {json_name} para abrir el visor con file://. */\n"
        f"window.{WEB_DATA_GLOBAL} = {payload};\n"
    )


def collect_linked_notes(web_model: dict, repository_root: Path) -> dict[str, str]:
    """Lee el contenido de cada nota referenciada por wikilinks del modelo.

    Indexa por ``vault_path``, por ``href`` y por el stem del target para que el
    visor encuentre la nota aunque falle una de las claves.
    """

    notes: dict[str, str] = {}

    def remember(key: str | None, text: str) -> None:
        if not key or key in notes:
            return
        notes[key] = text

    buckets = [web_model.get("questions", {}), web_model.get("postures", {})]
    for bucket in buckets:
        for entry in bucket.values():
            for enlace in entry.get("wikilinks") or []:
                vault_path = enlace.get("vault_path")
                if not vault_path:
                    continue
                path = repository_root / vault_path
                if not path.is_file():
                    continue
                text = path.read_text(encoding="utf-8")
                remember(vault_path, text)
                remember(enlace.get("href"), text)
                target = (enlace.get("target") or "").split("#")[0].split("|")[0].strip()
                remember(target, text)
                remember(Path(vault_path).name, text)
    return notes


def render_notes_module(notes: dict[str, str]) -> str:
    """Empaqueta las notas Markdown para el visor en `file://` (sin fetch)."""

    payload = json.dumps(notes, ensure_ascii=False, indent=2)
    return (
        "/* Generado por scripts/convertir_posturas_creencias.py; no editar a mano. */\n"
        "/* Notas del vault enlazadas desde posturas/preguntas (respaldo file://). */\n"
        f"window.{WEB_NOTES_GLOBAL} = {payload};\n"
    )


def render_image(
    graphviz_path: Path, image_path: Path, image_format: str, dpi: int
) -> None:
    """Invoca `dot`. Propaga FileNotFoundError si Graphviz no está instalado."""

    executable = shutil.which("dot")
    if executable is None:
        raise FileNotFoundError("dot")

    command = [executable, f"-T{image_format}"]
    if image_format == "png":
        command.append(f"-Gdpi={dpi}")
    command.extend([str(graphviz_path), "-o", str(image_path)])
    subprocess.run(command, check=True, capture_output=True, text=True)


def resolve_image_format(image_path: Path | None, requested: str | None) -> str:
    if requested:
        return requested
    if image_path is not None:
        suffix = image_path.suffix.lower().lstrip(".")
        if suffix in IMAGE_FORMATS:
            return suffix
    return DEFAULT_IMAGE_FORMAT


def default_outputs(input_path: Path) -> tuple[Path, Path, Path]:
    output_directory = input_path.parent / "diagramas"
    return (
        output_directory / f"{input_path.stem}.mmd",
        output_directory / f"{input_path.stem}.dag",
        output_directory / f"{input_path.stem}.gv",
    )


def default_image_path(input_path: Path, image_format: str) -> Path:
    return input_path.parent / "diagramas" / f"{input_path.stem}.{image_format}"


def default_json_path(input_path: Path) -> Path:
    return (
        input_path.parent
        / "diagramas"
        / WEB_APP_DIRECTORY
        / WEB_DATA_DIRECTORY
        / f"{input_path.stem}.json"
    )


def optional_output_path(value: str | None, default: Path, enabled: bool) -> Path | None:
    """None = no generar; cadena vacía o enabled = ruta por defecto; otro = ruta explícita."""
    if value is not None:
        return Path(value) if value else default
    if enabled:
        return default
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Convierte un árbol doctrinal Markdown a los datos del visor web. "
            "Mermaid, DrawDecisionTree, Graphviz y la imagen solo se generan "
            "con --diagramas o con cada flag por separado."
        )
    )
    parser.add_argument("input", type=Path, help="Archivo Markdown fuente.")
    parser.add_argument(
        "--diagramas",
        action="store_true",
        help=(
            "Genera Mermaid (.mmd), DrawDecisionTree (.dag), Graphviz (.gv) "
            "e imagen (SVG por defecto)."
        ),
    )
    parser.add_argument(
        "--mermaid",
        nargs="?",
        const="",
        default=None,
        metavar="RUTA",
        help="Genera Mermaid. Sin RUTA usa recursos/diagramas, .mmd.",
    )
    parser.add_argument(
        "--draw-decision-tree",
        "--dag",
        dest="dag",
        nargs="?",
        const="",
        default=None,
        metavar="RUTA",
        help="Genera DrawDecisionTree. Sin RUTA usa recursos/diagramas, .dag.",
    )
    parser.add_argument(
        "--graphviz",
        nargs="?",
        const="",
        default=None,
        metavar="RUTA",
        help="Genera el DOT de Graphviz. Sin RUTA usa recursos/diagramas, .gv.",
    )
    parser.add_argument(
        "--imagen",
        nargs="?",
        const="",
        default=None,
        metavar="RUTA",
        help="Genera la imagen. Sin RUTA usa recursos/diagramas, .svg.",
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        type=Path,
        help=(
            "Ruta del modelo de datos del visor web (por defecto: "
            f"recursos/diagramas/{WEB_APP_DIRECTORY}/{WEB_DATA_DIRECTORY}, .json). "
            "Junto al .json se escribe un .js equivalente para abrir el visor con file://."
        ),
    )
    parser.add_argument(
        "--sin-json",
        dest="sin_json",
        action="store_true",
        help="No genera el modelo de datos del visor web.",
    )
    parser.add_argument(
        "--formato",
        choices=IMAGE_FORMATS,
        help=f"Formato de la imagen (por defecto: {DEFAULT_IMAGE_FORMAT}). Implica --imagen.",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=DEFAULT_DPI,
        help=f"Resolución del PNG; se ignora en svg y pdf (por defecto: {DEFAULT_DPI}).",
    )
    parser.add_argument(
        "--sin-traduccion",
        dest="sin_traduccion",
        action="store_true",
        help="No regenera js/traducciones-en.js (inglés del visor).",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Falla si la conversión emite advertencias.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path: Path = args.input
    if not input_path.is_file():
        print(f"Error: no existe el archivo fuente: {input_path}", file=sys.stderr)
        return 2

    image_arg = Path(args.imagen) if args.imagen else None
    image_format = resolve_image_format(image_arg, args.formato)
    if image_arg is not None and args.formato:
        suffix = image_arg.suffix.lower().lstrip(".")
        if suffix in IMAGE_FORMATS and suffix != args.formato:
            print(
                f"Error: --formato {args.formato} no concuerda con la extensión "
                f"de --imagen ({image_arg.name}).",
                file=sys.stderr,
            )
            return 2

    default_mermaid, default_dag, default_graphviz = default_outputs(input_path)
    mermaid_path = optional_output_path(args.mermaid, default_mermaid, args.diagramas)
    dag_path = optional_output_path(args.dag, default_dag, args.diagramas)
    graphviz_path = optional_output_path(args.graphviz, default_graphviz, args.diagramas)
    want_image = args.diagramas or args.imagen is not None or args.formato is not None
    image_path = optional_output_path(
        args.imagen, default_image_path(input_path, image_format), want_image
    )

    json_path = args.json_path or default_json_path(input_path)

    outputs = [path for path in (mermaid_path, dag_path, graphviz_path, image_path) if path]
    if not args.sin_json:
        outputs.append(json_path)
    if len({path.resolve() for path in outputs}) != len(outputs):
        print("Error: cada salida debe tener una ruta distinta.", file=sys.stderr)
        return 2

    try:
        model = build_model(input_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, ValueError) as error:
        print(f"Error al convertir {input_path}: {error}", file=sys.stderr)
        return 1

    for warning in model.warnings:
        print(f"Advertencia: {warning}", file=sys.stderr)
    if args.strict and model.warnings:
        print("Error: --strict no permite advertencias de conversión.", file=sys.stderr)
        return 1

    for path in outputs:
        path.parent.mkdir(parents=True, exist_ok=True)

    if mermaid_path is not None:
        mermaid_path.write_text(render_mermaid(model, input_path.name), encoding="utf-8", newline="\n")
        print(f"Mermaid: {mermaid_path}")
    else:
        print("Mermaid: omitido.")

    if dag_path is not None:
        dag_path.write_text(
            render_draw_decision_tree(model, input_path.name), encoding="utf-8", newline="\n"
        )
        print(f"DrawDecisionTree: {dag_path}")
    else:
        print("DrawDecisionTree: omitido.")

    graphviz_text = (
        render_graphviz(model, input_path.name)
        if graphviz_path is not None or image_path is not None
        else None
    )
    if graphviz_path is not None:
        graphviz_path.write_text(graphviz_text or "", encoding="utf-8", newline="\n")
        print(f"Graphviz: {graphviz_path}")
    else:
        print("Graphviz: omitido.")

    if args.sin_json:
        print("Visor web: omitido (--sin-json).")
    else:
        web_model = build_web_model(model, input_path, json_path)
        json_module_path = json_path.with_suffix(".js")
        json_path.write_text(render_web_json(web_model), encoding="utf-8", newline="\n")
        json_module_path.write_text(
            render_web_json_module(web_model, json_path.name), encoding="utf-8", newline="\n"
        )
        notes = collect_linked_notes(web_model, find_repository_root(input_path))
        notes_path = json_path.parent / WEB_NOTES_FILENAME
        notes_path.write_text(render_notes_module(notes), encoding="utf-8", newline="\n")
        print(f"Visor web (datos): {json_path}")
        print(f"Visor web (respaldo file://): {json_module_path}")
        print(f"Visor web (notas embebidas): {notes_path} ({len(notes)})")
        if not args.sin_traduccion:
            from traducir_arbol_en import generar_traducciones_en

            en_path = json_path.parent.parent / "js" / "traducciones-en.js"
            generar_traducciones_en(web_model, en_path)
            print(f"Visor web (inglés): {en_path}")

    if image_path is None:
        print("Imagen: omitida.")
    else:
        source_gv = graphviz_path
        delete_gv = False
        if source_gv is None:
            handle, tmp_name = tempfile.mkstemp(suffix=".gv", text=True)
            os.close(handle)
            source_gv = Path(tmp_name)
            source_gv.write_text(graphviz_text or "", encoding="utf-8", newline="\n")
            delete_gv = True
        try:
            render_image(source_gv, image_path, image_format, args.dpi)
        except FileNotFoundError:
            print(
                "Advertencia: no se encontró 'dot' en PATH; no se generó la imagen. "
                "Instálalo con: winget install Graphviz.Graphviz",
                file=sys.stderr,
            )
            print("Imagen: no generada (falta Graphviz).")
        except subprocess.CalledProcessError as error:
            print(f"Error: Graphviz falló al renderizar {image_path}.", file=sys.stderr)
            if error.stderr:
                print(error.stderr.strip(), file=sys.stderr)
            return 1
        else:
            print(f"Imagen: {image_path}")
        finally:
            if delete_gv:
                source_gv.unlink(missing_ok=True)

    print(
        f"Convertidos {len(model.questions)} preguntas y {len(model.postures)} posturas "
        f"({len(model.warnings)} advertencias)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
