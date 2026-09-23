"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carga datos de forma asíncrona con estado de loading y `reload()`.
 * Pensado para la SPA estática (todo en cliente).
 */
export function useData<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const loaderRef = useRef(loader);

  // Mantiene el loader actualizado sin tocar refs durante el render.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let alive = true;
    loaderRef
      .current()
      .then((d) => {
        if (alive) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [nonce]);

  const reload = useCallback(() => {
    setLoading(true);
    setNonce((n) => n + 1);
  }, []);

  return { data, loading, reload, setData };
}
