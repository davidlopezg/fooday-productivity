"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Carga datos de forma asíncrona con estado de loading y `reload()`.
 *
 * - `loading` se inicializa a `true` y se apaga tras el primer load.
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
  const loaderRef = useRef(loader);
  const depsKey = deps.map((d) => JSON.stringify(d)).join("|");

  // Mantiene el loader actualizado sin tocar refs durante el render.
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let alive = true;
    loaderRef.current().then((d) => {
      if (!alive) return;
      setData(d);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [depsKey]);

  const reload = useCallback(() => {
    loaderRef.current().then((d) => {
      setData(d);
      setLoaded(true);
    });
  }, []);

  return { data, loading: !loaded, reload, setData };
}
