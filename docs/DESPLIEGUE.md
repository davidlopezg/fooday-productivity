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
