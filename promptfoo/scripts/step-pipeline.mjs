import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";
import { execFileSync } from "node:child_process";
import yaml from "js-yaml";
import { stateHash } from "../extensions/step-result.mjs";
import { planArtifactContract } from "../extensions/plan-artifacts.mjs";

const copy = (value) => structuredClone(value);
const writeConfig = (path, config) => {
  const serialized = copy(config);
  if (serialized.tags.phase === "execute-step") {
    // The CLI has already resolved this work order. A nested value bypasses
    // Promptfoo's string-variable rendering, preserving Twig/code literally.
    serialized.tests = serialized.tests.map((test) => ({
      ...test,
      vars: { ...test.vars, native_work_order: { text: config.prompts[0] } },
    }));
    serialized.prompts = ["{{ native_work_order.text }}"];
  }
  writeFileSync(path, yaml.dump(serialized, { lineWidth: 120, noRefs: true }));
};

export function executorConfig(
  base,
  {
    repo,
    runDir,
    step,
    workflowPath,
    context,
    executor,
    final,
    output,
    document,
    fixedWorkflows = {},
  },
) {
  const config = copy(base);
  config.description = `${base.description}: step ${step.id}`;
  config.outputPath = output;
  config.tags = {
    ...base.tags,
    phase: "execute-step",
    step: step.id,
    cli: executor.cli,
    model: executor.model,
    report: relative(repo, output),
    reasoning_effort: executor.cli === "codex" ? "medium" : "cli-default",
  };
  config.providers = config.providers.map((provider) => ({
    ...provider,
    id: `file://${join(repo, "promptfoo/providers", `${executor.cli}-cli.mjs`)}`,
    label: executor.model,
    config: {
      ...provider.config,
      model: executor.model,
      caseFile: final ? provider.config.caseFile : undefined,
      evidenceDir: join(runDir, "step-evidence", step.id),
    },
  }));
  config.prompts = [
    `You are the execution worker for exactly one fixed workflow step, already inside Promptfoo.\n` +
      `Saved workflow: ${workflowPath}\nAssigned step: ${step.id}\nUse node ${JSON.stringify(join(repo, "packages/storybook-addon-designbook/dist/cli.js"))} for Designbook commands.\n` +
      `The complete validated work order is below. Produce every task's specified outputs, then submit one batch keyed by exact task IDs with workflow done --step ${step.id} --data-file <results.json>. Start with workflow start ${JSON.stringify(workflowPath)} --step ${JSON.stringify(step.id)}. CLI commands run from this workspace root.\n` +
      `Use only this step's supplied instructions and concrete inputs. Read relevant existing project files as needed. Do not load the whole saved workflow, a planning catalogue, intake/builder skills, other steps or full reference dumps. Do not choose new targets, invent missing design decisions, launch another workflow, delegate, or provision fixtures.\n` +
      `On validation failure use the reported findings to correct this batch and record a concrete --correction when restarting the same step. If the work order lacks necessary decisions, block this step with a reason and attempted correction; do not guess. Stop after this step is done or blocked.\n\n${context}`,
  ];
  config.tests[0].vars = {
    workspace: base.tests[0].vars.workspace,
    step_contract: {
      workflow: document.definition.id,
      step: step.id,
      taskIds: step.tasks.map((t) => t.id),
      fixedWorkflows,
      stateHashes: Object.fromEntries(
        Object.entries(document.state.tasks).map(([id, state]) => [
          id,
          stateHash(state),
        ]),
      ),
    },
  };
  config.tests[0].assert = final
    ? copy(base.tests[0].assert)
    : [
        {
          type: "javascript",
          value:
            "output.definitionUnchanged === true && output.workflowErrors.length === 0 && output.usage != null",
        },
        {
          type: "javascript",
          value: `file://${join(repo, "promptfoo/extensions/design-intake.mjs")}`,
        },
      ];
  config.tests[0].assert.push({
    type: "javascript",
    value: `file://${join(repo, "promptfoo/extensions/step-result.mjs")}`,
  });
  return config;
}

/** Strong planning and each execution step are distinct native CLI invocations. */
export function runStepPipeline({
  repo,
  workspace,
  runDir,
  base,
  requestPrompt,
  intakeHandoff,
  executor,
  evaluate,
  runWorkflow,
}) {
  const handoff = JSON.parse(readFileSync(intakeHandoff, "utf8"));
  if (handoff.pass !== true || handoff.workspace !== workspace)
    throw new Error("Missing validated intake handoff");
  const catalogue = JSON.parse(readFileSync(handoff.catalogue, "utf8"));
  const workflowId = base.tags.workflow_id;
  const workflowPath = join(
    catalogue.config.data,
    "workflows",
    "changes",
    `${workflowId}-planned`,
    "tasks.yml",
  );
  const plan = copy(base);
  const planOutput = join(runDir, "plan.json");
  const planPath = join(runDir, "plan-promptfooconfig.yaml");
  plan.description = `${base.description}: plan`;
  plan.outputPath = planOutput;
  plan.tags = {
    ...base.tags,
    phase: "plan",
    report: relative(repo, planOutput),
  };
  plan.providers = plan.providers.map((p) => ({
    ...p,
    config: {
      ...p.config,
      caseFile: undefined,
      evidenceDir: join(runDir, "plan-evidence"),
    },
  }));
  plan.prompts = [
    `You are the planning model, already inside Promptfoo. Produce a complete, precise saved plan for a separate simple executor. Do not execute its tasks in this invocation.\n` +
      `Goal for the executor:\n${requestPrompt}\n\n` +
      `Intake is complete: read ${JSON.stringify(intakeHandoff)} and reuse its frozen catalogue ${JSON.stringify(handoff.catalogue)} and published reference revisions. Keep completed capture workflows unchanged; consume their bindings without resubmitting reference outputs or creating extraction tasks. Preserve the presented subjects/selectors/states/breakpoints. Load the copied domain planning instructions and author all structural/design decisions, parameters, independent step batches, dependencies, exact outputs and acceptance observations now.\n` +
      `Reference observations stay on disk and remain distinct from your target decisions. Author complete target decisions in the plan. Every task receives only its own concrete work order and typed task.reference observation package; resolved packages, raw DOM and broad measurement arrays never belong in shared context or params. Asset/font provisioning uses its own dependency package, not a header component package. Split independent work into smaller steps when needed; preserve all exact catalogue contracts.\n` +
      `The full worker prompt has a configured maximum of ${base.tags.step_prompt_max_bytes ?? 262144} UTF-8 bytes, including resolved data. Limit scope before saving; never truncate required instructions or decisions.\n` +
      `Use registry references without shortening any required instruction or weakening a discovered schema. Prepare each reference data package through the CLI before saving; missing information must be resolved in planning. The executor will receive only one step's resolved instructions/data and cannot recover omitted decisions from the full catalogue or extract.\n` +
      `Use definition.id ${JSON.stringify(workflowId)}. Run workflow validate and workflow create with --catalogue ${JSON.stringify(handoff.catalogue)}. Save the workflow at exactly ${JSON.stringify(workflowPath)}, then run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} ${JSON.stringify(workflowPath)}.\n` +
      `End after saving the complete pending workflow. Do not start/done/block workflow tasks, write component/scene output files, invoke execute-workflow, or provision fixtures. The following model calls execute it.`,
  ];
  const intakeArtifacts = JSON.parse(
    readFileSync(base.tags.intake_report, "utf8"),
  ).results.results[0].response.output;
  plan.tests[0].vars.plan_artifacts = planArtifactContract(
    workspace,
    catalogue.config,
    intakeArtifacts.fileHashes,
  );
  plan.tests[0].vars.plan_contract = {
    workflow: workflowId,
    fixedWorkflows: handoff.fixed_workflows || {},
  };
  plan.tests[0].assert = [
    {
      type: "javascript",
      value: `file://${join(repo, "promptfoo/extensions/plan-result.mjs")}`,
    },
    {
      type: "javascript",
      value:
        "output.definitionUnchanged === true && output.workflowErrors.length === 0 && output.usage != null",
    },
    {
      type: "javascript",
      value: `file://${join(repo, "promptfoo/extensions/design-intake.mjs")}`,
    },
    {
      type: "javascript",
      value: `file://${join(repo, "promptfoo/extensions/plan-artifacts.mjs")}`,
    },
  ];
  writeConfig(planPath, plan);
  const planStatus = evaluate(planPath);
  const result = {
    plan: { report: planOutput, exitCode: planStatus },
    steps: [],
    mainStatus: null,
    workflowPath,
  };
  const progressPath = join(runDir, "step-pipeline.json");
  const saveProgress = () =>
    writeFileSync(progressPath, JSON.stringify(result, null, 2) + "\n");
  saveProgress();
  if (planStatus !== 0) return result;
  const cli =
    runWorkflow ||
    ((...args) =>
      execFileSync(
        "node",
        [
          join(repo, "packages/storybook-addon-designbook/dist/cli.js"),
          "workflow",
          ...args,
        ],
        { cwd: workspace, encoding: "utf8", maxBuffer: 50 * 1024 * 1024 },
      ));
  try {
    let overview = JSON.parse(cli("steps", workflowPath));
    const initialCount = overview.steps.length;
    if (!initialCount || overview.steps.some((s) => s.status !== "pending"))
      throw new Error("Planning must leave every step pending");
    mkdirSync(join(runDir, "steps"), { recursive: true });
    const checkContext = (config, context, step, i) => {
      const promptBytes = Buffer.byteLength(config.prompts[0], "utf8");
      const limitBytes = Number(base.tags.step_prompt_max_bytes ?? 262144);
      if (!Number.isSafeInteger(limitBytes) || limitBytes <= 0)
        throw new Error("step_prompt_max_bytes must be a positive integer");
      const contextReport = {
        step: step.id,
        contextBytes: Buffer.byteLength(context, "utf8"),
        promptBytes,
        limitBytes,
        passed: promptBytes <= limitBytes,
      };
      writeFileSync(
        join(runDir, "steps", `${i + 1}-${step.id}.context.json`),
        JSON.stringify(contextReport, null, 2) + "\n",
      );
      if (!contextReport.passed)
        throw new Error(
          `Step ${step.id} prompt is ${promptBytes} bytes, limit ${limitBytes}; narrow reference packages and task context or split the step before execution`,
        );
    };
    // Check every planned step before the first worker; predecessor results may
    // enlarge later packets, so repeat the same check immediately before each call.
    const plannedDocument = yaml.load(readFileSync(workflowPath, "utf8"));
    for (const [i, step] of overview.steps.entries()) {
      const context = cli(
        "instructions",
        workflowPath,
        "--step",
        step.id,
        "--format",
        "md",
      );
      const config = executorConfig(base, {
        repo,
        runDir,
        step,
        workflowPath,
        context,
        executor,
        final: i === initialCount - 1,
        output: base.outputPath,
        document: plannedDocument,
        fixedWorkflows: handoff.fixed_workflows || {},
      });
      checkContext(config, context, step, i);
    }
    for (let i = 0; i < initialCount; i++) {
      const step = overview.steps.find(
        (s) => s.ready && s.status === "pending",
      );
      if (!step || !/^[a-z0-9][a-z0-9_-]*$/.test(step.id))
        throw new Error("No ready step in the fixed plan");
      const context = cli(
        "instructions",
        workflowPath,
        "--step",
        step.id,
        "--format",
        "md",
      );
      writeFileSync(join(runDir, "steps", `${i + 1}-${step.id}.md`), context);
      const final = i === initialCount - 1;
      const output = final
        ? base.outputPath
        : join(runDir, "steps", `${i + 1}-${step.id}.json`);
      const document = yaml.load(readFileSync(workflowPath, "utf8"));
      const config = executorConfig(base, {
        repo,
        runDir,
        step,
        workflowPath,
        context,
        executor,
        final,
        output,
        document,
        fixedWorkflows: handoff.fixed_workflows || {},
      });
      checkContext(config, context, step, i);
      const configPath = join(runDir, "steps", `${i + 1}-${step.id}.yaml`);
      writeConfig(configPath, config);
      const status = evaluate(configPath);
      result.steps.push({ step: step.id, report: output, exitCode: status });
      result.mainStatus = final || status !== 0 ? status : null;
      saveProgress();
      if (status !== 0) return result;
      overview = JSON.parse(cli("steps", workflowPath));
      if (overview.steps.find((s) => s.id === step.id)?.status !== "done")
        throw new Error(`Step ${step.id} did not complete`);
    }
  } catch (error) {
    result.error = error.message;
    result.mainStatus = 1;
  }
  saveProgress();
  return result;
}
