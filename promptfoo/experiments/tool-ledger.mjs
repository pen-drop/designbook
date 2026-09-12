import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Planned reference-approval interaction is not a flow disturbance. */
const PLANNED_REFERENCE_APPROVAL = /^(reference\.)?approval-(write|check|ask)$/i;

/**
 * @param {{ name?: string, planned_reference_approval?: boolean }} call
 */
export function isPlannedReferenceApprovalCall(call) {
  if (!call) return false;
  if (call.planned_reference_approval === true) return true;
  return PLANNED_REFERENCE_APPROVAL.test(String(call.name || ""));
}

/**
 * Append one top-level tool-call record. Does not invent inner CLI counts.
 * @param {string} ledgerPath
 * @param {{ name: string, ok: boolean, retries?: number, duration_ms?: number, phase?: string, agent?: string, task?: string, planned_reference_approval?: boolean }} call
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
    planned_reference_approval: Boolean(
      call.planned_reference_approval || isPlannedReferenceApprovalCall(call),
    ),
    at: new Date().toISOString(),
  };
  await appendFile(ledgerPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

/**
 * Summarize an append-only top-level tool-call ledger.
 * Planned reference-approval calls remain in total_calls but are excluded from
 * disturbance (failure/retry) aggregates.
 */
export async function summarizeToolLedger(ledgerPath) {
  let text = "";
  try {
    text = await readFile(ledgerPath, "utf8");
  } catch (err) {
    if (err?.code === "ENOENT") {
      return {
        total_calls: 0,
        failures: 0,
        retries: 0,
        disturbance_calls: 0,
        planned_reference_approvals: 0,
        by_name: {},
      };
    }
    throw err;
  }

  const lines = text.split(/\r?\n/).filter(Boolean);
  const byName = {};
  let failures = 0;
  let retries = 0;
  let disturbance = 0;
  let planned = 0;

  for (const line of lines) {
    const row = JSON.parse(line);
    const bucket = (byName[row.name] ??= { calls: 0, failures: 0, retries: 0 });
    bucket.calls += 1;
    const isPlanned = isPlannedReferenceApprovalCall(row);
    if (isPlanned) planned += 1;
    else disturbance += 1;
    if (!row.ok && !isPlanned) {
      failures += 1;
      bucket.failures += 1;
    }
    const r = Number.isSafeInteger(row.retries) ? row.retries : 0;
    if (!isPlanned) {
      retries += r;
      bucket.retries += r;
    }
  }

  return {
    total_calls: lines.length,
    failures,
    retries,
    disturbance_calls: disturbance,
    planned_reference_approvals: planned,
    by_name: byName,
  };
}
