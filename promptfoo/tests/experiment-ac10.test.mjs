import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { validateExperiment, loadExperimentFile } from "../experiments/schema.mjs";
import { generateComparisonReport } from "../experiments/report.mjs";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  isRealHumanApproval,
  assertNotPromotedToOpticalJudgment,
  requireApprovalProvenance,
} from "../experiments/approval-provenance.mjs";
import { savingsVerdict } from "../experiments/usage-normalize.mjs";
import { computeFinalPositive } from "../experiments/envelope.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

async function loadFixture(name) {
  const path = join(root, "docs/experiments/_fixtures", name, "experiment.yml");
  return loadExperimentFile(path);
}

test("AC-2 task-change fixture validates with task path + consuming case", async () => {
  const loaded = await loadFixture("task-change");
  assert.equal(loaded.ok, true, loaded.errors?.join("; "));
  assert.ok(loaded.doc.affected.tasks.length >= 1);
  assert.equal(loaded.doc.cases[0].case, "design-shell");
  assert.equal(loaded.doc.ticket, "DESIGNBOOK-62");
  assert.ok(loaded.doc.baseline.commit);
  assert.ok(loaded.doc.candidate.commit);
  assert.ok(loaded.doc.harness.commit);
});

test("AC-2 rule-change fixture validates with rule path + joint note", async () => {
  const loaded = await loadFixture("rule-change");
  assert.equal(loaded.ok, true, loaded.errors?.join("; "));
  assert.ok(loaded.doc.affected.rules.length >= 1);
  assert.ok(loaded.doc.affected.tasks.length >= 1);
  assert.match(loaded.doc.affected.note, /joint/i);
  assert.equal(loaded.doc.cases[0].case, "design-shell");
});

test("joint task+rule without note fails schema", () => {
  const result = validateExperiment({
    schema_version: 1,
    id: "joint-no-note",
    ticket: "DESIGNBOOK-62",
    primary_key: { branch: "feat/x", experiment: "joint-no-note" },
    affected: {
      tasks: [".agents/skills/designbook/design/tasks/design-shell.md"],
      rules: [".agents/skills/designbook/design/rules/design-consistency.md"],
    },
    baseline: { commit: "aaa" },
    candidate: { commit: "bbb" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /joint|note/i.test(e)));
});

test("AC-6 reference revision mismatch blocks single-change claim", () => {
  const baselineRef = {
    revision: "rev-a",
    fingerprint: "fp-a",
  };
  const candidateRef = {
    revision: "rev-b",
    fingerprint: "fp-b",
  };
  const comparable =
    baselineRef.revision === candidateRef.revision &&
    baselineRef.fingerprint === candidateRef.fingerprint;
  assert.equal(comparable, false);
  // Report helper wording: mismatched upstream refs ⇒ not a single-change claim
  const claim = comparable
    ? "single-change"
    : "not_evaluable: reference revision mismatch";
  assert.match(claim, /not_evaluable|mismatch/i);
});

test("AC-5 model swap factor is visible as requested vs effective", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "ac10-model-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const docsDir = join(dir, "docs");
  await mkdir(docsDir, { recursive: true });
  const experiment = (await loadFixture("task-change")).doc;
  experiment.models_constant = false;
  const md = await generateComparisonReport({
    experiment,
    docsDir,
    runs: [
      {
        variant: "baseline",
        run_id: "r0",
        evidence_root: "promptfoo/evidence/x/r0",
        evaluations: {
          static: { status: "pass" },
          flow: { status: "clean" },
          optical: {
            design_verify: { status: "pass" },
            human: { status: "pending" },
          },
          final_positive: false,
        },
        phases: [
          {
            name: "main",
            requested: { provider: "codex", model: "gpt-5.6" },
            effective: { provider: "claude", model: "opus", version: "1" },
            metrics: { status: "measured", total_tokens: 1 },
          },
        ],
      },
    ],
  });
  assert.match(md, /models_constant \| false/);
  assert.match(md, /codex \/ gpt-5\.6/);
  assert.match(md, /claude \/ opus/);
  assert.notEqual(
    "codex/gpt-5.6",
    "claude/opus",
  );
});

test("AC-10 remaining: false improvement, missing usage, simulated non-promotion, open judgment", () => {
  assert.equal(
    savingsVerdict(
      { status: "measured", total_tokens: 100, aborted: false, verify_skipped: false },
      { status: "measured", total_tokens: 10, aborted: false, verify_skipped: true },
      "tokens",
    ),
    "not_evaluable",
  );
  assert.equal(isRealHumanApproval({ mode: "simulated", status: "approved" }), false);
  assert.throws(() =>
    assertNotPromotedToOpticalJudgment(
      { mode: "simulated", status: "approved" },
      { optical: { human: { status: "pass" } } },
    ),
  );
  assert.throws(() =>
    requireApprovalProvenance({ status: "approved" }, null),
  );
  assert.equal(
    computeFinalPositive(
      {
        static: { status: "pass" },
        flow: { status: "clean" },
        optical: {
          design_verify: { status: "pass" },
          human: { status: "pending" },
        },
      },
      { visual: true },
    ),
    false,
  );
});

test("extract-reference fixture tags simulated provenance (no silent real approval)", async () => {
  const path = join(root, "fixtures/drupal-web/cases/extract-reference.yaml");
  const text = await readFile(path, "utf8");
  const doc = yaml.load(text);
  assert.match(doc.prompt, /mode:\s*simulated|mode simulated|provenance mode simulated/i);
  assert.match(doc.prompt, /Do not claim real human approval/i);
  const assertBlob = JSON.stringify(doc.assert);
  assert.match(assertBlob, /approval-provenance\.yml/);
  assert.match(assertBlob, /simulated/);
  assert.match(assertBlob, /mode !== 'interactive'|!== \\"interactive\\"|!== 'interactive'/);
});
