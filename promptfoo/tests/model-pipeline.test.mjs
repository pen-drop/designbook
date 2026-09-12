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
import {
  executorConfig,
  runModelPipeline,
} from "../scripts/model-pipeline.mjs";
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
  return {
    repo,
    workspace,
    runDir,
    base,
    intakeHandoff,
    executor: { cli: "codex", model: "gpt-5.6-luna" },
  };
}
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
  assert.equal(config.tags.execution_mode, "planner-executor");
  assert.equal(config.tags.step_prompt_max_bytes, undefined);
  assert.equal(config.tags.executor_model, "gpt-5.6-luna");
  const verify = yaml.load(readFileSync(config.tags.verify_config, "utf8"));
  assert.equal(verify.providers[0].config.model, "claude-opus-5");
  const verifyPrompt = verify.prompts[0];
  assert.doesNotMatch(verifyPrompt, /\.page__header|\.page__footer|leando\.de/);
  assert.doesNotMatch(verifyPrompt, /criteria above|take precedence/);
  assert.match(verifyPrompt, /all comparison targets from that saved plan/);
  assert.match(verifyPrompt, /3% when none is declared/);
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
    assert.equal(config.tags.execution_mode, "planner-executor");
    assert.equal(config.tags.step_prompt_max_bytes, undefined);
    assert.equal(config.tags.planner_cli, cli);
    assert.equal(config.tags.planner_model, planner);
    assert.equal(config.tags.executor_cli, cli);
    assert.equal(config.tags.executor_model, worker);
    assert.equal(config.providers[0].config.model, planner);
    const verify = yaml.load(readFileSync(config.tags.verify_config, "utf8"));
    assert.equal(verify.providers[0].config.model, planner);
  }
});

test("executor receives only a saved path and keeps all final assertions", (t) => {
  const f = fixture(t);
  const config = executorConfig(f.base, {
    ...f,
    workflowPath: "/saved/tasks.yml",
  });
  assert.equal(config.providers[0].config.model, "gpt-5.6-luna");
  assert.equal(config.providers[0].config.intakeHandoffInput, undefined);
  assert.deepEqual(config.tests[0].assert, f.base.tests[0].assert);
  assert.match(config.prompts[0], /execute-workflow/);
  assert.match(config.prompts[0], /until complete or blocked/);
  assert.doesNotMatch(
    config.prompts[0],
    /ENTIRE ORIGINAL CASE|Assigned step|native_work_order/,
  );
  assert.ok(Buffer.byteLength(config.prompts[0]) < 2000);
});

for (const planExit of [0, 100]) {
  test(`one executor call only after successful planner (exit ${planExit})`, (t) => {
    const f = fixture(t),
      calls = [];
    const result = runModelPipeline({
      ...f,
      requestPrompt: "Build shell",
      evaluate(path) {
        const config = yaml.load(readFileSync(path, "utf8"));
        calls.push(config);
        return config.tags.phase === "plan" ? planExit : 100;
      },
    });
    assert.deepEqual(
      calls.map((c) => c.tags.phase),
      planExit ? ["plan"] : ["plan", "main"],
    );
    assert.equal(result.mainStatus, planExit ? null : 100);
    assert.equal(result.steps, undefined);
  });
}
