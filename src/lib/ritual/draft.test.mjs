// ============================================================================
// Tests del borrador del ritual semanal (issue #88).
// ============================================================================
// Ejecuta con: `node src/lib/ritual/draft.test.mjs`
// Sin framework (patrón del repo) y sin API.
// ============================================================================

import {
  CAP_WIGS,
  PASOS,
  VERSION_DRAFT,
  alternarKr,
  contarFocoKrs,
  contarWigKrs,
  draftVacio,
  leerDraft,
  puedeEnfocar,
  serializarDraft,
} from "./draft.ts";

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

console.log("\nPASOS");

test("son 4 pasos, en orden, con minutos", () => {
  eq(PASOS.length, 4);
  eq(PASOS.map((p) => p.id), ["proyectos", "metas", "wigs", "krs"]);
  eq(PASOS.every((p) => p.minutos > 0), true);
});

console.log("\ndraftVacio");

test("empieza en el primer paso, con espejo activado y sin respuestas", () => {
  const d = draftVacio(2026, 46);
  eq(d.paso, "proyectos");
  eq(d.espejo, true);
  eq(d.wigsMeta, []);
  eq(d.krs, {});
  eq(d.version, VERSION_DRAFT);
});

console.log("\nleerDraft");

test("un draft de la misma semana se restaura", () => {
  const d = draftVacio(2026, 46);
  d.wigsMeta = ["m1"];
  const r = leerDraft(serializarDraft(d), 2026, 46);
  eq(r?.wigsMeta, ["m1"]);
});

test("un draft de OTRA semana no se arrastra", () => {
  const d = draftVacio(2026, 45);
  eq(leerDraft(serializarDraft(d), 2026, 46), null);
});

test("un draft de otra versión se descarta", () => {
  const d = draftVacio(2026, 46);
  d.version = 999;
  eq(leerDraft(serializarDraft(d), 2026, 46), null);
});

test("una basura no rompe la app", () => {
  eq(leerDraft("{no es json", 2026, 46), null);
  eq(leerDraft(null, 2026, 46), null);
});

console.log("\nalternarKr (espejo)");

test("con espejo, marcar el WIG marca también el foco", () => {
  const d = alternarKr(draftVacio(2026, 46), "kr1", "wig", true);
  eq(d.krs.kr1, { wig: true, foco: true });
});

test("con espejo, marcar el foco marca también el WIG", () => {
  const d = alternarKr(draftVacio(2026, 46), "kr1", "foco", true);
  eq(d.krs.kr1, { wig: true, foco: true });
});

test("sin espejo, cada interruptor va por su cuenta", () => {
  const d0 = { ...draftVacio(2026, 46), espejo: false };
  const d = alternarKr(d0, "kr1", "wig", true);
  eq(d.krs.kr1, { wig: true, foco: false });
});

test("un KR fuera de ventana no puede entrar en el foco", () => {
  const d = alternarKr(draftVacio(2026, 46), "kr1", "foco", false);
  eq(d.krs.kr1, undefined);
});

test("un WIG de ciclo puede existir aunque no sea enfocable", () => {
  const d = alternarKr(draftVacio(2026, 46), "kr1", "wig", false);
  eq(d.krs.kr1, { wig: true, foco: false });
});

test("volver a alternar desmarca los dos", () => {
  let d = alternarKr(draftVacio(2026, 46), "kr1", "wig", true);
  d = alternarKr(d, "kr1", "wig", true);
  eq(d.krs.kr1, { wig: false, foco: false });
});

console.log("\ncontadores");

test("cuenta WIGs y focos por separado", () => {
  let d = draftVacio(2026, 46);
  d = alternarKr(d, "kr1", "wig", true);
  d = alternarKr(d, "kr2", "foco", true);
  eq(contarWigKrs(d), 2);
  eq(contarFocoKrs(d), 2);
});

test("el cap de WIGs es 3", () => {
  eq(CAP_WIGS, 3);
});

console.log("\npuedeEnfocar");

test("un periodo que cubre la semana permite el foco", () => {
  eq(
    puedeEnfocar([{ fecha_inicio: "2026-01-01", fecha_fin: "2026-12-31" }], "2026-11-09", "2026-11-15"),
    true,
  );
});

test("un periodo futuro no permite el foco", () => {
  eq(
    puedeEnfocar([{ fecha_inicio: "2026-12-01", fecha_fin: "2026-12-31" }], "2026-11-09", "2026-11-15"),
    false,
  );
});

test("un periodo pasado no permite el foco", () => {
  eq(
    puedeEnfocar([{ fecha_inicio: "2026-01-01", fecha_fin: "2026-06-30" }], "2026-11-09", "2026-11-15"),
    false,
  );
});

test("basta con que uno de los periodos cubra la semana", () => {
  eq(
    puedeEnfocar(
      [
        { fecha_inicio: "2026-01-01", fecha_fin: "2026-06-30" },
        { fecha_inicio: "2026-11-01", fecha_fin: "2026-12-31" },
      ],
      "2026-11-09",
      "2026-11-15",
    ),
    true,
  );
});

console.log("\nresumen");

console.log(`\n${pass} ok, ${fail} fallos`);
if (fail > 0) {
  for (const f of failures) console.error(`  ✗ ${f.nombre}: ${f.error}`);
  process.exit(1);
}
