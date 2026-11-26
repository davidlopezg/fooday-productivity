// ============================================================================
// Test de la COBERTURA de los KRs en foco y de la rejilla de LAS 3 DEL DÍA
// (issue #89, paso 5 del ritual semanal).
//
// QUÉ COMPRUEBA
//   1. `calcularCobertura`: un KR en foco sin tareas esta semana se ve
//      VACÍO, y una tarea sin KR no cuenta para ningún KR (es trabajo sin
//      conexión con el foco).
//   2. `textoAvisoCobertura`: avisa de los KRs sin tareas y no molesta
//      cuando todo está cubierto.
//   3. La rejilla: el cap de 3 por día, el orden y las tareas de apoyo.
//   4. La migration 0045 declara la tabla y el trigger del cap de 3.
//
// ============================================================================

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calcularCobertura,
  krsSinCobertura,
  textoAvisoCobertura,
} from "@/lib/ritual/cobertura";
import {
  anadirALaSeleccion,
  CAP_TRES_DEL_DIA,
  estadoHuecos,
  quitarDeLaSeleccion,
  seleccionCompleta,
  tareasDeApoyo,
} from "@/lib/ritual/tresDelDia";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e instanceof Error ? e.message : String(e) });
  }
}

function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg ?? ""} esperaba ${b}, obtuvo ${a}`);
}

// ----------------------------------------------------------------------------
// Cobertura
// ----------------------------------------------------------------------------

const KRS = [
  { id: "kr1", titulo: "Facturar 10 clientes" },
  { id: "kr2", titulo: "Lanzar la web" },
];

test("un KR en foco sin tareas aparece como vacío", () => {
  const c = calcularCobertura(KRS, [
    { id: "t1", titulo: "Preparar invoices", resultado_periodo_id: "kr1" },
  ]);
  eq(c.length, 2);
  eq(c[0].tareas, 1);
  eq(c[0].vacio, false);
  eq(c[1].tareas, 0);
  eq(c[1].vacio, true);
  eq(krsSinCobertura(c).length, 1);
});

test("una tarea sin KR no cuenta para ningún KR", () => {
  const c = calcularCobertura(KRS, [
    { id: "t9", titulo: "Tarea suelta", resultado_periodo_id: null },
  ]);
  eq(c[0].tareas, 0);
  eq(c[1].tareas, 0);
  eq(krsSinCobertura(c).length, 2);
});

test("el aviso nombra los KRs que se quedan sin tareas", () => {
  const c = calcularCobertura(KRS, [
    { id: "t1", titulo: "Preparar invoices", resultado_periodo_id: "kr1" },
  ]);
  const aviso = textoAvisoCobertura(c);
  if (!aviso) throw new Error("debería haber aviso");
  if (!aviso.includes("Lanzar la web")) {
    throw new Error(`el aviso no nombra el KR vacío: ${aviso}`);
  }
  if (aviso.includes("Facturar")) {
    throw new Error(`el aviso nombra un KR que sí tiene tareas: ${aviso}`);
  }
});

test("sin KRs en foco no hay aviso", () => {
  eq(textoAvisoCobertura([]), null);
});

test("si todo el foco está cubierto no hay aviso", () => {
  const c = calcularCobertura(KRS, [
    { id: "t1", titulo: "A", resultado_periodo_id: "kr1" },
    { id: "t2", titulo: "B", resultado_periodo_id: "kr2" },
  ]);
  eq(textoAvisoCobertura(c), null);
});

// ----------------------------------------------------------------------------
// Las 3 del día
// ----------------------------------------------------------------------------

test("añadir respeta el cap de 3", () => {
  let sel = anadirALaSeleccion([], "a");
  sel = anadirALaSeleccion(sel, "b");
  sel = anadirALaSeleccion(sel, "c");
  sel = anadirALaSeleccion(sel, "d");
  eq(sel.length, CAP_TRES_DEL_DIA);
  eq(sel.includes("d"), false);
});

test("añadir dos veces la misma no la duplica", () => {
  const sel = anadirALaSeleccion(anadirALaSeleccion([], "a"), "a");
  eq(sel.length, 1);
});

test("quitar devuelve la selección anterior", () => {
  const sel = quitarDeLaSeleccion(["a", "b"], "a");
  eq(sel.length, 1);
  eq(sel[0], "b");
});

test("las no elegidas quedan de apoyo", () => {
  const candidatas = [
    { id: "a", titulo: "A" },
    { id: "b", titulo: "B" },
    { id: "c", titulo: "C" },
  ];
  const apoyo = tareasDeApoyo(candidatas, ["a"]);
  eq(apoyo.length, 2);
  eq(apoyo.map((c) => c.id).join(","), "b,c");
});

test("el estado de huecos avisa del cap", () => {
  eq(estadoHuecos([]).libres, 3);
  eq(estadoHuecos(["a", "b", "c"]).completo, true);
  eq(seleccionCompleta(["a", "b", "c"]), true);
  eq(seleccionCompleta(["a"]), false);
  if (!estadoHuecos([]).mensaje.includes("faltan 3")) {
    throw new Error(`mensaje inesperado: ${estadoHuecos([]).mensaje}`);
  }
});

// ----------------------------------------------------------------------------
// La migration
// ----------------------------------------------------------------------------

test("la migration 0045 crea la tabla y el trigger del cap", () => {
  const sql = readFileSync(
    path.join(RAIZ, "supabase", "migrations", "0045_ritual_tareas_dia.sql"),
    "utf8",
  );
  if (!/create table if not exists public\.ritual_tareas_dia/i.test(sql)) {
    throw new Error("falta la tabla ritual_tareas_dia");
  }
  if (!/create trigger trg_ritual_tareas_dia_cap/i.test(sql)) {
    throw new Error("falta el trigger del cap de 3");
  }
  if (!/enable row level security/i.test(sql)) {
    throw new Error("la tabla necesita RLS");
  }
});

// ----------------------------------------------------------------------------

console.log(`\n  ${pass} ok, ${fail} fallo(s)`);
if (fail > 0) {
  console.error("\n❌ Fallos:");
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
console.log("✅ Cobertura de KRs y las 3 del día (issue #89)");
