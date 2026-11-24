import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import yaml from "js-yaml";
import { generateComparisonReport } from "../experiments/report.mjs";
import { writeJudgment, loadJudgment } from "../experiments/judge.mjs";
import {
  computeFinalPositive,
  withFinalPositive,
} from "../experiments/envelope.mjs";

const sampleExperiment = {
  schema_version: 1,
  id: "db62-sample",
  ticket: "DESIGNBOOK-62",
  primary_key: {
    branch: "feat/designbook-62-task-und-ru",
    experiment: "db62-sample",
  },
  hypothesis: "Candidate improves flow without quality loss.",
  affected: {
    tasks: [".agents/skills/designbook/design/tasks/design-shell.md"],
    rules: [],
  },
  baseline: {
    repo: "designbook",
    branch: "feat/designbook-56-designbook",
    commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  },
  candidate: {
    repo: "designbook",
    branch: "feat/designbook-62-task-und-ru",
    commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  },
  cases: [{ suite: "drupal-web", case: "design-shell", validate: "design-verify" }],
  models_constant: true,
  harness: {
    commit: "cccccccccccccccccccccccccccccccccccccccc",
    promptfoo_schema: 1,
  },
};

test("report includes branch+experiment, ticket, variant commits, three levels, evidence links", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "exp-report-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const docsDir = join(root, "docs/experiments/db62-sample");
  await mkdir(docsDir, { recursive: true });
  await writeFile(
    join(docsDir, "experiment.yml"),
    yaml.dump(sampleExperiment),
    "utf8",
  );

  const evidenceRun = join(root, "promptfoo/evidence/db62-sample/run-1");
  await mkdir(evidenceRun, { recursive: true });

  const md = await generateComparisonReport({
    experiment: sampleExperiment,
    docsDir,
    runs: [
      {
        variant: "baseline",
        run_id: "run-0",
        evidence_root: join(root, "promptfoo/evidence/db62-sample/run-0"),
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
            effective: { provider: "codex", model: "gpt-5.6", version: "1" },
            metrics: { status: "measured", total_tokens: 1000 },
          },
        ],
      },
      {
        variant: "candidate",
        run_id: "run-1",
        evidence_root: evidenceRun,
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
            effective: { provider: "codex", model: "gpt-5.6", version: "1" },
            metrics: { status: "measured", total_tokens: 900 },
          },
        ],
      },
    ],
  });

  const written = await readFile(join(docsDir, "comparison.md"), "utf8");
  assert.equal(md, written);
  assert.match(written, /feat\/designbook-62-task-und-ru/);
  assert.match(written, /db62-sample/);
  assert.match(written, /DESIGNBOOK-62/);
  assert.match(written, /aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
  assert.match(written, /bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb/);
  assert.match(written, /Static/i);
  assert.match(written, /Flow/i);
  assert.match(written, /Optical/i);
  assert.match(written, /promptfoo\/evidence\/db62-sample\/run-1/);
  assert.match(written, /requested/i);
  assert.match(written, /effective/i);
  assert.match(written, /final_positive/i);
  assert.match(written, /human=pending \| false/);
});

test("judge writes evaluator/time/criteria/rationale; open judgment keeps final_positive false", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "exp-judge-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const evidenceRun = join(root, "run-1");
  await mkdir(join(evidenceRun, "screenshots"), { recursive: true });
  const resultImg = join(evidenceRun, "screenshots", "result.png");
  const refImg = join(evidenceRun, "screenshots", "reference.png");
  await writeFile(resultImg, "fake-png", "utf8");
  await writeFile(refImg, "fake-png", "utf8");

  const path = await writeJudgment(evidenceRun, {
    status: "unclear",
    resultImage: resultImg,
    referenceImage: refImg,
    criteria: "layout parity within tolerance",
    rationale: "needs closer look at header spacing",
    evaluator: "tester@example",
    blind: true,
  });

  const judgment = await loadJudgment(evidenceRun);
  assert.equal(path.endsWith("judgment.yml"), true);
  assert.equal(judgment.status, "unclear");
  assert.equal(judgment.evaluator, "tester@example");
  assert.ok(judgment.judged_at);
  assert.equal(judgment.criteria, "layout parity within tolerance");
  assert.match(judgment.rationale, /header/);
  assert.equal(judgment.blind, true);
  assert.equal(judgment.result_image, resultImg);
  assert.equal(judgment.reference_image, refImg);

  const evaluations = withFinalPositive(
    {
      static: { status: "pass" },
      flow: { status: "clean" },
      optical: {
        design_verify: { status: "pass" },
        human: { status: "pending", judgment_ref: "judgment.yml" },
      },
    },
    { visual: true },
  );
  assert.equal(evaluations.final_positive, false);
  assert.equal(computeFinalPositive(evaluations, { visual: true }), false);
});

test("rejected judgment keeps final_positive false", () => {
  const evaluations = {
    static: { status: "pass" },
    flow: { status: "clean" },
    optical: {
      design_verify: { status: "pass" },
      human: { status: "rejected", judgment_ref: "judgment.yml" },
    },
  };
  assert.equal(computeFinalPositive(evaluations, { visual: true }), false);
});
