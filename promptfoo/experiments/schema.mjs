import { readFile } from "node:fs/promises";
import yaml from "js-yaml";

const REQUIRED_TOP = ["schema_version", "id", "ticket", "primary_key"];

function requireCommit(errors, label, variant) {
  if (!variant || typeof variant !== "object") {
    errors.push(`${label} is required`);
    return;
  }
  if (!variant.commit || typeof variant.commit !== "string") {
    errors.push(`${label}.commit is required`);
  }
}

/**
 * Validate an experiment.yml document (schema_version 1).
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateExperiment(doc) {
  const errors = [];
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { ok: false, errors: ["experiment document must be an object"] };
  }

  for (const key of REQUIRED_TOP) {
    if (doc[key] === undefined || doc[key] === null || doc[key] === "") {
      errors.push(`${key} is required`);
    }
  }

  if (doc.schema_version !== 1 && doc.schema_version !== undefined) {
    errors.push(`unsupported schema_version: ${doc.schema_version}`);
  }

  if (doc.primary_key && typeof doc.primary_key === "object") {
    if (!doc.primary_key.branch) errors.push("primary_key.branch is required");
    if (!doc.primary_key.experiment) {
      errors.push("primary_key.experiment is required");
    }
  } else if (doc.primary_key !== undefined) {
    errors.push("primary_key must be an object");
  }

  requireCommit(errors, "baseline", doc.baseline);
  requireCommit(errors, "candidate", doc.candidate);

  if (doc.affected?.note === undefined && Array.isArray(doc.affected?.rules)) {
    const joint = (doc.affected.rules?.length || 0) + (doc.affected.tasks?.length || 0) > 1;
    if (joint && (doc.affected.rules?.length || 0) > 0 && (doc.affected.tasks?.length || 0) > 0) {
      errors.push('affected.note is required for joint task+rule edits (joint-change claims only)');
    }
  }

  return { ok: errors.length === 0, errors };
}

/**
 * AC-6: identical upstream reference revision/fingerprint required for a
 * single-change claim. Mismatch ⇒ not_evaluable.
 */
export function assertComparableReferences(baselineRef, candidateRef) {
  if (!baselineRef?.revision || !candidateRef?.revision) {
    return {
      ok: false,
      claim: "not_evaluable",
      reason: "missing reference revision",
    };
  }
  if (
    baselineRef.revision !== candidateRef.revision ||
    baselineRef.fingerprint !== candidateRef.fingerprint
  ) {
    return {
      ok: false,
      claim: "not_evaluable",
      reason: "reference revision mismatch",
    };
  }
  return { ok: true, claim: "single-change", reason: null };
}

/** Load and validate an experiment.yml file. */
export async function loadExperimentFile(path) {
  const raw = await readFile(path, "utf8");
  const doc = yaml.load(raw);
  const result = validateExperiment(doc);
  return { ...result, doc: result.ok ? doc : null, path };
}
