import { appendFile, mkdir, open, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const verificationColumns = [
  "verify_checks_failed",
  "verify_pass_rate",
  "verify_avg_diff_ratio",
  "verify_max_diff_ratio",
  "verify_issues_critical",
  "verify_issues_major",
  "verify_issues_minor",
  "verify_initial_score",
  "verify_score_delta",
  "verify_story_ids",
  "verify_reference_urls",
  "verify_breakpoints",
  "verify_thresholds_json",
  "verify_checks_json",
];

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
  ...verificationColumns,
  "cli",
  "cache_write_input_tokens",
];
const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

function selectedWorkflow(output, workflowId) {
  return (
    output?.completedWorkflows?.[workflowId] ||
    output?.pendingWorkflows?.[workflowId]
  );
}

function validMeasurement(measurement) {
  const checks = measurement?.checks;
  return (
    Number.isSafeInteger(measurement?.score) &&
    measurement.score >= 0 &&
    Array.isArray(checks) &&
    checks.length > 0 &&
    checks.every(
      (check) =>
        Number.isSafeInteger(check.score) &&
        check.score >= 0 &&
        typeof check.passed === "boolean",
    ) &&
    checks.reduce((sum, check) => sum + check.score, 0) === measurement.score
  );
}

// Read only the selected workflow's validated outtake reports. Token usage comes
// from Codex separately; agent-reported report.tokens is not measurement evidence.
export function verificationMetrics(output, workflowId) {
  const workflow = selectedWorkflow(output, workflowId);
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
      !validMeasurement(measurement)
    )
      return {};
    score += measurement.score;
    passed += checks.filter((check) => check.passed).length;
    total += checks.length;
  }
  return { score, passed, total };
}

// Optional measurements remain unknown unless every contributing check supplies
// them. Derive aggregates from checks, avoiding averages of unequal-sized reports.
export function verificationDetails(output, workflowId) {
  const metrics = verificationMetrics(output, workflowId);
  if (metrics.score === undefined) return {};
  const workflow = selectedWorkflow(output, workflowId);
  const reports = Object.values(workflow.state.tasks)
    .filter((task) => task.results?.["score-report"])
    .map((task) => task.results["score-report"].value);
  const ratio = (value) => Number.isFinite(value) && value >= 0 && value <= 1;
  const count = (value) => Number.isSafeInteger(value) && value >= 0;
  const checks = reports.flatMap((report) =>
    report.final.checks.map((check) => ({
      story_id: report.story_id ?? workflow.definition?.inputs?.story_id,
      breakpoint: check.breakpoint,
      element: check.element,
      score: check.score,
      passed: check.passed,
      diff_ratio: ratio(check.diff_percent) ? check.diff_percent : undefined,
      ...Object.fromEntries(
        ["critical", "major", "minor"].map((key) => [
          key,
          count(check[key]) ? check[key] : undefined,
        ]),
      ),
    })),
  );
  const differences = checks.map((check) => check.diff_ratio);
  const allDifferences = differences.every(ratio);
  const initial = reports.every((report) => validMeasurement(report.first_shot))
    ? reports.reduce((sum, report) => sum + report.first_shot.score, 0)
    : undefined;
  const strings = (values) => {
    const unique = [
      ...new Set(
        values.filter((value) => typeof value === "string" && value.length),
      ),
    ];
    return unique.length ? JSON.stringify(unique) : undefined;
  };
  const thresholds = reports.map((report) => ({
    story_id: report.story_id ?? workflow.definition?.inputs?.story_id,
    threshold_ratio: report.threshold ?? workflow.definition?.inputs?.threshold,
  }));
  return {
    verify_checks_failed: metrics.total - metrics.passed,
    verify_pass_rate: metrics.passed / metrics.total,
    verify_avg_diff_ratio: allDifferences
      ? differences.reduce((sum, value) => sum + value, 0) / differences.length
      : undefined,
    verify_max_diff_ratio: allDifferences
      ? Math.max(...differences)
      : undefined,
    ...Object.fromEntries(
      ["critical", "major", "minor"].map((key) => [
        `verify_issues_${key}`,
        checks.every((check) => count(check[key]))
          ? checks.reduce((sum, check) => sum + check[key], 0)
          : undefined,
      ]),
    ),
    verify_initial_score: initial,
    verify_score_delta:
      initial === undefined ? undefined : initial - metrics.score,
    verify_story_ids: strings(checks.map((check) => check.story_id)),
    verify_reference_urls: strings(
      reports.map(
        (report) =>
          report.reference_url ?? workflow.definition?.inputs?.reference_url,
      ),
    ),
    verify_breakpoints: strings(checks.map((check) => check.breakpoint)),
    verify_thresholds_json: thresholds.every((entry) =>
      ratio(entry.threshold_ratio),
    )
      ? JSON.stringify(thresholds)
      : undefined,
    verify_checks_json: JSON.stringify(checks),
  };
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
    const details = verificationDetails(output, tags.workflow_id);
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
      ...verificationColumns.map((column) => details[column]),
      output?.cli || tags.cli,
      usage?.cache_write_input_tokens,
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
