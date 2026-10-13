// ============================================================================
// Tests de la lógica de unidades disponibles y saneador de KRs.
// ============================================================================
// Ejecuta con: `node src/lib/plan-unidades.test.mjs`
// Cubre los 10 casos obligatorios del enunciado (sección 7).
// ============================================================================

import {
  construirUnidadesParaPlan,
  parsearMesesDeRango,
  saneKrsFromParsed,
} from "./plan.ts";

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

function assertEq(actual, esperado, label = "") {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(esperado);
  if (a !== e) {
    throw new Error(
      `${label || "assertEq"}: esperaba ${e}, recibí ${a}`,
    );
  }
}

console.log("\n=== construirUnidadesParaPlan ===");

// Caso 1 del enunciado: fechas 13/10/2026 → 17/12/2026.
test("Fechas 13/10/2026 - 17/12/2026 → octubre, noviembre, diciembre", () => {
  const u = construirUnidadesParaPlan({
    fecha_inicio_meta: "2026-10-13",
    fecha_objetivo: "2026-12-17",
    anio: 2026,
  });
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["mes:10", "mes:11", "mes:12"],
  );
  // Cada unidad debe tener la estructura completa.
  for (const x of u) {
    if (typeof x.nombre !== "string" || x.nombre.length === 0) {
      throw new Error(`falta nombre en ${JSON.stringify(x)}`);
    }
    if (typeof x.fecha_inicio !== "string" || x.fecha_inicio.length === 0) {
      throw new Error(`falta fecha_inicio en ${JSON.stringify(x)}`);
    }
    if (typeof x.fecha_fin !== "string" || x.fecha_fin.length === 0) {
      throw new Error(`falta fecha_fin en ${JSON.stringify(x)}`);
    }
  }
});

test("Sin fechas → fallback 4 trimestres", () => {
  const u = construirUnidadesParaPlan({ anio: 2026 });
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["trimestre:1", "trimestre:2", "trimestre:3", "trimestre:4"],
  );
});

test("Solo fecha_inicio (sin objetivo) → fallback 4 trimestres", () => {
  const u = construirUnidadesParaPlan({
    fecha_inicio_meta: "2026-10-13",
    fecha_objetivo: null,
    anio: 2026,
  });
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["trimestre:1", "trimestre:2", "trimestre:3", "trimestre:4"],
  );
});

test("forzarTrimestres=true ignora fechas", () => {
  const u = construirUnidadesParaPlan({
    fecha_inicio_meta: "2026-10-13",
    fecha_objetivo: "2026-12-17",
    anio: 2026,
    forzarTrimestres: true,
  });
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["trimestre:1", "trimestre:2", "trimestre:3", "trimestre:4"],
  );
});

test("Fechas inválidas (fin < inicio) → no cuelga, devuelve meses de inicio", () => {
  const u = construirUnidadesParaPlan({
    fecha_inicio_meta: "2026-12-17",
    fecha_objetivo: "2026-10-13",
    anio: 2026,
  });
  // parsearMesesDeRango trata fin < inicio como fin = inicio, así que
  // debe devolver solo el mes de inicio.
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["mes:12"],
  );
});

test("Rango cruzando años (nov 2026 → feb 2027) → meses correctos", () => {
  const u = construirUnidadesParaPlan({
    fecha_inicio_meta: "2026-11-15",
    fecha_objetivo: "2027-02-10",
    anio: 2026,
  });
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["mes:11", "mes:12", "mes:1", "mes:2"],
  );
});

test("Mismo día inicio y fin → solo 1 mes", () => {
  const u = construirUnidadesParaPlan({
    fecha_inicio_meta: "2026-10-13",
    fecha_objetivo: "2026-10-13",
    anio: 2026,
  });
  assertEq(
    u.map((x) => `${x.unidad}:${x.numero}`),
    ["mes:10"],
  );
});

console.log("\n=== parsearMesesDeRango ===");

test("Rango 13/10/2026 - 17/12/2026 → 3 meses con nombres y fechas", () => {
  const r = parsearMesesDeRango({
    fecha_inicio: "2026-10-13",
    fecha_objetivo: "2026-12-17",
    anio: 2026,
  });
  assertEq(r.meses.length, 3);
  assertEq(r.meses[0].numero, 10);
  assertEq(r.meses[1].numero, 11);
  assertEq(r.meses[2].numero, 12);
  if (!r.meses[0].nombre.includes("2026")) {
    throw new Error("falta año en nombre");
  }
  if (r.meses[0].fecha_inicio !== "2026-10-01") {
    throw new Error("fecha_inicio mes 10 mal");
  }
  if (r.meses[0].fecha_fin !== "2026-10-31") {
    throw new Error("fecha_fin mes 10 mal");
  }
  if (r.meses[2].fecha_fin !== "2026-12-31") {
    throw new Error("fecha_fin mes 12 mal");
  }
});

console.log("\n=== saneKrsFromParsed ===");

// Caso 2: KR mensual de octubre, noviembre y diciembre — los 3 pasan.
test("KRs mensuales 10/11/12 dentro del rango 13/10 - 17/12 → pasan", () => {
  const krs = saneKrsFromParsed(
    [
      { unidad_tiempo: "mes", mes: 10, titulo: "KR Oct", tareas: [] },
      { unidad_tiempo: "mes", mes: 11, titulo: "KR Nov", tareas: [] },
      { unidad_tiempo: "mes", mes: 12, titulo: "KR Dic", tareas: [] },
    ],
    construirUnidadesParaPlan({
      fecha_inicio_meta: "2026-10-13",
      fecha_objetivo: "2026-12-17",
      anio: 2026,
    }),
  );
  assertEq(krs.length, 3);
});

// Caso 3: KR mensual de septiembre se rechaza.
test("KR mes 9 se rechaza si la meta solo cubre oct-dic", () => {
  const krs = saneKrsFromParsed(
    [
      { unidad_tiempo: "mes", mes: 9, titulo: "KR Sep", tareas: [] },
      { unidad_tiempo: "mes", mes: 10, titulo: "KR Oct", tareas: [] },
    ],
    construirUnidadesParaPlan({
      fecha_inicio_meta: "2026-10-13",
      fecha_objetivo: "2026-12-17",
      anio: 2026,
    }),
  );
  assertEq(krs.length, 1);
  assertEq(krs[0].mes, 10);
});

test("KR mes 13 se rechaza (fuera de rango válido)", () => {
  const krs = saneKrsFromParsed(
    [{ unidad_tiempo: "mes", mes: 13, titulo: "X", tareas: [] }],
    [{ unidad: "mes", numero: 10, nombre: "Oct", fecha_inicio: "", fecha_fin: "" }],
  );
  assertEq(krs.length, 0);
});

test("Sin unidadesDisponibles ni trimestres → fallback 4 trimestres", () => {
  const krs = saneKrsFromParsed(
    [
      { unidad_tiempo: "trimestre", trimestre: 2, titulo: "KR Q2", tareas: [] },
      { unidad_tiempo: "trimestre", trimestre: 5, titulo: "Invalido", tareas: [] },
      { unidad_tiempo: "mes", mes: 10, titulo: "Oct", tareas: [] },
    ],
  );
  // Solo Q2 pasa: Q5 está fuera de rango y mes:10 no está en trimestres.
  assertEq(krs.length, 1);
  assertEq(krs[0].trimestre, 2);
});

test("Tareas: la IA no debe duplicar títulos (caso deduplicado por el apply)", () => {
  // Esto prueba el comportamiento del saneador: deja pasar duplicados,
  // el dedupe real ocurre en aplicarKrsYTareasEnMeta. Aquí verificamos
  // que el saneador no rompe si hay duplicados.
  const krs = saneKrsFromParsed(
    [
      {
        unidad_tiempo: "mes",
        mes: 10,
        titulo: "KR",
        tareas: [
          { titulo: "T1" },
          { titulo: "T1" }, // duplicado
        ],
      },
    ],
    [{ unidad: "mes", numero: 10, nombre: "Oct", fecha_inicio: "", fecha_fin: "" }],
  );
  assertEq(krs.length, 1);
  assertEq(krs[0].tareas.length, 2); // el saneador NO deduplica, lo hace el apply
});

test("KR con tareas con prioridad inválida → se coerce a 'media'", () => {
  const krs = saneKrsFromParsed(
    [
      {
        unidad_tiempo: "mes",
        mes: 10,
        titulo: "KR",
        tareas: [
          { titulo: "T1", prioridad: "altisima" }, // inválida → "media"
          { titulo: "T2", prioridad: "alta" },
        ],
      },
    ],
    [{ unidad: "mes", numero: 10, nombre: "Oct", fecha_inicio: "", fecha_fin: "" }],
  );
  assertEq(krs.length, 1);
  // El saneador NO descarta la tarea: la coerce a "media". El filtrado
  // estricto de prioridades lo hace la validación de esquema previa.
  assertEq(krs[0].tareas.length, 2);
  assertEq(krs[0].tareas[0].prioridad, "media");
  assertEq(krs[0].tareas[1].prioridad, "alta");
});

test("KR sin título → se descarta", () => {
  const krs = saneKrsFromParsed(
    [
      { unidad_tiempo: "mes", mes: 10, titulo: "  ", tareas: [] },
      { unidad_tiempo: "mes", mes: 10, titulo: "OK", tareas: [] },
    ],
    [{ unidad: "mes", numero: 10, nombre: "Oct", fecha_inicio: "", fecha_fin: "" }],
  );
  assertEq(krs.length, 1);
  assertEq(krs[0].titulo, "OK");
});

console.log("\n---");
console.log(`Resultado: ${pass} pasaron, ${fail} fallaron.`);
if (fail > 0) {
  console.log("\nFallos:");
  for (const f of failures) console.log(`  - ${f.nombre}: ${f.error}`);
  process.exit(1);
}
