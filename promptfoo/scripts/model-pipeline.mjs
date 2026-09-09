import { readFileSync, writeFileSync } from "node:fs";
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
    `You are the execution agent. In ${JSON.stringify(base.tests[0].vars.workspace)}, use the installed execute-workflow skill to execute the saved workflow at ${JSON.stringify(workflowPath)} until complete or blocked.\n` +
      `Read the work through the Designbook CLI one step at a time and complete every task in each step. The skill owns the execution loop. Preserve the saved plan. Use only this workspace and its inputs; do not read earlier test runs or provision fixtures. Report the final workflow summary.`,
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
      `Read the intake handoff at ${JSON.stringify(intakeHandoff)} and follow the installed planning skill using its catalogue ${JSON.stringify(handoff.catalogue)}. Resolve all decisions needed by the worker in the saved plan.\n` +
      `One executor agent will execute the entire workflow, reading one step at a time through the CLI. Group independent tasks into steps as the planning skill directs.\n` +
      `Use definition.id ${JSON.stringify(workflowId)}. Run workflow validate and workflow create with --catalogue ${JSON.stringify(handoff.catalogue)}. Save the workflow at exactly ${JSON.stringify(workflowPath)}, then run node ${JSON.stringify(join(repo, "promptfoo/scripts/snapshot-definition.mjs"))} ${JSON.stringify(workflowPath)}.\n` +
      `End after saving the complete pending workflow. Do not start/done/block workflow tasks, write component/scene output files, invoke execute-workflow, or provision fixtures. The following executor invocation executes it.`,
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
  };
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
