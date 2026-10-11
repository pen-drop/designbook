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
import { runModelPipeline } from "./model-pipeline.mjs";

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
// Separate-step (planner + fresh-executor-per-step) mode only applies to a
// nonrepeated design case without a case evidence manifest (see
// debo-test-run/resources/run.md). A design-intake case that declares
// `evidence` always uses the combined single-call path below, even though
// designIntake itself stays true (it still selects the planner model role).
const splitExecution =
  (designIntake && !caseDoc.repeat && !caseDoc.evidence) ||
  Boolean(opts["executor-provider"] || opts["executor-model"]);
if (
  designIntake &&
  !caseDoc.repeat &&
  !caseDoc.evidence &&
  !opts["executor-provider"] &&
  !opts["executor-model"]
) {
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
  "\nYou are already inside Promptfoo in a provisioned workspace. Read the complete SKILL.md of the installed domain skill requested by this case before doing the work. Invoke that skill and follow its referenced instructions; the skill owns intake, planning and execution. Do not replace it with a hand-written workflow or CLI recipe.\n" +
  "Use this workspace's inputs and copied skills, including outputs of earlier cases when the workspace was explicitly prepared. Do not read or copy other test workspaces or reports. Do not invoke debo-test run, Promptfoo or workspace setup again.\n" +
  "Honor the case's requested scope and execution mode. Preserve saved plans until scoring has collected them. Report the actual saved paths, results, failures and unanswered inputs. If required inputs or approvals are missing, report the blocker and stop; do not fabricate an answer or approval.";
if (caseDoc.evidence && opts.phase === "main") {
  prompt += `\nFollow the Case evidence and scoring contract in ${JSON.stringify(join(repo, ".agents/skills/designbook-test/skills/run/resources/run.md"))}. Save ${JSON.stringify(join(workspace, "case-runs.json"))} as a JSON array in execution order, with one entry per saved run: {workflow, definitionBefore, evidence, artifactSnapshot}, each an absolute file path. Each evidence file contains the actual build output and browser observations. Capture each artifact snapshot before the next repetition; preserve the fixture git baseline. Include every attempt. The Promptfoo provider reads this manifest and uses the shared scorer to inspect artifacts and evaluate the case assertions.`;
}
const intakeOutput = join(runDir, "intake.json");
const intakeHandoff = join(runDir, "intake-handoff.json");
if (designIntake)
  prompt += `\nThe capture part is already complete for this same run. Read the compact validated handoff at ${JSON.stringify(intakeHandoff)} and use its exact subjects, reference selectors and breakpoints. Reuse the published reference recorded there instead of recapturing; its reference files are frozen inputs. Continue through the installed domain skill using that handoff. Preserve its reference approval requirements.`;
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
assertions.push({ type: "javascript", value: "output.usage != null" });
// Old capture attempts are evidence, not the completion state of this run.
for (let i = assertions.length - 1; i >= 0; i--) {
  if (
    assertions[i].value === "Object.keys(output.pendingWorkflows).length === 0"
  )
    assertions.splice(i, 1);
}
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
          execution_mode: "planner-executor",
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
      vars: {
        workspace,
        ...(caseDoc.blockade ? { blockade: caseDoc.blockade } : {}),
        ...(opts.phase === "main" && !opts["prepared-workspace"]
          ? { suite: opts.suite, case: opts.case }
          : {}),
      },
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
      `You are the capture model, inside Promptfoo. Read .agents/skills/designbook/skills/extract-reference/SKILL.md and use that skill for any required capture. The skill resolves the source kind and integration; do not assume a website source for a Figma request. Reuse an existing published reference when the case requests it. Do NOT plan or implement the design itself.\n` +
        `Then write ${JSON.stringify(join(workspace, ".designbook-intake/catalogue.json"))} as JSON: \`{ "config": { "data": "<the absolute $DESIGNBOOK_DATA>" }, "reference": { "directory": "<published revision dir>", "subjects": [...], "selectors": [...], "breakpoints": [...] } }\`. The \`config.data\` field is required. Use an empty \`reference\` only when the case has neither a supplied source nor an existing published reference.\n` +
        `Finish by presenting the published reference bindings and selectors for the next model.\n` +
        `Case request:\n${requestPrompt}\nUse only this workspace. Do not provision fixtures or run Promptfoo.`,
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
            value: "output.usage != null",
          },
        ],
      },
    ],
  };
  // Only intake provisions fixtures. Execution preserves its workspace and evidence.
  delete config.tests[0].vars.suite;
  delete config.tests[0].vars.case;
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
    caseDoc.workflow || opts.case,
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
  const thresholdPercent = base.verificationThresholdPercent;
  if (
    !Number.isFinite(thresholdPercent) ||
    thresholdPercent < 0 ||
    thresholdPercent > 100
  )
    throw new Error("verificationThresholdPercent must be between 0 and 100");
  const verifyOutput = join(dirname(output), "verify.json");
  if (output === verifyOutput || existsSync(verifyOutput))
    throw new Error(
      `Choose a fresh run directory; verification output is reserved: ${verifyOutput}`,
    );
  verifyConfigPath = join(runDir, "verify-promptfooconfig.yaml");
  const verifyPrompt =
    `In ${JSON.stringify(workspace)}, read .agents/skills/designbook/skills/design-verify/SKILL.md and invoke the design-verify skill for the completed ${JSON.stringify(workflowId)} plan. The skill owns the verification procedure. Resolve all comparison targets from the saved main plan: reference, stories, selectors, views and states; do not invent new comparison targets.\n` +
    `Use the plan's fixed threshold, or ${thresholdPercent}% when none is declared. Preserve the main artifacts and reference bytes. Report the actual score file path and findings. If required evidence or approval is missing, report the blocker; this test has no interactive user.`;
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
            value: "output.usage != null",
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
  let modelPipeline;
  let pipelineError;
  if (intakeStatus === 0) {
    if (executor) {
      try {
        modelPipeline = runModelPipeline({
          repo,
          workspace,
          runDir,
          base: config,
          requestPrompt,
          intakeHandoff,
          executor,
          evaluate,
        });
        mainStatus = modelPipeline.mainStatus;
        pipelineError = modelPipeline.error;
      } catch (error) {
        pipelineError = error.message;
        console.error(`Model pipeline failed: ${pipelineError}`);
      }
    } else mainStatus = evaluate(configPath);
  }
  // A failed prerequisite is a skipped verification, not another model call.
  if (verifyConfig && modelPipeline?.workflowPath) {
    verifyConfig.prompts[0] += `\nSaved main workflow: ${JSON.stringify(modelPipeline.workflowPath)}. Read this definition to resolve verification targets.\n`;
    writeFileSync(
      verifyConfigPath,
      yaml.dump(verifyConfig, { lineWidth: 120, noRefs: true }),
    );
  }
  const verifyReady = intakeStatus === 0 && mainStatus === 0 && !pipelineError;
  const verifyStatus =
    verifyConfig && verifyReady ? evaluate(verifyConfigPath) : null;
  const passed =
    intakeStatus === 0 &&
    mainStatus === 0 &&
    !pipelineError &&
    (!executor || modelPipeline?.plan.exitCode === 0) &&
    (!verifyConfig || verifyStatus === 0);
  writeFileSync(
    join(runDir, "pipeline.json"),
    JSON.stringify(
      {
        passed,
        ...(intakeConfigPath
          ? { intake: { report: intakeOutput, exitCode: intakeStatus } }
          : {}),
        ...(modelPipeline
          ? {
              plan: modelPipeline.plan,
              execution: modelPipeline.execution,
              workflowPath: modelPipeline.workflowPath,
            }
          : {}),
        ...(pipelineError ? { error: pipelineError } : {}),
        main: !existsSync(output)
          ? {
              skipped: true,
              reason:
                intakeStatus !== 0
                  ? "Intake validation failed"
                  : pipelineError || "Planning or execution failed",
            }
          : { report: output, exitCode: mainStatus },
        ...(verifyConfig
          ? {
              verify: verifyReady
                ? {
                    report: verifyConfig.outputPath,
                    exitCode: verifyStatus,
                  }
                : {
                    skipped: true,
                    reason: "Intake, planning or execution failed",
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
