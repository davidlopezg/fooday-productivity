# fooday-productivity

Sistema operativo personal con **menos fricción** que los comandos y agentes:
una **app web (Next.js)** con **base de datos en Supabase**.

> **Propósito, valores, visión, metas/OKR, tareas, rituales, plan semanal y plan diario** en un solo sitio, accesible desde cualquier dispositivo.

---

## 🧭 Principio rector

> **Supabase es la fuente de verdad de los datos operativos.**
> El repositorio `fooday-intelligence-core` pasa a ser el **cerebro** (agentes, conocimiento, análisis) y **origen de una migración puntual**, no la base de datos.

```
   APP WEB (esta)  ──supabase-js──►  SUPABASE  ◄──MCP──  agente (cerebro)
```

---

## 🚀 Quickstart

### 1. Configurar variables de entorno

```bash
cp .env.local.example .env.local
# Rellena NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 2. Crear el esquema en Supabase

Opción A (CLI):
```bash
npx supabase link --project-ref <tu-project-ref>
npx supabase db push
```

Opción B (dashboard): pega el contenido de `supabase/migrations/0001_init.sql`
en el SQL Editor de Supabase.

### 3. Migrar los datos desde el repo de inteligencia

```bash
FOODAY_CORE_DIR="C:/Users/David/Projects/fooday-intelligence-core" \
FOODAY_OWNER_ID="<uuid-de-tu-usuario>" \
python scripts/etl/import_from_core.py
```

Esto genera `supabase/seed/001_seed_from_core.sql`. Ejecútalo en Supabase
(SQL Editor o `db push`). Detalle en [`docs/MIGRACION.md`](docs/MIGRACION.md).

### 4. Arrancar

```bash
npm run dev
# http://localhost:3000
```

---

## 🗺️ Pantallas

| Ruta | Pantalla | Qué hace |
|:---|:---|:---|
| `/` | **Hoy** | Semáforo + plan del día + contadores |
| `/captura` | **Captura** | Inbox rápido (vaciar cabeza) |
| `/tareas` | **Tareas** | Pendientes, marcar hechas |
| `/semana` | **Semana** | Rituales fijos |
| `/metas` | **Metas / OKR** | Cards de metas |
| `/norte` | **Norte** | Propósito, valores, visión |

---

## 📚 Documentación

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — capas y decisiones
- [`docs/MODELO-DATOS.md`](docs/MODELO-DATOS.md) — esquema de tablas
- [`docs/MIGRACION.md`](docs/MIGRACION.md) — ETL desde `fooday-intelligence-core`
- [`docs/CONFIGURACION.md`](docs/CONFIGURACION.md) — Supabase paso a paso
- [`docs/DESPLIEGUE.md`](docs/DESPLIEGUE.md) — publicar en GitHub Pages + app móvil (PWA)
- [`docs/CAPACITOR.md`](docs/CAPACITOR.md) — APK / IPA nativos con Capacitor

---

## 🔐 Seguridad

- El navegador usa **solo la `anon` key** + **Row Level Security (RLS)**.
- La `service_role` **nunca** va al cliente; solo en scripts de migración.
- Cada tabla tiene RLS `owner_id = auth.uid()`. Cada usuario ve solo lo suyo.
- **Este proyecto NO almacena** finanzas, salud, legal ni datos familiares sensibles.

---

## 🧱 Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Supabase** (`@supabase/supabase-js`, PostgreSQL + RLS)
- **Python** (solo para el ETL de migración)

## 📱 Móvil

La app es **PWA instalable** (manifest + icono) y además se puede compilar
como **app nativa Android / iOS con Capacitor**:

- **PWA rápida** → desplegar en GitHub Pages, abrir en el móvil y
  "Añadir a pantalla de inicio". Cero fricción.
- **APK / iOS nativo** → `npm run cap:build:android` (o `:ios`) genera
  el proyecto nativo listo para Android Studio / Xcode.
  Ver [`docs/CAPACITOR.md`](docs/CAPACITOR.md).
