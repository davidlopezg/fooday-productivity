function required(name, value) {
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

export function readConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8787),
    supabaseUrl: required("SUPABASE_URL", env.SUPABASE_URL).replace(/\/+$/, ""),
    supabaseAnonKey: required("SUPABASE_ANON_KEY", env.SUPABASE_ANON_KEY),
    aiBaseUrl: required("AI_BASE_URL", env.AI_BASE_URL).replace(/\/+$/, ""),
    aiApiKey: required("AI_API_KEY", env.AI_API_KEY),
    aiModel: env.AI_MODEL || "Minimax-M3",
    maxDurationMs: Number(env.RUN_MAX_DURATION_MS || 120_000),
    maxOutputChars: Number(env.RUN_MAX_OUTPUT_CHARS || 100_000),
  };
}
