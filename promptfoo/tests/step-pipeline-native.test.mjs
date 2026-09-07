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
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import yaml from "js-yaml";
import { runStepPipeline } from "../scripts/step-pipeline.mjs";
import { stateHash } from "../extensions/step-result.mjs";
import { publishedCapture } from "./published-capture-fixture.mjs";
import CliProvider from "../providers/cli-provider.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const report = (path) => JSON.parse(readFileSync(path, "utf8"));
const literalMarkup =
  '{{ <img src="image.svg"> }} {% if active %}literal{% endif %} {# retain comment #}';

test(
  "real Promptfoo executes a pending planner handoff and two isolated native workers",
  { timeout: 120000 },
  async (t) => {
    const root = mkdtempSync(join(tmpdir(), "step-pipeline-native-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const workspace = join(root, "workspace");
    const runDir = join(root, "run");
    const bin = join(root, "bin");
    const data = join(workspace, "designbook");
    for (const dir of [
      runDir,
      bin,
      data,
      join(workspace, ".designbook-intake"),
      join(workspace, ".agents/skills/components"),
    ])
      mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(workspace, ".agents/skills/components/x.md"),
      "Fixture instructions, not generated output.\n",
    );
    writeFileSync(
      join(workspace, "designbook.config.yml"),
      yaml.dump({ data }),
    );
    const content = {
      source: "fixture-task.md",
      content: `Write the specified text value exactly. ${literalMarkup}`,
    };
    const output = {
      value: {
        required: true,
        submission: "data",
        validators: [],
        schema: { type: "string", minLength: 1 },
      },
    };
    const catalogue = {
      template: {
        source: "fixture.md",
        content: "Two independent model calls execute two ordered steps.",
      },
      config: { data },
      blocks: {
        write: [
          {
            instructions: content,
            rules: [],
            blueprints: [],
            config_rules: [],
            config_instructions: [],
            params_schema: { type: "object" },
            outputs: output,
            schemas: {},
          },
        ],
      },
    };
    const cataloguePath = join(workspace, ".designbook-intake/catalogue.json");
    writeFileSync(cataloguePath, JSON.stringify(catalogue));
    const captured = publishedCapture(workspace);
    const captureDocument = yaml.load(readFileSync(captured.workflow, "utf8"));
    const task = {
      title: "Write text",
      type: "data",
      target: "text",
      params: {},
      params_schema: { type: "object" },
      instructions: "write",
      context: [],
      outputs: output,
    };
    const definition = {
      id: "native-probe",
      title: "Native phase probe",
      template: catalogue.template,
      workspace_root: workspace,
      config: catalogue.config,
      inputs: {},
      inputs_schema: {},
      context: { write: content },
      schemas: {},
      tasks: [
        { ...task, id: "first", step: "first", depends_on: [], inputs: {} },
        {
          ...task,
          id: "second",
          step: "second",
          depends_on: ["first"],
          inputs: { prior: { task: "first", result: "value" } },
        },
      ],
    };
    const workflow = join(
      data,
      "workflows/changes/native-probe-planned/tasks.yml",
    );
    const table =
      "| Subject | Reference selector | Story selector | Breakpoints | Evidence |\n| --- | --- | --- | --- | --- |\n| text | no reference | planned:.text | sm | Text-only accepted fixture |\n| header | header | planned:.header | sm, xl | rest: mobile.png and desktop.png show header |";
    const native = join(root, "intake.jsonl");
    writeFileSync(
      native,
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: table },
      }) + "\n",
    );
    const handoff = join(root, "intake-handoff.json");
    writeFileSync(
      handoff,
      JSON.stringify({
        pass: true,
        workspace,
        catalogue: cataloguePath,
        native_log: native,
        rows: [],
        fixed_workflows: { "capture-fixture": stateHash(captureDocument) },
        frozen_files: {
          ".designbook-intake/catalogue.json": createHash("sha256")
            .update(readFileSync(cataloguePath))
            .digest("hex"),
        },
      }),
    );
    const intakeReport = join(root, "intake-report.json");
    const intakeArtifacts = await new CliProvider(
      {},
      { defaultModel: "fixture" },
    ).collectArtifacts(workspace);
    writeFileSync(
      intakeReport,
      JSON.stringify({
        results: { results: [{ response: { output: intakeArtifacts } }] },
      }),
    );
    const calls = join(root, "calls.jsonl");
    const cli = join(repo, "packages/storybook-addon-designbook/dist/cli.js");
    writeFileSync(
      join(bin, "codex"),
      `#!/usr/bin/env node
const fs = require('node:fs');
const cp = require('node:child_process');
const prompt = fs.readFileSync(0, 'utf8');
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify({pid:process.pid, prompt})+'\\n');
const emit = event => console.log(JSON.stringify(event));
const run = args => {
  emit({type:'item.started',item:{type:'command_execution',command:'node '+${JSON.stringify(cli)}+' '+args.join(' ')}});
  cp.execFileSync(process.execPath,[${JSON.stringify(cli)},...args],{cwd:${JSON.stringify(workspace)},encoding:'utf8'});
};
if (prompt.includes('You are the planning model')) {
  const path = ${JSON.stringify(join(workspace, "authored.json"))};
  fs.writeFileSync(path,JSON.stringify(${JSON.stringify(definition)}));
  run(['workflow','create',path,'--catalogue',${JSON.stringify(cataloguePath)},'--output',${JSON.stringify(workflow)}]);
  cp.execFileSync(process.execPath,[${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))},${JSON.stringify(workflow)}],{encoding:'utf8'});
} else {
  const step = prompt.match(/Assigned step: ([a-z]+)/)[1];
  run(['workflow','start',${JSON.stringify(workflow)},'--step',step]);
  const path = ${JSON.stringify(root)}+'/'+step+'-results.json';
  fs.writeFileSync(path,JSON.stringify({[step]:{value:step+' completed'}}));
  run(['workflow','done',${JSON.stringify(workflow)},'--step',step,'--data-file',path]);
}
emit({type:'item.completed',item:{type:'agent_message',text:'Finished assigned role.'}});
emit({type:'turn.completed',usage:{input_tokens:100,cached_input_tokens:80,output_tokens:10,reasoning_output_tokens:4}});
`,
      { mode: 0o755 },
    );
    const history = join(root, "history.csv");
    const base = {
      description: "Native pipeline fixture",
      outputPath: join(runDir, "main.json"),
      tags: {
        workflow_id: "native-probe",
        suite: "fixture",
        case: "native",
        run_id: "native-probe",
        phase: "main",
        model: "planner-stub",
        cli: "codex",
        history_csv: history,
        intake_report: intakeReport,
      },
      providers: [
        {
          id: `file://${join(repo, "promptfoo/providers/codex-cli.mjs")}`,
          config: {
            model: "planner-stub",
            timeout: 15000,
            requireDesignIntake: true,
            intakeHandoffInput: handoff,
          },
        },
      ],
      prompts: ["Unused base prompt"],
      tests: [
        {
          vars: { workspace },
          assert: [
            {
              type: "javascript",
              value:
                "output.completedWorkflows['native-probe']?.state.status === 'completed' && output.definitionUnchanged === true",
            },
            {
              type: "javascript",
              value: `file://${join(repo, "promptfoo/extensions/design-intake.mjs")}`,
            },
          ],
        },
      ],
      extensions: [
        `file://${join(repo, "promptfoo/extensions/result-history.mjs")}:afterAll`,
      ],
    };
    const evaluations = [];
    const result = runStepPipeline({
      repo,
      workspace,
      runDir,
      base,
      requestPrompt: "PLANNER_ONLY_GOAL: produce two text results",
      intakeHandoff: handoff,
      executor: { cli: "codex", model: "worker-stub" },
      evaluate: (path) => {
        const child = spawnSync(
          "pnpm",
          [
            "exec",
            "promptfoo",
            "eval",
            "-c",
            path,
            "--no-cache",
            "--no-progress-bar",
          ],
          {
            cwd: repo,
            encoding: "utf8",
            timeout: 35000,
            maxBuffer: 4 * 1024 * 1024,
            env: {
              ...process.env,
              PATH: `${bin}:${process.env.PATH}`,
              PROMPTFOO_DISABLE_TELEMETRY: "1",
              PROMPTFOO_CONFIG_DIR: join(root, "promptfoo-state"),
            },
          },
        );
        evaluations.push({
          path,
          status: child.status,
          output: child.stdout + child.stderr,
        });
        return child.status ?? 1;
      },
    });
    assert.equal(result.plan.exitCode, 0, JSON.stringify(evaluations, null, 2));
    assert.equal(
      result.mainStatus,
      0,
      JSON.stringify({ result, evaluations }, null, 2),
    );
    assert.equal(result.steps.length, 2);
    const planned = report(result.plan.report).results.results[0];
    assert.equal(planned.success, true);
    assert.equal(planned.response.output.model, "planner-stub");
    assert.equal(
      planned.response.output.pendingWorkflows["native-probe"].state.status,
      "pending",
    );
    assert.ok(
      Object.values(
        planned.response.output.pendingWorkflows["native-probe"].state.tasks,
      ).every((s) => s.attempts === 0),
    );
    for (const step of result.steps) {
      const evaluation = report(step.report).results.results[0];
      assert.equal(evaluation.success, true);
      assert.equal(evaluation.response.output.model, "worker-stub");
      assert.equal(evaluation.response.tokenUsage.total, 110);
    }
    const final = yaml.load(readFileSync(workflow, "utf8"));
    assert.equal(final.state.status, "completed");
    assert.equal(
      stateHash(yaml.load(readFileSync(captured.workflow, "utf8"))),
      stateHash(captureDocument),
    );
    const nativeCalls = readFileSync(calls, "utf8")
      .trim()
      .split("\n")
      .map(JSON.parse);
    assert.equal(nativeCalls.length, 3);
    assert.equal(new Set(nativeCalls.map((c) => c.pid)).size, 3);
    assert.match(nativeCalls[0].prompt, /PLANNER_ONLY_GOAL/);
    for (const call of nativeCalls.slice(1))
      assert.doesNotMatch(
        call.prompt,
        /PLANNER_ONLY_GOAL|Two independent model calls execute/,
      );
    assert.match(nativeCalls[1].prompt, /Assigned step: first/);
    assert.ok(nativeCalls[1].prompt.includes(literalMarkup));
    assert.doesNotMatch(nativeCalls[1].prompt, /Task: second/);
    assert.match(nativeCalls[2].prompt, /Assigned step: second/);
    assert.ok(nativeCalls[2].prompt.includes(literalMarkup));
    const rows = readFileSync(history, "utf8").trim().split("\n");
    assert.equal(rows.length, 4);
    assert.match(rows[1], /"plan"/);
    for (const row of rows.slice(2)) assert.match(row, /"execute-step"/);
    for (const row of rows.slice(1))
      assert.match(row, /"100","80","20","10","4","110"/);
  },
);
