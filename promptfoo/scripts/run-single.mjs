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
import { runStepPipeline } from "./step-pipeline.mjs";

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
      "executor-provider",
      "executor-model",
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
const designIntake =
  opts.phase === "main" &&
  /^(design-shell|design-entity|design-screen|design-section|design-component)(?:-|$)/.test(
    caseDoc.workflow || opts.case,
  );
const planner = designIntake ? base.modelRoles.planner : undefined;
const cli = opts.provider || planner?.provider || "codex";
if (!["codex", "claude", "grok"].includes(cli))
  throw new Error("provider must be codex, claude or grok");
const model =
  opts.model ||
  (!opts.provider && planner?.model) ||
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
const splitExecution =
  designIntake || Boolean(opts["executor-provider"] || opts["executor-model"]);
if (designIntake && !opts["executor-provider"] && !opts["executor-model"]) {
  opts["executor-provider"] = base.modelRoles.executor.provider;
  opts["executor-model"] = base.modelRoles.executor.model;
}
if (splitExecution && (!opts["executor-provider"] || !opts["executor-model"]))
  throw new Error(
    "Specify both --executor-provider and --executor-model for separate step execution",
  );
if (
  splitExecution &&
  !["codex", "claude", "grok"].includes(opts["executor-provider"])
)
  throw new Error("executor-provider must be codex, claude or grok");
if (splitExecution && (!designIntake || caseDoc.repeat || caseDoc.evidence))
  throw new Error(
    "Separate step execution currently requires a nonrepeated design case without a case evidence manifest",
  );
const executor = splitExecution
  ? { cli: opts["executor-provider"], model: opts["executor-model"] }
  : undefined;
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
const requestPrompt = prompt;
prompt +=
  caseDoc.repeat && opts.phase === "main"
    ? `\nUse distinct saved definition IDs ${JSON.stringify(workflowId + "-1")} through ${JSON.stringify(workflowId + "-" + caseDoc.repeat.count)} for the ordered repetitions in this single evaluation. Setup occurs once.`
    : `\nUse ${JSON.stringify(workflowId)} as the primary saved workflow definition.id for this phase.`;
prompt +=
  "\nYou are the execution driver already running inside Promptfoo in a provisioned workspace. Execute the domain intake and saved workflow directly. Read only the Case evidence and scoring section of the tester resource; do not invoke debo-test run, the Promptfoo runner or workspace setup again.\n" +
  "Use this fresh workspace’s fixture inputs and copied skills. Prior test workspaces, saved definitions, generated artifacts and reports are not inputs; do not read or copy them. Repository test helpers and this case file remain available.\n" +
  "Run all Designbook CLI commands from the workspace root with its designbook.config.yml. Save the effective workflow discover catalogue to JSON and pass that file as --catalogue to both workflow validate and workflow create; copied instruction bodies and schemas must match it exactly.\n" +
  `After workflow create returns the saved tasks.yml path, run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} <saved-tasks.yml> before execute-workflow. This helper saves the unchanged definition beside tasks.yml. ` +
  "Execute the saved path through execute-workflow. Report every saved path, failure, retry and unanswered input. " +
  "If required inputs are missing, record the failure and end the run; this test has no interactive user.";
if (caseDoc.evidence && opts.phase === "main") {
  prompt += `\nFollow the Case evidence and scoring contract in ${JSON.stringify(join(repo, ".agents/skills/designbook-test/skills/run/resources/run.md"))}. Save ${JSON.stringify(join(workspace, "case-runs.json"))} as a JSON array in execution order, with one entry per saved run: {workflow, definitionBefore, evidence, artifactSnapshot}, each an absolute file path. Each evidence file contains the actual build output and browser observations. Capture each artifact snapshot before the next repetition; preserve the fixture git baseline. Include every attempt. The Promptfoo provider reads this manifest and uses the shared scorer to inspect artifacts and evaluate the case assertions.`;
}
const intakeOutput = join(runDir, "intake.json");
const intakeHandoff = join(runDir, "intake-handoff.json");
if (designIntake)
  prompt += `\nThe first intake part is already complete for this same run. Read the compact validated handoff at ${JSON.stringify(intakeHandoff)} and use its exact subjects, reference selectors, planned story selectors and breakpoints. Reuse the effective catalogue at the handoff catalogue path instead of rediscovering unchanged context. Its catalogue and reference files are frozen inputs: reuse them without modifying them. Continue with complete workflow definition authoring and execute-workflow in this invocation. The handoff's selector table has already been presented to the user; complete the remaining work now.`;
const providers = base.providers.map((p) => ({
  ...p,
  id: `file://${join(repo, "promptfoo/providers", `${cli}-cli.mjs`)}`,
  label: model,
  config: {
    ...p.config,
    model,
    requireDesignIntake: designIntake,
    ...(designIntake ? { intakeHandoffInput: intakeHandoff } : {}),
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
if (designIntake)
  assertions.push({
    type: "javascript",
    value: `file://${join(repo, "promptfoo/extensions/design-intake.mjs")}`,
  });
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
    ...(executor
      ? {
          execution_mode: "separate-steps",
          step_prompt_max_bytes: String(base.stepPromptMaxBytes),
          planner_cli: cli,
          planner_model: model,
          executor_cli: executor.cli,
          executor_model: executor.model,
        }
      : {}),
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
let intakeConfigPath;
if (designIntake) {
  intakeConfigPath = join(runDir, "intake-promptfooconfig.yaml");
  const intakeConfig = {
    ...config,
    description: `${opts.suite}/${opts.case}: intake`,
    outputPath: intakeOutput,
    tags: {
      ...config.tags,
      phase: "intake",
      report: relative(repo, intakeOutput),
    },
    prompts: [
      `This is the first, intake-only part of the design pipeline. Load the requested design intake, complete reference analysis and select concrete comparison subjects/selectors at all requested breakpoints. Save the effective workflow discover catalogue to ${join(workspace, ".designbook-intake/catalogue.json")} (create the directory first). Reuse that catalogue during intake. Complete and inspect the reference evidence in the workspace. Store each declared baseline PNG beside its reference meta.yml using the discovered element/state/breakpoint filename contract; ensure the metadata binds every presented subject and selector. Before presenting, validate every reference with reference validate --reference <folder> --contract <json>: write the contract using the exact effective extract-reference output schemas reference/reference_extract and block schemas as definitions. Correct every CLI finding now; enriched extracts, package decisions, dependency files and every capture cell must be complete before the handoff freezes them. Present your final intake as a Markdown table with exactly these columns: | Subject | Reference selector | Story selector | Breakpoints | Evidence |. Use exact element IDs, concrete reference CSS selectors (full page for an empty selector, no reference for text-only work), concrete story CSS selectors (prefix planned: for new DOM), comma-separated breakpoint IDs, and screenshot paths plus observed subject content as evidence. Resolve ambiguous or wrong subjects. The subsequent execution phase uses this table and the frozen reference artifacts.\n\nCase request:\n${requestPrompt}\n\nFor this invocation complete only intake. End after presenting the complete table. Create no saved workflow and execute no design tasks; the next pipeline part performs those using your handoff. Do not run fixture setup or Promptfoo yourself. Use this fresh workspace's inputs and copied skills only; earlier workspaces and reports are not inputs.`,
    ],
    providers: providers.map((provider) => ({
      ...provider,
      config: {
        ...provider.config,
        intakeOnly: true,
        intakeCatalogue: join(workspace, ".designbook-intake/catalogue.json"),
        intakeHandoffInput: undefined,
        intakeHandoffOutput: intakeHandoff,
        caseFile: undefined,
        evidenceDir: join(runDir, "intake-evidence"),
      },
    })),
    tests: [
      {
        vars: { ...config.tests[0].vars },
        assert: [
          {
            type: "javascript",
            value: `file://${join(repo, "promptfoo/extensions/design-intake.mjs")}`,
          },
          {
            type: "javascript",
            value: "output.usage != null && output.workflowErrors.length === 0",
          },
        ],
      },
    ],
  };
  // Only intake provisions fixtures. Execution preserves its workspace and evidence.
  delete config.tests[0].vars.suite;
  delete config.tests[0].vars.case;
  delete config.tests[0].vars.storybook_port;
  config.tags.intake_config = intakeConfigPath;
  config.tags.intake_report = intakeOutput;
  writeFileSync(
    intakeConfigPath,
    yaml.dump(intakeConfig, { lineWidth: 120, noRefs: true }),
  );
}
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
    `Use "design-verify" as the saved verification definition.id. Save the effective verification discover catalogue to JSON and pass it as --catalogue to workflow validate and workflow create. After workflow create, run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} <saved-tasks.yml>, then execute-workflow. Preserve the complete score-report and capture/comparison evidence. Return the check findings; any repair belongs to a separate test run and must not mutate these main artifacts.\n` +
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
        requireDesignIntake: false,
        intakeHandoffInput: undefined,
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
  const intakeStatus = intakeConfigPath ? evaluate(intakeConfigPath) : 0;
  let mainStatus = null;
  let stepPipeline;
  let pipelineError;
  if (intakeStatus === 0) {
    if (executor) {
      try {
        stepPipeline = runStepPipeline({
          repo,
          workspace,
          runDir,
          base: config,
          requestPrompt,
          intakeHandoff,
          executor,
          evaluate,
        });
        mainStatus = stepPipeline.mainStatus;
        pipelineError = stepPipeline.error;
      } catch (error) {
        pipelineError = error.message;
        console.error(`Step pipeline failed: ${pipelineError}`);
      }
    } else mainStatus = evaluate(configPath);
  }
  // Verification remains a separate attempt, including when earlier design parts fail.
  const verifyStatus = verifyConfig ? evaluate(verifyConfigPath) : null;
  const passed =
    intakeStatus === 0 &&
    mainStatus === 0 &&
    !pipelineError &&
    (!executor || stepPipeline?.plan.exitCode === 0) &&
    (!verifyConfig || verifyStatus === 0);
  writeFileSync(
    join(runDir, "pipeline.json"),
    JSON.stringify(
      {
        passed,
        ...(intakeConfigPath
          ? { intake: { report: intakeOutput, exitCode: intakeStatus } }
          : {}),
        ...(stepPipeline
          ? {
              plan: stepPipeline.plan,
              steps: stepPipeline.steps,
              workflowPath: stepPipeline.workflowPath,
            }
          : {}),
        ...(pipelineError ? { error: pipelineError } : {}),
        main: !existsSync(output)
          ? {
              skipped: true,
              reason:
                intakeStatus !== 0
                  ? "Intake validation failed"
                  : pipelineError ||
                    "Planning or an earlier execution step failed",
            }
          : { report: output, exitCode: mainStatus },
        ...(verifyConfig
          ? {
              verify: {
                report: verifyConfig.outputPath,
                exitCode: verifyStatus,
              },
            }
          : {}),
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(passed ? 0 : 1);
}
