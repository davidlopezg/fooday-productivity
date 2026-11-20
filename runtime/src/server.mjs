import { createServer } from "node:http";
import { readConfig } from "./config.mjs";
import { authenticate, HttpError, supabaseFetch } from "./auth.mjs";
import { canTransitionApproval, canTransitionRun, isExpiredApproval } from "./runs.mjs";

const config = readConfig();

function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new HttpError(413, "Cuerpo demasiado grande");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new HttpError(400, "JSON inválido");
  }
}

async function insertRun(user, body) {
  if (!body.prompt || typeof body.prompt !== "string") {
    throw new HttpError(400, "El prompt es obligatorio");
  }
  const response = await supabaseFetch("agent_runs", {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: user.id,
      conversation_id: body.conversation_id ?? null,
      agent_id: body.agent_id ?? null,
      state: "queued",
      prompt: body.prompt.slice(0, 100_000),
    }),
  }, user.token, config);
  const rows = await response.json();
  return rows[0];
}

async function updateRun(user, id, patch, expectedState) {
  const stateFilter = expectedState ? `&state=eq.${encodeURIComponent(expectedState)}` : "";
  const response = await supabaseFetch(`agent_runs?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}${stateFilter}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(patch),
  }, user.token, config);
  const rows = await response.json();
  return rows[0] || null;
}

async function getRun(user, id) {
  const response = await supabaseFetch(`agent_runs?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`, {
    method: "GET",
  }, user.token, config);
  const rows = await response.json();
  return rows[0] || null;
}

async function listApprovals(user) {
  const response = await supabaseFetch("agent_approvals?owner_id=eq." + encodeURIComponent(user.id) + "&state=eq.pending&select=*", {
    method: "GET",
  }, user.token, config);
  return response.json();
}

async function decideApproval(user, id, decision) {
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpError(400, "Decisión inválida");
  }
  const current = await getApproval(user, id);
  if (!current) throw new HttpError(404, "Aprobación no encontrada");
  if (isExpiredApproval(current)) {
    await updateApproval(user, id, { state: "expired", decided_at: new Date().toISOString() }, "pending");
    throw new HttpError(409, "La aprobación ha caducado");
  }
  if (!canTransitionApproval(current.state, decision)) {
    throw new HttpError(409, "La aprobación ya fue decidida");
  }
  const updated = await updateApproval(user, id, { state: decision, decided_at: new Date().toISOString() }, "pending");
  if (!updated) throw new HttpError(409, "La aprobación ya fue decidida");
  return updated;
}

async function getApproval(user, id) {
  const response = await supabaseFetch(`agent_approvals?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}&select=*`, {
    method: "GET",
  }, user.token, config);
  const rows = await response.json();
  return rows[0] || null;
}

async function updateApproval(user, id, patch, expectedState) {
  const stateFilter = expectedState ? `&state=eq.${encodeURIComponent(expectedState)}` : "";
  const response = await supabaseFetch(`agent_approvals?id=eq.${encodeURIComponent(id)}&owner_id=eq.${encodeURIComponent(user.id)}${stateFilter}`, {
    method: "PATCH",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(patch),
  }, user.token, config);
  const rows = await response.json();
  return rows[0] || null;
}

async function streamRun(user, run, body, res) {
  const started = Date.now();
  await updateRun(user, run.id, { state: "running", started_at: new Date().toISOString() });
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
  });
  res.write(`event: run\ndata: ${JSON.stringify({ id: run.id, state: "running" })}\n\n`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.maxDurationMs);
  let output = "";
  try {
    const response = await fetch(`${config.aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.aiApiKey}` },
      body: JSON.stringify({
        model: config.aiModel,
        stream: true,
        messages: [
          { role: "system", content: body.system || "Eres un asistente útil." },
          { role: "user", content: body.prompt },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Proveedor IA ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || "";
          if (token) {
            output += token;
            if (output.length > config.maxOutputChars) throw new Error("Se superó el límite de salida");
            res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes("límite")) throw error;
        }
      }
    }
    const current = await getRun(user, run.id);
    if (!current || current.state === "cancelled") {
      res.write(`event: done\ndata: ${JSON.stringify({ id: run.id, state: current?.state || "cancelled" })}\n\n`);
      return;
    }
    if (!canTransitionRun(current.state, "completed")) {
      throw new Error(`No se puede completar una run en estado ${current.state}`);
    }
    const final = await updateRun(user, run.id, {
      state: "completed",
      output,
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    }, "running");
    if (!final) {
      const cancelled = await getRun(user, run.id);
      res.write(`event: done\ndata: ${JSON.stringify({ id: run.id, state: cancelled?.state || "cancelled" })}\n\n`);
      return;
    }
    res.write(`event: done\ndata: ${JSON.stringify({ id: final.id, state: final.state })}\n\n`);
  } catch (error) {
    await updateRun(user, run.id, {
      state: "failed",
      error: error instanceof Error ? error.message.slice(0, 1_000) : "Error desconocido",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
    });
    res.write(`event: error\ndata: ${JSON.stringify({ message: error instanceof Error ? error.message : "Error desconocido" })}\n\n`);
  } finally {
    clearTimeout(timer);
    res.end();
  }
}

async function handler(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true });
  }

  const user = await authenticate(req, config);
  if (req.method === "POST" && url.pathname === "/v1/runs") {
    const body = await readJson(req);
    const run = await insertRun(user, body);
    return streamRun(user, run, body, res);
  }
  const runMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)$/);
  if (req.method === "GET" && runMatch) {
    const run = await getRun(user, runMatch[1]);
    return run ? json(res, 200, run) : json(res, 404, { error: "Run no encontrada" });
  }
  const cancelMatch = url.pathname.match(/^\/v1\/runs\/([^/]+)\/cancel$/);
  if (req.method === "POST" && cancelMatch) {
    const run = await getRun(user, cancelMatch[1]);
    if (!run) return json(res, 404, { error: "Run no encontrada" });
    if (!canTransitionRun(run.state, "cancelled")) {
      return json(res, 409, { error: `No se puede cancelar una run en estado ${run.state}` });
    }
    const updated = await updateRun(user, run.id, { state: "cancelled", finished_at: new Date().toISOString() }, run.state);
    return json(res, 200, updated);
  }
  if (req.method === "GET" && url.pathname === "/v1/approvals") {
    return json(res, 200, await listApprovals(user));
  }
  const approvalMatch = url.pathname.match(/^\/v1\/approvals\/([^/]+)\/(approved|rejected)$/);
  if (req.method === "POST" && approvalMatch) {
    return json(res, 200, await decideApproval(user, approvalMatch[1], approvalMatch[2]));
  }
  return json(res, 404, { error: "Ruta no encontrada" });
}

const server = createServer(async (req, res) => {
  try {
    await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      json(res, error instanceof HttpError ? error.status : 500, {
        error: error instanceof Error ? error.message : "Error interno",
      });
    } else {
      res.end();
    }
  }
});

server.listen(config.port, () => {
  console.log(`Fooday agent runtime escuchando en :${config.port}`);
});
