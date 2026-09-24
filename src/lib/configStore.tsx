"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";

export type Config = {
  base_url: string;
  minimax_api_key: string | null;
  model: string;
};

const DEFAULT: Config = {
  base_url: "https://api.minimax.io/v1",
  minimax_api_key: null,
  model: "Minimax-M3",
};

const LS_KEY = "fooday.config.v1";

function readLS(): Config {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Config>;
    return {
      base_url: parsed.base_url || DEFAULT.base_url,
      minimax_api_key:
        typeof parsed.minimax_api_key === "string" && parsed.minimax_api_key.length > 0
          ? parsed.minimax_api_key
          : null,
      model: parsed.model || DEFAULT.model,
    };
  } catch {
    return DEFAULT;
  }
}

function writeLS(cfg: Config) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* ignore quota errors */
  }
}

async function fetchRemote(): Promise<Config> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("configuracion")
    .select("base_url,minimax_api_key,model")
    .maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT;
  return {
    base_url: (data.base_url as string) || DEFAULT.base_url,
    minimax_api_key: (data.minimax_api_key as string | null) ?? null,
    model: (data.model as string) || DEFAULT.model,
  };
}

type ConfigContextValue = {
  data: Config;
  loading: boolean;
  save: (next: Partial<Config>) => Promise<void>;
  reload: () => void;
  diagnostic: { supabaseUrl: string; userId: string | null; lastError: string | null };
};

const ConfigContext = createContext<ConfigContextValue>({
  data: DEFAULT,
  loading: true,
  save: async () => {
    /* noop */
  },
  reload: () => {
    /* noop */
  },
  diagnostic: { supabaseUrl: "", userId: null, lastError: null },
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Config>(() => readLS());
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "(no definida)";
  const [userId, setUserId] = useState<string | null>(null);

  // Carga el user id una vez (para diagnóstico).
  useEffect(() => {
    let alive = true;
    createClient()
      .auth.getUser()
      .then(({ data: { user } }) => {
        if (alive) setUserId(user?.id ?? null);
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      alive = false;
    };
  }, []);

  // Sincroniza con Supabase en background; localStorage es la fuente inmediata.
  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchRemote()
      .then((d) => {
        if (!alive) return;
        setLastError(null);
        // Si Supabase tiene datos, hacen override a localStorage.
        if (d.minimax_api_key || d !== DEFAULT) {
          setData(d);
          writeLS(d);
        }
      })
      .catch((e: Error) => {
        if (alive) setLastError(e.message || String(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  const save = useCallback(
    async (next: Partial<Config>) => {
      const merged: Config = {
        base_url: next.base_url ?? data.base_url,
        minimax_api_key:
          next.minimax_api_key !== undefined
            ? next.minimax_api_key
            : data.minimax_api_key,
        model: next.model ?? data.model,
      };

      // 1) Actualiza local + localStorage inmediatamente (no bloquea la UI).
      setData(merged);
      writeLS(merged);
      setLastError(null);

      // 2) Intenta sincronizar con Supabase (best effort).
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLastError("No autenticado (no se pudo sincronizar con Supabase)");
          return;
        }
        const { error } = await supabase.from("configuracion").upsert(
          {
            user_id: user.id,
            base_url: merged.base_url,
            minimax_api_key: merged.minimax_api_key,
            model: merged.model,
          },
          { onConflict: "user_id" },
        );
        if (error) {
          setLastError(`Supabase: ${error.message}`);
        }
      } catch (e) {
        setLastError(
          e instanceof Error ? e.message : "Error desconocido al guardar",
        );
      }
    },
    [data],
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<ConfigContextValue>(
    () => ({
      data,
      loading,
      save,
      reload,
      diagnostic: { supabaseUrl, userId, lastError },
    }),
    [data, loading, save, reload, supabaseUrl, userId, lastError],
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
