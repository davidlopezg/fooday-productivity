"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/pagos/Modal";
import { useData } from "@/lib/useData";
import {
  fetchRecurrentes,
} from "@/lib/pagos/queries";
import {
  generarRecurrentes,
} from "@/lib/pagos/mutations";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIAS_PAGO,
  CATEGORIA_ICONO,
  CATEGORIA_LABEL,
  METODOS_PAGO,
  METODO_LABEL,
  type CategoriaPago,
  type MetodoPago,
  type RecurrentePago,
} from "@/lib/pagos/types";
import { errorMessage } from "@/lib/errors";
import { IconPlus, IconRepeat, IconTrash } from "@/components/icons";

const fmtEUR = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

/** Modal de gestión de reglas recurrentes. Vista lista + vista form. */
export function RecurrentesManager({
  onClose,
  onChanged,
}: {
  onClose: () => void;
  onChanged: () => void;
}) {
  const [vista, setVista] = useState<"lista" | "nuevo" | "editar">("lista");
  const [reglaEdit, setReglaEdit] = useState<RecurrentePago | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const reglas = useData<RecurrentePago[]>(
    () => fetchRecurrentes(false), // todas, activas e inactivas
    [],
    [refreshKey],
  );

  const reload = () => setRefreshKey((k) => k + 1);

  return (
    <Modal
      title={
        vista === "lista"
          ? "Reglas recurrentes"
          : vista === "nuevo"
          ? "Nueva regla"
          : "Editar regla"
      }
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cerrar
          </button>
          {vista === "lista" && (
            <button
              type="button"
              onClick={() => setVista("nuevo")}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <IconPlus className="h-4 w-4" />
              Nueva regla
            </button>
          )}
        </div>
      }
    >
      {vista === "lista" && (
        <ListaReglas
          reglas={reglas.data}
          loading={reglas.loading}
          onNueva={() => setVista("nuevo")}
          onEditar={(r) => {
            setReglaEdit(r);
            setVista("editar");
          }}
          onChanged={() => {
            reload();
            onChanged();
          }}
        />
      )}
      {vista === "nuevo" && (
        <FormRegla
          onCancel={() => setVista("lista")}
          onSaved={() => {
            reload();
            onChanged();
            setVista("lista");
          }}
        />
      )}
      {vista === "editar" && reglaEdit && (
        <FormRegla
          regla={reglaEdit}
          onCancel={() => setVista("lista")}
          onSaved={() => {
            reload();
            onChanged();
            setVista("lista");
          }}
        />
      )}
    </Modal>
  );
}

// ============================================================================
// Lista de reglas
// ============================================================================

function ListaReglas({
  reglas,
  loading,
  onNueva,
  onEditar,
  onChanged,
}: {
  reglas: RecurrentePago[];
  loading: boolean;
  onNueva: () => void;
  onEditar: (r: RecurrentePago) => void;
  onChanged: () => void;
}) {
  const [generando, setGenerando] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onGenerar = async () => {
    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();
    if (
      !confirm(
        `¿Generar los pagos recurrentes de ${mes.toString().padStart(2, "0")}/${anio}? (idempotente: si ya existen, no duplica)`,
      )
    ) {
      return;
    }
    setGenerando(true);
    setError(null);
    setResultado(null);
    try {
      const n = await generarRecurrentes(mes, anio);
      setResultado(
        n === 0
          ? `Nada nuevo que generar (ya estaban creados)`
          : `✔ ${n} pago${n === 1 ? "" : "s"} creado${n === 1 ? "" : "s"} para este mes`,
      );
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Banner acción rápida: generar mes */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2">
        <div>
          <p className="text-sm font-medium">Generar pagos del mes</p>
          <p className="text-xs text-muted-foreground">
            Crea los pagos de {new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })} desde las reglas activas. Idempotente.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerar}
          disabled={generando}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <IconRepeat className="h-4 w-4" />
          {generando ? "Generando…" : "Generar mes actual"}
        </button>
      </div>
      {resultado && (
        <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
          {resultado}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Lista */}
      {loading && reglas.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Cargando…</p>
      ) : reglas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No tienes reglas recurrentes. Crea una para nóminas, alquileres,
          suministros o cualquier pago que se repita.
        </div>
      ) : (
        <ul className="space-y-2">
          {reglas.map((r) => (
            <li
              key={r.id}
              className={`rounded-md border bg-card p-3 text-sm ${
                r.activo ? "border-border" : "border-border opacity-60"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-base">
                      {CATEGORIA_ICONO[r.categoria]}
                    </span>
                    <span className="font-semibold">{r.proveedor}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{r.concepto}</span>
                    {!r.activo && (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-700">
                        Inactiva
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono font-semibold tabular-nums text-foreground">
                      {fmtEUR(r.importe)}
                    </span>
                    <span>
                      Día {r.dia_del_mes}
                      {r.dia_vencimiento && ` · vence día ${r.dia_vencimiento}`}
                    </span>
                    <span>{METODO_LABEL[r.metodo_pago]}</span>
                    <span>{CATEGORIA_LABEL[r.categoria]}</span>
                    {r.fecha_fin && (
                      <span className="text-amber-600">
                        · fin {r.fecha_fin}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => onEditar(r)}
                    className="rounded-md border border-border bg-background px-2 py-1 text-xs hover:bg-accent"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================================
// Form de regla
// ============================================================================

function FormRegla({
  regla,
  onCancel,
  onSaved,
}: {
  regla?: RecurrentePago;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [proveedor, setProveedor] = useState(regla?.proveedor ?? "");
  const [concepto, setConcepto] = useState(regla?.concepto ?? "");
  const [categoria, setCategoria] = useState<CategoriaPago>(
    regla?.categoria ?? "proveedor",
  );
  const [importe, setImporte] = useState(regla ? String(regla.importe) : "");
  const [diaDelMes, setDiaDelMes] = useState(
    regla ? String(regla.dia_del_mes) : "1",
  );
  const [diaVencimiento, setDiaVencimiento] = useState(
    regla?.dia_vencimiento ? String(regla.dia_vencimiento) : "",
  );
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(
    regla?.metodo_pago ?? "transferencia",
  );
  const [fechaInicio, setFechaInicio] = useState(
    regla?.fecha_inicio ?? new Date().toISOString().slice(0, 10),
  );
  const [fechaFin, setFechaFin] = useState(regla?.fecha_fin ?? "");
  const [activo, setActivo] = useState(regla?.activo ?? true);
  const [notas, setNotas] = useState(regla?.notas ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proveedor.trim()) return setError("Proveedor obligatorio");
    if (!concepto.trim()) return setError("Concepto obligatorio");
    const imp = Number(importe.replace(",", "."));
    if (Number.isNaN(imp) || imp <= 0) return setError("Importe debe ser > 0");
    const d = Number(diaDelMes);
    if (!Number.isInteger(d) || d < 1 || d > 28) {
      return setError("Día del mes debe ser 1-28");
    }
    let dv: number | null = null;
    if (diaVencimiento) {
      dv = Number(diaVencimiento);
      if (!Number.isInteger(dv) || dv < 1 || dv > 28) {
        return setError("Día de vencimiento debe ser 1-28");
      }
    }

    startTransition(async () => {
      try {
        if (regla) {
          // Editar
          const { error: e } = await createClient()
            .schema("pagos")
            .from("recurrentes")
            .update({
              proveedor: proveedor.trim(),
              concepto: concepto.trim(),
              categoria,
              importe: imp,
              dia_del_mes: d,
              dia_vencimiento: dv,
              metodo_pago: metodoPago,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin || null,
              activo,
              notas: notas.trim() || null,
            })
            .eq("id", regla.id);
          if (e) throw e;
        } else {
          // Crear
          const { error: e } = await createClient()
            .schema("pagos")
            .from("recurrentes")
            .insert({
              proveedor: proveedor.trim(),
              concepto: concepto.trim(),
              categoria,
              importe: imp,
              dia_del_mes: d,
              dia_vencimiento: dv,
              metodo_pago: metodoPago,
              fecha_inicio: fechaInicio,
              fecha_fin: fechaFin || null,
              activo,
              notas: notas.trim() || null,
            });
          if (e) throw e;
        }
        onSaved();
      } catch (err) {
        setError(errorMessage(err));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Proveedor" required>
          <input
            type="text"
            value={proveedor}
            onChange={(e) => setProveedor(e.target.value)}
            placeholder="Endesa, Banco Sabadell…"
            className={inputCls}
            required
          />
        </Field>
        <Field label="Concepto" required>
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Luz, Alquiler, Cuota…"
            className={inputCls}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Categoría" required>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaPago)}
            className={inputCls}
          >
            {CATEGORIAS_PAGO.map((c) => (
              <option key={c} value={c}>
                {CATEGORIA_ICONO[c]} {CATEGORIA_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Importe (€)" required>
          <input
            type="text"
            inputMode="decimal"
            value={importe}
            onChange={(e) => setImporte(e.target.value)}
            placeholder="0,00"
            className={`${inputCls} font-mono tabular-nums`}
            required
          />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="Día del mes" hint="1-28" required>
          <input
            type="number"
            min={1}
            max={28}
            value={diaDelMes}
            onChange={(e) => setDiaDelMes(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Vence día" hint="opcional, 1-28">
          <input
            type="number"
            min={1}
            max={28}
            value={diaVencimiento}
            onChange={(e) => setDiaVencimiento(e.target.value)}
            placeholder="—"
            className={inputCls}
          />
        </Field>
        <Field label="Método" required>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
            className={inputCls}
          >
            {METODOS_PAGO.map((m) => (
              <option key={m} value={m}>
                {METODO_LABEL[m]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Desde" required>
          <input
            type="date"
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className={inputCls}
            required
          />
        </Field>
        <Field label="Hasta" hint="opcional">
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Notas" hint="opcional">
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={2}
          className={inputCls}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={activo}
          onChange={(e) => setActivo(e.target.checked)}
          className="h-4 w-4"
        />
        Activa
      </label>

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Guardando…" : regla ? "Guardar cambios" : "Crear regla"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-xs font-medium text-muted-foreground">
        <span>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && <span className="text-[10px] font-normal">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50";
