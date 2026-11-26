// ============================================================================
// QUÉ METAS COMPITEN EN EL RITUAL SEMANAL (paso 2).
// ----------------------------------------------------------------------------
// LA REGLA
//   Los proyectos van ANTES que las metas (estructura antes que foco): un
//   proyecto muerto arrastra sus metas y estas no deben competir por una WIG.
//
// QUÉ PASA CON CADA PROYECTO
//   · "vivo"    → sus metas se revisan en el paso 2.
//   · "pausado" → sus metas SE REVISAN (pausa ≠ muerte: la meta puede
//                 volver), pero se marcan para que no compitan por delante.
//   · "muerto"  → sus metas NO aparecen; se listan aparte con el motivo.
//   · no listado (archivado o borrado) → sus metas NO aparecen, y se dice
//     que el proyecto no está disponible (antes el aviso mentía y decía
//     que todos eran proyectos marcados como muertos).
//
// POR QUÉ ES UN MÓDULO PURO
//   El filtro es una regla de negocio, no de pantalla: va con su test.
// ============================================================================

import type { Meta, Proyecto } from "@/lib/types";

export type EstadoProyectoRitual = "vivo" | "pausado" | "muerto";

export type MotivoExclusion = "proyecto_muerto" | "proyecto_no_disponible";

export type MetaExcluida = {
  meta: Meta;
  /** Nombre del proyecto, si se conoce; null si ya no está. */
  proyecto: string | null;
  motivo: MotivoExclusion;
};

export type DraftRitualMinimo = {
  proyectos?: Record<string, { estado?: string }>;
  metas?: Record<string, { estado?: string }>;
};

/** Estado del proyecto en el ritual: lo del borrador manda sobre la BD. */
export function estadoProyectoEnRitual(
  proyecto: Proyecto,
  draft: DraftRitualMinimo | null | undefined,
): EstadoProyectoRitual {
  const delBorrador = draft?.proyectos?.[proyecto.id]?.estado;
  const estado = delBorrador ?? proyecto.estado ?? "vivo";
  if (estado === "muerto" || estado === "archivada") return "muerto";
  if (estado === "pausado" || estado === "pausada") return "pausado";
  return "vivo";
}

/** ¿La meta está cerrada (muere)? Ni se revisa ni se avisa de ella. */
function metaArchivada(meta: Meta, draft: DraftRitualMinimo | null | undefined) {
  if (meta.estado === "archivada") return true;
  return draft?.metas?.[meta.id]?.estado === "archivada";
}

export function clasificarMetasRitual(
  metas: Meta[],
  proyectos: Proyecto[],
  draft: DraftRitualMinimo | null | undefined,
): { visibles: Meta[]; excluidas: MetaExcluida[] } {
  const porId = new Map(proyectos.map((p) => [p.id, p]));

  const visibles: Meta[] = [];
  const excluidas: MetaExcluida[] = [];

  for (const meta of metas) {
    if (metaArchivada(meta, draft)) continue;

    if (!meta.proyecto_id) {
      visibles.push(meta);
      continue;
    }

    const proyecto = porId.get(meta.proyecto_id);
    if (!proyecto) {
      // El proyecto no está en la lista (archivado o borrado): sus metas
      // no se revisan, pero el aviso tiene que decir la verdad.
      excluidas.push({
        meta,
        proyecto: null,
        motivo: "proyecto_no_disponible",
      });
      continue;
    }

    if (estadoProyectoEnRitual(proyecto, draft) === "muerto") {
      excluidas.push({
        meta,
        proyecto: proyecto.nombre,
        motivo: "proyecto_muerto",
      });
      continue;
    }

    visibles.push(meta);
  }

  return { visibles, excluidas };
}

/** Texto del motivo, para la pantalla. */
export function textoMotivo(motivo: MotivoExclusion): string {
  return motivo === "proyecto_muerto"
    ? "su proyecto ha muerto en este ritual"
    : "su proyecto no está disponible (archivado o borrado)";
}
