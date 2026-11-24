import { randomUUID } from "node:crypto";

const STATIC_OK = new Set(["pass"]);
const FLOW_OK = new Set(["clean"]);
const VERIFY_OK = new Set(["pass", "not_applicable"]);
const HUMAN_OK = new Set(["pass", "not_applicable"]);

/**
 * Create a run envelope with experiment/variant/case identity.
 */
export function createEnvelope({
  experimentId,
  variant,
  caseId,
  suite,
  ticket,
  commit,
  harnessCommit,
  workspaceId,
  evidenceRoot,
  runId = randomUUID(),
  outcome = "unknown",
  abort = null,
} = {}) {
  if (!experimentId) throw new Error("experimentId is required");
  if (!variant) throw new Error("variant is required");
  return {
    schema_version: 1,
    run_id: runId,
    experiment_id: experimentId,
    variant,
    suite: suite ?? null,
    case: caseId ?? null,
    ticket: ticket ?? null,
    commit: commit ?? null,
    harness_commit: harnessCommit ?? null,
    workspace_id: workspaceId ?? null,
    evidence_root: evidenceRoot ?? null,
    outcome,
    abort,
    created_at: new Date().toISOString(),
  };
}

/**
 * For non-visual cases, optical channels are not_applicable.
 */
export function markOpticalForVisual(evaluations, { visual }) {
  const next = structuredClone(evaluations);
  next.optical ??= {};
  next.optical.design_verify ??= {};
  next.optical.human ??= {};
  if (!visual) {
    next.optical.design_verify.status = "not_applicable";
    next.optical.human.status = "not_applicable";
  }
  return next;
}

/**
 * AC-8: final_positive is true only when static + flow are ok and optical
 * channels allow. Visual + pending/rejected human ⇒ false.
 */
export function computeFinalPositive(evaluations, { visual = true } = {}) {
  if (!evaluations) return false;

  const staticStatus = evaluations.static?.status;
  const flowStatus = evaluations.flow?.status;
  if (!STATIC_OK.has(staticStatus)) return false;
  if (!FLOW_OK.has(flowStatus)) return false;

  const optical = evaluations.optical ?? {};
  let verify = optical.design_verify?.status;
  let human = optical.human?.status;

  if (!visual) {
    verify = verify === undefined ? "not_applicable" : verify;
    human = human === undefined ? "not_applicable" : human;
    if (verify !== "not_applicable" && !VERIFY_OK.has(verify)) return false;
    if (human !== "not_applicable" && !HUMAN_OK.has(human)) return false;
    return VERIFY_OK.has(verify || "not_applicable") &&
      HUMAN_OK.has(human || "not_applicable");
  }

  if (human === "pending" || human === "rejected" || human === "unknown") {
    return false;
  }
  if (!VERIFY_OK.has(verify)) return false;
  if (!HUMAN_OK.has(human)) return false;
  return true;
}

/** Attach final_positive onto an evaluations object. */
export function withFinalPositive(evaluations, options) {
  const next = structuredClone(evaluations);
  next.final_positive = computeFinalPositive(next, options);
  return next;
}
