// ============================================================================
// Tests del manual del método que se mete en el prompt del agente.
//
// Lo que se fija aquí:
//   · El manual seconstruye A PARTIR del módulo compartido
//     (src/lib/metodologia/conocimiento.ts). Si mañana se edita un pilar o
//     un ritual, el manual lo lleva (y esta test falla si alguien deja de
//     usar el módulo compartido y lo vuelve a duplicar en el agente).
//   · Contiene el conocimiento que el agente necesita: los 5 pilares, el
//     glosario, la arquitectura (WIGs/GTD/Próxima Acción), los rituales y
//     el índice de pantallas.
//   · No se dispara de tamaño (va en CADA mensaje del chat).
// ============================================================================

import { construirManual, manualMetodo } from "./manual.ts";
import {
  PILARES,
  GLOSARIO,
  RITUALES,
  HABITOS_RECURRENTES,
  WIG_PUNTOS,
  CRITERIO_SELECCION,
  FEATURES,
} from "@/lib/metodologia/conocimiento";

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

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

const manual = construirManual();

// ── El manual sale del módulo compartido ────────────────────────────────────
test("incluye el título y el resumen de cada uno de los 5 pilares", () => {
  ok(PILARES.length === 5, "se esperaban 5 pilares");
  for (const p of PILARES) {
    ok(manual.includes(p.titulo), `falta el título del pilar ${p.num}`);
    ok(manual.includes(p.resumen), `falta el resumen del pilar ${p.num}`);
  }
});

test("incluye los puntos de cada pilar", () => {
  for (const p of PILARES) {
    for (const punto of p.puntos) {
      ok(manual.includes(punto.titulo), `falta "${punto.titulo}"`);
    }
  }
});

test("incluye el glosario completo", () => {
  for (const g of GLOSARIO) {
    ok(manual.includes(g.titulo), `falta el glosario "${g.titulo}"`);
  }
});

test("incluye los tres rituales con sus pantallas", () => {
  for (const ritual of ["diario", "semanal", "mensual"]) {
    for (const f of RITUALES[ritual]) {
      ok(manual.includes(f.cuando), `falta el ritual "${f.cuando}"`);
    }
  }
});

test("incluye las 3 reglas que no se rompen", () => {
  for (const h of HABITOS_RECURRENTES) {
    ok(manual.includes(h.titulo), `falta la regla "${h.titulo}"`);
  }
});

test("incluye la arquitectura (WIGs) y el criterio de selección", () => {
  for (const w of WIG_PUNTOS) {
    ok(manual.includes(w.titulo), `falta "${w.titulo}"`);
  }
  for (const c of CRITERIO_SELECCION) {
    ok(manual.includes(c.titulo), `falta "${c.titulo}"`);
  }
});

test("incluye el índice de pantallas (con la ruta de cada una)", () => {
  for (const f of FEATURES) {
    ok(manual.includes(f.ruta), `falta la ruta ${f.ruta}`);
  }
});

// ── Tamaño ───────────────────────────────────────────────────────────────────
test("no se dispara de tamaño (va en cada mensaje)", () => {
  ok(manual.length < 60_000, `manual demasiado grande: ${manual.length} chars`);
  ok(manual.length > 15_000, `manual sospechosamente corto: ${manual.length}`);
});

// ── Cache ────────────────────────────────────────────────────────────────────
test("manualMetodo() devuelve siempre lo mismo (cache)", () => {
  ok(manualMetodo() === manualMetodo(), "el manual no es estable");
  ok(manualMetodo() === manual, "el manual cacheado difiere del construido");
});

console.log(
  `\n${fail === 0 ? "✅" : "❌"} ${pass} tests en verde` +
    (fail > 0 ? ` · ${fail} fallos` : ""),
);

if (fail > 0) {
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
