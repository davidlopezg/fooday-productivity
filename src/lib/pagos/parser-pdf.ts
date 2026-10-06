// ============================================================================
// Parser de PDFs de facturas
// Extrae proveedor, fecha de factura, fecha de vencimiento e importe.
// Estrategia: pdfjs-dist (Mozilla) para extraer el texto embebido del PDF
// + regex heurísticas. Si falla algo, el campo queda null y el usuario
// lo rellena a mano.
// ============================================================================

import type { CategoriaPago } from "@/lib/pagos/types";

/** Resultado de la extracción. Todos los campos son opcionales: si el regex
 *  no encuentra nada, el campo queda null y la UI lo muestra vacío. */
export type FacturaExtraida = {
  proveedor: string | null;
  concepto: string | null;
  importe: number | null;
  fechaEmision: string | null; // YYYY-MM-DD
  fechaVencimiento: string | null; // YYYY-MM-DD
  /** Texto crudo extraído (primeras 600 chars), para que el usuario
   *  verifique de dónde salió cada cosa. */
  textoMuestra: string;
  /** Advertencias no bloqueantes (p.ej. "encontré 2 importes, cogí el mayor") */
  avisos: string[];
};

/** Carga pdfjs-dist de forma lazy (solo en cliente, evita SSR). */
async function loadPdfjs(): Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> {
  // Import dinámico: Next.js lo trata como chunk separado.
  // La build "legacy" es compatible con navegadores antiguos.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Worker: en Next.js no se puede usar `?url` de Vite, así que usamos
  // el CDN de Mozilla (mismo que el oficial) o desactivamos el worker.
  // Si el CDN falla (offline), pdfjs hace fallback al hilo principal.
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  } catch {
    // noop: pdfjs usará el hilo principal (más lento pero funciona)
  }
  return pdfjs;
}

/** Extrae el texto de un PDF (todas las páginas concatenadas). */
async function extraerTextoPDF(file: File): Promise<string> {
  const pdfjs = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const paginas: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    // Cada item de `content.items` tiene `str` (texto) y opcionalmente
    // información de posición. Concatenamos con espacio para evitar
    // pegar palabras.
    const texto = content.items
      .map((it: unknown) => {
        const item = it as { str?: string; hasEOL?: boolean };
        return (item.str ?? "") + (item.hasEOL ? "\n" : " ");
      })
      .join("");
    paginas.push(texto);
  }
  return paginas.join("\n\n");
}

// ============================================================================
// Heurísticas
// ============================================================================

/** Convierte "12/05/2026", "12-05-2026", "12 de mayo de 2026" a "2026-05-12".
 *  Devuelve null si no puede. */
export function parsearFecha(s: string): string | null {
  s = s.trim();

  // 1) Numérico: dd/mm/yyyy o dd-mm-yyyy o dd.mm.yyyy
  const m1 = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (m1) {
    const d = Number(m1[1]);
    const mo = Number(m1[2]);
    let y = Number(m1[3]);
    if (y < 100) y += 2000;
    return iso(d, mo, y);
  }

  // 2) "12 mayo 2026" o "12 de mayo de 2026"
  const meses: Record<string, number> = {
    ene: 1, enero: 1,
    feb: 2, febrero: 2,
    mar: 3, marzo: 3,
    abr: 4, abril: 4,
    may: 5, mayo: 5,
    jun: 6, junio: 6,
    jul: 7, julio: 7,
    ago: 8, agosto: 8,
    sep: 9, set: 9, sept: 9, septiembre: 9, setiembre: 9,
    oct: 10, octubre: 10,
    nov: 11, noviembre: 11,
    dic: 12, diciembre: 12,
  };
  const m2 = s.match(/^(\d{1,2})\s+(?:de\s+)?([a-záéíóúñ]+)(?:\s+de)?\s+(\d{4})$/i);
  if (m2) {
    const d = Number(m2[1]);
    const mo = meses[m2[2].toLowerCase()];
    const y = Number(m2[3]);
    if (mo) return iso(d, mo, y);
  }

  // 3) "mayo 12, 2026"
  const m3 = s.match(/^([a-záéíóúñ]+)\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (m3) {
    const mo = meses[m3[1].toLowerCase()];
    const d = Number(m3[2]);
    const y = Number(m3[3]);
    if (mo) return iso(d, mo, y);
  }

  return null;
}

function iso(d: number, m: number, y: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/** Busca importes con formato "187,00 €" o "187.00" o "1.234,56".
 *  Devuelve los números encontrados, de mayor a menor. */
function buscarImportes(texto: string): number[] {
  // Captura: 1.234,56 | 1234,56 | 1234.56 | 1,234.56
  // Estrategia: números con separador de miles + decimal, o solo decimal.
  const re = /(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+[.,]\d{2})/g;
  const encontrados: number[] = [];
  for (const m of texto.matchAll(re)) {
    const raw = m[1];
    // Normalizar: si tiene "," como decimal, quitar "." (miles) y cambiar "," por "."
    let normalizado: string;
    if (raw.includes(",") && raw.lastIndexOf(",") > raw.lastIndexOf(".")) {
      // Formato europeo: 1.234,56
      normalizado = raw.replace(/\./g, "").replace(",", ".");
    } else if (raw.includes(",") && !raw.includes(".")) {
      // Solo decimales con coma: 1234,56
      normalizado = raw.replace(",", ".");
    } else {
      // Formato inglés o sin separador: 1,234.56 o 1234.56
      normalizado = raw.replace(",", "");
    }
    const n = Number(normalizado);
    if (!Number.isNaN(n) && n > 0 && n < 10_000_000) {
      encontrados.push(n);
    }
  }
  // Ordenar de mayor a menor (suele ser el total).
  return encontrados.sort((a, b) => b - a);
}

/** Busca un campo por etiqueta en el texto. Devuelve el valor tras los
 *  dos puntos (o en la misma línea), o null. */
function buscarCampo(
  texto: string,
  etiquetas: string[],
): string | null {
  for (const et of etiquetas) {
    // Patrón: "etiqueta: valor" o "etiqueta valor" (en la misma línea o la siguiente)
    const re = new RegExp(
      `${escapeRegex(et)}\\s*[:\\-]?\\s*([^\\n\\r]{3,80})`,
      "i",
    );
    const m = texto.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Detecta una categoría probable a partir del proveedor y el concepto. */
export function detectarCategoria(proveedor: string, concepto: string): CategoriaPago {
  const t = `${proveedor} ${concepto}`.toLowerCase();
  if (/alquiler|renta|arrend|inmueble/.test(t)) return "alquiler";
  if (/luz|agua|gas|electric|endesa|iberdrola|naturgy|vodafone|movistar|orange|internet|telefon/.test(t)) return "suministro";
  if (/nomina|sueldo|salario|emplead|trabajador|teresa|menchu|maría|maria|manel/.test(t)) return "nomina";
  if (/aeat|hacienda|iva|irpf|seguridad social|tgss|seguridad|autónom|modelo [0-9]/.test(t)) return "impuesto";
  if (/préstamo|prestamo|hipoteca|cuota.*banco|sabadell|caixabank|bbva|santander|banco/.test(t)) return "prestamo";
  if (/seguro|mutua|adeslas|asisa|sanitas|mapfre/.test(t)) return "seguro";
  return "proveedor";
}

// ============================================================================
// Punto de entrada
// ============================================================================

export async function extraerDatosDePDF(file: File): Promise<FacturaExtraida> {
  const texto = await extraerTextoPDF(file);
  const avisos: string[] = [];

  // ----- PROVEEDOR -----
  // Estrategia 1: el primer "gran" bloque de texto del documento (suele
  // ser el emisor en facturas digitales).
  // Estrategia 2: buscar tras etiquetas "Emisor:", "Proveedor:", "De:".
  let proveedor: string | null = null;
  const emisor = buscarCampo(texto, [
    "Emisor",
    "Proveedor",
    "De",
    "From",
    "Razón social",
    "Razon social",
  ]);
  if (emisor) {
    proveedor = emisor;
  } else {
    // Heurística: primera línea no vacía con al menos 3 letras.
    const primeraLinea = texto
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 3 && /[A-Za-zÀ-ÿ]{3}/.test(l));
    if (primeraLinea) proveedor = primeraLinea.slice(0, 80);
  }

  // ----- CONCEPTO -----
  // Busca "Concepto:", "Descripción:", o coge las primeras palabras del
  // primer bloque de texto significativo (después del proveedor).
  const concepto =
    buscarCampo(texto, [
      "Concepto",
      "Descripción",
      "Descripcion",
      "Servicio",
      "Asunto",
      "Subject",
    ])?.slice(0, 80) ?? null;

  // ----- IMPORTES -----
  // Buscamos todos y nos quedamos con el mayor (suele ser el total).
  // Si hay etiqueta "Total", "Importe total", "TOTAL A PAGAR", lo priorizamos.
  const totalEtiquetado = buscarCampo(texto, [
    "Total a pagar",
    "TOTAL A PAGAR",
    "Importe total",
    "Importe Total",
    "TOTAL",
    "Total factura",
    "Total Factura",
    "Total",
  ]);
  let importe: number | null = null;
  if (totalEtiquetado) {
    const nums = buscarImportes(totalEtiquetado);
    if (nums.length > 0) {
      importe = nums[0];
    } else {
      // El campo "Total" tenía texto raro, pero podemos tener el número
      // en la misma línea o en una línea cercana.
      const lineas = texto.split("\n");
      const idx = lineas.findIndex((l) => /total/i.test(l));
      if (idx >= 0) {
        const numsCercanos = buscarImportes(
          lineas.slice(idx, idx + 3).join(" "),
        );
        if (numsCercanos.length > 0) importe = numsCercanos[0];
      }
    }
  }
  if (importe == null) {
    const todos = buscarImportes(texto);
    if (todos.length > 0) {
      importe = todos[0]; // el mayor
      if (todos.length > 1) {
        avisos.push(
          `Encontré ${todos.length} importes; cogí el mayor (${importe.toFixed(2)} €).`,
        );
      }
    }
  }

  // ----- FECHAS -----
  // 1) Emisión: "Fecha factura", "Fecha de emisión", "Fecha", "Date"
  const fechaEmisionStr = buscarCampo(texto, [
    "Fecha factura",
    "Fecha de factura",
    "Fecha emisión",
    "Fecha de emisión",
    "Fecha de expedición",
    "Fecha",
    "Date",
    "Emitida",
  ]);
  const fechaEmision = fechaEmisionStr ? parsearFecha(primeraFecha(fechaEmisionStr)) : null;

  // 2) Vencimiento: "Fecha vencimiento", "Vencimiento", "Fecha límite",
  //    "Due date", "Plazo"
  const fechaVencStr = buscarCampo(texto, [
    "Fecha vencimiento",
    "Fecha de vencimiento",
    "Vencimiento",
    "Fecha límite de pago",
    "Fecha limite de pago",
    "Fecha límite",
    "Fecha limite",
    "Plazo de pago",
    "Due date",
    "Vence",
  ]);
  const fechaVencimiento = fechaVencStr ? parsearFecha(primeraFecha(fechaVencStr)) : null;

  return {
    proveedor: proveedor?.slice(0, 80) ?? null,
    concepto: concepto?.slice(0, 80) ?? null,
    importe,
    fechaEmision,
    fechaVencimiento,
    textoMuestra: texto.slice(0, 600),
    avisos,
  };
}

/** Si el campo extraído contiene varias fechas (p.ej. "12/05/2026 - 12/06/2026"),
 *  devuelve la primera. Si no encuentra ninguna fecha, devuelve el texto tal cual. */
function primeraFecha(s: string): string {
  const m = s.match(/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/);
  if (m) return m[0];
  const m2 = s.match(/\d{1,2}\s+de\s+[a-záéíóúñ]+\s+de\s+\d{4}/i);
  if (m2) return m2[0];
  return s;
}
