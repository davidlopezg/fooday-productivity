import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sql = await readFile(new URL("../../../supabase/migrations/0040_agentes_mvp.sql", import.meta.url), "utf8");
const tablas = [
  "agent_configs", "agent_config_versions", "agent_skills_mvp", "agent_skill_links",
  "agent_conversations_mvp", "agent_conversation_participants_mvp", "agent_messages_mvp",
  "agent_task_assignments_mvp", "agent_action_proposals_mvp", "agent_activity_mvp",
];

test("cada tabla del MVP tiene owner_id y RLS", () => {
  for (const tabla of tablas) {
    const bloque = sql.match(new RegExp(`create table if not exists public\\.${tabla} \\(([\\s\\S]*?)\\);`));
    assert.ok(bloque, `falta la tabla ${tabla}`);
    assert.match(bloque[1], /owner_id uuid not null default auth\.uid\(\)/);
    assert.match(sql, /alter table public\.%I enable row level security/);
    assert.match(sql, /create policy own_select on public\.%I for select using \(owner_id = auth\.uid\(\)\)/);
    assert.match(sql, new RegExp(`'${tabla}'`));
  }
});

test("las relaciones validan el propietario", () => {
  assert.match(sql, /validar_relaciones_agentes_mvp/);
  assert.match(sql, /owner_id = new\.owner_id/);
  assert.match(sql, /validar_conversacion_agentes_mvp/);
});
