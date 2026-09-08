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
