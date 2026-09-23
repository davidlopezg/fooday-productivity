import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase para el navegador (SPA estática).
 * Solo usa la anon key + RLS. La sesión se persiste en localStorage.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
}
