import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Append one top-level tool-call record. Does not invent inner CLI counts.
 * @param {string} ledgerPath
 * @param {{ name: string, ok: boolean, retries?: number, duration_ms?: number, phase?: string, agent?: string, task?: string }} call
 */
export async function appendToolCall(ledgerPath, call) {
  if (!call?.name) throw new Error("tool call name is required");
  await mkdir(dirname(ledgerPath), { recursive: true });
  const record = {
    name: call.name,
    ok: Boolean(call.ok),
    retries: Number.isSafeInteger(call.retries) ? call.retries : 0,
    duration_ms: Number.isSafeInteger(call.duration_ms) ? call.duration_ms : null,
    phase: call.phase ?? null,
    agent: call.agent ?? null,
    task: call.task ?? null,
    at: new Date().toISOString(),
  };
  await appendFile(ledgerPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

/**
 * Summarize an append-only top-level tool-call ledger.
 */
export async function summarizeToolLedger(ledgerPath) {
  let text = "";
  try {
    text = await readFile(ledgerPath, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") {
      return { total_calls: 0, failures: 0, retries: 0, by_name: {} };
    }
    throw err;
  }

  const lines = text.split(/\r?\n/).filter(Boolean);
  const byName = {};
  let failures = 0;
  let retries = 0;

  for (const line of lines) {
    const row = JSON.parse(line);
    const bucket = (byName[row.name] ??= { calls: 0, failures: 0, retries: 0 });
    bucket.calls += 1;
    if (!row.ok) {
      failures += 1;
      bucket.failures += 1;
    }
    const r = Number.isSafeInteger(row.retries) ? row.retries : 0;
    retries += r;
    bucket.retries += r;
  }

  return {
    total_calls: lines.length,
    failures,
    retries,
    by_name: byName,
  };
}
