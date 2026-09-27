import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Cliente Supabase singleton para el navegador (SPA estática).
 * Solo usa la anon key + RLS. La sesión se persiste en localStorage.
 *
 * Reutiliza la misma instancia entre llamadas para evitar N clientes
 * simultáneos y reducir memoria.
 */
export function createClient(): SupabaseClient {
  if (_client) return _client;
  _client = createSupabaseClient(
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
  return _client;
}