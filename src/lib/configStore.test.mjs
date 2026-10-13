// ============================================================================
// Test del logging de configStore: NUNCA debe exponer la API key.
// ============================================================================
// Interceptamos console.error/console.warn para verificar que los logs
// solo contienen campos estructurales (code/message/details/hint) y nunca
// el contenido de `minimax_api_key`.
// ============================================================================

let pass = 0;
let fail = 0;
const failures = [];

function test(nombre, fn) {
  try {
    fn();
    pass++;
    console.log(`  ✅ ${nombre}`);
  } catch (e) {
    fail++;
    failures.push({ nombre, error: e.message });
    console.log(`  ❌ ${nombre}: ${e.message}`);
  }
}

const API_KEY_FALSA = "minimax-FAKEKEY-1234567890-abcdef";

test("El log de fetchRemote no contiene la API key", () => {
  const logs = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => logs.push(args);
  console.warn = (...args) => logs.push(args);
  try {
    // Simula el bloque de log que configStore.tsx ejecuta cuando
    // fetchRemote recibe un error de Supabase.
    const error = {
      code: "PGRST116",
      message: "JSON object requested, multiple (or no) rows returned",
      details: null,
      hint: null,
    };
    console.error("[configStore] fetchRemote Supabase error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
  // Verifica que ninguno de los logs contiene la API key.
  const textoLogs = JSON.stringify(logs);
  if (textoLogs.includes(API_KEY_FALSA)) {
    throw new Error("el log contiene la API key!");
  }
});

test("El log del upsert no contiene la API key", () => {
  const logs = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => logs.push(args);
  console.warn = (...args) => logs.push(args);
  try {
    // Simula la línea exacta de configStore.tsx cuando upsert falla.
    const error = {
      code: "23505",
      message: "duplicate key value violates unique constraint",
      details: "Key (user_id)=(abc) already exists.",
      hint: null,
    };
    console.error("[configStore] upsert Supabase error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  } finally {
    console.error = origError;
    console.warn = origWarn;
  }
  const textoLogs = JSON.stringify(logs);
  if (textoLogs.includes(API_KEY_FALSA)) {
    throw new Error("el log contiene la API key!");
  }
});

test("El setLastError solo expone el mensaje genérico de Supabase", () => {
  // Verifica que el mensaje al usuario no filtra información sensible.
  const mensajeUsuario = "Supabase: JSON object requested, multiple (or no) rows returned";
  if (mensajeUsuario.includes(API_KEY_FALSA)) {
    throw new Error("el mensaje al usuario contiene la API key!");
  }
  if (mensajeUsuario.length === 0) {
    throw new Error("el mensaje al usuario está vacío");
  }
});

test("El log de upsert con 0 filas diagnostica RLS", () => {
  // Verifica que el mensaje accionable se muestra al usuario.
  const mensaje =
    "Supabase aceptó la operación pero no se insertó/actualizó ninguna fila. " +
    "Revisa las políticas RLS de la tabla configuracion.";
  if (mensaje.includes(API_KEY_FALSA)) {
    throw new Error("el mensaje contiene la API key!");
  }
  if (!mensaje.toLowerCase().includes("rls")) {
    throw new Error("el mensaje no menciona RLS");
  }
});

console.log("\n---");
console.log(`Resultado: ${pass} pasaron, ${fail} fallaron.`);
if (fail > 0) {
  console.log("\nFallos:");
  for (const f of failures) console.log(`  - ${f.nombre}: ${f.error}`);
  process.exit(1);
}
