export const RUN_STATES = ["queued", "running", "waiting_user", "waiting_approval", "completed", "failed", "cancelled"];
export const APPROVAL_STATES = ["pending", "approved", "rejected", "expired"];

export function canTransitionRun(from, to) {
  const transitions = {
    queued: ["running", "cancelled", "failed"],
    running: ["waiting_user", "waiting_approval", "completed", "failed", "cancelled"],
    waiting_user: ["running", "cancelled", "failed"],
    waiting_approval: ["running", "completed", "failed", "cancelled"],
    completed: [],
    failed: [],
    cancelled: [],
  };
  return (transitions[from] || []).includes(to);
}

export function canTransitionApproval(from, to) {
  return from === "pending" && ["approved", "rejected", "expired"].includes(to);
}

export function isTerminalRun(state) {
  return ["completed", "failed", "cancelled"].includes(state);
}

export function isExpiredApproval(approval, now = Date.now()) {
  return approval.state === "pending" && approval.expires_at && Date.parse(approval.expires_at) <= now;
}
