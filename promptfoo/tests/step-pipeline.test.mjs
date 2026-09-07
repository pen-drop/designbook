import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import { executorConfig, runStepPipeline } from "../scripts/step-pipeline.mjs";
import stepResult, { stateHash } from "../extensions/step-result.mjs";

function fixture(t) {
  const repo = mkdtempSync(join(tmpdir(), "step-pipeline-"));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const workspace = join(repo, "workspace");
  const runDir = join(repo, "reports");
  mkdirSync(workspace);
  mkdirSync(runDir);
  const catalogue = join(workspace, "catalogue.json");
  writeFileSync(
    catalogue,
    JSON.stringify({ config: { data: join(workspace, "data") } }),
  );
  const intakeHandoff = join(runDir, "handoff.json");
  writeFileSync(
    intakeHandoff,
    JSON.stringify({ pass: true, workspace, catalogue }),
  );
  const intakeReport = join(runDir, "intake.json");
  writeFileSync(
    intakeReport,
    JSON.stringify({
      results: { results: [{ response: { output: { fileHashes: {} } } }] },
    }),
  );
  const base = {
    description: "shell",
    outputPath: join(runDir, "main.json"),
    tags: {
      workflow_id: "design-shell",
      intake_report: intakeReport,
      model: "claude-opus-5",
      cli: "claude",
    },
    providers: [
      {
        id: "claude",
        config: {
          model: "claude-opus-5",
          requireDesignIntake: true,
          intakeHandoffInput: intakeHandoff,
        },
      },
    ],
    tests: [
      {
        vars: { workspace },
        assert: [{ type: "javascript", value: "final-quality-gate" }],
      },
    ],
    prompts: ["ENTIRE ORIGINAL CASE"],
  };
  const document = {
    definition: {
      id: "design-shell",
      tasks: [
        { id: "a", step: "first" },
        { id: "b", step: "second" },
      ],
    },
    state: {
      tasks: {
        a: { status: "pending", attempts: 0 },
        b: { status: "pending", attempts: 0 },
      },
    },
  };
  return {
    repo,
    workspace,
    runDir,
    base,
    intakeHandoff,
    document,
    executor: { cli: "codex", model: "gpt-5.6-luna" },
  };
}

test("executor receives only its work order, retains intake gate and fixed state contract", (t) => {
  const f = fixture(t);
  const config = executorConfig(f.base, {
    ...f,
    step: { id: "first", tasks: [{ id: "a" }] },
    workflowPath: "/saved/tasks.yml",
    context: "EXACT FIRST STEP",
    output: join(f.runDir, "first.json"),
    final: false,
  });
  assert.match(config.providers[0].id, /codex-cli.mjs$/);
  assert.equal(config.providers[0].config.model, "gpt-5.6-luna");
  assert.equal(config.providers[0].config.requireDesignIntake, true);
  assert.equal(config.providers[0].config.intakeHandoffInput, f.intakeHandoff);
  assert.match(config.prompts[0], /EXACT FIRST STEP/);
  assert.doesNotMatch(config.prompts[0], /ENTIRE ORIGINAL CASE/);
  assert.equal(config.tests[0].vars.suite, undefined);
  assert.ok(
    config.tests[0].assert.some((a) => a.value.endsWith("design-intake.mjs")),
  );
  assert.ok(
    !config.tests[0].assert.some((a) => a.value === "final-quality-gate"),
  );
  assert.equal(f.base.providers[0].config.model, "claude-opus-5");
});

test("step gate rejects cross-step edits, incomplete batch and extra workflows", (t) => {
  const { document } = fixture(t);
  const context = {
    vars: {
      step_contract: {
        workflow: "design-shell",
        step: "first",
        taskIds: ["a"],
        stateHashes: Object.fromEntries(
          Object.entries(document.state.tasks).map(([id, s]) => [
            id,
            stateHash(s),
          ]),
        ),
      },
    },
  };
  const output = { pendingWorkflows: { "design-shell": document } };
  assert.equal(stepResult(output, context).pass, false);
  document.state.tasks.a.status = "done";
  assert.equal(stepResult(output, context).pass, true);
  document.state.tasks.b.attempts = 1;
  assert.match(stepResult(output, context).reason, /another step/);
  document.state.tasks.b.attempts = 0;
  output.completedWorkflows = { surprise: structuredClone(document) };
  assert.equal(stepResult(output, context).pass, false);
});

function simulate(t, { failPhase, contextFailure = false } = {}) {
  const f = fixture(t);
  const calls = [];
  const workflowPath = join(
    f.workspace,
    "data/workflows/changes/design-shell-planned/tasks.yml",
  );
  const result = runStepPipeline({
    ...f,
    requestPrompt: "ONLY PLANNER SEES REQUEST",
    evaluate(path) {
      const config = yaml.load(readFileSync(path, "utf8"));
      calls.push(config);
      const phase = config.tags.phase === "plan" ? "plan" : config.tags.step;
      writeFileSync(config.outputPath, JSON.stringify({ phase }));
      if (phase === "plan") {
        mkdirSync(join(workflowPath, ".."), { recursive: true });
      } else if (phase !== failPhase) {
        const id = phase === "first" ? "a" : "b";
        f.document.state.tasks[id].status = "done";
      }
      writeFileSync(workflowPath, yaml.dump(f.document));
      return phase === failPhase ? 1 : 0;
    },
    runWorkflow(command, path, ...args) {
      assert.equal(path, workflowPath);
      if (command === "instructions") {
        if (contextFailure) throw new Error("Reference fingerprint changed");
        return args[1] === "first"
          ? "FIRST TASK MATERIAL"
          : "SECOND TASK MATERIAL";
      }
      assert.equal(command, "steps");
      return JSON.stringify({
        steps: [
          {
            id: "first",
            status: f.document.state.tasks.a.status,
            ready: true,
            tasks: [{ id: "a" }],
          },
          {
            id: "second",
            status: f.document.state.tasks.b.status,
            ready: f.document.state.tasks.a.status === "done",
            tasks: [{ id: "b" }],
          },
        ],
      });
    },
  });
  return { ...f, result, calls };
}

test("pipeline plans once and invokes a fresh executor for each ready batch", (t) => {
  const { calls, result, runDir } = simulate(t);
  assert.equal(result.mainStatus, 0);
  assert.equal(result.steps.length, 2);
  assert.deepEqual(
    calls.map((c) => c.tags.phase),
    ["plan", "execute-step", "execute-step"],
  );
  assert.deepEqual(
    calls.map((c) => c.providers[0].config.model),
    ["claude-opus-5", "gpt-5.6-luna", "gpt-5.6-luna"],
  );
  assert.match(calls[0].prompts[0], /ONLY PLANNER SEES REQUEST/);
  assert.match(calls[0].prompts[0], /--catalogue/);
  assert.doesNotMatch(calls[1].prompts[0], /ONLY PLANNER|SECOND TASK MATERIAL/);
  assert.doesNotMatch(calls[2].prompts[0], /ONLY PLANNER|FIRST TASK MATERIAL/);
  assert.ok(
    calls[2].tests[0].assert.some((a) => a.value === "final-quality-gate"),
  );
  assert.equal(calls[2].outputPath, join(runDir, "main.json"));
});

test("failed planning or execution never advances to later steps", (t) => {
  for (const failPhase of ["plan", "first"]) {
    const { calls, result } = simulate(t, { failPhase });
    assert.equal(calls.length, failPhase === "plan" ? 1 : 2);
    assert.equal(
      result.steps.some((s) => s.step === "second"),
      false,
    );
    assert.notEqual(result.mainStatus, 0);
  }
});

test("query failure preserves completed planning accounting and invokes no executor", (t) => {
  const { calls, result, runDir } = simulate(t, { contextFailure: true });
  assert.equal(calls.length, 1);
  assert.equal(result.plan.exitCode, 0);
  assert.match(result.error, /fingerprint/);
  assert.equal(
    JSON.parse(readFileSync(join(runDir, "step-pipeline.json"))).plan.exitCode,
    0,
  );
});

test("runner exposes explicit planner/executor selection without changing verifier", (t) => {
  const f = fixture(t);
  const path = execFileSync(
    "node",
    [
      "promptfoo/scripts/run-single.mjs",
      "design-shell",
      "--suite",
      "drupal-web",
      "--workspace",
      f.workspace,
      "--output",
      join(f.runDir, "report.json"),
      "--config-only",
      "--provider",
      "claude",
      "--executor-provider",
      "codex",
      "--executor-model",
      "gpt-5.6-luna",
    ],
    { encoding: "utf8" },
  ).trim();
  const config = yaml.load(readFileSync(path, "utf8"));
  assert.equal(config.tags.execution_mode, "separate-steps");
  assert.equal(config.tags.executor_model, "gpt-5.6-luna");
  const verify = yaml.load(readFileSync(config.tags.verify_config, "utf8"));
  assert.equal(verify.providers[0].config.model, "claude-opus-5");
  assert.throws(
    () =>
      execFileSync(
        "node",
        [
          "promptfoo/scripts/run-single.mjs",
          "vision",
          "--config-only",
          "--executor-provider",
          "codex",
          "--executor-model",
          "gpt-5.6-luna",
        ],
        { stdio: "pipe" },
      ),
    /requires a nonrepeated design case/,
  );
});

test("planner and executor models are independently configurable within one provider", (t) => {
  const f = fixture(t);
  for (const [cli, planner, worker] of [
    ["codex", "gpt-6-astra", "gpt-5.6-luna"],
    ["claude", "opus", "sonnet"],
    ["codex", "gpt-5.6-luna", "gpt-5.6-luna"],
  ]) {
    const path = execFileSync(
      "node",
      [
        "promptfoo/scripts/run-single.mjs",
        "design-shell",
        "--suite",
        "drupal-web",
        "--workspace",
        f.workspace,
        "--output",
        join(f.runDir, "report.json"),
        "--config-only",
        "--provider",
        cli,
        "--model",
        planner,
        "--executor-provider",
        cli,
        "--executor-model",
        worker,
      ],
      { encoding: "utf8" },
    ).trim();
    const config = yaml.load(readFileSync(path, "utf8"));
    assert.equal(config.tags.execution_mode, "separate-steps");
    assert.equal(config.tags.planner_cli, cli);
    assert.equal(config.tags.planner_model, planner);
    assert.equal(config.tags.executor_cli, cli);
    assert.equal(config.tags.executor_model, worker);
    assert.equal(config.providers[0].config.model, planner);
    const verify = yaml.load(readFileSync(config.tags.verify_config, "utf8"));
    assert.equal(verify.providers[0].config.model, planner);
  }
});
