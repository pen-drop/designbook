import { resolve, dirname } from 'node:path';
import { mkdirSync, readFileSync, existsSync, openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync, spawn } from 'node:child_process';
import * as http from 'node:http';
import { screenshot } from './screenshot.js';
import { Command } from 'commander';
import { loadConfig, findConfig, normalizeExtensions, getExtensionIds, getExtensionSkillIds } from './config.js';
import { validateData } from './validators/data.js';
import { validateTokens } from './validators/tokens.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { validateEntityMapping } from './validators/entity-mapping.js';
import {
  workflowCreate,
  workflowPlan,
  workflowUpdate,
  workflowValidate,
  workflowList,
  workflowAddFile,
  workflowDone,
  workflowAbandon,
  workflowMerge,
  isGitRepo,
  resolveEngine,
  type WorkflowFile,
} from './workflow.js';
import { engines as engineRegistry } from './engines/index.js';
import { load as parseYaml } from 'js-yaml';
import {
  resolveAllStages,
  parseFrontmatter,
  buildEnvMap,
  validateAndMergeParams,
  generateTaskId,
  generateTaskTitle,
  inferTaskType,
  expandFilePaths,
  computeDependsOn,
  type ResolvedStep,
} from './workflow-resolve.js';
import { defaultRegistry, applyConfigExtensions } from './validation-registry.js';

function printJson(label: string, valid: boolean, errors?: string[], warnings?: string[]): void {
  const out: Record<string, unknown> = { valid, label };
  if (errors?.length) out.errors = errors;
  if (warnings?.length) out.warnings = warnings;
  console.log(JSON.stringify(out));
  process.exitCode = valid ? 0 : 1;
}

const program = new Command();

program.name('storybook-addon-designbook').description('Designbook CLI utilities');

program
  .command('config')
  .description('Output shell export statements for designbook.config.yml values')
  .action(() => {
    const config = loadConfig();

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) continue;

      // Skip internal properties and designbook.* nested keys (handled explicitly below)
      if (key === 'data' || key === 'workspace') continue;
      if (key.startsWith('designbook.')) continue;

      if (Array.isArray(value)) {
        if (key === 'extensions') {
          // extensions: normalize to objects, then emit ids and skills separately
          const entries = normalizeExtensions(value);
          const ids = getExtensionIds(entries).replace(/'/g, "'\\''");
          const skills = getExtensionSkillIds(entries).replace(/'/g, "'\\''");
          console.log(`export DESIGNBOOK_EXTENSIONS='${ids}'`);
          console.log(`export DESIGNBOOK_EXTENSION_SKILLS='${skills}'`);
          continue;
        }
        const envName = 'DESIGNBOOK_' + key.toUpperCase();
        const escaped = value.join(',').replace(/'/g, "'\\''");
        console.log(`export ${envName}='${escaped}'`);
        continue;
      }

      const parts = key.split('.');
      const envParts = parts.map((p) => (p === 'frameworks' ? 'FRAMEWORK' : p.toUpperCase()));
      const envName = 'DESIGNBOOK_' + envParts.join('_');

      const escaped = String(value).replace(/'/g, "'\\''");
      console.log(`export ${envName}='${escaped}'`);
    }

    // Explicit: DESIGNBOOK_HOME, DESIGNBOOK_DATA, DESIGNBOOK_URL
    const home = config['designbook.home'] as string | undefined;
    const data = config['designbook.data'] as string | undefined;
    const url = config['designbook.url'] as string | undefined;
    if (home) console.log(`export DESIGNBOOK_HOME='${home.replace(/'/g, "'\\''")}'`);
    if (data) console.log(`export DESIGNBOOK_DATA='${data.replace(/'/g, "'\\''")}'`);
    if (url) console.log(`export DESIGNBOOK_URL='${url.replace(/'/g, "'\\''")}'`);

    // DESIGNBOOK_CMD: shell function that runs from DESIGNBOOK_HOME
    const cmd = config['designbook.cmd'] as string | undefined;
    if (cmd) {
      const runDir = (home ?? process.cwd()).replace(/'/g, "'\\''");
      console.log(`designbook() { (cd '${runDir}' && ${cmd} "$@"); }`);
      console.log(`export DESIGNBOOK_CMD='designbook'`);
    }

    // Derive SDC provider from drupal.theme
  });

const validate = program.command('validate').description('Validate Designbook artifacts against schemas');

validate
  .command('data <section-id>')
  .description('Validate section data.yml against data-model.yml')
  .action((sectionId: string) => {
    const config = loadConfig();
    const dataModelPath = resolve(config.data, 'data-model.yml');
    const dataPath = resolve(config.data, 'sections', sectionId, 'data.yml');
    const result = validateData(dataModelPath, dataPath);
    printJson(sectionId, result.valid, result.errors, result.warnings);
  });

validate
  .command('tokens')
  .description('Validate design tokens against W3C schema')
  .action(() => {
    const config = loadConfig();
    const tokensPath = resolve(config.data, 'design-system', 'design-tokens.yml');
    const result = validateTokens(tokensPath);
    printJson('design-tokens', result.valid, result.errors, result.warnings);
  });

validate
  .command('component <name>')
  .description('Validate component YAML against Drupal SDC schema')
  .action((name: string) => {
    const config = loadConfig();
    const themePath = config['designbook.home'] as string | undefined;
    if (!themePath) {
      console.error('Error: designbook.home not configured in designbook.config.yml');
      process.exitCode = 1;
      return;
    }
    const componentPath = resolve(themePath, 'components', name, `${name}.component.yml`);
    const result = validateComponent(componentPath);
    printJson(name, result.valid, result.errors, result.warnings);
  });

validate
  .command('data-model')
  .description('Validate data-model.yml against schema')
  .action(() => {
    const config = loadConfig();
    const dataModelPath = resolve(config.data, 'data-model.yml');
    const result = validateDataModel(dataModelPath);
    printJson('data-model', result.valid, result.errors, result.warnings);
  });

validate
  .command('entity-mapping <name>')
  .description('Validate a .jsonata entity mapping file against sample data')
  .action(async (name: string) => {
    const config = loadConfig();
    const file = resolve(config.data, 'entity-mapping', `${name}.jsonata`);
    const result = await validateEntityMapping(file, config);
    printJson(name, result.valid, result.errors, result.warnings);
  });

const workflow = program.command('workflow').description('Manage workflow tracking');

workflow
  .command('list')
  .description('List workflows for a given workflow id')
  .requiredOption('--workflow <id>', 'Workflow identifier (e.g., debo-design-shell)')
  .option('--include-archived', 'Also include archived workflows')
  .action((opts: { workflow: string; includeArchived?: boolean }) => {
    const config = loadConfig();
    const names = workflowList(config.data, opts.workflow, opts.includeArchived);
    for (const n of names) console.log(n);
  });

workflow
  .command('create')
  .description('Create a new workflow tracking file. With --workflow-file, auto-resolves intake task.')
  .requiredOption('--workflow <id>', 'Workflow identifier (e.g., vision)')
  .option('--title <title>', 'Human-readable workflow title')
  .option('--workflow-file <path>', 'Path to workflow .md file (resolves intake task + stages)')
  .option('--tasks <json>', 'JSON array of tasks with id, title, type, stage?, files[] (legacy)')
  .option('--tasks-file <path>', 'Path to JSON file containing tasks array (legacy)')
  .option('--stages <json>', 'JSON array of ordered stage names (legacy)')
  .option('--parent <name>', 'Triggering workflow name when started via a hook')
  .action(
    (opts: {
      workflow: string;
      title?: string;
      workflowFile?: string;
      tasks?: string;
      tasksFile?: string;
      stages?: string;
      parent?: string;
    }) => {
      const config = loadConfig();

      // Resolution mode: --workflow-file resolves ALL stages at create time
      if (opts.workflowFile) {
        const configPath = findConfig();
        const rawConfig = configPath
          ? ((parseYaml(readFileSync(configPath, 'utf-8')) as Record<string, unknown>) ?? {})
          : {};
        const configDir = configPath ? dirname(configPath) : process.cwd();
        const agentsDir = resolve(configDir, '.agents');

        try {
          const resolved = resolveAllStages(resolve(opts.workflowFile), config, rawConfig, agentsDir);

          const title = opts.title ?? resolved.title;

          // Find intake step (if any) to create an intake task
          const intakeStep = resolved.steps.find((s) => s.endsWith(':intake'));
          const intakeResolved = intakeStep ? resolved.step_resolved[intakeStep] : undefined;
          const intakeTask =
            intakeStep && intakeResolved
              ? [
                  {
                    id: 'intake',
                    title: `Intake: ${title}`,
                    type: 'data' as const,
                    step: intakeStep,
                    stage: 'execute' as const,
                    files: [] as string[],
                    task_file: intakeResolved.task_file,
                    rules: intakeResolved.rules,
                    config_rules: intakeResolved.config_rules,
                    config_instructions: intakeResolved.config_instructions,
                  },
                ]
              : [];

          const name = workflowCreate(
            config.data,
            opts.workflow,
            title,
            intakeTask,
            resolved.stages,
            opts.parent,
            resolved.step_resolved,
            resolved.engine,
          );

          // Output JSON with workflow name + all resolved steps
          console.log(
            JSON.stringify(
              {
                name,
                steps: resolved.steps,
                ...(resolved.stages ? { stages: resolved.stages } : {}),
                ...(resolved.engine ? { engine: resolved.engine } : {}),
                step_resolved: resolved.step_resolved,
              },
              null,
              2,
            ),
          );
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
        return;
      }

      // Legacy mode: --tasks / --tasks-file
      const title = opts.title ?? opts.workflow;
      let tasks: Array<{ id: string; title: string; type: string; stage?: string; files?: string[] }> = [];

      if (opts.tasksFile) {
        try {
          tasks = JSON.parse(readFileSync(opts.tasksFile, 'utf-8'));
        } catch (err) {
          console.error(`Error reading tasks file: ${(err as Error).message}`);
          process.exitCode = 1;
          return;
        }
      } else if (opts.tasks) {
        try {
          tasks = JSON.parse(opts.tasks);
        } catch (err) {
          console.error(`Error parsing --tasks JSON: ${(err as Error).message}`);
          process.exitCode = 1;
          return;
        }
      }

      if (!Array.isArray(tasks)) {
        console.error('Error: tasks must be a JSON array');
        process.exitCode = 1;
        return;
      }

      let stagesRecord: Record<string, { steps: string[] }> | undefined;
      if (opts.stages) {
        try {
          const parsed = JSON.parse(opts.stages);
          if (Array.isArray(parsed)) {
            // Legacy flat format: convert to grouped (all steps in execute)
            stagesRecord = { execute: { steps: parsed } };
          } else if (typeof parsed === 'object') {
            stagesRecord = parsed;
          } else {
            throw new Error('stages must be an array or object');
          }
        } catch (err) {
          console.error(`Error parsing --stages JSON: ${(err as Error).message}`);
          process.exitCode = 1;
          return;
        }
      }

      const name = workflowCreate(config.data, opts.workflow, title, tasks, stagesRecord, opts.parent);
      console.log(name);
    },
  );

workflow
  .command('plan')
  .description('Expand items into tasks using pre-resolved stage data from tasks.yml.')
  .requiredOption('--workflow <name>', 'Workflow name')
  .requiredOption('--items <json>', 'JSON array of {stage, params} items')
  .option('--params <json>', 'Global intake params JSON')
  .option('--engine <name>', 'Write engine: git-worktree or direct (overrides workflow frontmatter)')
  .option('--dry-run', 'Preview plan output without writing to tasks.yml')
  .action((opts: { workflow: string; items: string; params?: string; engine?: string; dryRun?: boolean }) => {
    const config = loadConfig();

    let items: Array<{ step: string; params?: Record<string, unknown> }>;
    try {
      const rawItems = JSON.parse(opts.items);
      if (!Array.isArray(rawItems)) throw new Error('items must be an array');
      // Support both old { stage } and new { step } format
      items = rawItems.map((item: Record<string, unknown>) => ({
        step: (item.step ?? item.stage) as string,
        params: item.params as Record<string, unknown> | undefined,
      }));
    } catch (err) {
      console.error(`Error parsing --items JSON: ${(err as Error).message}`);
      process.exitCode = 1;
      return;
    }

    let globalParams: Record<string, unknown> = {};
    if (opts.params) {
      try {
        globalParams = JSON.parse(opts.params);
      } catch (err) {
        console.error(`Error parsing --params JSON: ${(err as Error).message}`);
        process.exitCode = 1;
        return;
      }
    }

    try {
      // Read stage_loaded from existing tasks.yml
      const changesDir = resolve(config.data, 'workflows', 'changes', opts.workflow);
      const tasksYmlPath = resolve(changesDir, 'tasks.yml');
      if (!existsSync(tasksYmlPath)) {
        throw new Error(`Workflow not found: ${opts.workflow}`);
      }

      const existing = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as Record<string, unknown>;
      const stageLoaded = existing.stage_loaded as Record<string, ResolvedStep> | undefined;
      if (!stageLoaded) {
        throw new Error(`No stage_loaded in tasks.yml. Was the workflow created with --workflow-file?`);
      }

      // Extract steps from stages (grouped format) or legacy flat format
      const rawStages = existing.stages;
      let allSteps: string[];
      let stageDefinitions: Record<string, { steps: string[] }> | undefined;
      if (rawStages && !Array.isArray(rawStages)) {
        // Grouped format: { execute: { steps: [...] }, test: { steps: [...] } }
        stageDefinitions = rawStages as Record<string, { steps: string[] }>;
        allSteps = [];
        for (const def of Object.values(stageDefinitions)) {
          allSteps.push(...(def.steps ?? []));
        }
      } else {
        allSteps = (rawStages as string[] | undefined) ?? [];
      }
      const execSteps = allSteps.filter((s) => !s.endsWith(':intake'));

      // Build step → parent stage mapping
      const stepToStage = new Map<string, string>();
      if (stageDefinitions) {
        for (const [stageName, def] of Object.entries(stageDefinitions)) {
          for (const step of def.steps) {
            stepToStage.set(step, stageName);
          }
        }
      }

      // Validate items against known steps
      for (const item of items) {
        if (!execSteps.includes(item.step)) {
          throw new Error(`Item step "${item.step}" not in workflow steps: [${execSteps.join(', ')}]`);
        }
      }

      const rootDir = (config.workspace as string | undefined) ?? dirname(config.data);
      const envMap = buildEnvMap(config);

      // Resolve engine: --engine flag > frontmatter engine > auto
      const frontmatterEngine = existing.engine as string | undefined;
      const resolvedEngine = resolveEngine(opts.engine, frontmatterEngine, isGitRepo(rootDir));

      // Engine setup: creates isolation context and returns the envMap for path expansion
      const workspacesBase = process.env['DESIGNBOOK_WORKSPACES'] ?? resolve(config.data, 'workspaces');
      const worktreePath = resolve(workspacesBase, opts.workflow);
      const workspace = (config['workspace'] as string | undefined) ?? rootDir;
      const engine = engineRegistry[resolvedEngine];
      if (!engine) throw new Error(`Unknown engine: "${resolvedEngine}"`);
      const engineResult = engine.setup({
        envMap,
        worktreePath,
        rootDir,
        workflowName: opts.workflow,
        workspace,
        dryRun: !!opts.dryRun,
      });
      const filesEnvMap = engineResult.envMap;

      // Expand items into tasks using pre-resolved step data
      const tasks: Array<{
        id: string;
        title: string;
        type: string;
        step: string;
        stage: string;
        files: string[];
        depends_on: string[];
        params: Record<string, unknown>;
        task_file: string;
        rules: string[];
        config_rules: string[];
        config_instructions: string[];
      }> = [];
      const taskIdsByStep = new Map<string, string[]>();

      for (const step of execSteps) {
        const stepItems = items.filter((i) => i.step === step);
        if (stepItems.length === 0) continue;

        taskIdsByStep.set(step, []);
        const resolved = stageLoaded[step];
        if (!resolved) {
          throw new Error(`No stage_loaded entry for step "${step}"`);
        }

        const taskFm = parseFrontmatter(resolved.task_file);
        const schemaParams = (taskFm?.params ?? {}) as Record<string, unknown>;
        const fileTemplates = (taskFm?.files ?? []) as string[];

        for (const item of stepItems) {
          const mergedParams = validateAndMergeParams({ ...globalParams, ...item.params }, schemaParams, step);
          const taskId = generateTaskId(step, mergedParams, schemaParams);
          const title = generateTaskTitle(step, mergedParams, schemaParams);
          const type = inferTaskType(step);
          const files = expandFilePaths(fileTemplates, mergedParams, filesEnvMap);

          tasks.push({
            id: taskId,
            title,
            type,
            step,
            stage: stepToStage.get(step) ?? 'execute',
            files,
            depends_on: [],
            params: mergedParams,
            task_file: resolved.task_file,
            rules: resolved.rules ?? [],
            config_rules: resolved.config_rules ?? [],
            config_instructions: resolved.config_instructions ?? [],
          });

          taskIdsByStep.get(step)!.push(taskId);
        }
      }

      // Deduplicate IDs
      const seen = new Map<string, number>();
      for (const task of tasks) {
        const base = task.id;
        const count = seen.get(base) ?? 0;
        if (count > 0) task.id = `${base}-${count + 1}`;
        seen.set(base, count + 1);
      }

      // Rebuild taskIdsByStep after dedup
      taskIdsByStep.clear();
      for (const task of tasks) {
        if (!taskIdsByStep.has(task.step)) taskIdsByStep.set(task.step, []);
        taskIdsByStep.get(task.step)!.push(task.id);
      }

      // Compute depends_on
      const depsMap = computeDependsOn(execSteps, taskIdsByStep);
      for (const task of tasks) {
        task.depends_on = depsMap.get(task.id) ?? [];
      }

      // Write to tasks.yml (skip in dry-run mode)
      if (!opts.dryRun) {
        workflowPlan(
          config.data,
          opts.workflow,
          tasks,
          undefined,
          globalParams,
          engineResult.write_root,
          rootDir,
          engineResult.worktree_branch,
          resolvedEngine,
        );
      }

      // Output plan JSON
      const planOutput: Record<string, unknown> = {
        params: globalParams,
        steps: execSteps,
        tasks,
        engine: resolvedEngine,
      };
      if (engineResult.worktree_branch) planOutput.worktree_branch = engineResult.worktree_branch;
      console.log(JSON.stringify(planOutput, null, 2));
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('instructions')
  .description('Get the files to load before starting a stage. Returns task_file, rules, config from stage_loaded.')
  .requiredOption('--workflow <name>', 'Workflow name')
  .requiredOption('--stage <name>', 'Stage name (e.g., designbook-components:intake, create-component)')
  .action((opts: { workflow: string; stage: string }) => {
    const config = loadConfig();
    const changesDir = resolve(config.data, 'workflows', 'changes', opts.workflow);
    const tasksYmlPath = resolve(changesDir, 'tasks.yml');

    if (!existsSync(tasksYmlPath)) {
      console.error(`Error: workflow not found: ${opts.workflow}`);
      process.exitCode = 1;
      return;
    }

    const data = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as Record<string, unknown>;
    const stageLoaded = data.stage_loaded as Record<string, unknown> | undefined;

    if (!stageLoaded || !stageLoaded[opts.stage]) {
      console.error(
        `Error: no resolved data for stage "${opts.stage}". ` +
          `Available stages: ${stageLoaded ? Object.keys(stageLoaded).join(', ') : 'none'}. ` +
          `Was the workflow created with --workflow-file?`,
      );
      process.exitCode = 1;
      return;
    }

    const stage = stageLoaded[opts.stage] as Record<string, unknown>;
    console.log(
      JSON.stringify(
        {
          stage: opts.stage,
          task_file: stage.task_file,
          rules: stage.rules ?? [],
          config_rules: stage.config_rules ?? [],
          config_instructions: stage.config_instructions ?? [],
        },
        null,
        2,
      ),
    );
  });

workflow
  .command('add-file')
  .description('Add a file to an existing task (escape hatch for files not known at plan time)')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .requiredOption('--task <id>', 'Task id')
  .requiredOption('--file <path>', 'File path to register with the task')
  .action((opts: { workflow: string; task: string; file: string }) => {
    const config = loadConfig();
    try {
      workflowAddFile(config.data, opts.workflow, opts.task, opts.file);
      console.log(`Added file to task ${opts.task}: ${opts.file}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('done')
  .description('Mark a task as done. Auto-archives workflow when all tasks are done.')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .requiredOption('--task <id>', 'Task id to mark done')
  .option(
    '--loaded <json>',
    'JSON payload with stage context (task_file, rules, config_rules, config_instructions) and task validation results',
  )
  .action((opts: { workflow: string; task: string; loaded?: string }) => {
    const config = loadConfig();
    let loaded;
    if (opts.loaded) {
      try {
        loaded = JSON.parse(opts.loaded);
      } catch {
        console.error('Error: --loaded must be valid JSON');
        process.exitCode = 1;
        return;
      }
    }
    try {
      const result = workflowDone(config.data, opts.workflow, opts.task, loaded);
      const { data, response } = result;

      if (result.archived) {
        console.log(`Workflow ${opts.workflow} archived (all tasks done)`);
        console.log(`  Completed: ${data.completed_at}`);
        console.log(`  Summary:   ${data.summary}`);
      } else {
        const done = data.tasks.filter((t) => t.status === 'done').length;
        console.log(`Task ${opts.task} → done (${done}/${data.tasks.length} tasks complete)`);
        for (const t of data.tasks) {
          const icon = t.status === 'done' ? '✓' : t.status === 'in-progress' ? '○' : '·';
          console.log(`  ${icon} ${t.title} — ${t.status}`);
        }
      }

      // Output stage-based response (replaces FLAGS)
      if (response) {
        console.log(`\nRESPONSE: ${JSON.stringify(response)}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('abandon')
  .description('Archive a workflow as incomplete (user declined to resume).')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .action((opts: { workflow: string }) => {
    const config = loadConfig();
    try {
      const data = workflowAbandon(config.data, opts.workflow);
      console.log(`Workflow ${opts.workflow} archived as incomplete`);
      console.log(`  Summary: ${data.summary}`);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('update <name> <task-id>')
  .description('Update a task status in a workflow')
  .requiredOption('--status <status>', 'New status: in-progress or done')
  .option('--files <paths...>', 'Files produced by this task (absolute or relative to designbook dir)')
  .action((name: string, taskId: string, opts: { status: string; files?: string[] }) => {
    if (opts.status !== 'in-progress' && opts.status !== 'done') {
      console.error(`Error: Invalid status "${opts.status}". Must be "in-progress" or "done"`);
      process.exitCode = 1;
      return;
    }

    const config = loadConfig();
    try {
      const result = workflowUpdate(config.data, name, taskId, opts.status, opts.files);
      const { data } = result;

      if (result.archived) {
        console.log(`Workflow ${name} archived (all tasks done)`);
        console.log(`  Completed: ${data.completed_at}`);
        console.log(`  Summary:   ${data.summary}`);
      } else {
        console.log(`Task ${taskId} → ${opts.status}`);
        console.log(
          `  Updated: ${data.tasks.find((t) => t.id === taskId)?.started_at || data.tasks.find((t) => t.id === taskId)?.completed_at}`,
        );
        if (opts.files?.length) {
          console.log(`  Files (requires validation):`);
          for (const f of opts.files) {
            console.log(`    · ${f}`);
          }
        }
        const done = data.tasks.filter((t) => t.status === 'done').length;
        const inProgress = data.tasks.filter((t) => t.status === 'in-progress').length;
        const pending = data.tasks.filter((t) => t.status === 'pending').length;
        console.log(
          `  Progress: ${done}/${data.tasks.length} done${inProgress ? `, ${inProgress} in-progress` : ''}${pending ? `, ${pending} pending` : ''}`,
        );
        for (const t of data.tasks) {
          const icon = t.status === 'done' ? '\u2713' : t.status === 'in-progress' ? '\u25CB' : '\u00B7';
          console.log(`    ${icon} ${t.title} (${t.type}) — ${t.status}`);
        }
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

workflow
  .command('validate')
  .description('Validate files in a workflow. Use --task to scope to a single task.')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .option('--task <id>', 'Scope validation to a specific task id')
  .action(async (opts: { workflow: string; task?: string }) => {
    const name = opts.workflow;
    const config = loadConfig();
    applyConfigExtensions(config, defaultRegistry);

    try {
      const results = await workflowValidate(
        config.data,
        name,
        (file) => defaultRegistry.validate(file, config),
        opts.task,
      );

      let hasFailure = false;
      for (const r of results) {
        const line: Record<string, unknown> = {
          task: r.task,
          file: r.file,
          type: r.type,
          valid: r.valid,
        };
        if (r.error) line.error = r.error;
        if (r.skipped) line.skipped = r.skipped;
        console.log(JSON.stringify(line));
        if (r.valid === false) hasFailure = true;
      }

      process.exitCode = hasFailure ? 1 : 0;
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program
  .command('screenshot')
  .description('Screenshot Storybook scenes')
  .requiredOption('--scene <ref>', 'Scene reference (e.g. design-system:shell, galerie:product-detail)')
  .action(async (opts: { scene: string }) => {
    const config = loadConfig();
    try {
      await screenshot(config, { scene: opts.scene });
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// ── helpers ──────────────────────────────────────────────────────────────────

/** Bind to port 0, let the OS pick a free port, return it. */
function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : null;
      server.close((err) => {
        if (err || port === null) reject(err ?? new Error('Could not determine port'));
        else resolve(port);
      });
    });
    server.on('error', reject);
  });
}

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        let body = '';
        res.on('data', (chunk: Buffer) => {
          body += chunk.toString();
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            reject(new Error('Invalid JSON'));
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Prepare the test environment: start Storybook preview, take screenshots, update tasks.yml.
 * Internal — not a CLI command.
 */
async function prepareEnvironment(
  dataDir: string,
  name: string,
  workflow: WorkflowFile,
): Promise<{
  previewPort: number;
  previewPid: number | undefined;
  startupErrors: string[];
  screenshotPaths: string[];
}> {
  // Resolve the designbook CLI command: DESIGNBOOK_CMD env var or fallback to npx
  const designbookCmdEnv = process.env['DESIGNBOOK_CMD']?.trim();
  const [cliExec = 'npx', ...cliBaseArgs] = designbookCmdEnv
    ? designbookCmdEnv.split(/\s+/)
    : ['npx', 'storybook-addon-designbook'];

  // Start Storybook — no --port: storybook start auto-detects a free port
  // storybook start exits 0 when ready, writing JSON to stdout
  let startupErrors: string[] = [];
  let pid: number | undefined;
  let port = 0;
  try {
    const output = execFileSync(cliExec, [...cliBaseArgs, 'storybook', 'start'], {
      encoding: 'utf-8',
      // Storybook logs go to stderr (inherited); stdout has only the JSON ready line
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const result = JSON.parse(output.trim()) as {
      ready: boolean;
      pid?: number;
      port?: number;
      startup_errors?: string[];
    };
    if (!result.ready) throw new Error('Storybook start returned ready: false');
    pid = result.pid;
    port = result.port ?? 0;
    startupErrors = result.startup_errors ?? [];
  } catch (err) {
    throw new Error(`Storybook start failed: ${(err as Error).message}`);
  }

  // Screenshot each scene declared in task params
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const screenshotDir = resolve(changesDir, 'screenshots');
  mkdirSync(screenshotDir, { recursive: true });
  const screenshotPaths: string[] = [];

  const scenes = workflow.tasks
    .filter((t) => t.params?.scene)
    .map((t) => t.params!['scene'] as string)
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const previewUrl = `http://localhost:${port}`;
  for (const scene of scenes) {
    const safeName = scene.replace(/[:/]/g, '-');
    const screenshotPath = resolve(screenshotDir, `${safeName}.png`);
    try {
      execFileSync(cliExec, [...cliBaseArgs, 'screenshot', '--scene', scene], {
        env: { ...process.env, DESIGNBOOK_STORYBOOK_URL: previewUrl },
        stdio: 'inherit',
      });
      screenshotPaths.push(screenshotPath);
    } catch {
      // Screenshot failed — don't block test stage
    }
  }

  return { previewPort: port, previewPid: pid, startupErrors, screenshotPaths };
}

// ── storybook commands ────────────────────────────────────────────────────────

const storybookCmd = program.command('storybook').description('Storybook process management');

storybookCmd
  .command('start')
  .description('Start Storybook dev server and exit when ready (Storybook continues as daemon)')
  .option('--port <port>', 'Port to start Storybook on (auto-detected when omitted)')
  .action(async (opts: { port?: string }) => {
    const config = loadConfig(process.env['DESIGNBOOK_HOME']);
    const storybookCmdStr = config['designbook.cmd'] as string | undefined;
    if (!storybookCmdStr) {
      console.error('Error: designbook.cmd not configured in designbook.config.yml');
      process.exitCode = 1;
      return;
    }

    const port = opts.port ? parseInt(opts.port, 10) : await findFreePort();
    const fullCmd = `${storybookCmdStr} --port ${port}`;
    const storybookRoot = config['designbook.home'] as string | undefined;
    const startupErrors: string[] = [];
    const errorPattern = /ERROR|ModuleNotFoundError|Cannot find|Failed to/;

    // Use a log file instead of pipes — pipes get EPIPE when the parent exits,
    // which can kill intermediary processes (npm/pnpm wrappers) and take Storybook down with them.
    const logPath = resolve(tmpdir(), `designbook-storybook-${Date.now()}.log`);
    const logFd = openSync(logPath, 'a');
    const child = spawn(fullCmd, [], {
      shell: true,
      detached: true,
      stdio: ['ignore', logFd, logFd],
      ...(storybookRoot ? { cwd: storybookRoot } : {}),
    });
    closeSync(logFd); // parent closes its copy; child retains its own fd

    const timeoutMs = 120_000;
    const startTime = Date.now();
    let ready = false;
    let logOffset = 0;

    while (!ready && Date.now() - startTime < timeoutMs) {
      await new Promise<void>((r) => setTimeout(r, 2000));

      // Scan new log content, forward to stderr, collect errors
      try {
        const content = readFileSync(logPath, 'utf-8');
        const newContent = content.slice(logOffset);
        logOffset = content.length;
        for (const line of newContent.split('\n')) {
          if (line.trim()) {
            process.stderr.write(line + '\n');
            if (errorPattern.test(line)) startupErrors.push(line.trim());
          }
        }
      } catch {
        /* log not yet written */
      }

      try {
        const result = await fetchJson(`http://localhost:${port}/index.json`);
        if (result !== null && typeof result === 'object' && 'entries' in result) {
          ready = true;
        }
      } catch {
        // Not ready yet
      }
    }

    if (ready) {
      child.unref();
      console.log(
        JSON.stringify({
          ready: true,
          pid: child.pid,
          port,
          startup_errors: startupErrors.filter(Boolean),
        }),
      );
      process.exit(0);
    } else {
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      console.log(JSON.stringify({ ready: false, error: 'timeout' }));
      process.exit(1);
    }
  });

storybookCmd
  .command('stop')
  .description('Stop a Storybook process started by storybook start')
  .requiredOption('--pid <pid>', 'Process ID to stop')
  .action(async (opts: { pid: string }) => {
    const pid = parseInt(opts.pid, 10);
    try {
      process.kill(-pid, 'SIGTERM'); // negative PID kills process group (shell + all children)
      await new Promise<void>((r) => setTimeout(r, 5000));
      try {
        process.kill(-pid, 0); // throws if process group is gone
        process.kill(-pid, 'SIGKILL');
      } catch {
        // Already gone — good
      }
    } catch {
      // PID not found — exit 0 silently
    }
    process.exit(0);
  });

// ── workflow prepare-environment ──────────────────────────────────────────────

workflow
  .command('prepare-environment')
  .description('Start Storybook preview, take screenshots, store preview PID/port, and mark task done')
  .requiredOption('--workflow <name>', 'Workflow name')
  .requiredOption('--task <id>', 'Task ID of the prepare-environment task')
  .action(async (opts: { workflow: string; task: string }) => {
    const config = loadConfig();
    try {
      const changesDir = resolve(config.data, 'workflows', 'changes', opts.workflow);
      const workflow = parseYaml(readFileSync(resolve(changesDir, 'tasks.yml'), 'utf-8')) as WorkflowFile;
      const prepResult = await prepareEnvironment(config.data, opts.workflow, workflow);

      // Mark the prepare-environment task done with preview info in loaded payload
      const result = workflowDone(config.data, opts.workflow, opts.task, {
        preview_pid: prepResult.previewPid,
        preview_port: prepResult.previewPort,
        pre_test_screenshots: prepResult.screenshotPaths,
      });

      const previewUrl = `http://localhost:${prepResult.previewPort}`;
      console.log(`✓ prepare-environment complete`);
      console.log(`  Preview: ${previewUrl} (pid ${prepResult.previewPid})`);
      if (prepResult.startupErrors.length > 0) {
        console.log(`  ⚠ Storybook started with build errors:`);
        for (const e of prepResult.startupErrors) console.log(`    · ${e}`);
      }
      if (prepResult.screenshotPaths.length > 0) {
        console.log(`  Screenshots: ${prepResult.screenshotPaths.length} taken`);
      }

      // Show pending test tasks
      const testTasks = result.data.tasks.filter((t) => t.type === 'test' && t.status === 'pending');
      if (testTasks.length > 0) {
        console.log(`\nTest tasks ready (DESIGNBOOK_PREVIEW_URL=${previewUrl}):`);
        for (const t of testTasks) console.log(`  · ${t.title}`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// ── workflow merge ────────────────────────────────────────────────────────────

workflow
  .command('merge')
  .description('Squash-merge a workflow branch, kill preview, and archive the workflow')
  .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
  .action((opts: { workflow: string }) => {
    const config = loadConfig();
    try {
      const result = workflowMerge(config.data, opts.workflow);
      console.log(`✓ Workflow ${opts.workflow} merged and archived`);
      console.log(`  Branch:  ${result.branch} (deleted)`);
      console.log(`  Commit:  workflow: ${opts.workflow}`);
      if (result.preview_pid) {
        console.log(`  Preview: stopped (pid ${result.preview_pid})`);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

program.parse();
