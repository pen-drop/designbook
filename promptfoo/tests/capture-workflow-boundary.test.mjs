import test from "node:test";
import assert from "node:assert/strict";
import planResult from "../extensions/plan-result.mjs";

test("planning checks its target, not historical capture attempts", () => {
  const design = {
    state: {
      status: "pending",
      tasks: { header: { status: "pending", attempts: 0, results: {} } },
    },
  };
  const output = {
    pendingWorkflows: { design, oldCapture: { state: { status: "blocked" } } },
  };
  const context = { vars: { plan_contract: { workflow: "design" } } };
  assert.equal(planResult(output, context).pass, true);
  design.state.tasks.header.attempts = 1;
  assert.equal(planResult(output, context).pass, false);
});

test("planning accepts a named PrerequisiteNeed blockade instead of a sealed plan", () => {
  const output = {
    text: "kind: PrerequisiteNeed\nworkflow: design-entity\nneed:\n  workflow: tokens\n  reason: missing or incomplete design tokens\n",
    pendingWorkflows: {},
    completedWorkflows: {},
    fileContents: {},
  };
  const context = {
    vars: {
      plan_contract: {
        workflow: "design-entity",
        blockade: { workflow: "tokens" },
      },
    },
  };
  assert.equal(planResult(output, context).pass, true);
  assert.equal(
    planResult(
      { ...output, text: "sealed a design-entity plan" },
      context,
    ).pass,
    false,
  );
});
