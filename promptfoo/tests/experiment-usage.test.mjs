import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  normalizeUsage,
  sumPhaseMetrics,
  savingsVerdict,
} from "../experiments/usage-normalize.mjs";
import {
  appendToolCall,
  summarizeToolLedger,
  isPlannedReferenceApprovalCall,
} from "../experiments/tool-ledger.mjs";

test("missing usage → unknown, never coerced to 0", () => {
  const missing = normalizeUsage(null, { source: "codex-native", scope: "thread-tree" });
  assert.equal(missing.status, "unknown");
  assert.ok(missing.reason);
  assert.equal(missing.input_tokens, undefined);
  assert.notEqual(missing.input_tokens, 0);

  const empty = normalizeUsage({}, { source: "codex-native", scope: "thread-tree" });
  assert.equal(empty.status, "unknown");
});

test("cache_read is a subset of input and not added twice into total", () => {
  const metrics = normalizeUsage(
    {
      input_tokens: 1000,
      cached_input_tokens: 400,
      output_tokens: 100,
      reasoning_output_tokens: 20,
    },
    { source: "codex-native", scope: "thread-tree" },
  );
  assert.equal(metrics.status, "measured");
  assert.equal(metrics.input_tokens, 1000);
  assert.equal(metrics.cache_read, 400);
  assert.equal(metrics.output_tokens, 100);
  assert.equal(metrics.reasoning_tokens, 20);
  // Total must not double-count cache_read or reasoning on top of already-included totals
  assert.equal(metrics.total_tokens, 1100);
  assert.equal(metrics.usage_source, "codex-native");
  assert.equal(metrics.usage_scope, "thread-tree");
});

test("parallel elapsed vs summed active are both present and distinct", () => {
  const phases = [
    {
      name: "a",
      metrics: normalizeUsage(
        { input_tokens: 10, cached_input_tokens: 0, output_tokens: 5 },
        { source: "codex-native", scope: "thread" },
      ),
      durations: { active_ms: 1000, wall_ms: 1200 },
    },
    {
      name: "b",
      metrics: normalizeUsage(
        { input_tokens: 20, cached_input_tokens: 0, output_tokens: 5 },
        { source: "codex-native", scope: "thread" },
      ),
      durations: { active_ms: 800, wall_ms: 900 },
    },
  ];
  const sum = sumPhaseMetrics(phases, {
    parallelElapsedMs: 1300,
  });
  assert.equal(sum.summed_active_ms, 1800);
  assert.equal(sum.parallel_elapsed_ms, 1300);
  assert.notEqual(sum.summed_active_ms, sum.parallel_elapsed_ms);
  assert.equal(sum.tokens.status, "measured");
  assert.equal(sum.tokens.total_tokens, 40);
});

test("tool failure + retry are counted in ledger", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "tool-ledger-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const ledger = join(dir, "tool-ledger.jsonl");

  await appendToolCall(ledger, {
    name: "reference.capture-image",
    ok: false,
    retries: 0,
    duration_ms: 100,
    phase: "capture",
    agent: "main",
  });
  await appendToolCall(ledger, {
    name: "reference.capture-image",
    ok: true,
    retries: 1,
    duration_ms: 200,
    phase: "capture",
    agent: "main",
  });

  const summary = await summarizeToolLedger(ledger);
  assert.equal(summary.total_calls, 2);
  assert.equal(summary.failures, 1);
  assert.equal(summary.retries, 1);
  assert.equal(summary.by_name["reference.capture-image"].calls, 2);

  const raw = await readFile(ledger, "utf8");
  assert.equal(raw.trim().split("\n").length, 2);
});

test("early abort with lower tokens does not yield improved savings verdict", () => {
  const baseline = {
    status: "measured",
    total_tokens: 5000,
    aborted: false,
    verify_skipped: false,
  };
  const candidate = {
    status: "measured",
    total_tokens: 1000,
    aborted: true,
    verify_skipped: false,
  };
  const verdict = savingsVerdict(baseline, candidate, "tokens");
  assert.notEqual(verdict, "improved");
  assert.ok(["not_evaluable", "unclear"].includes(verdict));
});

test("false improvement when verify skipped is not improved", () => {
  const baseline = {
    status: "measured",
    total_tokens: 5000,
    aborted: false,
    verify_skipped: false,
  };
  const candidate = {
    status: "measured",
    total_tokens: 2000,
    aborted: false,
    verify_skipped: true,
  };
  const verdict = savingsVerdict(baseline, candidate, "tokens");
  assert.notEqual(verdict, "improved");
  assert.ok(["not_evaluable", "unclear"].includes(verdict));
});

test("unknown baseline or candidate blocks improved savings", () => {
  const measured = {
    status: "measured",
    total_tokens: 100,
    aborted: false,
    verify_skipped: false,
  };
  const unknown = { status: "unknown", reason: "missing native log" };
  assert.equal(savingsVerdict(unknown, measured, "tokens"), "not_evaluable");
  assert.equal(savingsVerdict(measured, unknown, "tokens"), "not_evaluable");
});

test("genuine token reduction without skip/abort can be improved", () => {
  const baseline = {
    status: "measured",
    total_tokens: 5000,
    aborted: false,
    verify_skipped: false,
  };
  const candidate = {
    status: "measured",
    total_tokens: 3000,
    aborted: false,
    verify_skipped: false,
  };
  assert.equal(savingsVerdict(baseline, candidate, "tokens"), "improved");
});

test("planned reference approval calls are excluded from disturbance counts", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "tool-ledger-ref-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const ledger = join(dir, "tool-ledger.jsonl");

  assert.equal(
    isPlannedReferenceApprovalCall({ name: "reference.approval-write" }),
    true,
  );

  await appendToolCall(ledger, {
    name: "reference.capture-image",
    ok: true,
    retries: 0,
  });
  await appendToolCall(ledger, {
    name: "reference.approval-write",
    ok: true,
    retries: 0,
  });
  await appendToolCall(ledger, {
    name: "reference.approval-check",
    ok: false,
    retries: 1,
  });

  const summary = await summarizeToolLedger(ledger);
  assert.equal(summary.total_calls, 3);
  assert.equal(summary.planned_reference_approvals, 2);
  assert.equal(summary.disturbance_calls, 1);
  assert.equal(summary.failures, 0);
  assert.equal(summary.retries, 0);
});
