import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import yaml from "js-yaml";
import { planArtifactContract } from "../extensions/plan-artifacts.mjs";

const copy = (value) => structuredClone(value);
const writeConfig = (path, config) =>
  writeFileSync(path, yaml.dump(config, { lineWidth: 120, noRefs: true }));

export function executorConfig(base, { repo, runDir, workflowPath, executor }) {
  const config = copy(base);
  config.description = `${base.description}: execute saved workflow`;
  config.tags = {
    ...base.tags,
    phase: "main",
    cli: executor.cli,
    model: executor.model,
    report: relative(repo, config.outputPath),
    reasoning_effort: executor.cli === "codex" ? "medium" : "cli-default",
  };
  config.providers = config.providers.map((provider) => ({
    ...provider,
    id: `file://${join(repo, "promptfoo/providers", `${executor.cli}-cli.mjs`)}`,
    label: executor.model,
    config: {
      ...provider.config,
      model: executor.model,
      evidenceDir: join(runDir, "execution-evidence"),
      intakeHandoffInput: undefined,
    },
  }));
  config.tests[0].vars = { workspace: base.tests[0].vars.workspace };
  config.prompts = [
    `You are the execution agent in ${JSON.stringify(base.tests[0].vars.workspace)}. Read .agents/skills/designbook/skills/execute-workflow/SKILL.md and invoke that skill with the saved plan ${JSON.stringify(workflowPath)}. Follow its referenced executor instructions until complete or blocked.\n` +
      `Preserve the sealed definition and reference inputs. Do not re-plan or provision fixtures. The skill owns task execution, recovery and problem reporting. Use only this workspace and its inputs; do not read earlier test runs. Report the final plan summary and problems inventory.`,
  ];
  return config;
}

/** One planner invocation followed by one executor invocation, independent of step count. */
export function runModelPipeline({
  repo,
  workspace,
  runDir,
  base,
  requestPrompt,
  intakeHandoff,
  executor,
  evaluate,
}) {
  const handoff = JSON.parse(readFileSync(intakeHandoff, "utf8"));
  if (handoff.pass !== true || handoff.workspace !== workspace)
    throw new Error("Missing validated intake handoff");
  const catalogue = JSON.parse(readFileSync(handoff.catalogue, "utf8"));
  const workflowId = base.tags.workflow_id;
  const today = new Date().toISOString().slice(0, 10);
  // `plan build --name <workflowId>` seals a per-initiative folder dated today;
  // workflowId is already a valid slug (lowercase, alnum + hyphen), so this
  // matches the CLI's own slugify(workflowId) with no separate lookup.
  const workflowPath = join(
    catalogue.config.data,
    "plans",
    `${today}-${workflowId}`,
    "plan.md",
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
  const blockade = base.tests[0].vars.blockade;
  const intakeSetup =
    `Read .agents/skills/designbook/SKILL.md and the installed domain SKILL.md for ${JSON.stringify(workflowId)}. The skill owns discovery, intake and plan creation.\n` +
    `Read the intake handoff at ${JSON.stringify(intakeHandoff)}. Reuse its exact published reference bindings, subjects and selectors, preserving the captured bytes and approval requirements.\n` +
    `If intake yields a named \`ReferenceNeed\` or \`PrerequisiteNeed\`, report it and stop without creating or executing a plan.\n`;
  plan.prompts = [
    blockade
      ? `You are the planning model, already inside Promptfoo. Complete domain intake in this invocation. Workflow tasks wait for a later executor.\nGoal:\n${requestPrompt}\n\n${intakeSetup}`
      : `You are the planning model, already inside Promptfoo. Use the domain skill in persist / planning-only mode with initiative name ${JSON.stringify(workflowId)}. Seal the plan through the skill's CLI procedure in this invocation; a chat-only markdown brief is not a sealed plan. Do NOT execute its tasks.\n` +
        `Goal for the executor:\n${requestPrompt}\n\n${intakeSetup}` +
        `The runner's expected saved plan is ${JSON.stringify(workflowPath)}. Return its actual path. Stop after the complete plan is sealed; do not write component/scene output files or provision fixtures. A separate execute-workflow skill invocation executes the saved plan.`,
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
    ...(blockade ? { blockade } : {}),
  };
  plan.tests[0].vars.composition_plan = workflowPath;
  plan.tests[0].assert = [
    {
      type: "javascript",
      value: `file://${join(repo, "promptfoo/extensions/plan-result.mjs")}`,
    },
    {
      type: "javascript",
      value: "output.usage != null",
    },
    {
      type: "javascript",
      value: `file://${join(repo, "promptfoo/extensions/plan-artifacts.mjs")}`,
    },
    ...(new Set([
      "design-entity",
      "design-component",
      "design-screen",
      "design-shell",
    ]).has(workflowId)
      ? [
          {
            type: "javascript",
            value: `file://${join(repo, "promptfoo/extensions/composition-presentation.mjs")}`,
          },
        ]
      : []),
  ];
  writeConfig(planPath, plan);
  const planStatus = evaluate(planPath);
  const result = {
    plan: { report: planOutput, exitCode: planStatus },
    mainStatus: null,
    workflowPath,
  };
  const progressPath = join(runDir, "model-pipeline.json");
  const saveProgress = () =>
    writeFileSync(progressPath, JSON.stringify(result, null, 2) + "\n");
  saveProgress();
  if (planStatus !== 0) return result;
  if (blockade) {
    copyFileSync(planOutput, base.outputPath);
    result.mainStatus = 0;
    result.execution = {
      skipped: true,
      report: base.outputPath,
      reason: `PrerequisiteNeed ${blockade.workflow}`,
    };
    saveProgress();
    return result;
  }
  const executionPath = join(runDir, "execution-promptfooconfig.yaml");
  writeConfig(
    executionPath,
    executorConfig(base, { repo, runDir, workflowPath, executor }),
  );
  result.mainStatus = evaluate(executionPath);
  result.execution = { report: base.outputPath, exitCode: result.mainStatus };
  saveProgress();
  return result;
}
