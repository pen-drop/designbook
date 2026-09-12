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
    `You are the execution agent. In ${JSON.stringify(base.tests[0].vars.workspace)}, set up the CLI once: \`_debo() { npx storybook-addon-designbook "$@"; }\` then \`eval "$(_debo config)"\`.\n` +
      `A sealed MD plan already exists at ${JSON.stringify(workflowPath)}. Use the installed execute-workflow skill to execute it: attempt in-scope fixes, append persistent defects to the sibling .problems.md beside the plan, continue through remaining tasks, then report plan summary plus the problems inventory. Do NOT re-plan, run intake, or edit the plan's definition.\n` +
      `Loop through the Designbook CLI one step at a time: \`plan steps <plan>\` to see steps and checkbox state, \`plan instructions <plan> --step <id>\` for a step's context and contracts, produce each task's declared outputs, then \`plan done <plan> --task <name> --data-file <result.json>\` (add \`--title\` when a step repeats a task name). The skill owns the loop. Preserve the saved plan. Use only this workspace and its inputs; do not read earlier test runs or provision fixtures.\n` +
      `The plan's \`index_url\` points at the Storybook the planning phase started; check \`storybook status\` first and reuse that running server — its live URL is the plan's index_url. Only run \`storybook start\` if none is running. Never assume a fixed port.\n` +
      `Finish by reporting \`plan summary <plan>\`.`,
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
  // The MD-plan engine writes one sealed plan per workflow at this canonical path.
  const workflowPath = join(
    catalogue.config.data,
    "plans",
    `${workflowId}.plan.md`,
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
    `You are the planning model, already inside Promptfoo. Produce a complete, sealed MD plan for a separate simple executor. Do NOT execute its tasks in this invocation.\n` +
      `Goal for the executor:\n${requestPrompt}\n\n` +
      `Set up the CLI once: \`_debo() { npx storybook-addon-designbook "$@"; }\` then \`eval "$(_debo config)"\`.\n` +
      `Read the intake handoff at ${JSON.stringify(intakeHandoff)} — it records the workspace and the published reference from the completed capture phase. Reuse those exact reference bindings, subjects and selectors; do not recapture. Its reference files are frozen inputs.\n` +
      `Follow the installed planning skill (the ${JSON.stringify(workflowId)} domain intake and \`.agents/skills/designbook/resources/workflow-building.md\`): run \`_debo intake ${workflowId} --palette\`, read the applicable intake rules, and author the COMPLETE \`tasks.json\` — one entry per concrete task covering every step, each \`params\` satisfying that task's \`params_schema\`, and every open selector resolved.\n` +
      `Then run \`_debo plan build ${workflowId} --tasks <tasks.json>\`. It validates each task's params, embeds every body once, freezes the contracts and definitions, computes the digest (auto-sealed), and writes the plan to exactly ${JSON.stringify(workflowPath)}. Fix any reported unmet param or missing step in \`tasks.json\` and re-run until it returns ok.\n` +
      `End after \`plan build\` returns ok and the sealed plan exists at ${JSON.stringify(workflowPath)}. Do NOT run \`plan done\`, write component/scene output files, invoke execute-workflow, or provision fixtures. The following executor invocation executes it.`,
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
