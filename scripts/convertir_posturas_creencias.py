#!/usr/bin/env python3
"""Convierte el árbol Markdown de posturas doctrinales a Mermaid y DrawDecisionTree.

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
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


TREE_HEADER = "## Árbol de Decisión:"
CHOICES = "ABCDEF"
WIKILINK = re.compile(r"\[\[([^\]|]+)(?:\|([^\]]+))?\]\]")
LIST_ITEM = re.compile(r"^(?P<indent>[ \t]*)-\s+(?P<text>.+?)\s*$")


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


@dataclass
class Question:
    id: str
    text: str
    formal_text: str
    source_line: int
    posture_hints: list[str] = field(default_factory=list)
    colloquial_hint: str | None = None
    answers: list["Answer"] = field(default_factory=list)


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
        )
        return posture_id

    def add_question(self, text: str, source_line: int) -> str:
        self._question_number += 1
        question_id = f"Q{self._question_number}"
        full_text = display_text(text)
        formal_text, colloquial_hint = split_colloquial_question(full_text)
        self.questions[question_id] = Question(
            id=question_id,
            text=full_text,
            formal_text=formal_text,
            source_line=source_line,
            colloquial_hint=colloquial_hint,
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

    Solo se extrae un paréntesis final que inicia con ``¿``. Así se conservan
    aclaraciones formales como ``(especialmente su resurrección)`` dentro de
    la pregunta principal.
    """

    match = re.search(r"\s+\((¿[^()]*)\)\s*$", question)
    if not match:
        return question, None
    return question[: match.start()].rstrip(), match.group(1).strip()


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


def default_outputs(input_path: Path) -> tuple[Path, Path]:
    output_directory = input_path.parent / "diagramas"
    return (
        output_directory / f"{input_path.stem}.mmd",
        output_directory / f"{input_path.stem}.dag",
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convierte un árbol doctrinal Markdown a Mermaid (.mmd) y DrawDecisionTree (.dag)."
    )
    parser.add_argument("input", type=Path, help="Archivo Markdown fuente.")
    parser.add_argument(
        "--mermaid",
        type=Path,
        help="Ruta del archivo Mermaid de salida (por defecto: recursos/diagramas, .mmd).",
    )
    parser.add_argument(
        "--draw-decision-tree",
        "--dag",
        dest="dag",
        type=Path,
        help="Ruta del archivo DrawDecisionTree de salida (por defecto: recursos/diagramas, .dag).",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Falla si el Markdown requiere una reparación o una inferencia.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    input_path: Path = args.input
    if not input_path.is_file():
        print(f"Error: no existe el archivo fuente: {input_path}", file=sys.stderr)
        return 2

    default_mermaid, default_dag = default_outputs(input_path)
    mermaid_path = args.mermaid or default_mermaid
    dag_path = args.dag or default_dag
    if mermaid_path.resolve() == dag_path.resolve():
        print("Error: las dos salidas deben tener rutas distintas.", file=sys.stderr)
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

    mermaid_path.parent.mkdir(parents=True, exist_ok=True)
    dag_path.parent.mkdir(parents=True, exist_ok=True)
    mermaid_path.write_text(render_mermaid(model, input_path.name), encoding="utf-8", newline="\n")
    dag_path.write_text(render_draw_decision_tree(model, input_path.name), encoding="utf-8", newline="\n")

    print(f"Mermaid: {mermaid_path}")
    print(f"DrawDecisionTree: {dag_path}")
    print(
        f"Convertidos {len(model.questions)} preguntas y {len(model.postures)} posturas "
        f"({len(model.warnings)} advertencias)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
