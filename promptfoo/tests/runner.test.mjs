import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import yaml from "js-yaml";
import Provider from "../providers/codex-cli.mjs";
import caseResult from "../extensions/case-result.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "promptfoo-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  const provider = new Provider({
    config: { evidenceDir: join(root, "evidence"), timeout: 5000 },
  });
  const workflow = async (folder, directory, id, status, tasks = {}) => {
    const path = join(workspace, "designbook/workflows", folder, directory);
    await mkdir(path, { recursive: true });
    await writeFile(
      join(path, "tasks.yml"),
      yaml.dump({ definition: { id }, state: { status, tasks } }),
    );
    await writeFile(join(path, "definition-before.yml"), yaml.dump({ id }));
  };
  const stub = async (body, command = "codex") => {
    const bin = join(root, "bin");
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, command), `#!/usr/bin/env node\n${body}\n`, {
      mode: 0o755,
    });
    const original = process.env.PATH;
    process.env.PATH = `${bin}:${original}`;
    t.after(() => {
      process.env.PATH = original;
    });
  };
  return { root, workspace, provider, workflow, stub };
}
const completed = [
  { type: "item.completed", item: { type: "agent_message", text: "Done" } },
  {
    type: "turn.completed",
    usage: {
      input_tokens: 100,
      cached_input_tokens: 80,
      output_tokens: 10,
      reasoning_output_tokens: 4,
    },
  },
];
const emit = (events) =>
  `for (const event of ${JSON.stringify(events)}) console.log(JSON.stringify(event));`;
const claudeCompleted = [
  {
    type: "result",
    subtype: "success",
    is_error: false,
    result: "Done",
    usage: {
      input_tokens: 10,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 80,
      output_tokens: 10,
      output_tokens_details: { thinking_tokens: 4 },
    },
    modelUsage: {
      "claude-opus-5": {
        inputTokens: 10,
        cacheCreationInputTokens: 10,
        cacheReadInputTokens: 80,
        outputTokens: 10,
      },
    },
  },
];

test("text-only design cases retain semantic evidence through the Promptfoo runner", async (t) => {
  const { root, workspace } = await fixture(t);
  for (const name of ["component", "screen", "shell", "entity"]) {
    for (const suffix of ["", "-update"]) {
      const caseName = `design-${name}${suffix}`;
      const path = execFileSync(
        "node",
        [
          "promptfoo/scripts/run-single.mjs",
          caseName,
          "--suite",
          "drupal-petshop",
          "--workspace",
          workspace,
          "--output",
          join(root, `${caseName}.json`),
          "--config-only",
        ],
        { encoding: "utf8" },
      ).trim();
      const config = yaml.load(await readFile(path, "utf8"));
      assert.equal(config.tags.verify_config, undefined);
      assert.match(
        config.providers[0].config.caseFile,
        new RegExp(`${caseName}\\.yaml$`),
      );
      assert.match(config.prompts[0], /case-runs\.json/);
      assert.match(config.prompts[0], /already running inside Promptfoo/);
      assert.match(
        config.prompts[0],
        /Prior test workspaces, saved definitions, generated artifacts and reports are not inputs/,
      );
      assert.equal(
        config.tests[0].vars.case_file,
        config.providers[0].config.caseFile,
      );
      assert.ok(
        config.tests[0].assert.some((assertion) =>
          assertion.value.endsWith("/case-result.mjs"),
        ),
      );
      if (caseName === "design-screen-update") {
        assert.match(config.prompts[0], /distinct saved definition IDs/);
        assert.match(config.prompts[0], /design-screen-update-2/);
        assert.doesNotMatch(
          config.prompts[0],
          /as the primary saved workflow definition.id/,
        );
      }
    }
  }
});

test("case grading keeps scorer semantics for expressions and statement bodies", async (t) => {
  const { root } = await fixture(t);
  const caseFile = join(root, "case.yml");
  await writeFile(
    caseFile,
    yaml.dump({
      assert: [
        { type: "javascript", value: "output.present === true" },
        {
          type: "javascript",
          value:
            "const refs = output.refs; return refs.length > 0 && refs.every(ref => ref === 'valid');",
        },
      ],
    }),
  );
  const context = { vars: { case_file: caseFile } };
  assert.deepEqual(caseResult({ present: true, refs: ["valid"] }, context), {
    pass: true,
    score: 1,
    reason: "2/2 case assertions passed",
  });
  assert.equal(
    caseResult({ present: true, refs: ["invalid"] }, context).pass,
    false,
  );
  assert.equal(caseResult({}, context).pass, false);
  await writeFile(caseFile, "assert: []\n");
  assert.equal(caseResult({}, context).pass, false);
});

test("provider reuses bounded baseline and independent execution evidence", async (t) => {
  const { root, workspace, provider } = await fixture(t);
  const theme = join(workspace, "web/themes/custom/test_theme");
  await mkdir(join(theme, "components/card"), { recursive: true });
  await mkdir(join(theme, "designbook/data"), { recursive: true });
  await writeFile(
    join(workspace, "designbook.config.yml"),
    yaml.dump({ designbook: { home: "web/themes/custom/test_theme" } }),
  );
  const artifact = "components/card/card.component.yml";
  await writeFile(join(theme, artifact), "name: Card\n");
  await writeFile(
    join(theme, "designbook/data/node.pet.yml"),
    "- title: Bella\n",
  );
  await writeFile(join(theme, "designbook/mapping.jsonata"), '{"name": title}');
  const git = (...args) =>
    execFileSync("git", args, { cwd: theme, stdio: "pipe" });
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "-qm",
    "fixture",
  );
  await writeFile(join(theme, artifact), "name: Updated card\n");
  const caseFile = join(root, "case.yaml");
  await writeFile(
    caseFile,
    yaml.dump({
      evidence: {
        files: [
          artifact,
          "designbook/data/node.pet.yml",
          "designbook/mapping.jsonata",
        ],
        mappings: [
          {
            file: "designbook/mapping.jsonata",
            data: "designbook/data/node.pet.yml",
          },
        ],
      },
    }),
  );
  provider.config.caseFile = caseFile;
  const entries = [];
  for (const id of ["first", "second"]) {
    const dir = join(theme, "designbook/workflows/changes", id);
    await mkdir(dir, { recursive: true });
    const definition = {
      id,
      tasks: [{ id: "write", outputs: { artifact: { required: true } } }],
    };
    const entry = {
      workflow: join(dir, "tasks.yml"),
      definitionBefore: join(dir, "definition-before.yml"),
      evidence: join(dir, "evidence.json"),
      artifactSnapshot: join(dir, "snapshot.json"),
    };
    await writeFile(
      entry.workflow,
      yaml.dump({
        definition,
        state: {
          status: "completed",
          tasks: {
            write: {
              status: "done",
              results: { artifact: { valid: true, value: "done" } },
            },
          },
        },
      }),
    );
    await writeFile(entry.definitionBefore, yaml.dump(definition));
    await writeFile(entry.evidence, JSON.stringify({ observedRun: id }));
    await writeFile(
      entry.artifactSnapshot,
      JSON.stringify({ capturedRun: id }),
    );
    entries.push(entry);
  }
  const manifest = join(workspace, "case-runs.json");
  await writeFile(manifest, JSON.stringify(entries));
  const result = await provider.collectArtifacts(workspace);
  assert.deepEqual(result.workflowErrors, []);
  assert.equal(result.definitionUnchanged, true);
  assert.equal(result.runs.length, 2);
  assert.ok(
    result.runs.every((run) => run.complete && run.definitionUnchanged),
  );
  assert.deepEqual(
    result.runs.map((run) => run.evidence.observedRun),
    ["first", "second"],
  );
  assert.deepEqual(
    result.runs.map((run) => run.artifacts.capturedRun),
    ["first", "second"],
  );
  assert.equal(result.fileContents[artifact].name, "Updated card");
  assert.equal(result.baselineContents[artifact].name, "Card");
  assert.ok(result.modifiedFiles.includes(artifact));
  assert.ok(result.unchangedFiles.includes("designbook/data/node.pet.yml"));
  assert.deepEqual(result.mappingResults["designbook/mapping.jsonata"], {
    name: "Bella",
  });
  assert.deepEqual(result.componentIds, ["card"]);
  await writeFile(manifest, JSON.stringify(entries.slice(0, 1)));
  await assert.rejects(
    provider.collectArtifacts(workspace),
    /every saved execution path/,
  );
  await writeFile(manifest, "[]");
  await assert.rejects(
    provider.collectArtifacts(workspace),
    /nonempty execution manifest/,
  );
});

test("exact workflow IDs preserve failed attempts and archive does not imply completion", async (t) => {
  const { provider, workspace, workflow } = await fixture(t);
  await workflow("changes", "first", "design-shell-first", "blocked");
  await workflow("archive", "retry", "design-shell-retry", "completed");
  await workflow("archive", "unfinished", "unfinished", "running");
  const result = await provider.collectArtifacts(workspace);
  assert.deepEqual(Object.keys(result.completedWorkflows), [
    "design-shell-retry",
  ]);
  assert.deepEqual(Object.keys(result.pendingWorkflows).sort(), [
    "design-shell-first",
    "unfinished",
  ]);
  assert.equal(result.completedWorkflows["design-shell"], undefined);
});

test("invalid documents and duplicate IDs are errors, including across states", async (t) => {
  const { provider, workspace, workflow } = await fixture(t);
  await workflow("changes", "one", "same", "blocked");
  await workflow("archive", "two", "same", "completed");
  await workflow("archive", "bad", undefined, "completed");
  const result = await provider.collectArtifacts(workspace);
  assert.equal(result.workflowErrors.length, 2);
});

test("Codex constructor config, usage subsets and raw logs survive execution", async (t) => {
  const { provider, workspace, stub } = await fixture(t);
  await stub(emit(completed));
  const result = await provider.callApi("Test prompt", { vars: { workspace } });
  assert.equal(result.error, undefined);
  assert.equal(result.output.model, "gpt-5.6-luna");
  assert.equal(result.output.text, "Done");
  assert.equal(result.tokenUsage.total, 110);
  assert.equal(result.tokenUsage.cached, 80);
  assert.equal(result.tokenUsage.completionDetails.reasoning, 4);
  assert.match(
    await readFile(join(result.metadata.evidenceDir, "codex.jsonl"), "utf8"),
    /turn.completed/,
  );
  assert.equal(
    await readFile(join(result.metadata.evidenceDir, "prompt.txt"), "utf8"),
    "Test prompt",
  );
});

test("nonzero exit and timeout retain partial evidence and cannot pass", async (t) => {
  const { provider, workspace, stub } = await fixture(t);
  await stub(
    'console.log(JSON.stringify({type:"turn.started"})); console.error("failure detail"); process.exitCode = 1;',
  );
  const failed = await provider.callApi("Fail", { vars: { workspace } });
  assert.match(failed.error, /Codex CLI error/);
  assert.match(
    await readFile(join(failed.metadata.evidenceDir, "codex.jsonl"), "utf8"),
    /turn.started/,
  );
  assert.match(
    await readFile(join(failed.metadata.evidenceDir, "stderr.log"), "utf8"),
    /failure detail/,
  );
  await writeFile(
    join(resolve(process.env.PATH.split(":")[0]), "codex"),
    '#!/usr/bin/env node\nconsole.log("partial"); setTimeout(() => {}, 30000);\n',
  );
  provider.timeout = 300;
  const timedOut = await provider.callApi("Timeout", { vars: { workspace } });
  assert.match(timedOut.error, /timed out/);
  assert.match(
    await readFile(join(timedOut.metadata.evidenceDir, "codex.jsonl"), "utf8"),
    /partial/,
  );
});

test("zero exit without completed turn is a failure", async (t) => {
  const { provider, workspace, stub } = await fixture(t);
  await stub(emit([{ type: "turn.failed", error: { message: "quota" } }]));
  const result = await provider.callApi("Incomplete", { vars: { workspace } });
  assert.match(result.error, /did not complete/);
});

test("native terminal usage survives a nonzero exit and artifact collection failure", async (t) => {
  const { provider, workspace, stub } = await fixture(t);
  await stub(emit(completed) + "\nprocess.exitCode = 1;");
  const failed = await provider.callApi("Fail after usage", {
    vars: { workspace },
  });
  assert.match(failed.error, /CLI error/);
  assert.equal(failed.tokenUsage.total, 110);
  assert.equal(failed.metadata.run.usage.input_tokens, 100);
  assert.equal(
    JSON.parse(
      await readFile(join(failed.metadata.evidenceDir, "run.json"), "utf8"),
    ).usage.output_tokens,
    10,
  );

  await stub(emit(completed));
  provider.collectArtifacts = async () => {
    throw new Error("Missing manifest");
  };
  const collection = await provider.callApi("Artifact failure", {
    vars: { workspace },
  });
  assert.match(collection.error, /Missing manifest/);
  assert.equal(collection.tokenUsage.total, 110);
});

test("Grok aggregates multiple model turns once and rejects incomplete or inconsistent usage", async () => {
  const { grokRuntime } = await import("../providers/grok-cli.mjs");
  const events = [
    {
      type: "assistant",
      parent_tool_use_id: null,
      message: {
        id: "msg_0",
        usage: {
          input_tokens: 30,
          output_tokens: 6,
          cache_read_input_tokens: 1,
          cache_creation_input_tokens: 0,
        },
      },
    },
    {
      type: "assistant",
      parent_tool_use_id: null,
      message: {
        id: "msg_1",
        usage: {
          input_tokens: 2,
          output_tokens: 4,
          cache_read_input_tokens: 31,
          cache_creation_input_tokens: 0,
        },
      },
    },
    {
      type: "result",
      subtype: "success",
      is_error: false,
      result: "Done",
      usage: {
        input_tokens: 32,
        output_tokens: 10,
        cache_read_input_tokens: 32,
        cache_creation_input_tokens: 0,
      },
    },
  ];
  const parsed = grokRuntime.parse(events);
  assert.equal(parsed.usage.input_tokens, 64);
  assert.equal(parsed.usage.cached_input_tokens, 32);
  assert.equal(parsed.usage.output_tokens, 10);
  assert.equal(parsed.usageScope, "session-no-subagents");
  assert.equal(parsed.subagentCount, 0);
  assert.throws(() => grokRuntime.parse(events.slice(0, -1)), /missing result/);
  const mismatch = structuredClone(events);
  mismatch[2].usage.input_tokens++;
  assert.throws(() => grokRuntime.parse(mismatch), /usage mismatch/);
  assert.throws(() => grokRuntime.parse([events[0], ...events]), /duplicate/);
  const child = structuredClone(events);
  child[0].parent_tool_use_id = "subagent";
  assert.throws(() => grokRuntime.parse(child), /subagent/);
  const missing = structuredClone(events);
  delete missing[0].message.usage.output_tokens;
  assert.throws(() => grokRuntime.parse(missing), /usage mismatch/);
  const failure = structuredClone(events);
  failure[2].is_error = true;
  assert.throws(() => grokRuntime.parse(failure), /did not complete/);
});

test("generated main/verify configs isolate setup and preserve paths", async (t) => {
  const { root, workspace } = await fixture(t);
  const promptFile = join(root, "verify.txt");
  await writeFile(promptFile, "Verify {{workspace}}");
  const generate = async (extra) => {
    const path = execFileSync(
      "node",
      [
        "promptfoo/scripts/run-single.mjs",
        "design-shell",
        "--suite",
        "drupal-web",
        "--workspace",
        workspace,
        "--output",
        join(root, "report.json"),
        "--config-only",
        ...extra,
      ],
      { encoding: "utf8" },
    ).trim();
    return yaml.load(await readFile(path, "utf8"));
  };
  const main = await generate([]);
  assert.equal(main.tests[0].vars.case, "design-shell");
  assert.equal(main.providers[0].config.timeout, 3600000);
  assert.equal(main.providers[0].config.model, "gpt-5.6-luna");
  const claude = await generate([
    "--provider",
    "claude",
    "--storybook-port",
    "41201",
  ]);
  assert.equal(claude.providers[0].config.model, "claude-opus-5");
  assert.match(claude.providers[0].id, /claude-cli\.mjs$/);
  assert.equal(claude.tests[0].vars.storybook_port, 41201);
  const automaticVerify = yaml.load(
    await readFile(claude.tags.verify_config, "utf8"),
  );
  assert.match(automaticVerify.providers[0].id, /claude-cli\.mjs$/);
  assert.equal(automaticVerify.providers[0].config.model, "claude-opus-5");
  assert.equal(automaticVerify.tests[0].vars.suite, undefined);
  const prepared = await generate([
    "--provider",
    "claude",
    "--prepared-workspace",
  ]);
  assert.deepEqual(prepared.tests[0].vars, { workspace });
  const verify = await generate([
    "--phase",
    "verify",
    "--prompt-file",
    promptFile,
    "--validate",
    "verify-'quoted",
  ]);
  assert.deepEqual(verify.tests[0].vars, { workspace });
  assert.notEqual(
    main.providers[0].config.evidenceDir,
    verify.providers[0].config.evidenceDir,
  );
  const expression = verify.tests[0].assert[0].value;
  assert.equal(
    new Function("output", `return ${expression}`)({
      completedWorkflows: { a: { definition: { id: "verify-'quoted" } } },
    }),
    true,
  );
});

for (const cli of ["codex", "claude", "grok"])
  test(`real Promptfoo loads ${cli} and verifies without resetting the workspace`, async (t) => {
    const { root, workspace, workflow, stub } = await fixture(t);
    const events =
      cli === "codex"
        ? completed
        : cli === "claude"
          ? claudeCompleted
          : [
              {
                type: "assistant",
                parent_tool_use_id: null,
                message: { id: "msg_0", usage: claudeCompleted[0].usage },
              },
              ...claudeCompleted,
            ];
    await stub(
      `if (process.env.DESIGNBOOK_PROMPTFOO_DRIVER !== "1") process.exit(2);\n${emit(events)}`,
      cli,
    );
    await workflow("archive", "verification", "design-verify", "completed", {
      outtake: measuredTask(0, true),
    });
    const marker = join(workspace, "main-artifact.txt");
    await writeFile(marker, "preserve");
    const promptFile = join(root, "verify.txt");
    await writeFile(promptFile, "Verify this workspace");
    const report = join(root, "report.json");
    execFileSync(
      "node",
      [
        "promptfoo/scripts/run-single.mjs",
        "design-shell",
        "--provider",
        cli,
        "--suite",
        "drupal-web",
        "--workspace",
        workspace,
        "--output",
        report,
        "--phase",
        "verify",
        "--prompt-file",
        promptFile,
        "--no-progress-bar",
        "--history",
        join(root, "history.csv"),
      ],
      {
        encoding: "utf8",
        timeout: 60000,
        env: {
          ...process.env,
          PROMPTFOO_DISABLE_TELEMETRY: "1",
          PROMPTFOO_CONFIG_DIR: join(root, "promptfoo-state"),
        },
      },
    );
    const results = JSON.parse(await readFile(report, "utf8"));
    assert.equal(results.results.stats.successes, 1);
    assert.equal(results.results.stats.failures, 0);
    assert.equal(await readFile(marker, "utf8"), "preserve");
    const response = results.results.results[0].response;
    assert.equal(response.output.usage.input_tokens, 100);
    assert.equal(response.output.cli, cli);
    assert.equal(response.tokenUsage.total, 110);
    const history = await readFile(join(root, "history.csv"), "utf8");
    assert.match(history, /input_tokens,cached_input_tokens/);
    assert.match(history, /"100","80","20","10","4","110"/);
    assert.match(history, /"0","1","1","0","1",/);
  });

test("Claude usage requires a successful terminal result and complete native counters", async () => {
  const { claudeRuntime } = await import("../providers/claude-cli.mjs");
  assert.throws(() => claudeRuntime.parse([]), /missing result/);
  assert.throws(
    () =>
      claudeRuntime.parse([
        { type: "result", subtype: "error_max_turns", is_error: true },
      ]),
    /did not complete/,
  );
  const event = structuredClone(claudeCompleted[0]);
  delete event.usage.cache_creation_input_tokens;
  assert.throws(
    () => claudeRuntime.parse([event]),
    /invalid Claude token usage/,
  );
  const valid = structuredClone(claudeCompleted[0]);
  delete valid.usage.output_tokens_details;
  assert.equal(
    claudeRuntime.parse([valid]).usage.reasoning_output_tokens,
    undefined,
  );
  assert.equal(
    claudeRuntime.parse(claudeCompleted).usage.cache_write_input_tokens,
    10,
  );
});

test("missing or changed definition snapshots fail the integrity gate", async (t) => {
  const { provider, workspace, workflow } = await fixture(t);
  await workflow("archive", "main", "vision", "completed");
  assert.equal(
    (await provider.collectArtifacts(workspace)).definitionUnchanged,
    true,
  );
  const before = join(
    workspace,
    "designbook/workflows/archive/main/definition-before.yml",
  );
  await writeFile(before, "id: altered");
  assert.equal(
    (await provider.collectArtifacts(workspace)).definitionUnchanged,
    false,
  );
  await rm(before);
  const missing = await provider.collectArtifacts(workspace);
  assert.equal(missing.definitionUnchanged, false);
  assert.equal(missing.definitionErrors.length, 1);
});

test("missing token measurements are not reported as zero", async (t) => {
  const { provider, workspace, stub } = await fixture(t);
  await stub(emit([{ type: "turn.completed", usage: {} }]));
  const result = await provider.callApi("Unknown usage", {
    vars: { workspace },
  });
  assert.match(result.error, /invalid Codex token usage/);
  assert.equal(result.tokenUsage, undefined);
});

test("CSV history appends concurrent runs and keeps missing measurements empty", async (t) => {
  const { root } = await fixture(t);
  const { afterAll } = await import("../extensions/result-history.mjs");
  const csv = join(root, "results.csv");
  const context = {
    config: {
      tags: {
        history_csv: csv,
        suite: 'a,"suite',
        case: "vision",
        phase: "main",
      },
    },
  };
  await Promise.all([
    afterAll({
      ...context,
      evalId: "first",
      results: [
        { success: true, response: { output: { usage: completed[1].usage } } },
      ],
    }),
    afterAll({
      ...context,
      evalId: "failed",
      results: [{ success: false, error: "timeout" }],
    }),
  ]);
  const rows = (await readFile(csv, "utf8")).trim().split("\n");
  assert.equal(rows.length, 3);
  assert.equal(rows.filter((row) => row.startsWith("timestamp,")).length, 1);
  assert.match(rows.join("\n"), /"a,""suite"/);
  const failed = rows.find((row) => row.includes('"failed"'));
  assert.match(failed, /"fail","0","0","","","","","",""/);
});

test("CSV retains measured usage and evidence for failed provider responses", async (t) => {
  const { root } = await fixture(t);
  const { afterAll } = await import("../extensions/result-history.mjs");
  const csv = join(root, "failure.csv");
  await afterAll({
    config: {
      tags: { history_csv: csv, cli: "codex", reasoning_effort: "medium" },
    },
    results: [
      {
        success: false,
        response: {
          error: "collection failed",
          metadata: {
            run: {
              usage: completed[1].usage,
              usageScope: "thread-tree",
              subagentCount: 0,
              evidenceDir: "raw-evidence",
            },
          },
        },
      },
    ],
  });
  const [header, row] = (await readFile(csv, "utf8")).trim().split("\n");
  const fields = Object.fromEntries(
    header.split(",").map((name, i) => [name, row.split(",")[i].slice(1, -1)]),
  );
  assert.equal(fields.status, "fail");
  assert.equal(fields.total_tokens, "110");
  assert.equal(fields.usage_source, "codex-native");
  assert.equal(fields.usage_scope, "thread-tree");
  assert.equal(fields.subagent_input_tokens, "0");
  assert.equal(fields.reasoning_effort, "medium");
  assert.equal(fields.evidence_dir, "raw-evidence");
});

test("snapshot helper preserves multiline instruction content and refuses overwrites", async (t) => {
  const { workspace, workflow } = await fixture(t);
  await workflow("changes", "main", "vision", "pending");
  const directory = join(workspace, "designbook/workflows/changes/main");
  const path = join(directory, "tasks.yml");
  const definition = {
    id: "vision",
    instructions: { content: "a:\n  b\n\nc:\n  d\n" },
  };
  await writeFile(path, yaml.dump({ definition }));
  await rm(join(directory, "definition-before.yml"));
  execFileSync("node", ["promptfoo/scripts/snapshot-definition.mjs", path]);
  assert.deepEqual(
    yaml.load(await readFile(join(directory, "definition-before.yml"), "utf8")),
    definition,
  );
  assert.throws(
    () =>
      execFileSync(
        "node",
        ["promptfoo/scripts/snapshot-definition.mjs", path],
        { stdio: "pipe" },
      ),
    /EEXIST/,
  );
});

function measuredTask(score, passed) {
  const measurement = {
    score,
    checks: [{ breakpoint: "sm", element: "header", score, passed }],
  };
  return {
    status: "done",
    results: {
      "score-report": {
        valid: true,
        value: {
          first_shot: measurement,
          final: measurement,
          delta: 0,
          tokens: { input: 999999, output: 999999 },
        },
      },
    },
  };
}

test("verification exports the selected measured score and rejects missing or inconsistent evidence", async (t) => {
  const { verificationMetrics, afterAll } =
    await import("../extensions/result-history.mjs");
  const { root } = await fixture(t);
  const output = {
    usage: completed[1].usage,
    completedWorkflows: {
      stale: { state: { tasks: { outtake: measuredTask(0, true) } } },
      selected: { state: { tasks: { outtake: measuredTask(3, false) } } },
    },
  };
  assert.deepEqual(verificationMetrics(output, "selected"), {
    score: 3,
    passed: 0,
    total: 1,
  });
  assert.deepEqual(verificationMetrics(output, "missing"), {});
  const task = output.completedWorkflows.selected.state.tasks.outtake;
  task.results["score-report"].valid = false;
  assert.deepEqual(verificationMetrics(output, "selected"), {});
  task.results["score-report"].valid = true;
  task.results["score-report"].value.final = { score: 0, checks: [] };
  assert.deepEqual(verificationMetrics(output, "selected"), {});
  task.results["score-report"].value.final = {
    score: 0,
    checks: [{ score: 3, passed: false }],
  };
  assert.deepEqual(verificationMetrics(output, "selected"), {});
  output.completedWorkflows.selected.state.tasks.outtake = measuredTask(
    3,
    false,
  );
  const csv = join(root, "verification.csv");
  await afterAll({
    evalId: "failed-visual",
    config: {
      tags: { history_csv: csv, workflow_id: "selected", phase: "verify" },
    },
    results: [{ success: false, response: { output } }],
  });
  const written = await readFile(csv, "utf8");
  assert.match(written, /"3","0","1","1","0",/);
  assert.match(written, /"100","80","20","10","4","110"/);
  assert.doesNotMatch(written, /999999/);
});

test("CSV exports per-check verification details and aggregates unequal report sizes", async (t) => {
  const { verificationDetails, afterAll } =
    await import("../extensions/result-history.mjs");
  const { root } = await fixture(t);
  const task = (story, differences) => {
    const checks = differences.map((diff, index) => ({
      breakpoint: index ? "xl" : "sm",
      element: 'region, "quoted"',
      score: diff > 0.3 ? 2 : 0,
      passed: diff <= 0.3,
      diff_percent: diff,
      critical: 0,
      major: diff > 0.3 ? 1 : 0,
      minor: 0,
    }));
    const final = {
      score: checks.reduce((sum, check) => sum + check.score, 0),
      checks,
    };
    return {
      status: "done",
      results: {
        "score-report": {
          valid: true,
          value: {
            story_id: story,
            reference_url: "https://reference.example/",
            threshold: 0.3,
            final,
            first_shot: final,
          },
        },
      },
    };
  };
  const output = {
    completedWorkflows: {
      selected: {
        state: {
          tasks: {
            a: task("first", [0.1]),
            b: task("second", [0.2, 0.3, 0.4]),
          },
        },
      },
    },
  };
  const details = verificationDetails(output, "selected");
  assert.equal(details.verify_avg_diff_ratio, 0.25);
  assert.equal(details.verify_max_diff_ratio, 0.4);
  assert.equal(details.verify_checks_failed, 1);
  assert.equal(details.verify_pass_rate, 0.75);
  assert.equal(details.verify_issues_critical, 0);
  assert.equal(details.verify_issues_major, 1);
  assert.equal(details.verify_issues_minor, 0);
  assert.equal(details.verify_initial_score, 2);
  assert.equal(details.verify_score_delta, 0);
  assert.deepEqual(JSON.parse(details.verify_story_ids), ["first", "second"]);
  assert.deepEqual(JSON.parse(details.verify_reference_urls), [
    "https://reference.example/",
  ]);
  assert.deepEqual(JSON.parse(details.verify_breakpoints), ["sm", "xl"]);
  assert.equal(JSON.parse(details.verify_checks_json).length, 4);
  assert.deepEqual(JSON.parse(details.verify_thresholds_json), [
    { story_id: "first", threshold_ratio: 0.3 },
    { story_id: "second", threshold_ratio: 0.3 },
  ]);
  const csv = join(root, "details.csv");
  await afterAll({
    evalId: "details",
    config: { tags: { history_csv: csv, workflow_id: "selected" } },
    results: [{ success: false, response: { output } }],
  });
  const [header, row] = (await readFile(csv, "utf8")).trim().split("\n");
  const cells = [...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map((match) =>
    match[1].replaceAll('""', '"'),
  );
  assert.equal(cells.length, header.split(",").length);
  assert.deepEqual(
    JSON.parse(cells[header.split(",").indexOf("verify_checks_json")]),
    JSON.parse(details.verify_checks_json),
  );

  const report =
    output.completedWorkflows.selected.state.tasks.a.results["score-report"]
      .value;
  delete report.final.checks[0].diff_percent;
  delete report.final.checks[0].critical;
  delete report.first_shot;
  const missing = verificationDetails(output, "selected");
  assert.equal(missing.verify_avg_diff_ratio, undefined);
  assert.equal(missing.verify_max_diff_ratio, undefined);
  assert.equal(missing.verify_issues_critical, undefined);
  assert.equal(missing.verify_initial_score, undefined);
  assert.equal(missing.verify_score_delta, undefined);
  assert.deepEqual(verificationDetails(output, "missing"), {});
  output.completedWorkflows.selected.state.tasks.a.results[
    "score-report"
  ].valid = false;
  assert.deepEqual(verificationDetails(output, "selected"), {});
});

test("verification assertion rejects visual failures and changes to main artifacts", async (t) => {
  const { default: verifyResult } =
    await import("../extensions/verify-result.mjs");
  const { root } = await fixture(t);
  const mainReport = join(root, "main.json");
  await writeFile(
    mainReport,
    JSON.stringify({
      results: {
        results: [
          {
            response: { output: { fileHashes: { "shell.twig": "original" } } },
          },
        ],
      },
    }),
  );
  const context = { vars: { workflow_id: "verify", main_report: mainReport } };
  const output = {
    completedWorkflows: {
      verify: { state: { tasks: { outtake: measuredTask(0, true) } } },
    },
    fileHashes: { "shell.twig": "original" },
  };
  assert.equal(verifyResult(output, context).pass, true);
  output.fileHashes["shell.twig"] = "repaired";
  assert.equal(verifyResult(output, context).pass, false);
  output.fileHashes["shell.twig"] = "original";
  output.completedWorkflows.verify.state.tasks.outtake = measuredTask(2, false);
  assert.equal(verifyResult(output, context).pass, false);
  output.completedWorkflows.verify.state.tasks = {};
  assert.equal(verifyResult(output, context).pass, false);
});

test("shell, entity and screen pipelines always invoke verification and fails if either phase fails", async (t) => {
  const { root, workspace } = await fixture(t);
  const bin = join(root, "bin");
  await mkdir(bin);
  const calls = join(root, "calls.jsonl");
  await writeFile(
    join(bin, "pnpm"),
    `#!/usr/bin/env node
const fs = require('node:fs');
const yaml = require(${JSON.stringify(resolve("node_modules/js-yaml"))});
const config = yaml.load(fs.readFileSync(process.argv[process.argv.indexOf('-c') + 1], 'utf8'));
fs.appendFileSync(${JSON.stringify(calls)}, JSON.stringify(config) + '\\n');
fs.writeFileSync(config.outputPath, '{}');
process.exitCode = Number(config.tags.phase === 'main' ? process.env.TEST_MAIN_EXIT : process.env.TEST_VERIFY_EXIT);
`,
    { mode: 0o755 },
  );
  for (const [caseName, mainExit, verifyExit] of [
    ["design-shell", 0, 0],
    ["design-shell", 100, 0],
    ["design-shell", 0, 100],
    ["design-entity", 0, 0],
    ["design-screen", 0, 0],
  ]) {
    const report = join(
      root,
      `${caseName}-${mainExit}-${verifyExit}`,
      "main.json",
    );
    const child = spawnSync(
      "node",
      [
        "promptfoo/scripts/run-single.mjs",
        caseName,
        "--suite",
        "drupal-web",
        "--workspace",
        workspace,
        "--output",
        report,
      ],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          TEST_MAIN_EXIT: String(mainExit),
          TEST_VERIFY_EXIT: String(verifyExit),
        },
      },
    );
    assert.equal(child.status, mainExit || verifyExit ? 1 : 0, child.stderr);
  }
  const configs = (await readFile(calls, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.deepEqual(
    configs.map((c) => c.tags.phase),
    [
      "main",
      "verify",
      "main",
      "verify",
      "main",
      "verify",
      "main",
      "verify",
      "main",
      "verify",
    ],
  );
  for (let index = 0; index < configs.length; index += 2) {
    const main = configs[index],
      verify = configs[index + 1];
    assert.equal(main.tags.run_id, verify.tags.run_id);
    assert.equal(verify.tags.workflow_id, "design-verify");
    assert.equal(verify.tests[0].vars.workspace, workspace);
    assert.equal(verify.tests[0].vars.suite, undefined);
    assert.equal(verify.tests[0].vars.case, undefined);
    assert.equal(verify.tests[0].vars.main_report, main.outputPath);
    if (main.tags.case === "design-shell")
      assert.match(verify.prompts[0], /threshold 3%/);
    assert.match(verify.prompts[0], /original reference/);
  }
});

test("pending documents at noncanonical paths cannot disappear from workflow gates", async (t) => {
  const { provider, workspace, workflow } = await fixture(t);
  await workflow("changes", "completed", "main", "completed");
  const root = join(workspace, "designbook/workflows");
  await writeFile(
    join(root, "changes/initial-attempt"),
    yaml.dump({
      definition: { id: "main" },
      state: { status: "pending", tasks: {} },
    }),
  );
  await mkdir(join(root, "attempts"));
  await writeFile(
    join(root, "attempts/blocked.yml"),
    yaml.dump({
      definition: { id: "blocked" },
      state: { status: "blocked", tasks: {} },
    }),
  );
  await writeFile(join(root, "notes.md"), "Not a workflow");
  const result = await provider.collectArtifacts(workspace);
  assert.equal(result.definitionUnchanged, false);
  assert.equal(result.pendingWorkflows.blocked.state.status, "blocked");
  assert.ok(
    result.workflowErrors.some((error) =>
      error.error.includes("Duplicate workflow id: main"),
    ),
  );
});

test("nested runner refuses before provisioning or writing reports", async (t) => {
  const { root, workspace } = await fixture(t);
  const marker = join(workspace, "preserve.txt");
  await writeFile(marker, "active fixture");
  const result = spawnSync(
    process.execPath,
    [
      "promptfoo/scripts/run-single.mjs",
      "design-shell",
      "--workspace",
      workspace,
      "--output",
      join(root, "nested.json"),
    ],
    {
      encoding: "utf8",
      env: { ...process.env, DESIGNBOOK_PROMPTFOO_DRIVER: "1" },
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Already inside the Promptfoo CLI driver/);
  assert.equal(await readFile(marker, "utf8"), "active fixture");
  await assert.rejects(readFile(join(root, "nested.json")), { code: "ENOENT" });
});
