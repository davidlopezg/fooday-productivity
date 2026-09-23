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

type ConfigContextValue = {
  data: Config;
  loading: boolean;
  save: (next: Partial<Config>) => Promise<void>;
  reload: () => void;
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
});

async function fetchRemote(): Promise<Config> {
  const supabase = createClient();
  const { data } = await supabase
    .from("configuracion")
    .select("base_url,minimax_api_key,model")
    .maybeSingle();
  if (!data) return DEFAULT;
  return {
    base_url: (data.base_url as string) || DEFAULT.base_url,
    minimax_api_key: (data.minimax_api_key as string | null) ?? null,
    model: (data.model as string) || DEFAULT.model,
  };
}

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Config>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchRemote()
      .then((d) => {
        if (alive) setData(d);
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
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No autenticado");
      const { error } = await supabase.from("configuracion").upsert(
        {
          user_id: user.id,
          base_url: merged.base_url,
          minimax_api_key: merged.minimax_api_key,
          model: merged.model,
        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
      // Optimista: actualiza el estado compartido al instante para que
      // todas las páginas vean la nueva config sin esperar al refetch.
      setData(merged);
    },
    [data],
  );

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const value = useMemo<ConfigContextValue>(
    () => ({ data, loading, save, reload }),
    [data, loading, save, reload],
  );

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
