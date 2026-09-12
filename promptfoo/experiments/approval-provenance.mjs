import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

export const APPROVAL_MODES = Object.freeze([
  "interactive",
  "recorded",
  "simulated",
]);

/**
 * Persist approval-provenance.yml beside a revision or under an evidence root.
 * @param {string} revisionOrEvidenceDir
 * @param {{ mode: 'interactive'|'recorded'|'simulated', status?: string, note?: string, actor?: string }} fields
 */
export async function writeApprovalProvenance(revisionOrEvidenceDir, fields) {
  if (!APPROVAL_MODES.includes(fields?.mode)) {
    throw new Error(
      `approval provenance mode must be one of ${APPROVAL_MODES.join("|")}`,
    );
  }
  await mkdir(revisionOrEvidenceDir, { recursive: true });
  const doc = {
    mode: fields.mode,
    status: fields.status ?? null,
    note: fields.note ?? null,
    actor: fields.actor ?? null,
    written_at: new Date().toISOString(),
  };
  const path = join(revisionOrEvidenceDir, "approval-provenance.yml");
  await writeFile(path, yaml.dump(doc, { lineWidth: 100 }), "utf8");
  return path;
}

/**
 * Real human reference approval only when mode is interactive and status approved.
 */
export function isRealHumanApproval(provenance) {
  if (!provenance || typeof provenance !== "object") return false;
  return provenance.mode === "interactive" && provenance.status === "approved";
}

/**
 * Guard: simulated/recorded reference approval must never promote to human optical pass.
 */
export function assertNotPromotedToOpticalJudgment(provenance, evaluations) {
  const mode = provenance?.mode;
  if (mode === "interactive") return;
  const human = evaluations?.optical?.human?.status;
  if (human === "pass" || human === "fail" || human === "rejected") {
    throw new Error(
      `refusing to promote ${mode || "untagged"} reference approval to optical.human=${human}; ` +
        "only interactive real human judgment may set optical human design status",
    );
  }
}

/**
 * Contract check: an approved approval.yml without provenance is invalid.
 */
export function requireApprovalProvenance(approval, provenance) {
  if (approval?.status === "approved" && !provenance?.mode) {
    throw new Error(
      "approved approval.yml requires approval-provenance.yml with mode " +
        "(interactive|recorded|simulated)",
    );
  }
  if (provenance && !APPROVAL_MODES.includes(provenance.mode)) {
    throw new Error(`invalid approval provenance mode: ${provenance.mode}`);
  }
  if (
    approval?.status === "approved" &&
    provenance?.mode &&
    provenance.status &&
    provenance.status !== "approved"
  ) {
    throw new Error("approval status and provenance status disagree");
  }
  return true;
}
