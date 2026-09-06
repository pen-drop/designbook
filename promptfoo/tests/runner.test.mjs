import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import Provider from "../providers/codex-cli.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "promptfoo-contract-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const workspace = join(root, "workspace");
  await mkdir(workspace);
  const provider = new Provider({
    config: { evidenceDir: join(root, "evidence"), timeout: 5000 },
  });
  const workflow = async (folder, directory, id, status) => {
    const path = join(workspace, "designbook/workflows", folder, directory);
    await mkdir(path, { recursive: true });
    await writeFile(
      join(path, "tasks.yml"),
      yaml.dump({ definition: { id }, state: { status } }),
    );
    await writeFile(join(path, "definition-before.yml"), yaml.dump({ id }));
  };
  const stub = async (body) => {
    const bin = join(root, "bin");
    await mkdir(bin, { recursive: true });
    await writeFile(join(bin, "codex"), `#!/usr/bin/env node\n${body}\n`, {
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

test("real Promptfoo loads the Codex class and verifies without resetting the workspace", async (t) => {
  const { root, workspace, workflow, stub } = await fixture(t);
  await stub(emit(completed));
  await workflow("archive", "verification", "design-verify", "completed");
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
  assert.equal(response.tokenUsage.total, 110);
  const history = await readFile(join(root, "history.csv"), "utf8");
  assert.match(history, /input_tokens,cached_input_tokens/);
  assert.match(history, /"100","80","20","10","4","110"/);
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
