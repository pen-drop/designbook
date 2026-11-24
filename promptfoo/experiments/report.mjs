import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

function fmtCommit(sha) {
  return sha ? `\`${sha}\`` : "_unknown_";
}

function levelRow(run) {
  const e = run.evaluations || {};
  return `| ${run.variant} | ${e.static?.status ?? "unknown"} | ${e.flow?.status ?? "unknown"} | verify=${e.optical?.design_verify?.status ?? "unknown"}; human=${e.optical?.human?.status ?? "unknown"} | ${e.final_positive ?? false} |`;
}

function modelRows(run) {
  const lines = [];
  for (const phase of run.phases || []) {
    const req = phase.requested || {};
    const eff = phase.effective || {};
    lines.push(
      `| ${run.variant} / ${phase.name} | ${req.provider ?? "?"} / ${req.model ?? "?"} | ${eff.provider ?? "?"} / ${eff.model ?? "?"} / ${eff.version ?? "unknown"} |`,
    );
  }
  return lines;
}

/**
 * Write docs/experiments/<id>/comparison.md from experiment + run summaries.
 * @returns {Promise<string>} markdown content
 */
export async function generateComparisonReport({
  experiment,
  docsDir,
  runs = [],
} = {}) {
  if (!experiment?.id) throw new Error("experiment.id is required");
  await mkdir(docsDir, { recursive: true });

  const pk = experiment.primary_key || {};
  const lines = [
    `# Experiment comparison: ${experiment.id}`,
    "",
    "## Identity",
    "",
    `| Field | Value |`,
    `| --- | --- |`,
    `| primary_key.branch | \`${pk.branch ?? ""}\` |`,
    `| primary_key.experiment | \`${pk.experiment ?? experiment.id}\` |`,
    `| ticket | ${experiment.ticket ?? "_missing_"} |`,
    `| baseline.commit | ${fmtCommit(experiment.baseline?.commit)} |`,
    `| candidate.commit | ${fmtCommit(experiment.candidate?.commit)} |`,
    `| harness.commit | ${fmtCommit(experiment.harness?.commit)} |`,
    `| models_constant | ${experiment.models_constant ?? "unknown"} |`,
    "",
    "## Hypothesis",
    "",
    (experiment.hypothesis || "").trim() || "_none_",
    "",
    "## Affected",
    "",
    `- tasks: ${(experiment.affected?.tasks || []).map((t) => `\`${t}\``).join(", ") || "_none_"}`,
    `- rules: ${(experiment.affected?.rules || []).map((t) => `\`${t}\``).join(", ") || "_none_"}`,
    experiment.affected?.note ? `- note: ${experiment.affected.note}` : null,
    "",
    "## Evaluation levels",
    "",
    "| Variant | Static | Flow | Optical | final_positive |",
    "| --- | --- | --- | --- | --- |",
    ...runs.map(levelRow),
    "",
    "## Model binding (requested vs effective)",
    "",
    "| Variant / phase | requested | effective |",
    "| --- | --- | --- |",
    ...runs.flatMap(modelRows),
    "",
    "## Runs and evidence",
    "",
    "| Variant | run_id | evidence | tokens |",
    "| --- | --- | --- | --- |",
    ...runs.map((run) => {
      const tokens =
        run.phases?.[0]?.metrics?.total_tokens ??
        run.phases?.[0]?.metrics?.status ??
        "unknown";
      return `| ${run.variant} | \`${run.run_id}\` | \`${run.evidence_root}\` | ${tokens} |`;
    }),
    "",
    "## Notes",
    "",
    "- Insufficient evidence ⇒ `unclear` / `not_evaluable` — never a positive overall verdict.",
    "- Simulated/recorded reference approval is not human optical design judgment.",
    "- Harness-only changes must not be reported as product Task/Rule improvements.",
    "",
  ].filter((line) => line !== null);

  const md = `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`;
  await writeFile(join(docsDir, "comparison.md"), md, "utf8");
  return md;
}
