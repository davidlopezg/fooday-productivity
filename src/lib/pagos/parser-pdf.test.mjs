// Test del parser con texto simulado (sin PDF real)
import { parsearFecha, detectarCategoria } from "./parser-pdf.ts";

const tests = [
  {
    nombre: "Fecha dd/mm/yyyy",
    input: "15/03/2026",
    esperado: "2026-03-15",
    fn: parsearFecha,
  },
  {
    nombre: "Fecha dd-mm-yy",
    input: "5-6-26",
    esperado: "2026-06-05",
    fn: parsearFecha,
  },
  {
    nombre: "Fecha texto '12 de mayo de 2026'",
    input: "12 de mayo de 2026",
    esperado: "2026-05-12",
    fn: parsearFecha,
  },
  {
    nombre: "Fecha texto 'mayo 12, 2026'",
    input: "mayo 12, 2026",
    esperado: "2026-05-12",
    fn: parsearFecha,
  },
  {
    nombre: "Fecha inválida",
    input: "ayer",
    esperado: null,
    fn: parsearFecha,
  },
  {
    nombre: "Detectar categoría: Endesa → suministro",
    input: ["Endesa", "Luz septiembre"],
    esperado: "suministro",
    fn: ([p, c]) => detectarCategoria(p, c),
  },
  {
    nombre: "Detectar categoría: TGSS → impuesto",
    input: ["TGSS", "Cuota autónomo"],
    esperado: "impuesto",
    fn: ([p, c]) => detectarCategoria(p, c),
  },
  {
    nombre: "Detectar categoría: Banco Sabadell → prestamo",
    input: ["Banco Sabadell", "Cuota préstamo 2/3"],
    esperado: "prestamo",
    fn: ([p, c]) => detectarCategoria(p, c),
  },
  {
    nombre: "Detectar categoría: Teresa → nomina",
    input: ["Teresa", "Factura julio"],
    esperado: "nomina",
    fn: ([p, c]) => detectarCategoria(p, c),
  },
  {
    nombre: "Detectar categoría: Adeslas → seguro",
    input: ["Adeslas", "Seguro médico"],
    esperado: "seguro",
    fn: ([p, c]) => detectarCategoria(p, c),
  },
  {
    nombre: "Detectar categoría: genérico → proveedor",
    input: ["ACME", "Material oficina"],
    esperado: "proveedor",
    fn: ([p, c]) => detectarCategoria(p, c),
  },
];

let ok = 0, fail = 0;
for (const t of tests) {
  const got = t.fn(t.input);
  const pass = JSON.stringify(got) === JSON.stringify(t.esperado);
  if (pass) {
    ok++;
    console.log(`✓ ${t.nombre}`);
  } else {
    fail++;
    console.log(`✗ ${t.nombre}`);
    console.log(`  esperado: ${JSON.stringify(t.esperado)}`);
    console.log(`  obtuvo:   ${JSON.stringify(got)}`);
  }
}

console.log(`\n${ok} ok, ${fail} fallidos`);
process.exit(fail > 0 ? 1 : 0);
