import { useState } from "react";

interface Props {
  error?: string;
  taskId?: string;
}

export function RecurrenceWarning({ error, taskId }: Props) {
  const [show, setShow] = useState(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Check for global warning state via a simple module-level variable
  // (mounted only once). We store it as a plain object on the module.
  // For simplicity we expose it through a closure captured from the effect below.
  // Since TS doesn't allow direct access, we'll just render when show is true.
  // In practice, the parent AppShell sets up the effect which populates these states.

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 w-full bg-amber-500/80 bg-amber-300/20 border-b border-amber-500/30 z-50 p-4 text-sm text-amber-800 dark:text-amber-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 font-medium">⚠️</span>
            <span className="text-amber-800">Error al clonar tarea recurrente</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="ml-2 px-3 py-1 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors"
              onClick={() => {
                if (taskId) {
                  console.log("Retrying clone for task", taskId);
                  setShow(false);
                }
              }}
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
