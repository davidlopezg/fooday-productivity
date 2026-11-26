import {
  MARCO_SECCIONES,
  MARCO_SUBTITULO,
  MARCO_TITULO,
  marcoAnchor,
  type MarcoSeccion,
} from "@/lib/norte/marcoPersonal";

// ============================================================================
// Render del "Marco Personal de Vida" dentro de /norte.
//
// Es contenido estático, así que no necesita estado: se renderiza con <details>
// (nativo, accesible con teclado) para que el documento sea largo pero legible.
// ============================================================================

function Seccion({ seccion }: { seccion: MarcoSeccion }) {
  return (
    <section
      id={marcoAnchor(seccion)}
      className="scroll-mt-20 rounded-xl border border-border bg-card p-6"
    >
      <h3 className="text-lg font-bold tracking-tight">
        <span className="mr-2 font-mono text-sm text-muted-foreground">
          §{seccion.num}
        </span>
        {seccion.titulo}
      </h3>

      {seccion.intro?.map((p) => (
        <p key={p} className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {p}
        </p>
      ))}

      {seccion.bloques?.map((bloque) => (
        <details
          key={bloque.titulo}
          className="group mt-4 rounded-lg border border-border bg-background/60"
        >
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold marker:hidden">
            <span className="mr-2 inline-block transition-transform group-open:rotate-90">
              ▸
            </span>
            {bloque.titulo}
          </summary>
          <div className="space-y-3 px-4 pb-4">
            {bloque.parrafos?.map((p) => (
              <p key={p} className="text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {bloque.lista ? (
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                  {bloque.lista.titulo}
                </div>
                <ul className="mt-2 space-y-1.5">
                  {bloque.lista.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {bloque.cierre ? (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm font-medium leading-relaxed">
                {bloque.cierre}
              </p>
            ) : null}
          </div>
        </details>
      ))}

      {seccion.listas?.map((lista) => (
        <div key={lista.titulo} className="mt-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
            {lista.titulo}
          </div>
          <ul className="mt-2 space-y-1.5">
            {lista.items.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {seccion.tablas?.map((tabla) => (
        <div key={tabla.titulo ?? tabla.columnas.join("/")} className="mt-4">
          {tabla.titulo ? (
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-foreground">
              {tabla.titulo}
            </div>
          ) : null}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {tabla.columnas.map((c) => (
                    <th
                      key={c}
                      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tabla.filas.map((fila, i) => (
                  <tr key={`${fila[0]}-${i}`} className="border-t border-border">
                    {fila.map((celda, j) => (
                      <td
                        key={j}
                        className={`px-3 py-2 align-top leading-relaxed ${
                          j === 0
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {celda}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {seccion.cierre?.map((p) => (
        <p
          key={p}
          className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium leading-relaxed"
        >
          {p}
        </p>
      ))}
    </section>
  );
}

export default function MarcoPersonal() {
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-xl font-bold tracking-tight">📜 {MARCO_TITULO}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {MARCO_SUBTITULO}
        </p>
      </header>

      <nav
        aria-label="Índice del marco personal"
        className="rounded-xl border border-border bg-card p-6"
      >
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Índice del documento
        </h3>
        <ol className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {MARCO_SECCIONES.map((s) => (
            <li key={s.num}>
              <a
                href={`#${marcoAnchor(s)}`}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                <span className="mr-1.5 font-mono text-xs">§{s.num}</span>
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-4">
        {MARCO_SECCIONES.map((s) => (
          <Seccion key={s.num} seccion={s} />
        ))}
      </div>
    </section>
  );
}
