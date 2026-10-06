"use client";

import { useState, useTransition } from "react";
import { extraerDatosDePDF, type FacturaExtraida } from "@/lib/pagos/parser-pdf";
import { IconFile, IconUpload, IconX } from "@/components/icons";
import { errorMessage } from "@/lib/errors";

type Props = {
  /** Llamado cuando el usuario confirma los datos extraídos. */
  onAplicar: (datos: FacturaExtraida) => void;
};

/** Zona "📎 Subir PDF" dentro del modal de alta. Muestra:
 *   1. Botón para seleccionar archivo
 *   2. Spinner mientras procesa
 *   3. Vista previa de los datos extraídos + aviso si hay dudas
 *   4. Botón "Aplicar al formulario" */
export function SubirFactura({ onAplicar }: Props) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datos, setDatos] = useState<FacturaExtraida | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleFile = (file: File) => {
    if (file.type !== "application/pdf") {
      setError("Solo PDFs por ahora");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("PDF demasiado grande (máx 10 MB)");
      return;
    }
    setError(null);
    setArchivo(file);
    setDatos(null);
    startTransition(async () => {
      try {
        const resultado = await extraerDatosDePDF(file);
        setDatos(resultado);
      } catch (e) {
        setError(`No se pudo leer el PDF: ${errorMessage(e)}`);
      }
    });
  };

  const handleLimpiar = () => {
    setArchivo(null);
    setDatos(null);
    setError(null);
  };

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
      {!archivo ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm hover:text-foreground">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="sr-only"
          />
          <IconUpload className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            📎 <u>Subir PDF de la factura</u> — autocompleta proveedor, fechas e importe
          </span>
        </label>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <IconFile className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{archivo.name}</span>
              <span className="text-xs text-muted-foreground">
                ({(archivo.size / 1024).toFixed(0)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={handleLimpiar}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Quitar PDF"
            >
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>

          {isPending && (
            <p className="text-xs text-muted-foreground">
              Leyendo PDF…
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          {datos && !isPending && (
            <div className="space-y-2 text-xs">
              <div className="rounded-md border border-border bg-card p-2">
                <p className="mb-1 font-semibold text-muted-foreground">
                  Datos detectados (revisa y corrige si hace falta):
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <strong>Proveedor:</strong>{" "}
                    {datos.proveedor ?? <em className="text-muted-foreground">no detectado</em>}
                  </li>
                  <li>
                    <strong>Concepto:</strong>{" "}
                    {datos.concepto ?? <em className="text-muted-foreground">no detectado</em>}
                  </li>
                  <li>
                    <strong>Importe:</strong>{" "}
                    {datos.importe != null
                      ? `${datos.importe.toFixed(2)} €`
                      : <em className="text-muted-foreground">no detectado</em>}
                  </li>
                  <li>
                    <strong>Fecha factura:</strong>{" "}
                    {datos.fechaEmision ?? <em className="text-muted-foreground">no detectada</em>}
                  </li>
                  <li>
                    <strong>Vencimiento:</strong>{" "}
                    {datos.fechaVencimiento ?? <em className="text-muted-foreground">no detectado</em>}
                  </li>
                </ul>
                {datos.avisos.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-amber-700 dark:text-amber-300">
                    {datos.avisos.map((a, i) => (
                      <li key={i}>⚠️ {a}</li>
                    ))}
                  </ul>
                )}
                <details className="mt-1">
                  <summary className="cursor-pointer text-muted-foreground">
                    Ver texto extraído
                  </summary>
                  <pre className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 text-[10px] text-muted-foreground">
                    {datos.textoMuestra}…
                  </pre>
                </details>
              </div>
              <button
                type="button"
                onClick={() => onAplicar(datos)}
                className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
              >
                ✓ Aplicar al formulario
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
