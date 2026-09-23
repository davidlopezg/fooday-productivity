# Configuración de Supabase

## 1. Crear (o elegir) el proyecto

En https://supabase.com/dashboard, crea un proyecto nuevo para este dominio
(**no reutilices** el de recetas ni el de tesorería).

Anota:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (solo local, para el ETL)

## 2. Variables de entorno

```bash
cp .env.local.example .env.local
```

Rellena `.env.local` (nunca se sube a git).

## 3. Aplicar el esquema

**Dashboard:** SQL Editor → pega `supabase/migrations/0001_init.sql` → Run.

**CLI:**
```bash
npx supabase login
npx supabase link --project-ref <ref>
npx supabase db push
```

## 4. Crear tu usuario

Supabase Dashboard → Authentication → Users → **Add user**
(email + contraseña). Copia el `uuid`.

```sql
select id, email from auth.users;
```

## 5. Migrar los datos

```bash
FOODAY_OWNER_ID="<uuid>" python scripts/etl/import_from_core.py
```

Ejecuta `supabase/seed/001_seed_from_core.sql` en el SQL Editor.

## 6. (Opcional) Conectar el agente por MCP

Para que `fooday-intelligence-core` lea Supabase, añade un MCP server de
Supabase a su `.mcp.json`. En ese caso:
- Usa un **token de solo lectura** o RLS, no la `service_role` global.
- No dupliques datos: Supabase manda en el dominio operativo.

## 7. Desplegar

Puedes desplegar en **Vercel** (Next.js) o **Cloudflare Pages**.
Configura las variables de entorno en el panel del hosting.
Nunca subas la `service_role` al hosting del frontend.
