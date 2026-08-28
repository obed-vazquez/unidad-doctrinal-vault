#!/usr/bin/env python3
"""Genera js/traducciones-en.js a partir del JSON del visor.

Traduce con MyMemory (sin clave) y cachea por texto original para no
repetir peticiones. Lo invoca convertir_posturas_creencias.py al escribir
el modelo web. No editar el .js a mano.
"""

from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

FIJOS = {
    "Sí": "Yes",
    "Si": "Yes",
    "No": "No",
    "(sin nombre)": "(unnamed)",
    "?": "?",
}

USER_AGENT = "unidad-doctrinal-vault/arbol-web (traducir_arbol_en.py)"


def cache_path(js_path: Path) -> Path:
    return js_path.parent.parent / "datos" / "traducciones-en.cache.json"


def cargar_cache(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}
    try:
        crudo = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    return {str(k): str(v) for k, v in crudo.items() if k and v}


def guardar_cache(path: Path, cache: dict[str, str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(cache, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def traducir_remoto(texto: str) -> str | None:
    consulta = texto.strip()[:450]
    if not consulta:
        return None
    url = "https://api.mymemory.translated.net/get?" + urllib.parse.urlencode(
        {"q": consulta, "langpair": "es|en"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=25) as respuesta:
            datos = json.loads(respuesta.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError):
        return None
    bloque = datos.get("responseData") or {}
    traducido = (bloque.get("translatedText") or "").strip()
    if not traducido or traducido.lower() == "null":
        return None
    return traducido


def resolver(texto: str, cache: dict[str, str]) -> str:
    original = str(texto or "").strip()
    if not original:
        return original
    if original in FIJOS:
        return FIJOS[original]
    if original in cache:
        return cache[original]
    remoto = traducir_remoto(original)
    time.sleep(0.18)
    if remoto:
        cache[original] = remoto
        return remoto
    return original


def recolectar_unicos(modelo: dict[str, Any]) -> list[str]:
    vistos: dict[str, None] = {}
    orden: list[str] = []

    def add(texto: str | None) -> None:
        if not texto:
            return
        t = str(texto).strip()
        if not t or t in FIJOS or t in vistos:
            return
        vistos[t] = None
        orden.append(t)

    for pregunta in (modelo.get("questions") or {}).values():
        add(pregunta.get("formal_text"))
        add(pregunta.get("colloquial_hint"))
        for respuesta in pregunta.get("answers") or []:
            add(respuesta.get("label"))
            add(respuesta.get("gloss"))

    for postura in (modelo.get("postures") or {}).values():
        if postura.get("is_unnamed"):
            continue
        add(postura.get("label"))

    for nombre, entrada in (modelo.get("traditions_index") or {}).items():
        add(nombre)
        for alias in entrada.get("aliases") or []:
            add(alias)

    return orden


def armar_overlay(modelo: dict[str, Any], cache: dict[str, str]) -> dict[str, Any]:
    unicos = recolectar_unicos(modelo)
    pendientes = [texto for texto in unicos if texto not in cache and texto not in FIJOS]
    if pendientes:
        print(
            f"Traduciendo {len(pendientes)} textos nuevos al inglés "
            f"(MyMemory; {len(unicos) - len(pendientes)} ya estaban en caché)…"
        )
    for i, texto in enumerate(pendientes, start=1):
        resolver(texto, cache)
        if i % 10 == 0 or i == len(pendientes):
            print(f"  {i}/{len(pendientes)}")

    def t(texto: str | None) -> str | None:
        if not texto:
            return texto
        original = str(texto).strip()
        if original in FIJOS:
            return FIJOS[original]
        return cache.get(original, original)

    questions: dict[str, Any] = {}
    for qid, pregunta in (modelo.get("questions") or {}).items():
        entrada: dict[str, Any] = {}
        formal = t(pregunta.get("formal_text"))
        if formal:
            entrada["formal"] = formal
        coloquial = t(pregunta.get("colloquial_hint"))
        if coloquial:
            entrada["colloquial"] = coloquial
        answers: dict[str, Any] = {}
        for respuesta in pregunta.get("answers") or []:
            clave = respuesta.get("key")
            if not clave:
                continue
            pieza: dict[str, str] = {}
            etiqueta = t(respuesta.get("label"))
            if etiqueta:
                pieza["label"] = etiqueta
            glosa = t(respuesta.get("gloss"))
            if glosa:
                pieza["gloss"] = glosa
            if pieza:
                answers[clave] = pieza
        if answers:
            entrada["answers"] = answers
        if entrada:
            questions[qid] = entrada

    postures: dict[str, str] = {}
    for pid, postura in (modelo.get("postures") or {}).items():
        if postura.get("is_unnamed"):
            continue
        etiqueta = t(postura.get("label"))
        if etiqueta:
            postures[pid] = etiqueta

    traditions: dict[str, str] = {}
    for nombre in modelo.get("traditions_index") or {}:
        traditions[nombre] = t(nombre) or nombre

    return {
        "yes": "Yes",
        "no": "No",
        "unnamed": "(unnamed)",
        "questions": questions,
        "postures": postures,
        "traditions": traditions,
    }


def render_js(overlay: dict[str, Any]) -> str:
    payload = json.dumps(overlay, ensure_ascii=False, indent=2)
    return (
        "/* Generado por scripts/traducir_arbol_en.py; no editar a mano. */\n"
        "/* Se regenera al convertir el Markdown del árbol. */\n\n"
        "(function (global) {\n"
        "  'use strict';\n"
        "  var Arbol = global.Arbol || (global.Arbol = {});\n"
        f"  Arbol.EN = {payload};\n"
        "})(window);\n"
    )


def generar_traducciones_en(modelo: dict[str, Any], js_path: Path) -> None:
    disco = cache_path(js_path)
    cache = cargar_cache(disco)
    overlay = armar_overlay(modelo, cache)
    guardar_cache(disco, cache)
    js_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.write_text(render_js(overlay), encoding="utf-8", newline="\n")


if __name__ == "__main__":
    import argparse
    import sys

    parser = argparse.ArgumentParser(description="Regenera js/traducciones-en.js desde el JSON del visor.")
    parser.add_argument(
        "json",
        nargs="?",
        type=Path,
        default=Path("recursos/diagramas/arbol-web/datos/posturas-creencias.json"),
    )
    parser.add_argument(
        "--js",
        type=Path,
        default=Path("recursos/diagramas/arbol-web/js/traducciones-en.js"),
    )
    args = parser.parse_args()
    if not args.json.is_file():
        print(f"Error: no existe {args.json}", file=sys.stderr)
        sys.exit(2)
    modelo = json.loads(args.json.read_text(encoding="utf-8"))
    generar_traducciones_en(modelo, args.js)
    print(f"Escrito {args.js}")
