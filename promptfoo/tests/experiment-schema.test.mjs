import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import yaml from "js-yaml";
import { validateExperiment, loadExperimentFile } from "../experiments/schema.mjs";
import {
  createEnvelope,
  computeFinalPositive,
  markOpticalForVisual,
} from "../experiments/envelope.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = join(
  root,
  "docs/experiments/_fixtures/minimal/experiment.yml",
);

test("valid minimal experiment.yml passes validation", async () => {
  const doc = yaml.load(await readFile(fixturePath, "utf8"));
  const result = validateExperiment(doc);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  const loaded = await loadExperimentFile(fixturePath);
  assert.equal(loaded.ok, true);
  assert.equal(loaded.doc.id, "minimal-fixture");
  assert.equal(loaded.doc.ticket, "DESIGNBOOK-62");
});

test("missing ticket fails validation", () => {
  const result = validateExperiment({
    schema_version: 1,
    id: "no-ticket",
    primary_key: { branch: "feat/x", experiment: "no-ticket" },
    baseline: { commit: "aaa" },
    candidate: { commit: "bbb" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /ticket/i.test(e)));
});

test("missing commit on variant fails validation", () => {
  const result = validateExperiment({
    schema_version: 1,
    id: "no-commit",
    ticket: "DESIGNBOOK-62",
    primary_key: { branch: "feat/x", experiment: "no-commit" },
    baseline: { commit: "aaa" },
    candidate: { branch: "feat/y" },
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => /candidate.*commit|commit.*candidate/i.test(e)));
});

test("createEnvelope records identity fields", () => {
  const envelope = createEnvelope({
    experimentId: "minimal-fixture",
    variant: "baseline",
    caseId: "design-shell",
    suite: "drupal-web",
    ticket: "DESIGNBOOK-62",
    commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    harnessCommit: "cccccccccccccccccccccccccccccccccccccccc",
    workspaceId: "ws-1",
    evidenceRoot: "promptfoo/evidence/minimal-fixture/run-1",
  });
  assert.equal(envelope.experiment_id, "minimal-fixture");
  assert.equal(envelope.variant, "baseline");
  assert.equal(envelope.case, "design-shell");
  assert.equal(envelope.ticket, "DESIGNBOOK-62");
  assert.equal(envelope.commit, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.equal(envelope.harness_commit, "cccccccccccccccccccccccccccccccccccccccc");
  assert.equal(envelope.workspace_id, "ws-1");
  assert.ok(envelope.evidence_root);
  assert.ok(envelope.run_id);
});

test("final_positive false when visual and human optical pending", () => {
  const evaluations = {
    static: { status: "pass", checks: [] },
    flow: { status: "clean", findings: [] },
    optical: {
      design_verify: { status: "pass", score: 0.95, image_refs: [] },
      human: { status: "pending", judgment_ref: null },
    },
  };
  assert.equal(computeFinalPositive(evaluations, { visual: true }), false);
});

test("final_positive false when human optical rejected", () => {
  const evaluations = {
    static: { status: "pass", checks: [] },
    flow: { status: "clean", findings: [] },
    optical: {
      design_verify: { status: "pass", score: 0.95, image_refs: [] },
      human: { status: "rejected", judgment_ref: "judgment.yml" },
    },
  };
  assert.equal(computeFinalPositive(evaluations, { visual: true }), false);
});

test("final_positive true only when static+flow ok and optical channels allow", () => {
  const evaluations = {
    static: { status: "pass", checks: [] },
    flow: { status: "clean", findings: [] },
    optical: {
      design_verify: { status: "pass", score: 0.95, image_refs: ["result.png"] },
      human: { status: "pass", judgment_ref: "judgment.yml" },
    },
  };
  assert.equal(computeFinalPositive(evaluations, { visual: true }), true);

  const staticFail = structuredClone(evaluations);
  staticFail.static.status = "fail";
  assert.equal(computeFinalPositive(staticFail, { visual: true }), false);

  const flowFail = structuredClone(evaluations);
  flowFail.flow.status = "blocked";
  assert.equal(computeFinalPositive(flowFail, { visual: true }), false);

  const verifyFail = structuredClone(evaluations);
  verifyFail.optical.design_verify.status = "fail";
  assert.equal(computeFinalPositive(verifyFail, { visual: true }), false);
});

test("non-visual marks optical not_applicable and can be finally positive", () => {
  const evaluations = markOpticalForVisual(
    {
      static: { status: "pass", checks: [] },
      flow: { status: "clean", findings: [] },
      optical: {
        design_verify: { status: "unknown" },
        human: { status: "pending" },
      },
    },
    { visual: false },
  );
  assert.equal(evaluations.optical.design_verify.status, "not_applicable");
  assert.equal(evaluations.optical.human.status, "not_applicable");
  assert.equal(computeFinalPositive(evaluations, { visual: false }), true);
});
