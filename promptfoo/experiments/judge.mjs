import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import yaml from "js-yaml";

const STATUSES = new Set(["pass", "fail", "unclear", "rejected"]);

/**
 * Write judgment.yml under an evidence run directory.
 */
export async function writeJudgment(evidenceRun, {
  status,
  resultImage,
  referenceImage,
  criteria,
  rationale,
  evaluator = process.env.USER || "unknown",
  blind = false,
} = {}) {
  if (!STATUSES.has(status)) {
    throw new Error(`judgment status must be one of ${[...STATUSES].join("|")}`);
  }
  if (!resultImage || !referenceImage) {
    throw new Error("result and reference image paths are required");
  }
  await access(resultImage);
  await access(referenceImage);
  await mkdir(evidenceRun, { recursive: true });

  const doc = {
    status,
    result_image: resultImage,
    reference_image: referenceImage,
    criteria: criteria || "",
    rationale: rationale || "",
    evaluator,
    blind: Boolean(blind),
    judged_at: new Date().toISOString(),
  };
  const path = join(evidenceRun, "judgment.yml");
  await writeFile(path, yaml.dump(doc, { lineWidth: 100 }), "utf8");
  return path;
}

export async function loadJudgment(evidenceRun) {
  const path = join(evidenceRun, "judgment.yml");
  return yaml.load(await readFile(path, "utf8"));
}

/** Map judgment status onto optical.human.status for evaluations. */
export function humanStatusFromJudgment(judgment) {
  if (!judgment) return "pending";
  if (judgment.status === "pass") return "pass";
  if (judgment.status === "fail") return "fail";
  if (judgment.status === "rejected") return "rejected";
  if (judgment.status === "unclear") return "pending";
  return "unknown";
}
