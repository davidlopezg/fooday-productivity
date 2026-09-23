// Tipos del dominio operativo (alineados con supabase/migrations/0001_init.sql)

export type Semaforo = "verde" | "amarillo" | "rojo";

export type EstadoMeta =
  | "sin_empezar"
  | "en_progreso"
  | "bloqueada"
  | "completada"
  | "archivada";

export type EstadoTarea =
  | "pendiente"
  | "en_progreso"
  | "bloqueada"
  | "hecha"
  | "descartada"
  | "archivada";

export type Prioridad = "critica" | "urgente" | "alta" | "media" | "baja";

export interface Area {
  id: string;
  nombre: string;
  color: string | null;
  orden: number;
}

export interface Proposito {
  id: string;
  area_id: string | null;
  texto: string;
  orden: number;
}

export interface Valor {
  id: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface Vision {
  id: string;
  horizonte: string;
  texto: string;
  es_bhag: boolean;
  orden: number;
}

export interface Meta {
  id: string;
  area_id: string | null;
  codigo: string | null;
  titulo: string;
  descripcion: string | null;
  estado: EstadoMeta;
  prioridad: Prioridad | null;
  rice: number | null;
  plazo: string | null;
}

export interface Tarea {
  id: string;
  area_id: string | null;
  meta_id: string | null;
  codigo: string | null;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad | null;
  capa: string | null;
  deadline: string | null;
  pts: number | null;
  esfuerzo: string | null;
  importe: number | null;
  estado: EstadoTarea;
  origen: string | null;
  notas: string | null;
  completada_at: string | null;
}

export interface Ritual {
  id: string;
  dia_semana: number; // ISO 1=lunes .. 7=domingo
  hora: string | null;
  bloque: string | null;
  descripcion: string;
  activo: boolean;
}

export interface PlanDiario {
  id: string;
  fecha: string;
  semaforo: Semaforo | null;
  despertar: string | null;
  mente: string | null;
  cuerpo: string | null;
  rueda: string | null;
  necesidad: string | null;
  resumen: string | null;
  recomendacion: string | null;
}

export interface PlanDiarioTarea {
  id: string;
  plan_diario_id: string;
  tarea_id: string | null;
  tipo: "imprescindible" | "autocuidado" | "micro" | "extra";
  titulo_libre: string | null;
  hecho: boolean;
  orden: number;
}

export interface Captura {
  id: string;
  fecha: string;
  rama:
    | "tarea"
    | "problema"
    | "reflexion"
    | "idea"
    | "pago"
    | "maria"
    | "sin_clasificar"
    | null;
  texto: string;
  estado: "pendiente" | "procesada" | "descartada";
  destino: string | null;
}
