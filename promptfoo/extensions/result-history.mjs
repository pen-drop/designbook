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
];
const cell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

// Invoked by Promptfoo after evaluation. One row per result, including failures.
export async function afterAll({ results, evalId, config, suite }) {
  const tags = config?.tags || suite?.tags;
  if (!tags?.history_csv) throw new Error("Missing history_csv tag");
  const csv = tags.history_csv;
  const rows = results.map((result) => {
    const output = result.response?.output;
    const usage = output?.usage;
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
