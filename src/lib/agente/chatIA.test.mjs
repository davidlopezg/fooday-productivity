// ============================================================================
// Tests del chat del agente: extracción de referencias y construcción del
// prompt.
//
// Lo que se fija aquí (y no puede romperse sin que se note):
//   · Un id que NO está en el catálogo NO se convierte en chip (ni se
//     inventa una entidad): el texto se deja tal cual.
//   · Un id del catálogo se quita del texto y se devuelve como referencia
//     con su etiqueta (que es la de la entidad real, no la que dijo el
//     modelo).
//   · El mismo id citado dos veces produce UNA referencia.
//   · Las referencias de tipo "kr" conservan el id de su meta (el chip
//     lleva a /metas/detalle?id=<meta>).
//   · El prompt lleva SIEMPRE el snapshot y la pregunta, y el historial
//     si lo hay.
// ============================================================================

import { extraerRefs, construirPrompt, extractorDeRespuesta } from "./chatIA.ts";

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

const META = "11111111-1111-4111-8111-111111111111";
const KR = "22222222-2222-4222-8222-222222222222";
const TAREA = "33333333-3333-4333-8333-333333333333";
const FANTASMA = "99999999-9999-4999-8999-999999999999";

const CATALOGO = [
  { tipo: "meta", id: META, etiqueta: "Abrir Sol de Nit" },
  { tipo: "kr", id: KR, etiqueta: "Facturar 20k/mes", meta_id: META },
  { tipo: "tarea", id: TAREA, etiqueta: "Llamar al casero" },
];

// ── extraerRefs ─────────────────────────────────────────────────────────────
test("un id del catálogo sale del texto y vuelve como referencia", () => {
  const r = extraerRefs(`Vas bien con [${META}].`, CATALOGO);
  eq(r.respuesta, "Vas bien con .");
  eq(r.refs.length, 1);
  eq(r.refs[0].id, META);
  eq(r.refs[0].tipo, "meta");
  eq(r.refs[0].etiqueta, "Abrir Sol de Nit");
});

test("un id desconocido NO genera referencia y el texto se conserva", () => {
  const texto = `No existe [${FANTASMA}].`;
  const r = extraerRefs(texto, CATALOGO);
  eq(r.refs.length, 0);
  eq(r.respuesta, texto);
});

test("el mismo id citado dos veces produce UNA sola referencia", () => {
  const r = extraerRefs(`[${TAREA}] y otra vez [${TAREA}]`, CATALOGO);
  eq(r.refs.length, 1);
  eq(r.refs[0].etiqueta, "Llamar al casero");
});

test("la referencia de un KR conserva el id de su meta", () => {
  const r = extraerRefs(`El KR [${KR}] va por detrás.`, CATALOGO);
  eq(r.refs.length, 1);
  eq(r.refs[0].tipo, "kr");
  eq(r.refs[0].meta_id, META);
});

test("la etiqueta la pone el catálogo, no el modelo", () => {
  const r = extraerRefs(`[${META}]`, CATALOGO);
  eq(r.refs[0].etiqueta, "Abrir Sol de Nit");
});

test("sin marcadores la respuesta se devuelve tal cual", () => {
  const r = extraerRefs("Todo bien por aquí.", CATALOGO);
  eq(r.respuesta, "Todo bien por aquí.");
  eq(r.refs.length, 0);
});

// ── extractorDeRespuesta (streaming) ───────────────────────────────────────
test("extrae el texto de {\"respuesta\": ...} de una pieza", () => {
  const e = extractorDeRespuesta();
  eq(e.push('{"respuesta": "Hola David"}'), "Hola David");
});

test("extrae el texto aunque llegue a trozos", () => {
  const e = extractorDeRespuesta();
  let salida = "";
  for (const frag of ['{"respue', 'sta": "Hola', ' David"}']) {
    salida = e.push(frag);
  }
  eq(salida, "Hola David");
});

test("deshace los escapes del JSON", () => {
  const e = extractorDeRespuesta();
  const salida = e.push('{"respuesta": "línea 1\\nlínea 2 \\"quoted\\" \\u00e9"}');
  eq(salida, 'línea 1\nlínea 2 "quoted" é');
});

test("si el JSON no trae \"respuesta\", no inventa texto", () => {
  const e = extractorDeRespuesta();
  eq(e.push('{"otra": "cosa"}'), "");
});

test("el extractor es idempotente con el mismo texto", () => {
  const e = extractorDeRespuesta();
  e.push('{"respuesta": "abc"}');
  eq(e.push('{"respuesta": "abc"}'), "abc");
});

// ── construirPrompt ────────────────────────────────────────────────────────
test("el prompt lleva el snapshot y la pregunta", () => {
  const p = construirPrompt({
    snapshot: "METAS (1)\n- [abc] \"X\"",
    historial: [],
    pregunta: "¿Qué hago hoy?",
  });
  if (!p.includes("METAS (1)")) throw new Error("falta el snapshot");
  if (!p.includes("¿Qué hago hoy?")) throw new Error("falta la pregunta");
});

test("el prompt incluye el historial cuando lo hay", () => {
  const p = construirPrompt({
    snapshot: "SNAPSHOT",
    historial: [
      { rol: "user", contenido: "hola" },
      { rol: "assistant", contenido: "buenas" },
    ],
    pregunta: "¿y ahora?",
  });
  if (!p.includes("Usuario: hola")) throw new Error("falta el turno del usuario");
  if (!p.includes("Agente: buenas")) throw new Error("falta el turno del agente");
});

test("el prompt mete el perfil del usuario cuando existe", () => {
  const p = construirPrompt({
    snapshot: "SNAPSHOT",
    historial: [],
    pregunta: "q",
    perfil: {
      perfil: "David dirige un restaurante",
      familia: null,
      restricciones: null,
      contexto_negocio: null,
    },
  });
  if (!p.includes("David dirige un restaurante")) throw new Error("falta el perfil");
});

console.log(
  `\n${fail === 0 ? "✅" : "❌"} ${pass} tests en verde` +
    (fail > 0 ? ` · ${fail} fallos` : ""),
);

if (fail > 0) {
  for (const f of failures) console.error(`  · ${f.nombre}: ${f.error}`);
  process.exit(1);
}
