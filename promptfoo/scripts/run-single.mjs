#!/usr/bin/env node
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";
import yaml from "js-yaml";

if (process.env.DESIGNBOOK_PROMPTFOO_DRIVER === "1")
  throw new Error(
    "Already inside the Promptfoo CLI driver: execute the domain intake and saved workflow; nested tester runs would reset the active workspace.",
  );

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const opts = { suite: "drupal-petshop", phase: "main" };
const extra = [];
for (let i = 0; i < args.length; i++) {
  const key = args[i].replace(/^--/, "");
  if (
    [
      "suite",
      "workspace",
      "output",
      "phase",
      "prompt-file",
      "validate",
      "history",
      "provider",
      "model",
      "storybook-port",
    ].includes(key)
  ) {
    if (!args[i + 1] || args[i + 1].startsWith("--"))
      throw new Error(`Missing value for --${key}`);
    opts[key] = args[++i];
  } else if (
    ["--list", "--config-only", "--prepared-workspace"].includes(args[i])
  )
    opts[key] = true;
  else if (!opts.case && !args[i].startsWith("-")) opts.case = args[i];
  else extra.push(args[i]);
}
const cases = join(repo, "fixtures", opts.suite, "cases");
if (opts.list || !opts.case) {
  console.log(
    readdirSync(cases)
      .filter((f) => f.endsWith(".yaml"))
      .map((f) => f.slice(0, -5))
      .join("\n"),
  );
  process.exit(0);
}
if (!["main", "verify"].includes(opts.phase))
  throw new Error("phase must be main or verify");
if (opts["prepared-workspace"] && !opts.workspace)
  throw new Error("prepared-workspace requires an explicit --workspace");
if (opts.phase === "verify" && (!opts.workspace || !opts["prompt-file"])) {
  throw new Error(
    "Verification needs --workspace and --prompt-file, and preserves the main artifacts",
  );
}
const caseDoc = yaml.load(
  readFileSync(join(cases, `${opts.case}.yaml`), "utf8"),
);
const base = yaml.load(
  readFileSync(join(repo, "promptfoo/configs/base.yaml"), "utf8"),
);
const cli = opts.provider || "codex";
if (!["codex", "claude", "grok"].includes(cli))
  throw new Error("provider must be codex, claude or grok");
const model =
  opts.model ||
  (cli === "grok"
    ? "grok-4.6"
    : cli === "claude"
      ? "claude-opus-5"
      : base.providers[0].config.model);
const storybookPort =
  opts["storybook-port"] === undefined
    ? undefined
    : Number(opts["storybook-port"]);
if (
  storybookPort !== undefined &&
  (!Number.isInteger(storybookPort) ||
    storybookPort < 1024 ||
    storybookPort > 65535)
)
  throw new Error("storybook-port must be an integer from 1024 to 65535");
const requestedOutput = resolve(
  repo,
  opts.output ||
    `promptfoo/reports/${opts.suite}-${opts.case}-${opts.phase}.json`,
);
mkdirSync(dirname(requestedOutput), { recursive: true });
const runDir = mkdtempSync(
  join(dirname(requestedOutput), `${opts.case}-${opts.phase}-`),
);
const output = opts.output ? requestedOutput : join(runDir, "report.json");
if (existsSync(output))
  throw new Error(
    `Report already exists: ${output}; choose a fresh --output path`,
  );
const workspace = resolve(
  repo,
  opts.workspace || `promptfoo/workspaces/${opts.suite}-${opts.case}`,
);
let prompt = opts["prompt-file"]
  ? readFileSync(resolve(repo, opts["prompt-file"]), "utf8")
  : caseDoc.prompt;
if (typeof prompt !== "string" || !prompt.trim())
  throw new Error("Case needs a nonempty prompt");
const workflowId =
  opts.phase === "main"
    ? caseDoc.workflow || opts.case
    : opts.validate || "design-verify";
prompt = prompt.replaceAll("{{workspace}}", workspace);
prompt +=
  caseDoc.repeat && opts.phase === "main"
    ? `\nUse distinct saved definition IDs ${JSON.stringify(workflowId + "-1")} through ${JSON.stringify(workflowId + "-" + caseDoc.repeat.count)} for the ordered repetitions in this single evaluation. Setup occurs once.`
    : `\nUse ${JSON.stringify(workflowId)} as the primary saved workflow definition.id for this phase.`;
prompt +=
  "\nYou are the execution driver already running inside Promptfoo in a provisioned workspace. Execute the domain intake and saved workflow directly. Read only the Case evidence and scoring section of the tester resource; do not invoke debo-test run, the Promptfoo runner or workspace setup again.\n" +
  "Use this fresh workspace’s fixture inputs and copied skills. Prior test workspaces, saved definitions, generated artifacts and reports are not inputs; do not read or copy them. Repository test helpers and this case file remain available.\n" +
  "Run all Designbook CLI commands from the workspace root with its designbook.config.yml.\n" +
  `After workflow create returns the saved tasks.yml path, run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} <saved-tasks.yml> before execute-workflow. This helper saves the unchanged definition beside tasks.yml. ` +
  "Execute the saved path through execute-workflow. Report every saved path, failure, retry and unanswered input. " +
  "If required inputs are missing, record the failure and end the run; this test has no interactive user.";
if (caseDoc.evidence && opts.phase === "main") {
  prompt += `\nFollow the Case evidence and scoring contract in ${JSON.stringify(join(repo, ".agents/skills/designbook-test/skills/run/resources/run.md"))}. Save ${JSON.stringify(join(workspace, "case-runs.json"))} as a JSON array in execution order, with one entry per saved run: {workflow, definitionBefore, evidence, artifactSnapshot}, each an absolute file path. Each evidence file contains the actual build output and browser observations. Capture each artifact snapshot before the next repetition; preserve the fixture git baseline. Include every attempt. The Promptfoo provider reads this manifest and uses the shared scorer to inspect artifacts and evaluate the case assertions.`;
}
const providers = base.providers.map((p) => ({
  ...p,
  id: `file://${join(repo, "promptfoo/providers", `${cli}-cli.mjs`)}`,
  label: model,
  config: {
    ...p.config,
    model,
    evidenceDir: join(runDir, "evidence"),
    definitionSnapshotDir: join(runDir, "definitions"),
    ...(caseDoc.evidence && opts.phase === "main"
      ? { caseFile: join(cases, `${opts.case}.yaml`) }
      : {}),
  },
}));
const assertions =
  opts.phase === "main"
    ? caseDoc.evidence
      ? [
          ...(caseDoc.assert || []).filter(
            (assertion) => assertion.type !== "javascript",
          ),
          {
            type: "javascript",
            value: `file://${join(repo, "promptfoo/extensions/case-result.mjs")}`,
          },
        ]
      : [...(caseDoc.assert || [])]
    : [
        {
          type: "javascript",
          value: `Object.values(output.completedWorkflows).some(w => w.definition.id === ${JSON.stringify(workflowId)})`,
        },
      ];
assertions.push(
  { type: "javascript", value: "output.workflowErrors.length === 0" },
  {
    type: "javascript",
    value: "Object.keys(output.pendingWorkflows).length === 0",
  },
  { type: "javascript", value: "output.usage != null" },
  { type: "javascript", value: "output.definitionUnchanged === true" },
);
const config = {
  description: `${opts.suite}/${opts.case}: ${opts.phase}`,
  outputPath: output,
  extensions: [
    `file://${join(repo, "promptfoo/extensions/result-history.mjs")}:afterAll`,
  ],
  tags: {
    suite: opts.suite,
    case: opts.case,
    phase: opts.phase,
    workflow_id: workflowId,
    run_id: relative(repo, dirname(output)),
    history_csv: resolve(repo, opts.history || "promptfoo/results.csv"),
    report: relative(repo, output),
    model: providers[0].config.model,
    cli,
    reasoning_effort:
      cli === "codex"
        ? providers[0].config.reasoningEffort || "medium"
        : "cli-default",
    git_commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repo,
      encoding: "utf8",
    }).trim(),
    source_dirty: String(
      Boolean(
        execFileSync(
          "git",
          [
            "status",
            "--porcelain",
            "--",
            ".agents/skills",
            "promptfoo/providers",
            "promptfoo/scripts",
            "promptfoo/extensions",
            "promptfoo/configs",
            "packages",
            "scripts",
            "fixtures",
          ],
          { cwd: repo, encoding: "utf8" },
        ).trim(),
      ),
    ),
  },
  prompts: [prompt],
  providers,
  evaluateOptions: { ...base.evaluateOptions, maxConcurrency: 1 },
  tests: [
    {
      vars:
        opts.phase === "main" && !opts["prepared-workspace"]
          ? {
              suite: opts.suite,
              case: opts.case,
              workspace,
              ...(storybookPort === undefined
                ? {}
                : { storybook_port: storybookPort }),
            }
          : { workspace },
      assert: assertions,
    },
  ],
};
if (caseDoc.evidence && opts.phase === "main")
  config.tests[0].vars.case_file = join(cases, `${opts.case}.yaml`);
const configPath = join(runDir, "promptfooconfig.yaml");
let verifyConfig;
let verifyConfigPath;
const designCase =
  /^(design-shell|design-entity|design-screen|design-section)(?:-|$)/.test(
    opts.case,
  );
if (opts.phase === "main" && designCase)
  assertions.push({
    type: "javascript",
    value: `file://${join(repo, "promptfoo/extensions/design-main-result.mjs")}`,
  });
if (
  opts.phase === "main" &&
  (caseDoc.verify || (designCase && caseDoc.validate !== "none"))
) {
  const verificationCase =
    caseDoc.verify ||
    opts.case
      .replace(/^design-section/, "design-screen")
      .replace(/^design-/, "design-verify-");
  const verificationCasePath = join(cases, `${verificationCase}.yaml`);
  const criteria = existsSync(verificationCasePath)
    ? yaml.load(readFileSync(verificationCasePath, "utf8")).prompt
    : "Run /debo design-verify against the design just produced, using the original reference, regions, breakpoints and thresholds from its saved inputs. Missing comparison inputs fail the check; never compare the generated design to itself.";
  const verifyOutput = join(dirname(output), "verify.json");
  if (output === verifyOutput || existsSync(verifyOutput))
    throw new Error(
      `Choose a fresh run directory; verification output is reserved: ${verifyOutput}`,
    );
  verifyConfigPath = join(runDir, "verify-promptfooconfig.yaml");
  const verifyPrompt =
    criteria.replaceAll("{{workspace}}", workspace) +
    `\nCheck the ACTUAL design created by the main workflow ${JSON.stringify(workflowId)} in this workspace. Keep its artifacts and fixtures. Do not import verification fixtures. Read that saved main definition for the original reference and targets; these take precedence over example stories/references in the criteria above. If the main run had no reference, fail with missing-reference evidence. Never substitute a different reference or compare output to itself.\n` +
    "Before capturing, confirm the produced scene exists and the Storybook server belongs to this workspace. Missing scenes, error pages or missing target selectors fail verification; preserve their evidence without grading them as rendered designs.\n" +
    `Use "design-verify" as the saved verification definition.id. After workflow create, run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} <saved-tasks.yml>, then execute-workflow. Preserve the complete score-report and capture/comparison evidence. Return the check findings; any repair belongs to a separate test run and must not mutate these main artifacts.\n` +
    "Run CLI commands from the workspace root. Missing inputs are failures; this test has no interactive user.";
  verifyConfig = {
    ...config,
    description: `${opts.suite}/${opts.case}: verify`,
    outputPath: verifyOutput,
    prompts: [verifyPrompt],
    providers: providers.map((provider) => ({
      ...provider,
      config: {
        ...provider.config,
        evidenceDir: join(runDir, "verify-evidence"),
        caseFile: undefined,
      },
    })),
    tags: {
      ...config.tags,
      phase: "verify",
      workflow_id: "design-verify",
      report: relative(repo, verifyOutput),
    },
    tests: [
      {
        vars: { workspace, workflow_id: "design-verify", main_report: output },
        assert: [
          {
            type: "javascript",
            value:
              "output.completedWorkflows['design-verify']?.state?.status === 'completed'",
          },
          {
            type: "javascript",
            value:
              "output.workflowErrors.length === 0 && Object.keys(output.pendingWorkflows).length === 0 && output.definitionUnchanged === true",
          },
          {
            type: "javascript",
            value: `file://${join(repo, "promptfoo/extensions/verify-result.mjs")}`,
          },
        ],
      },
    ],
  };
  config.tags.verify_config = verifyConfigPath;
  writeFileSync(
    verifyConfigPath,
    yaml.dump(verifyConfig, { lineWidth: 120, noRefs: true }),
  );
}
if (opts.phase === "verify" && workflowId === "design-verify") {
  config.tests[0].vars.workflow_id = workflowId;
  config.tests[0].assert.push({
    type: "javascript",
    value: `file://${join(repo, "promptfoo/extensions/verify-result.mjs")}`,
  });
}
writeFileSync(configPath, yaml.dump(config, { lineWidth: 120, noRefs: true }));
console.log(configPath);
if (!opts["config-only"]) {
  const evaluate = (path) => {
    const child = spawnSync(
      "pnpm",
      ["exec", "promptfoo", "eval", "-c", path, "--no-cache", ...extra],
      { cwd: repo, stdio: "inherit" },
    );
    if (child.error) throw child.error;
    return child.status ?? 1;
  };
  const mainStatus = evaluate(configPath);
  if (!verifyConfig) process.exit(mainStatus);
  // A failed main assertion still gets a separate verification attempt. Its
  // failure remains in the original report and in the combined exit status.
  const verifyStatus = evaluate(verifyConfigPath);
  const passed = mainStatus === 0 && verifyStatus === 0;
  writeFileSync(
    join(runDir, "pipeline.json"),
    JSON.stringify(
      {
        passed,
        main: { report: output, exitCode: mainStatus },
        verify: { report: verifyConfig.outputPath, exitCode: verifyStatus },
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(passed ? 0 : 1);
}
