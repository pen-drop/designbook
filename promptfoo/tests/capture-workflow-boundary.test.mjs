import test from "node:test";
import assert from "node:assert/strict";
import stepResult, { stateHash } from "../extensions/step-result.mjs";
import planResult from "../extensions/plan-result.mjs";
import { validateIntakeCaptures } from "../extensions/intake-capture.mjs";

test("intake accepts only fully completed published reference capture workflows", () => {
  const document = {
    definition: {
      capture: {
        role: "reference",
        scope: [
          {
            subject: "header",
            view: "desktop",
            breakpoint: "xl",
            state: "rest",
            locator: { kind: "figma-node", value: "1:2" },
          },
          {
            subject: "header",
            view: "desktop",
            breakpoint: "xl",
            state: "menu-open",
            locator: { kind: "figma-node", value: "1:2" },
          },
        ],
      },
    },
    state: {
      status: "completed",
      tasks: { capture: { status: "done" } },
      capture: {
        id: "site",
        revision: "rev1",
        directory: "/data/site/rev1",
        files: { "meta.yml": "hash" },
      },
    },
  };
  const output = {
    completedWorkflows: { capture: document },
    pendingWorkflows: {},
    definitionUnchanged: true,
  };
  const rows = [
    {
      subject: "header",
      "reference selector": "1:2",
      breakpoints: "xl",
      evidence: "rest: desktop.png; menu-open: open.png",
    },
  ];
  assert.equal(validateIntakeCaptures(output, rows).pass, true);
  for (const change of [
    { subject: "footer" },
    { breakpoints: "mobile" },
    { evidence: "rest: desktop.png" },
    { "reference selector": "9:9" },
  ])
    assert.equal(
      validateIntakeCaptures(output, [{ ...rows[0], ...change }]).pass,
      false,
    );
  assert.equal(validateIntakeCaptures(output, []).pass, false);
  document.definition.capture.role = "actual";
  assert.equal(validateIntakeCaptures(output, rows).pass, false);
  document.definition.capture.role = "reference";
  document.state.tasks.capture.status = "blocked";
  assert.equal(validateIntakeCaptures(output, rows).pass, false);
  document.state.tasks.capture.status = "done";
  output.definitionUnchanged = false;
  assert.equal(validateIntakeCaptures(output, rows).pass, false);
  output.definitionUnchanged = true;
  delete document.state.capture;
  assert.equal(validateIntakeCaptures(output, rows).pass, false);
});

test("planner retains only its completed captures and a new unexecuted design plan", () => {
  const capture = { state: { status: "completed" } };
  const design = {
    state: {
      status: "pending",
      tasks: { header: { status: "pending", attempts: 0, results: {} } },
    },
  };
  const output = {
    completedWorkflows: { capture },
    pendingWorkflows: { design },
  };
  const context = {
    vars: {
      plan_contract: {
        workflow: "design",
        fixedWorkflows: { capture: stateHash(capture) },
      },
    },
  };
  assert.equal(planResult(output, context).pass, true);
  design.state.tasks.header.attempts = 1;
  assert.equal(planResult(output, context).pass, false);
  design.state.tasks.header.attempts = 0;
  capture.state.status = "pending";
  assert.equal(planResult(output, context).pass, false);
  capture.state.status = "completed";
  output.completedWorkflows.unexpected = capture;
  assert.equal(planResult(output, context).pass, false);
});

test("worker preserves completed capture workflows alongside its assigned design step", () => {
  const capture = {
    definition: { id: "capture-site", capture: { role: "reference" } },
    state: { status: "completed", capture: { revision: "frozen" } },
  };
  const design = {
    definition: { tasks: [{ id: "header", step: "build" }] },
    state: { tasks: { header: { status: "done" } } },
  };
  const output = {
    completedWorkflows: { "capture-site": capture, design },
    pendingWorkflows: {},
  };
  const context = {
    vars: {
      step_contract: {
        workflow: "design",
        step: "build",
        taskIds: ["header"],
        stateHashes: { header: stateHash({ status: "pending" }) },
        fixedWorkflows: { "capture-site": stateHash(capture) },
      },
    },
  };
  assert.equal(stepResult(output, context).pass, true);
  capture.state.capture.revision = "changed";
  assert.equal(stepResult(output, context).pass, false);
  capture.state.capture.revision = "frozen";
  output.completedWorkflows.unexpected = capture;
  assert.equal(stepResult(output, context).pass, false);
  delete output.completedWorkflows.unexpected;
  delete output.completedWorkflows["capture-site"];
  assert.equal(stepResult(output, context).pass, false);
});
