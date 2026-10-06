"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "@/lib/errors";

/**
 * Carga datos de forma asíncrona con estado de loading, error y `reload()`.
 *
 * - `loading` se inicializa a `true` y se apaga tras el primer load.
 * - `error` captura cualquier excepción del loader (red, RLS, etc.) y la
 *   expone para que la UI pueda mostrar un mensaje en vez de crashear.
 * - Para señales de "estoy recargando" durante mutaciones, el consumidor
 *   debería usar `useTransition` local en su handler.
 * - `deps` opcional: si cambia, se vuelve a cargar.
 */
export function useData<T>(
  loader: () => Promise<T>,
  initial: T,
  deps: ReadonlyArray<unknown> = [],
) {
  const [data, setData] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  const depsKey = deps.map((d) => JSON.stringify(d)).join("|");

  // Mantiene el loader actualizado sin tocar refs durante el render.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let alive = true;
    setError(null);
    loaderRef.current()
      .then((d) => {
        if (!alive) return;
        setData(d);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = errorMessage(e);
        setError(msg);
        setLoaded(true); // no se queda en loading eterno
        console.warn("[useData] load falló:", msg);
      });
    return () => {
      alive = false;
    };
  }, [depsKey]);

  const reload = useCallback(() => {
    setError(null);
    loaderRef.current()
      .then((d) => {
        setData(d);
        setLoaded(true);
      })
      .catch((e: unknown) => {
        const msg = errorMessage(e);
        setError(msg);
        console.warn("[useData] reload falló:", msg);
      });
  }, []);

  return { data, loading: !loaded, reload, setData, error };
}
