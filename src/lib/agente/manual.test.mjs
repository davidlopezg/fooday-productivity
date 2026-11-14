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

import {
  construirManual,
  construirManualCompacto,
  esPreguntaDeMetodo,
  manualCompacto,
  manualMetodo,
  manualPara,
} from "./manual.ts";
import {
  PILARES,
  GLOSARIO,
  PARA_QUE,
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
test("incluye el para qué (definición de riqueza) en los dos niveles", () => {
  for (const p of PARA_QUE) {
    ok(manual.includes(p.cuerpo), `falta el para qué "${p.titulo}"`);
    ok(manualCompacto().includes(p.titulo), `falta el para qué en el compacto "${p.titulo}"`);
  }
});

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

// ── NIVEL COMPACTO ───────────────────────────────────────────────────────────
test("el manual compacto es bastante más pequeño que el completo", () => {
  const compacto = construirManualCompacto();
  ok(
    compacto.length < manual.length * 0.7,
    `el compacto (${compacto.length}) no es mucho más pequeño que el completo (${manual.length})`,
  );
  ok(compacto.length > 5_000, `el compacto sospechosamente corto: ${compacto.length}`);
});

test("el manual compacto conserva las reglas operativas", () => {
  const compacto = construirManualCompacto();
  // El orden de selección va ENTERO: es lo que el agente usa al recomendar.
  ok(
    compacto.includes(CRITERIO_SELECCION[0].titulo),
    "falta el orden de selección",
  );
  ok(
    compacto.includes("RIESGO FINANCIERO"),
    "falta el orden de decisión (riesgo financiero primero)",
  );
  // Y los rituales, que son la chuleta de "qué abro y cuándo".
  for (const ritual of ["diario", "semanal", "mensual"]) {
    for (const f of RITUALES[ritual]) {
      ok(compacto.includes(f.cuando), `falta el ritual "${f.cuando}"`);
    }
  }
  // Y las capas (proyecto/meta/KR/tarea).
  for (const g of GLOSARIO) {
    ok(compacto.includes(g.titulo), `falta la capa "${g.titulo}"`);
  }
});

test("el manual compacto viene del módulo compartido (no está escrito a mano)", () => {
  const compacto = construirManualCompacto();
  for (const w of WIG_PUNTOS) {
    ok(compacto.includes(w.titulo), `falta "${w.titulo}"`);
  }
  for (const h of HABITOS_RECURRENTES) {
    ok(compacto.includes(h.titulo), `falta la regla "${h.titulo}"`);
  }
});

// ── Heurística: ¿pregunta de método o de datos? ────────────────────────────
test("las preguntas de MÉTODO piden el manual completo", () => {
  for (const q of [
    "¿qué es el KR de la semana?",
    "¿por qué solo 3 WIGs?",
    "explícame el método",
    "¿cuál es el ritual del lunes?",
    "explícame qué son los WIGs",
    "¿qué reglas hay de captura?",
  ]) {
    ok(esPreguntaDeMetodo(q), `debería ser método: "${q}"`);
    ok(manualPara(q).nivel === "completo", `nivel incorrecto: "${q}"`);
  }
});

test("las preguntas de DATOS usan el manual compacto (rápido)", () => {
  for (const q of [
    "¿qué hago hoy?",
    "¿qué está en riesgo?",
    "resume el proyecto Sol de Nit",
    "cuántas metas tengo activas",
    "qué tareas están bloqueadas",
  ]) {
    ok(!esPreguntaDeMetodo(q), `no debería ser método: "${q}"`);
    ok(manualPara(q).nivel === "compacto", `nivel incorrecto: "${q}"`);
  }
});

test("manualPara() devuelve el manual del nivel pedido", () => {
  ok(manualPara("¿qué hago hoy?").texto === manualCompacto(), "nivel compacto");
  ok(manualPara("explícame el método").texto === manualMetodo(), "nivel completo");
});

console.log(
  `\n${fail === 0 ? "✅" : "❌"} ${pass} tests en verde` +
    (fail > 0 ? ` · ${fail} fallos` : ""),
);

if (fail > 0) {
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
