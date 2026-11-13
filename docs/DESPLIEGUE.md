# Despliegue en GitHub Pages (app móvil)

La app es una **SPA estática** (`output: "export"`) y una **PWA instalable**.
GitHub Pages solo sirve archivos estáticos, por eso todo corre en el navegador
(Supabase se consulta directamente con la anon key + RLS).

## 1. Crear el repositorio en GitHub

Crea un repo (por ejemplo `fooday-productivity`) en tu cuenta y sube el código:

```bash
cd C:/Users/David/Projects/fooday-productivity
git remote add origin https://github.com/<TU-USUARIO>/fooday-productivity.git
git branch -M main
git push -u origin main
```

## 2. Añadir los secretos del repo

GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|:---|:---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ulawigfrvfezyiisrdzw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon key |

> La anon key es **pública** (va en el bundle); los secretos solo evitan tenerla en el código.

## 3. Activar GitHub Pages

GitHub → repo → **Settings → Pages** → **Source: GitHub Actions**.

## 4. Desplegar

El workflow `.github/workflows/deploy.yml` se dispara en cada `push` a `main`.
Espera ~1 min y tendrás la URL:

```
https://<TU-USUARIO>.github.io/fooday-productivity/
```

> El workflow fija `NEXT_PUBLIC_BASE_PATH=/<nombre-del-repo>` automáticamente.
> Si usas un dominio propio o un *user site* (`<usuario>.github.io`), cambia ese valor.

## 5. Autorizar la URL en Supabase Auth

Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://<TU-USUARIO>.github.io/fooday-productivity/`
- **Redirect URLs:** añade la misma URL.

Así funcionarán los enlaces de confirmación/recuperación.

## 6. Instalar en el móvil (PWA)

- **Android/Chrome:** abre la URL → menú ⋮ → **Añadir a pantalla de inicio**.
- **iPhone/Safari:** abre la URL → **Compartir** → **Añadir a pantalla de inicio**.

Se abre a pantalla completa, como una app.

## Migraciones (importante: el deploy NO las aplica)

El workflow `.github/workflows/deploy.yml` **solo construye y publica** el
código. **No aplica las migraciones de `supabase/migrations/`**: eso es un
paso MANUAL, y si te lo saltas la app deployed pide columnas que la base de
datos todavía no tiene.

Qué pasó de verdad (issue #54): al fusionar el PR que traía la migration
0038 (WIG de KR), la página `/krs` dejó de cargar con

```
column resultados_periodo.es_wig does not exist code: 42703
```

porque la migration estaba en `main` pero no en la base de datos.

### Cómo aplicar una migración

1. Abre el proyecto en <https://supabase.com/dashboard> → **SQL Editor**.
2. Pega el contenido del fichero de `supabase/migrations/` (son idempotentes:
   `add column if not exists`, `create index if not exists`,
   `create or replace function`).
3. Ejecuta y comprueba que no da errores.

> `npm run db:push` (Supabase CLI) necesita un proyecto enlazado
> (`supabase link`) y aplica TODAS las migraciones pendientes, no solo una.
> Para una migración nueva, el SQL Editor es lo más seguro.

### Qué hacer si te saltas ese paso

La app **degrada, no se rompe**: la página avisa de qué migración falta y lo
que deja de funcionar hasta que la apliques. Pero la función NO existe hasta
entonces: aplícala cuanto antes.

### En los PRs

Si el PR trae una migración, el campo **Riesgo** de la plantilla del PR tiene
que decir qué migración hay que aplicar. Fusionar sin aplicarla es lo que
provoca estas roturas.

## Probar en local

```bash
npm run dev          # desarrollo (http://localhost:3000)
npm run build        # genera ./out
npm run preview      # sirve ./out (simula producción)
```

Para simular GitHub Pages en local:

```bash
# Git Bash: MSYS_NO_PATHCONV=1 evita que convierta "/repo" en ruta Windows
MSYS_NO_PATHCONV=1 NEXT_PUBLIC_BASE_PATH=/fooday-productivity npm run build
```

## Seguridad

- El repositorio/Pages es **público**, pero los datos están protegidos por
  **Supabase Auth + RLS**: cada usuario solo ve lo suyo.
- No subas nunca la `service_role` (solo se usa en scripts locales).
