import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import yaml from "js-yaml";
import {
  writeApprovalProvenance,
  isRealHumanApproval,
  assertNotPromotedToOpticalJudgment,
  requireApprovalProvenance,
} from "../experiments/approval-provenance.mjs";
import { computeFinalPositive } from "../experiments/envelope.mjs";

test("only interactive mode satisfies isRealHumanApproval", () => {
  assert.equal(
    isRealHumanApproval({ mode: "interactive", status: "approved" }),
    true,
  );
  assert.equal(
    isRealHumanApproval({ mode: "recorded", status: "approved" }),
    false,
  );
  assert.equal(
    isRealHumanApproval({ mode: "simulated", status: "approved" }),
    false,
  );
  assert.equal(isRealHumanApproval(null), false);
  assert.equal(isRealHumanApproval({ mode: "interactive", status: "rejected" }), false);
});

test("simulated approval must not set optical.human pass", () => {
  const provenance = { mode: "simulated", status: "approved" };
  assert.throws(
    () =>
      assertNotPromotedToOpticalJudgment(provenance, {
        optical: { human: { status: "pass" } },
      }),
    /promot|optical|simulated|recorded/i,
  );

  assert.doesNotThrow(() =>
    assertNotPromotedToOpticalJudgment(provenance, {
      optical: { human: { status: "not_applicable" } },
    }),
  );

  const recorded = { mode: "recorded", status: "approved" };
  assert.throws(
    () =>
      assertNotPromotedToOpticalJudgment(recorded, {
        optical: { human: { status: "pass" } },
      }),
    /promot|optical|simulated|recorded/i,
  );
});

test("writeApprovalProvenance persists mode tag", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "approval-prov-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const path = await writeApprovalProvenance(dir, {
    mode: "simulated",
    status: "approved",
    note: "fixture automation; not a real human gate",
  });
  const doc = yaml.load(await readFile(path, "utf8"));
  assert.equal(doc.mode, "simulated");
  assert.equal(doc.status, "approved");
  assert.ok(doc.written_at);
});

test("silent approved without provenance fails contract check", () => {
  assert.throws(
    () => requireApprovalProvenance({ status: "approved" }, null),
    /provenance/i,
  );
  assert.doesNotThrow(() =>
    requireApprovalProvenance(
      { status: "approved" },
      { mode: "simulated", status: "approved" },
    ),
  );
});

test("simulated approval does not make visual final_positive via optical human", () => {
  // Even if someone wrongly stamps human pass from simulated, computeFinalPositive
  // alone is not enough — promotion guard must reject the pairing.
  const evaluations = {
    static: { status: "pass", checks: [] },
    flow: { status: "clean", findings: [] },
    optical: {
      design_verify: { status: "pass" },
      human: { status: "pass", judgment_ref: null },
    },
  };
  assert.throws(() =>
    assertNotPromotedToOpticalJudgment(
      { mode: "simulated", status: "approved" },
      evaluations,
    ),
  );
  // Without a real interactive judgment, pending keeps final_positive false
  evaluations.optical.human.status = "pending";
  assert.equal(computeFinalPositive(evaluations, { visual: true }), false);
});
