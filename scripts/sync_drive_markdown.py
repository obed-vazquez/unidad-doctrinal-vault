#!/usr/bin/env python3
"""Exporta Google Docs de una carpeta de Drive a Markdown (Drive = fuente de verdad)."""

from __future__ import annotations

import argparse
import io
import logging
import re
import shutil
import sys
import time
from pathlib import Path

import google.auth
import google.auth.exceptions
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

DEFAULT_FOLDER_ID = "0B-9PnaxsQwDUM2RQTm8zdVJVcXM"
DEFAULT_RESOURCE_KEY = "0-Z6bSHLQmPlYvReeOjQbUTA"
DEFAULT_OUT = "apologética"

MIME_FOLDER = "application/vnd.google-apps.folder"
MIME_DOC = "application/vnd.google-apps.document"
MIME_SHORTCUT = "application/vnd.google-apps.shortcut"
MIME_SHEET = "application/vnd.google-apps.spreadsheet"
MIME_SLIDE = "application/vnd.google-apps.presentation"
MIME_PDF = "application/pdf"

DRIVE_FIELDS = (
    "id, name, mimeType, resourceKey, "
    "shortcutDetails(targetId, targetMimeType, targetResourceKey)"
)
LIST_FIELDS = f"nextPageToken, files({DRIVE_FIELDS})"
SCOPE = ["https://www.googleapis.com/auth/drive.readonly"]
WINDOWS_BAD = re.compile(r'[<>:"/\\|?*\x00-\x1f]')

log = logging.getLogger("sync_drive")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = parse_args()
    out = Path(args.out)

    creds, _ = google.auth.default(scopes=SCOPE)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)

    keys: dict[str, str] = {}
    if args.resource_key:
        keys[args.folder_id] = args.resource_key

    children = list_children(drive, args.folder_id, keys)
    log.info("Listado de primer nivel (%s ítems):", len(children))
    if not children:
        log.info("  (vacío)")
    for item in children:
        log.info(
            "  id=%s  mimeType=%s  name=%s",
            item.get("id"),
            item.get("mimeType"),
            item.get("name"),
        )

    staging = out.parent / f".{out.name}.sync-tmp"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    stats = {"docs": 0, "md": 0, "skipped": 0}
    seen: set[str] = set()
    walk(drive, children, staging, keys, seen, stats)

    exported = stats["docs"] + stats["md"]
    log.info(
        "Listo: %s Docs, %s .md nativos, %s omitidos",
        stats["docs"],
        stats["md"],
        stats["skipped"],
    )
    if exported == 0:
        shutil.rmtree(staging, ignore_errors=True)
        log.error("Cero documentos exportados. Abortando (no se toca %s).", out)
        return 1

    replace_out(staging, out)
    shutil.rmtree(staging, ignore_errors=True)
    return 0


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--folder-id", default=DEFAULT_FOLDER_ID)
    p.add_argument("--resource-key", default=DEFAULT_RESOURCE_KEY)
    p.add_argument("--out", default=DEFAULT_OUT)
    return p.parse_args()


def remember_key(item: dict, keys: dict[str, str]) -> None:
    fid = item.get("id")
    rkey = item.get("resourceKey")
    if fid and rkey:
        keys[fid] = rkey
    details = item.get("shortcutDetails") or {}
    tid, tkey = details.get("targetId"), details.get("targetResourceKey")
    if tid and tkey:
        keys[tid] = tkey


def resource_header(keys: dict[str, str]) -> str:
    return ",".join(f"{fid}/{rkey}" for fid, rkey in keys.items() if fid and rkey)


def retryable(err: HttpError) -> bool:
    status = int(err.resp.status)
    if status in (429, 500, 502, 503, 504):
        return True
    if status == 403:
        body = str(err).lower()
        return any(
            token in body
            for token in ("quota", "ratelimit", "rate limit", "userRateLimit".lower())
        )
    return False


def execute(build_request, keys: dict[str, str]):
    delay = 1.0
    last: HttpError | None = None
    for attempt in range(8):
        request = build_request()
        header = resource_header(keys)
        if header:
            request.headers["X-Goog-Drive-Resource-Keys"] = header
        try:
            return request.execute()
        except HttpError as err:
            last = err
            if not retryable(err) or attempt == 7:
                raise
            log.warning(
                "Reintento %s/8 tras HTTP %s (%.0fs)",
                attempt + 1,
                err.resp.status,
                delay,
            )
            time.sleep(delay)
            delay = min(delay * 2, 60)
    raise last  # pragma: no cover


def download_bytes(build_request, keys: dict[str, str]) -> bytes:
    delay = 1.0
    for attempt in range(8):
        request = build_request()
        header = resource_header(keys)
        if header:
            request.headers["X-Goog-Drive-Resource-Keys"] = header
        buf = io.BytesIO()
        downloader = MediaIoBaseDownload(buf, request)
        try:
            done = False
            while not done:
                _, done = downloader.next_chunk()
            return buf.getvalue()
        except HttpError as err:
            if not retryable(err) or attempt == 7:
                raise
            log.warning(
                "Reintento %s/8 tras HTTP %s (%.0fs)",
                attempt + 1,
                err.resp.status,
                delay,
            )
            time.sleep(delay)
            delay = min(delay * 2, 60)
    raise RuntimeError("download_bytes: reintentos agotados")


def list_children(drive, folder_id: str, keys: dict[str, str]) -> list[dict]:
    items: list[dict] = []
    page_token = None
    query = f"'{folder_id}' in parents and trashed = false"
    while True:
        token = page_token

        def build_request(tok=token):
            return drive.files().list(
                q=query,
                fields=LIST_FIELDS,
                pageSize=1000,
                pageToken=tok,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            )

        resp = execute(build_request, keys)
        batch = resp.get("files") or []
        for item in batch:
            remember_key(item, keys)
        items.extend(batch)
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def walk(
    drive,
    items: list[dict],
    dest: Path,
    keys: dict[str, str],
    seen: set[str],
    stats: dict[str, int],
) -> None:
    dest.mkdir(parents=True, exist_ok=True)
    used_names: set[str] = set()
    for item in items:
        remember_key(item, keys)
        mime = item.get("mimeType") or ""
        if mime == MIME_SHORTCUT:
            item = resolve_shortcut(drive, item, keys, seen)
            if item is None:
                stats["skipped"] += 1
                continue
            mime = item.get("mimeType") or ""

        fid = item.get("id")
        if not fid or fid in seen:
            continue

        name = item.get("name") or fid
        if mime == MIME_FOLDER:
            seen.add(fid)
            child_dest = dest / unique_name(sanitize(name), used_names, is_dir=True)
            grandchildren = list_children(drive, fid, keys)
            walk(drive, grandchildren, child_dest, keys, seen, stats)
            continue

        if mime == MIME_DOC:
            seen.add(fid)
            filename = unique_name(md_filename(name), used_names)
            export_doc(drive, fid, dest / filename, keys)
            stats["docs"] += 1
            continue

        if is_native_markdown(name, mime):
            seen.add(fid)
            filename = unique_name(md_filename(name), used_names)
            download_file(drive, fid, dest / filename, keys)
            stats["md"] += 1
            continue

        reason = skip_reason(mime)
        log.info("Omitido: %s (%s) — %s", name, fid, reason)
        stats["skipped"] += 1


def resolve_shortcut(
    drive, item: dict, keys: dict[str, str], seen: set[str]
) -> dict | None:
    details = item.get("shortcutDetails") or {}
    target_id = details.get("targetId")
    if not target_id:
        log.info("Omitido atajo sin destino: %s (%s)", item.get("name"), item.get("id"))
        return None
    if target_id in seen:
        log.info("Omitido atajo cíclico: %s → %s", item.get("name"), target_id)
        return None
    remember_key(item, keys)

    def build_request():
        return drive.files().get(
            fileId=target_id,
            fields=DRIVE_FIELDS,
            supportsAllDrives=True,
        )

    target = execute(build_request, keys)
    remember_key(target, keys)
    if (target.get("mimeType") or "") == MIME_SHORTCUT:
        return resolve_shortcut(drive, target, keys, seen)
    # Conservar el nombre del atajo (lo que se ve en Drive).
    target = dict(target)
    if item.get("name"):
        target["name"] = item["name"]
    return target


def export_doc(drive, file_id: str, path: Path, keys: dict[str, str]) -> None:
    def build_request():
        return drive.files().export_media(fileId=file_id, mimeType="text/markdown")

    data = download_bytes(build_request, keys)
    path.write_bytes(data)
    log.info("Exportado Doc → %s", path)


def download_file(drive, file_id: str, path: Path, keys: dict[str, str]) -> None:
    def build_request():
        return drive.files().get_media(fileId=file_id, supportsAllDrives=True)

    data = download_bytes(build_request, keys)
    path.write_bytes(data)
    log.info("Descargado .md → %s", path)


def is_native_markdown(name: str, mime: str) -> bool:
    if mime in ("text/markdown", "text/x-markdown"):
        return True
    return name.lower().endswith(".md") and not mime.startswith("application/vnd.google-apps.")


def skip_reason(mime: str) -> str:
    if mime == MIME_SHEET:
        return "Google Sheet"
    if mime == MIME_SLIDE:
        return "Google Slides"
    if mime == MIME_PDF:
        return "PDF"
    if mime.startswith("image/"):
        return "imagen"
    return mime or "tipo desconocido"


def sanitize(name: str) -> str:
    cleaned = WINDOWS_BAD.sub("_", name).rstrip(" .")
    return cleaned or "sin-nombre"


def md_filename(name: str) -> str:
    base = sanitize(name)
    if not base.lower().endswith(".md"):
        base += ".md"
    return base


def unique_name(name: str, used: set[str], is_dir: bool = False) -> str:
    candidate = name
    n = 2
    while candidate.lower() in used:
        if is_dir:
            candidate = f"{name}-{n}"
        else:
            stem, suffix = Path(name).stem, Path(name).suffix
            candidate = f"{stem}-{n}{suffix}"
        n += 1
    used.add(candidate.lower())
    return candidate


def replace_out(staging: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    for child in out.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
    for child in staging.iterdir():
        target = out / child.name
        if child.is_dir():
            shutil.copytree(child, target)
        else:
            shutil.copy2(child, target)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except google.auth.exceptions.DefaultCredentialsError:
        log = logging.getLogger("sync_drive")
        logging.basicConfig(level=logging.ERROR, format="%(levelname)s %(message)s")
        logging.error(
            "No hay credenciales ADC. Define GOOGLE_APPLICATION_CREDENTIALS "
            "con el JSON de la cuenta de servicio."
        )
        sys.exit(1)
