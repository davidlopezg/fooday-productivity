// Test rápido del parser de plazo (smoke test). Ejecuta con:
//   npx tsx scripts/test-plazo.ts

function sinAcentos(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function parsearTrimestresDePlazo(plazo: string | null | undefined): Array<1 | 2 | 3 | 4> {
  if (!plazo || !plazo.trim()) return [1, 2, 3, 4];
  const t = sinAcentos(plazo.trim());

  if (/\b(primer|primero|primera)\s+trimestre\b/.test(t)) return [1];
  if (/\b(ultimo|ultima)\s+trimestre\b/.test(t)) return [4];
  if (/\b(segundo|segunda)\s+trimestre\b/.test(t)) return [2];
  if (/\b(tercer|tercera)\s+trimestre\b/.test(t)) return [3];
  const ordinalMatch = t.match(/(\d+)\s*[º°o]\s*trimestre/);
  if (ordinalMatch) {
    const n = Number(ordinalMatch[1]);
    if (n >= 1 && n <= 4) return [n] as Array<1 | 2 | 3 | 4>;
  }
  if (/\b(principio|inicio|arranque)\s+de\s+(ano|2\d{3})/.test(t)) return [1];
  if (/\bfin\s+de\s+(ano|2\d{3})/.test(t)) return [4];
  if (/\bmedio\s+(de|del)\s+(ano|2\d{3})/.test(t)) return [2, 3];

  const individuos = new Set<number>();
  let mm: RegExpExecArray | null;
  const reQt = /[qt]([1-4])/gi;
  while ((mm = reQt.exec(t)) !== null) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= 4) individuos.add(n);
  }
  const reTrim = /trimestre\s*([1-4])/gi;
  while ((mm = reTrim.exec(t)) !== null) {
    const n = Number(mm[1]);
    if (n >= 1 && n <= 4) individuos.add(n);
  }
  if (individuos.size === 0) return [1, 2, 3, 4];

  const rangos: Array<[number, number]> = [];
  const reRangoQt = /[qt]([1-4])\s*(?:-|a\s+|al\s+|→\s*)[qt]?([1-4])/gi;
  while ((mm = reRangoQt.exec(t)) !== null) {
    const a = Number(mm[1]);
    const b = Number(mm[2]);
    if (a >= 1 && a <= 4 && b >= 1 && b <= 4) rangos.push([a, b]);
  }
  const reRangoTrim = /trimestre\s*([1-4])\s*(?:-|a\s+|al\s+)(?:trimestre\s*)?([1-4])/gi;
  while ((mm = reRangoTrim.exec(t)) !== null) {
    const a = Number(mm[1]);
    const b = Number(mm[2]);
    if (a >= 1 && a <= 4 && b >= 1 && b <= 4) rangos.push([a, b]);
  }
  const tieneSeparador = /[,+]/.test(t) || /\s+[ye]\s+/.test(t);
  if (rangos.length === 0 && individuos.size >= 2 && !tieneSeparador) {
    const sorted = Array.from(individuos).sort((a, b) => a - b);
    rangos.push([sorted[0], sorted[sorted.length - 1]]);
  }

  const resultado = new Set<number>();
  for (const [a, b] of rangos) {
    const min = Math.min(a, b);
    const max = Math.max(a, b);
    for (let i = min; i <= max; i++) resultado.add(i);
  }
  for (const x of individuos) {
    let enRango = false;
    for (const [a, b] of rangos) {
      const min = Math.min(a, b);
      const max = Math.max(a, b);
      if (x >= min && x <= max) { enRango = true; break; }
    }
    if (!enRango) resultado.add(x);
  }

  if (resultado.size === 0) return [1, 2, 3, 4];
  return Array.from(resultado).sort((a, b) => a - b) as Array<1 | 2 | 3 | 4>;
}

const casos: Array<[unknown, Array<1 | 2 | 3 | 4>]> = [
  [null, [1, 2, 3, 4]],
  ["", [1, 2, 3, 4]],
  ["   ", [1, 2, 3, 4]],
  ["Q3", [3]],
  ["Q3 2026", [3]],
  ["2026-Q3", [3]],
  ["q3", [3]],
  ["T2", [2]],
  ["trimestre 3", [3]],
  ["Trimestre 4", [4]],
  ["primer trimestre", [1]],
  ["último trimestre", [4]],
  ["primer trimestre de 2026", [1]],
  ["último trimestre del año", [4]],
  ["fin de 2026", [4]],
  ["fin de año", [4]],
  ["principio de 2026", [1]],
  ["medio de 2026", [2, 3]],
  ["Q1-Q3", [1, 2, 3]],
  ["Q1 a Q3", [1, 2, 3]],
  ["Q1 al Q3 2026", [1, 2, 3]],
  ["Q1→Q3", [1, 2, 3]],
  ["Q1-Q4", [1, 2, 3, 4]],
  ["Q1 + Q3", [1, 3]],
  ["Q1, Q3", [1, 3]],
  ["Q1 y Q3", [1, 3]],
  ["Q1, Q2, Q3 2026", [1, 2, 3]],
  ["Q3 a Q1", [1, 2, 3]],
  ["12 meses", [1, 2, 3, 4]],
  ["2026", [1, 2, 3, 4]],
  ["texto sin Q ni trimestre", [1, 2, 3, 4]],
  ["  Q3  ", [3]],
  ["trimestre 1 trimestre 4", [1, 2, 3, 4]],
  ["trimestre 1 al 4", [1, 2, 3, 4]],
  ["1º trimestre", [1]],
  ["4º trimestre", [4]],
];

let ok = 0, fail = 0;
for (const [input, expected] of casos) {
  const got = parsearTrimestresDePlazo(input as string | null | undefined);
  if (JSON.stringify(got) === JSON.stringify(expected)) ok++;
  else {
    fail++;
    console.log(`❌ "${String(input)}" → ${JSON.stringify(got)} (esperaba ${JSON.stringify(expected)})`);
  }
}
console.log(`\n${ok}/${ok + fail} OK, ${fail} fallos`);
if (fail > 0) process.exit(1);
export {};
