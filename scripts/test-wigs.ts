// Test rápido del mapeo meta_codigo → meta_id (smoke test).
//   npx tsx scripts/test-wigs.ts

type Meta = { id: string; codigo?: string | null };
type Sug = { meta_codigo?: string; meta_id?: string; razon?: string };

function resolver(
  raw: Sug[],
  metas: Meta[],
): { sugerencias: Array<{ meta_id: string; razon: string }>; rechazadas: string[] } {
  const porCodigo = new Map<string, string>();
  const porId = new Set<string>();
  for (const m of metas) {
    porId.add(m.id);
    if (m.codigo) porCodigo.set(m.codigo.trim(), m.id);
  }
  const sugerencias: Array<{ meta_id: string; razon: string }> = [];
  const rechazadas: string[] = [];
  for (const s of raw) {
    const codigo = String(s.meta_codigo ?? s.meta_id ?? "").trim();
    if (!codigo) continue;
    let id: string | null = porCodigo.get(codigo) ?? null;
    if (!id && porId.has(codigo)) id = codigo;
    if (!id) { rechazadas.push(codigo); continue; }
    const razon = String(s.razon ?? "").trim().slice(0, 200);
    if (!razon) continue;
    sugerencias.push({ meta_id: id, razon });
    if (sugerencias.length >= 3) break;
  }
  return { sugerencias, rechazadas };
}

const metas: Meta[] = [
  { id: "11111111-1111-1111-1111-111111111111", codigo: "M-1" },
  { id: "22222222-2222-2222-2222-222222222222", codigo: "M-2" },
  { id: "33333333-3333-3333-3333-333333333333", codigo: "M-3" },
  { id: "44444444-4444-4444-4444-444444444444", codigo: null },
];

const casos: Array<{ nombre: string; input: Sug[]; expected: number; expectedId: string }> = [
  {
    nombre: "IA devuelve meta_codigo M-2",
    input: [{ meta_codigo: "M-2", razon: "alto impacto" }],
    expected: 1,
    expectedId: "22222222-2222-2222-2222-222222222222",
  },
  {
    nombre: "IA devuelve meta_codigo M-1, M-3",
    input: [
      { meta_codigo: "M-1", razon: "urgente" },
      { meta_codigo: "M-3", razon: "leverage" },
    ],
    expected: 2,
    expectedId: "33333333-3333-3333-3333-333333333333",
  },
  {
    nombre: "IA inventa un codigo que no existe → rechazado",
    input: [{ meta_codigo: "M-99", razon: "cualquier cosa" }],
    expected: 0,
    expectedId: "",
  },
  {
    nombre: "meta sin codigo cae al id (compat)",
    input: [{ meta_codigo: "44444444-4444-4444-4444-444444444444", razon: "sin codigo" }],
    expected: 1,
    expectedId: "44444444-4444-4444-4444-444444444444",
  },
  {
    nombre: "legacy meta_id (compat hacia atrás)",
    input: [{ meta_id: "M-1", razon: "legacy" }],
    expected: 1,
    expectedId: "11111111-1111-1111-1111-111111111111",
  },
  {
    nombre: "tres sugerencias válidas + 1 inválida → 3, no falla",
    input: [
      { meta_codigo: "M-1", razon: "1" },
      { meta_codigo: "M-99", razon: "rechazada" },
      { meta_codigo: "M-2", razon: "2" },
      { meta_codigo: "M-3", razon: "3" },
    ],
    expected: 3,
    expectedId: "33333333-3333-3333-3333-333333333333",
  },
  {
    nombre: "razón vacía → se descarta",
    input: [{ meta_codigo: "M-1", razon: "" }],
    expected: 0,
    expectedId: "",
  },
];

let ok = 0, fail = 0;
for (const c of casos) {
  const { sugerencias } = resolver(c.input, metas);
  const passed = sugerencias.length === c.expected &&
    (c.expected === 0 || sugerencias[sugerencias.length - 1]?.meta_id === c.expectedId);
  if (passed) {
    ok++;
  } else {
    fail++;
    console.log(`❌ ${c.nombre}: ${JSON.stringify(sugerencias)} (esperaba len=${c.expected} lastId=${c.expectedId})`);
  }
}
console.log(`\n${ok}/${ok + fail} OK, ${fail} fallos`);
if (fail > 0) process.exit(1);
export {};
