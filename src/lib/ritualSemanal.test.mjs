// ============================================================================
// Tests de las reglas del ritual semanal (issue #87).
// ============================================================================
// Ejecuta con: `node src/lib/ritualSemanal.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  CLAVE_FASES_META,
  CUPO_TAREAS_ACTIVAS,
  ESTADOS_ACTIVOS_TAREA,
  FASES_META_POR_DEFECTO,
  contarActivas,
  estadoCupo,
  etiquetaSemana,
  fasesDisponibles,
  normalizarBitacora,
  normalizarFases,
  tareaEsActiva,
} from "./ritualSemanal.ts";

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${nombre}`);
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e.message });
    console.log(`  ❌ ${nombre}: ${e.message}`);
  }
}

function eq(a, b, msg) {
  const sa = JSON.stringify(a);
  const sb = JSON.stringify(b);
  if (sa !== sb) throw new Error(`${msg ?? "desigual"}: ${sa} !== ${sb}`);
}

const t = (estado) => ({ estado });

console.log("\ntareaEsActiva");

test("pendiente, en progreso y bloqueada son activas", () => {
  eq(tareaEsActiva(t("pendiente")), true);
  eq(tareaEsActiva(t("en_progreso")), true);
  eq(tareaEsActiva(t("bloqueada")), true);
});

test("en espera, cancelada, hecha, descartada y archivada NO son activas", () => {
  eq(tareaEsActiva(t("en_espera")), false);
  eq(tareaEsActiva(t("cancelada")), false);
  eq(tareaEsActiva(t("hecha")), false);
  eq(tareaEsActiva(t("descartada")), false);
  eq(tareaEsActiva(t("archivada")), false);
});

test("la lista de estados activos no incluye en_espera ni cancelada", () => {
  eq(ESTADOS_ACTIVOS_TAREA.includes("en_espera"), false);
  eq(ESTADOS_ACTIVOS_TAREA.includes("cancelada"), false);
  eq(ESTADOS_ACTIVOS_TAREA.length, 3);
});

console.log("\ncontarActivas");

test("cuenta solo las activas de una lista mezclada", () => {
  eq(
    contarActivas([
      t("pendiente"),
      t("hecha"),
      t("en_espera"),
      t("en_progreso"),
      t("cancelada"),
    ]),
    2,
  );
});

console.log("\nestadoCupo");

test("con hueco muestra cuántas quedan", () => {
  const c = estadoCupo(Array.from({ length: 7 }, () => t("pendiente")));
  eq(c.activas, 7);
  eq(c.cupo, CUPO_TAREAS_ACTIVAS);
  eq(c.libres, 3);
  eq(c.excedido, false);
  eq(c.mensaje.includes("7/10"), true);
});

test("con el cupo lleno avisa y no quedan huecos", () => {
  const c = estadoCupo(Array.from({ length: 10 }, () => t("pendiente")));
  eq(c.libres, 0);
  eq(c.mensaje.includes("En espera"), true);
});

test("si alguien escribe por fuera y se pasa, lo dice", () => {
  const c = estadoCupo(Array.from({ length: 12 }, () => t("pendiente")));
  eq(c.excedido, true);
  eq(c.libres, 0);
});

console.log("\nnormalizarFases");

test("recorta y quita repetidos aunque cambien tildes o mayúsculas", () => {
  eq(normalizarFases(["  Construcción ", "construccion", "", "Lanzamiento"]), [
    "Construcción",
    "Lanzamiento",
  ]);
});

test("lo que no es una lista devuelve vacío", () => {
  eq(normalizarFases(null), []);
  eq(normalizarFases("construccion"), []);
});

console.log("\nfasesDisponibles");

test("usa las configuradas y mantiene el resto del catálogo por defecto", () => {
  eq(fasesDisponibles(["personal"]), ["personal", ...FASES_META_POR_DEFECTO]);
});

test("una fase ya usada sobrevive aunque se borre de la lista", () => {
  const fases = fasesDisponibles(["personal"], ["Fase vieja"]);
  eq(fases.includes("Fase vieja"), true);
});

console.log("\nnormalizarBitacora");

test("limpia ids, quita repetidos y tops los caps de 3", () => {
  const b = normalizarBitacora({
    anio: 2026,
    semana_iso: 46,
    metas_vivas: ["m1", "m1", "", "m2"],
    wigs_meta: ["a", "b", "c", "d"],
    krs_foco: ["k1", "k2", "k3", "k4"],
    metas_pausadas: [],
    tareas_activas: 9,
  });
  eq(b.metas_vivas, ["m1", "m2"]);
  eq(b.wigs_meta.length, 3);
  eq(b.krs_foco.length, 3);
  eq(b.notas, null);
});

console.log("\netiquetaSemana");

test("etiqueta legible de la semana", () => {
  eq(etiquetaSemana(2026, 46), "2026 · semana 46");
});

console.log("\nconstantes");

test("la clave de la lista configurable es la esperada", () => {
  eq(CLAVE_FASES_META, "fases_meta");
  eq(CUPO_TAREAS_ACTIVAS, 10);
});

// ── resumen ────────────────────────────────────────────────────────────────
console.log(`\n${pass} ok, ${fail} fallos`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
