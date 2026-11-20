import test from "node:test";
import assert from "node:assert/strict";
import { canTransitionApproval, canTransitionRun, isExpiredApproval, isTerminalRun } from "../src/runs.mjs";

test("una run solo sigue transiciones válidas", () => {
  assert.equal(canTransitionRun("queued", "running"), true);
  assert.equal(canTransitionRun("running", "completed"), true);
  assert.equal(canTransitionRun("completed", "running"), false);
  assert.equal(canTransitionRun("cancelled", "completed"), false);
  assert.equal(isTerminalRun("cancelled"), true);
});

test("una aprobación pendiente se decide una sola vez", () => {
  assert.equal(canTransitionApproval("pending", "approved"), true);
  assert.equal(canTransitionApproval("pending", "rejected"), true);
  assert.equal(canTransitionApproval("approved", "rejected"), false);
  assert.equal(canTransitionApproval("expired", "approved"), false);
});

test("una aprobación pendiente puede expirar", () => {
  assert.equal(isExpiredApproval({ state: "pending", expires_at: "2020-01-01T00:00:00Z" }), true);
  assert.equal(isExpiredApproval({ state: "approved", expires_at: "2020-01-01T00:00:00Z" }), false);
});
