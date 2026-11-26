"use client";

// ============================================================================
// PasoKrs — paso 4 del ritual semanal (issue #88).
// ----------------------------------------------------------------------------
// LAS DOS CAPAS (y por qué están separadas)
//   ⭐ WIG del CICLO  (resultados_periodo.es_wig, máx 3): el resultado clave
//     que define el trimestre. Cambia poco.
//   📅 Foco de ESTA SEMANA (kr_foco_semanal, máx 3): dónde pongo las horas
//     AHORA. Rota cada semana.
//
// EL ESPEJO
//   Lo normal es que coincidan (los 3 KRs del trimestre son los 3 de esta
//   semana), y la excepción es un KR táctico de la semana. Por eso el
//   espejo está ACTIVADO por defecto: marcar uno marca el otro. Se puede
//   apagar para que cada capa vaya por su cuenta.
//
// LA REGLA DE LA VENTANA
//   La RPC `toggle_kr_foco_semanal` (migration 0033) solo admite KRs cuyo
//   periodo contiene la semana actual. Un WIG de ciclo que entrega en Q4 no
//   puede entrar en el foco de esta semana: aquí sale deshabilitado y con
//   el motivo, no escondido.
// ============================================================================

import Link from "next/link";
import { alternarKr, type DraftRitual } from "@/lib/ritual/draft";
import type { KrOverview } from "@/lib/types";

export function PasoKrs({
  krs,
  draft,
  onChange,
  lunes,
  domingo,
}: {
  krs: KrOverview[];
  draft: DraftRitual;
  onChange: (d: DraftRitual) => void;
  lunes: string;
  domingo: string;
}) {
  function puedeFoco(kr: KrOverview): boolean {
    return kr.periodos.some(
      (p) => p.fecha_inicio <= domingo && p.fecha_fin >= lunes,
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">⭐ WIG del ciclo</strong> — el
          resultado clave que define el trimestre. Rara vez cambia (3 en todo
          el trimestre).
        </p>
        <p className="mt-1">
          <strong className="text-foreground">📅 Foco de esta semana</strong> —
          dónde pones las horas <em>esta</em> semana. Rota cada semana (3 en
          cada semana).
        </p>
        <label className="mt-2 flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.espejo}
            onChange={(e) => onChange({ ...draft, espejo: e.target.checked })}
          />
          <span>
            Mantenerlos iguales (espejo). Si lo apagas, cada capa va por su
            cuenta.
          </span>
        </label>
      </div>

      {krs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Las 3 WIGs de meta que has elegido no tienen KRs. Crea un KR en{" "}
          <Link href="/krs" className="underline underline-offset-4">
            /krs
          </Link>{" "}
          o vuelve al paso 3.
        </p>
      ) : (
        <ul className="space-y-2">
          {krs.map(({ kr, meta, periodos, total_tareas, tareas_hechas }) => {
            const elegible = puedeFoco({ kr, meta, periodos, total_tareas, tareas_hechas } as KrOverview);
            const d = draft.krs[kr.id] ?? { wig: false, foco: false };
            const entrega = periodos[0]?.nombre ?? "sin periodo";

            return (
              <li key={kr.id} className="rounded-xl border border-border bg-card p-3">
                <p className="text-sm font-medium">{kr.titulo}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {meta?.titulo ?? "sin meta"} · {entrega} ·{" "}
                  {tareas_hechas}/{total_tareas} tareas hechas
                </p>

                <div className="mt-2 flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={d.wig}
                      onChange={() =>
                        onChange(alternarKr(draft, kr.id, "wig", elegible))
                      }
                    />
                    <span>⭐ WIG del ciclo</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={d.foco}
                      disabled={!elegible}
                      onChange={() =>
                        onChange(alternarKr(draft, kr.id, "foco", elegible))
                      }
                    />
                    <span className={elegible ? "" : "text-muted-foreground line-through"}>
                      📅 Foco de esta semana
                    </span>
                  </label>
                </div>

                {!elegible && (
                  <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                    Su entrega no cae en esta semana: puede ser WIG del ciclo,
                    pero no entrar en el foco semanal (la BD lo rechaza).
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
