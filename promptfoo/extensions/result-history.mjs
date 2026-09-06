import { appendFile, mkdir, open, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const columns = [
  "timestamp",
  "eval_id",
  "suite",
  "case",
  "phase",
  "git_commit",
  "source_dirty",
  "model",
  "status",
  "assertions_passed",
  "assertions_total",
  "input_tokens",
  "cached_input_tokens",
  "uncached_input_tokens",
  "output_tokens",
  "reasoning_tokens",
  "total_tokens",
  "duration_ms",
  "report",
  "workflow_id",
  "run_id",
  "verify_score",
  "verify_checks_passed",
  "verify_checks_total",
];
const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

// Read only the selected workflow's validated outtake reports. Token usage comes
// from Codex separately; agent-reported report.tokens is not measurement evidence.
export function verificationMetrics(output, workflowId) {
  const workflow =
    output?.completedWorkflows?.[workflowId] ||
    output?.pendingWorkflows?.[workflowId];
  const tasks = Object.values(workflow?.state?.tasks || {});
  const reports = tasks.filter((task) => task.results?.["score-report"]);
  if (!reports.length) return {};
  let score = 0,
    passed = 0,
    total = 0;
  for (const task of reports) {
    const result = task.results["score-report"];
    const measurement = result.value?.final;
    const checks = measurement?.checks;
    if (
      task.status !== "done" ||
      result.valid !== true ||
      !Number.isSafeInteger(measurement?.score) ||
      measurement.score < 0 ||
      !Array.isArray(checks) ||
      !checks.length ||
      checks.some(
        (check) =>
          !Number.isSafeInteger(check.score) ||
          check.score < 0 ||
          typeof check.passed !== "boolean",
      ) ||
      checks.reduce((sum, check) => sum + check.score, 0) !== measurement.score
    )
      return {};
    score += measurement.score;
    passed += checks.filter((check) => check.passed).length;
    total += checks.length;
  }
  return { score, passed, total };
}

// Invoked by Promptfoo after evaluation. One row per result, including failures.
export async function afterAll({ results, evalId, config, suite }) {
  const tags = config?.tags || suite?.tags;
  if (!tags?.history_csv) throw new Error("Missing history_csv tag");
  const csv = tags.history_csv;
  const rows = results.map((result) => {
    const output = result.response?.output;
    const usage = output?.usage;
    const verification = verificationMetrics(output, tags.workflow_id);
    const checks = result.gradingResult?.componentResults || [];
    return [
      new Date().toISOString(),
      evalId,
      tags.suite,
      tags.case,
      tags.phase,
      tags.git_commit,
      tags.source_dirty,
      output?.model || tags.model,
      result.success ? "pass" : "fail",
      checks.filter((c) => c.pass).length,
      checks.length,
      usage?.input_tokens,
      usage?.cached_input_tokens,
      usage ? usage.input_tokens - usage.cached_input_tokens : undefined,
      usage?.output_tokens,
      usage?.reasoning_output_tokens,
      usage ? usage.input_tokens + usage.output_tokens : undefined,
      result.latencyMs,
      tags.report,
      tags.workflow_id,
      tags.run_id,
      verification.score,
      verification.passed,
      verification.total,
    ]
      .map(cell)
      .join(",");
  });
  await mkdir(dirname(csv), { recursive: true });
  // Separate Promptfoo processes can finish concurrently. Serialize header + append.
  let lock;
  for (let attempt = 0; !lock; attempt++) {
    try {
      lock = await open(`${csv}.lock`, "wx");
    } catch (error) {
      if (error.code !== "EEXIST" || attempt >= 100) throw error;
      await delay(50);
    }
  }
  try {
    let prefix = "";
    try {
      const file = await open(csv, "wx");
      await file.close();
      prefix = columns.join(",") + "\n";
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    await appendFile(csv, prefix + rows.join("\n") + "\n");
  } finally {
    await lock.close();
    await unlink(`${csv}.lock`);
  }
}
