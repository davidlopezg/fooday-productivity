import test from "node:test";
import assert from "node:assert/strict";
import { parsearRespuestaAgente } from "./propuesta.ts";

test("parsea respuesta con propuesta de tarea", () => {
  const r = parsearRespuestaAgente(JSON.stringify({ respuesta: "Puedo preparar esa tarea.", propuesta: { titulo: "  Llamar a Marta  ", prioridad: "alta" } }));
  assert.equal(r.contenido, "Puedo preparar esa tarea.");
  assert.equal(r.propuesta?.titulo, "Llamar a Marta");
  assert.equal(r.propuesta?.prioridad, "alta");
});

test("una propuesta sin título no se aplica", () => {
  const r = parsearRespuestaAgente(JSON.stringify({ respuesta: "Texto", propuesta: { titulo: "  " } }));
  assert.equal(r.propuesta, null);
});

test("una respuesta no JSON se conserva", () => {
  const r = parsearRespuestaAgente("Respuesta normal");
  assert.equal(r.contenido, "Respuesta normal");
  assert.equal(r.propuesta, null);
});
