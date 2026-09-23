#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ETL: fooday-intelligence-core (Markdown) → fooday-productivity (Supabase).

Lee los archivos canónicos del repositorio de inteligencia y genera un
seed SQL idempotente para Supabase.

Uso:
    FOODAY_CORE_DIR=... FOODAY_OWNER_ID=<uuid> python scripts/etl/import_from_core.py

Salida: supabase/seed/001_seed_from_core.sql

Qué migra (determinista):
  - docs/planificacion/tareas-notion.md        → tareas
  - docs/metas/*.md                            → metas (+ áreas)
  - docs/planificacion/rituales-semanales.md   → rituales

Qué NO migra (interpretativo, requiere edición humana):
  - propósito / valores / visión  → se genera plantilla en 002_norte_manual.sql
"""

from __future__ import annotations

import datetime as dt
import os
import re
import sys
from pathlib import Path

def _load_dotenv() -> None:
    """Carga variables desde .env.local si no están ya en el entorno."""
    ruta = Path(__file__).resolve().parents[2] / ".env.local"
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()
        if not linea or linea.startswith("#") or "=" not in linea:
            continue
        k, v = linea.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


_load_dotenv()

CORE = Path(
    os.environ.get(
        "FOODAY_CORE_DIR", "C:/Users/David/Projects/fooday-intelligence-core"
    )
)
OWNER = os.environ.get("FOODAY_OWNER_ID", "00000000-0000-0000-0000-000000000000")
if OWNER.startswith("00000000"):
    raise SystemExit(
        "ERROR: define FOODAY_OWNER_ID (uuid del usuario) en .env.local o entorno."
    )
OUT = Path(__file__).resolve().parents[2] / "supabase" / "seed" / "001_seed_from_core.sql"

DIAS = {
    "lunes": 1,
    "martes": 2,
    "miércoles": 3,
    "miercoles": 3,
    "jueves": 4,
    "viernes": 5,
    "sábado": 6,
    "sabado": 6,
    "domingo": 7,
}

AREAS = [
    ("Familia", "#ec4899"),
    ("Finanzas", "#f59e0b"),
    ("Salud", "#10b981"),
    ("Sol de Nit", "#ef4444"),
    ("Rent Boats", "#0ea5e9"),
    ("Crecimiento Personal", "#8b5cf6"),
    ("Sistema", "#64748b"),
]


def q(v) -> str:
    """Literal SQL seguro."""
    if v is None or v == "":
        return "null"
    if isinstance(v, (int, float)):
        return str(v)
    return "'" + str(v).replace("'", "''") + "'"


def num(s: str):
    m = re.search(r"(\d+(?:[.,]\d+)?)", s or "")
    return float(m.group(1).replace(",", ".")) if m else None


# ----------------------------------------------------------------------------
# TAREAS
# ----------------------------------------------------------------------------
def limpiar(texto: str) -> str:
    t = re.sub(r"\*\*(.+?)\*\*", r"\1", texto)
    t = re.sub(r"~~(.+?)~~", r"\1", t)
    t = re.sub(r"`(.+?)`", r"\1", t)
    t = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", t)
    return re.sub(r"\s+", " ", t).strip()


def parsear_tareas() -> list[dict]:
    ruta = CORE / "docs" / "planificacion" / "tareas-notion.md"
    if not ruta.exists():
        print(f"  ! no existe {ruta}", file=sys.stderr)
        return []
    lineas = ruta.read_text(encoding="utf-8").split("\n")
    capa = area = categoria = ""
    out: list[dict] = []
    i, n = 0, len(lineas)
    while i < n:
        l = lineas[i].strip()
        if l.startswith("## "):
            capa = l[3:]
            if "CAPA" not in capa.upper():
                capa = ""
            area = categoria = ""
        elif l.startswith("### ") and capa:
            area = l[4:]
            categoria = ""
        elif l.startswith("#### ") and (capa or area):
            categoria = l[5:]

        if l.startswith("|") and "| Tarea |" in ("|" + l + "|"):
            header = [c.strip() for c in l.split("|")[1:-1]]
            try:
                idx_id = header.index("#")
                idx_t = header.index("Tarea")
            except ValueError:
                i += 1
                continue
            idx_p = next((j for j, h in enumerate(header) if h == "Prioridad"), None)
            idx_dl = next(
                (j for j, h in enumerate(header) if h in ("Deadline", "Fecha")), None
            )
            idx_pts = next((j for j, h in enumerate(header) if h == "Pts"), None)
            idx_esf = next((j for j, h in enumerate(header) if h == "Esfuerzo"), None)
            j = i + 1
            while j < n and not lineas[j].strip().startswith("|"):
                j += 1
            if j < n and re.match(r"^\|[\s:|-]+\|?$", lineas[j].strip()):
                j += 1
            while j < n:
                fila = lineas[j].strip()
                if not fila.startswith("|"):
                    break
                c = fila.split("|")[1:-1]
                if idx_id >= len(c) or idx_t >= len(c):
                    break
                tid = limpiar(c[idx_id].strip())
                texto = limpiar(c[idx_t].strip())
                if not re.match(r"^[A-ZÁÉÍÓÚÑ][A-Za-z0-9]*[- ]?\d", tid) and not re.match(
                    r"^[A-ZÁÉÍÓÚÑ]{1,3}\d", tid
                ):
                    if not texto:
                        break
                if not texto:
                    j += 1
                    continue
                prio_raw = c[idx_p].strip() if idx_p is not None else ""
                prio = limpiar(prio_raw).lower()
                if "crít" in prio or "crit" in prio:
                    prio = "critica"
                elif "urgent" in prio:
                    prio = "urgente"
                elif "alta" in prio:
                    prio = "alta"
                elif "baja" in prio:
                    prio = "baja"
                else:
                    prio = "media"
                hecha = bool(re.search(r"✅|✔|COMPLETADA|HECHA", prio_raw.upper())) or "✅" in c[idx_t]
                out.append(
                    {
                        "codigo": tid,
                        "titulo": texto,
                        "prioridad": prio,
                        "capa": limpiar(capa) if capa else None,
                        "area": limpiar(area) if area else None,
                        "categoria": limpiar(categoria) if categoria else None,
                        "deadline": limpiar(c[idx_dl]) if idx_dl is not None and idx_dl < len(c) else None,
                        "pts": num(c[idx_pts]) if idx_pts is not None and idx_pts < len(c) else None,
                        "esfuerzo": limpiar(c[idx_esf]) if idx_esf is not None and idx_esf < len(c) else None,
                        "estado": "hecha" if hecha else "pendiente",
                    }
                )
                j += 1
            i = j
            continue
        i += 1
    return out


# ----------------------------------------------------------------------------
# METAS
# ----------------------------------------------------------------------------
def match_area(area_str: str | None) -> str | None:
    """Mapea el área libre del repo a una de las áreas canónicas."""
    if not area_str:
        return None
    s = area_str.lower()
    for nombre, _ in AREAS:
        if nombre.lower() in s:
            return nombre
    return None


def parsear_metas() -> list[dict]:
    d = CORE / "docs" / "metas"
    out = []
    if not d.exists():
        return out
    for f in sorted(d.glob("[0-9][0-9][0-9]-*.md")):
        codigo = f.name.split("-")[0]
        txt = f.read_text(encoding="utf-8")
        m = re.search(r"^#\s+.*?META\s*—\s*(.+)$", txt, re.M)
        if not m:
            m = re.search(r"^#\s+(.+)$", txt, re.M)
        titulo = (m.group(1) if m else f.stem).strip()
        titulo = re.sub(r"^[^\w]+", "", titulo).strip() or f.stem
        estado_raw = _campo(txt, "Estado")
        area = _campo(txt, "Áreas de responsabilidad") or _campo(txt, "Área")
        plazo = _campo(txt, "Plazo Total")
        estado = {
            "activo": "en_progreso",
            "en progreso": "en_progreso",
            "en ejecución": "en_progreso",
            "pausado": "bloqueada",
            "sin empezar": "sin_empezar",
            "no iniciada": "sin_empezar",
            "completada": "completada",
            "archivada": "archivada",
        }.get((estado_raw or "").strip().lower(), "sin_empezar")
        out.append(
            {
                "codigo": codigo,
                "titulo": titulo,
                "descripcion": _bloque(txt, "Objetivo General"),
                "estado": estado,
                "plazo": plazo,
                "area": match_area(limpiar(area)),
            }
        )
    return out


def _campo(txt: str, nombre: str) -> str | None:
    m = re.search(rf"\|\s*\*\*{re.escape(nombre)}\*\*\s*\|\s*(.+?)\s*\|", txt)
    return m.group(1).strip() if m else None


def _bloque(txt: str, nombre: str) -> str | None:
    m = re.search(rf"\*\*{re.escape(nombre)}:\*\*\s*\n>\s*(.+)", txt)
    return m.group(1).strip() if m else None


# ----------------------------------------------------------------------------
# RITUALES
# ----------------------------------------------------------------------------
def parsear_rituales() -> list[dict]:
    ruta = CORE / "docs" / "planificacion" / "rituales-semanales.md"
    if not ruta.exists():
        return []
    out = []
    dia = None
    for linea in ruta.read_text(encoding="utf-8").split("\n"):
        l = linea.strip()
        if l.startswith("##"):
            for nombre, num_dia in DIAS.items():
                if re.search(rf"\b{nombre}\b", l, re.I):
                    dia = num_dia
                    break
            continue
        if not dia or not l.startswith("|"):
            continue
        c = [x.strip() for x in l.split("|")[1:-1]]
        if not c or any(x.startswith(":") or set(x) <= set("-: ") for x in c):
            continue
        if c[0].lower() in ("bloque", "orden"):
            continue
        if "orden" in [x.lower() for x in c]:
            continue
        hora = c[0] if re.match(r"^\d{1,2}[:h]", c[0]) else None
        desc = limpiar(c[1]) if len(c) > 1 else ""
        if desc and not desc.startswith("**"):
            out.append({"dia": dia, "hora": hora, "descripcion": desc})
    return out


# ----------------------------------------------------------------------------
# RENDER SQL
# ----------------------------------------------------------------------------
def main() -> None:
    print(f"Origen: {CORE}")
    tareas = parsear_tareas()
    metas = parsear_metas()
    rituales = parsear_rituales()
    print(f"  tareas:   {len(tareas)}")
    print(f"  metas:    {len(metas)}")
    print(f"  rituales: {len(rituales)}")

    now = dt.datetime.now().isoformat(timespec="seconds")
    sql = [
        "-- Generado por scripts/etl/import_from_core.py",
        f"-- Fecha: {now}",
        f"-- Origen: {CORE}",
        f"-- Owner:  {OWNER}",
        "begin;",
        "",
        "-- Áreas",
    ]
    for nombre, color in AREAS:
        sql.append(
            "insert into public.areas (owner_id, nombre, color) values "
            f"({q(OWNER)}, {q(nombre)}, {q(color)}) "
            "on conflict (owner_id, nombre) do update set color = excluded.color;"
        )

    sql += ["", "-- Metas"]
    for m in metas:
        sql.append(
            "insert into public.metas (owner_id, codigo, titulo, descripcion, estado, plazo, area_id) "
            f"values ({q(OWNER)}, {q(m['codigo'])}, {q(m['titulo'])}, {q(m['descripcion'])}, "
            f"{q(m['estado'])}, {q(m['plazo'])}, "
            f"(select id from public.areas where owner_id={q(OWNER)} and nombre={q(m['area'])} limit 1)) "
            "on conflict (owner_id, codigo) do update set titulo=excluded.titulo, "
            "descripcion=excluded.descripcion, estado=excluded.estado, plazo=excluded.plazo;"
        )

    sql += ["", "-- Rituales"]
    for r in rituales:
        sql.append(
            "insert into public.rituales (owner_id, dia_semana, hora, descripcion) "
            f"values ({q(OWNER)}, {r['dia']}, {q(r['hora'])}, {q(r['descripcion'])}) "
            "on conflict do nothing;"
        )

    sql += ["", "-- Tareas"]
    for t in tareas:
        sql.append(
            "insert into public.tareas "
            "(owner_id, codigo, titulo, prioridad, capa, deadline, pts, esfuerzo, estado, origen) "
            f"values ({q(OWNER)}, {q(t['codigo'])}, {q(t['titulo'])}, {q(t['prioridad'])}, "
            f"{q(t['capa'])}, {q(t['deadline'])}, {q(t['pts'])}, {q(t['esfuerzo'])}, "
            f"{q(t['estado'])}, 'tareas-notion.md') "
            "on conflict (owner_id, codigo) do update set titulo=excluded.titulo, "
            "prioridad=excluded.prioridad, deadline=excluded.deadline, pts=excluded.pts;"
        )

    sql += ["", "commit;", ""]
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(sql), encoding="utf-8")
    print(f"[OK] Escrito {OUT}")

    norte = OUT.parent / "002_norte_manual.sql"
    if not norte.exists():
        norte.write_text(
            "-- El Norte (propósito, valores, visión) requiere edición humana.\n"
            "-- Rellena y ejecuta cuando esté listo.\n\n"
            "-- insert into public.propositos (owner_id, texto, orden) values\n"
            f"--   ('{OWNER}', 'Mi propósito es ...', 0);\n\n"
            "-- insert into public.valores (owner_id, nombre, descripcion, orden) values\n"
            f"--   ('{OWNER}', 'Familia', '...', 0);\n\n"
            "-- insert into public.visiones (owner_id, horizonte, texto, es_bhag) values\n"
            f"--   ('{OWNER}', 'largo plazo', '...', true);\n",
            encoding="utf-8",
        )
        print(f"[OK] Plantilla {norte}")


if __name__ == "__main__":
    main()
