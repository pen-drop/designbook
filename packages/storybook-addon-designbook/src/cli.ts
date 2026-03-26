import { resolve, dirname } from 'node:path';
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
} from './workflow.js';
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
  type ResolvedStage,
} from './workflow-resolve.js';
import { readFileSync, existsSync } from 'node:fs';
import { load as parseYaml } from 'js-yaml';
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
    const configPath = findConfig();
    const configDir = configPath ? dirname(configPath) : process.cwd();
    const config = loadConfig();

    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) continue;

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

      // Emit cmd as a shell function that always runs from config root
      if (envName === 'DESIGNBOOK_CMD') {
        const cmd = String(value);
        console.log(`designbook() { (cd '${configDir}' && ${cmd} "$@"); }`);
        console.log(`export DESIGNBOOK_CMD='designbook'`);
        continue;
      }

      const escaped = String(value).replace(/'/g, "'\\''");
      console.log(`export ${envName}='${escaped}'`);
    }

    // Export root directory
    console.log(`export DESIGNBOOK_ROOT='${configDir}'`);

    // Derive SDC provider from drupal.theme
  });

const validate = program.command('validate').description('Validate Designbook artifacts against schemas');

validate
  .command('data <section-id>')
  .description('Validate section data.yml against data-model.yml')
  .action((sectionId: string) => {
    const config = loadConfig();
    const dist = config.dist;
    const dataModelPath = resolve(dist, 'data-model.yml');
    const dataPath = resolve(dist, 'sections', sectionId, 'data.yml');
    const result = validateData(dataModelPath, dataPath);
    printJson(sectionId, result.valid, result.errors, result.warnings);
  });

validate
  .command('tokens')
  .description('Validate design tokens against W3C schema')
  .action(() => {
    const config = loadConfig();
    const tokensPath = resolve(config.dist, 'design-system', 'design-tokens.yml');
    const result = validateTokens(tokensPath);
    printJson('design-tokens', result.valid, result.errors, result.warnings);
  });

validate
  .command('component <name>')
  .description('Validate component YAML against Drupal SDC schema')
  .action((name: string) => {
    const config = loadConfig();
    const themePath = config['drupal.theme'] as string;
    if (!themePath) {
      console.error('Error: drupal.theme not configured in designbook.config.yml');
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
    const dataModelPath = resolve(config.dist, 'data-model.yml');
    const result = validateDataModel(dataModelPath);
    printJson('data-model', result.valid, result.errors, result.warnings);
  });

validate
  .command('entity-mapping <name>')
  .description('Validate a .jsonata entity mapping file against sample data')
  .action(async (name: string) => {
    const config = loadConfig();
    const file = resolve(config.dist, 'entity-mapping', `${name}.jsonata`);
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
    const names = workflowList(config.dist, opts.workflow, opts.includeArchived);
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

          // Find intake stage (if any) to create an intake task
          const intakeStage = resolved.stages.find((s) => s.endsWith(':intake'));
          const intakeTask = intakeStage
            ? [
                {
                  id: 'intake',
                  title: `Intake: ${title}`,
                  type: 'data' as const,
                  stage: intakeStage,
                  files: [] as string[],
                  task_file: resolved.stage_resolved[intakeStage].task_file,
                  rules: resolved.stage_resolved[intakeStage].rules,
                  config_rules: resolved.stage_resolved[intakeStage].config_rules,
                  config_instructions: resolved.stage_resolved[intakeStage].config_instructions,
                },
              ]
            : [];

          const name = workflowCreate(
            config.dist,
            opts.workflow,
            title,
            intakeTask,
            resolved.stages,
            opts.parent,
            resolved.stage_resolved,
          );

          // Output JSON with workflow name + all resolved stages
          console.log(
            JSON.stringify(
              {
                name,
                stages: resolved.stages,
                stage_resolved: resolved.stage_resolved,
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

      let stages: string[] | undefined;
      if (opts.stages) {
        try {
          stages = JSON.parse(opts.stages);
          if (!Array.isArray(stages)) throw new Error('stages must be an array');
        } catch (err) {
          console.error(`Error parsing --stages JSON: ${(err as Error).message}`);
          process.exitCode = 1;
          return;
        }
      }

      const name = workflowCreate(config.dist, opts.workflow, title, tasks, stages, opts.parent);
      console.log(name);
    },
  );

workflow
  .command('plan')
  .description('Expand items into tasks using pre-resolved stage data from tasks.yml.')
  .requiredOption('--workflow <name>', 'Workflow name')
  .requiredOption('--items <json>', 'JSON array of {stage, params} items')
  .option('--params <json>', 'Global intake params JSON')
  .option('--dry-run', 'Preview plan output without writing to tasks.yml')
  .action((opts: { workflow: string; items: string; params?: string; dryRun?: boolean }) => {
    const config = loadConfig();

    let items: Array<{ stage: string; params?: Record<string, unknown> }>;
    try {
      items = JSON.parse(opts.items);
      if (!Array.isArray(items)) throw new Error('items must be an array');
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
      const changesDir = resolve(config.dist, 'workflows', 'changes', opts.workflow);
      const tasksYmlPath = resolve(changesDir, 'tasks.yml');
      if (!existsSync(tasksYmlPath)) {
        throw new Error(`Workflow not found: ${opts.workflow}`);
      }

      const existing = parseYaml(readFileSync(tasksYmlPath, 'utf-8')) as Record<string, unknown>;
      const stageLoaded = existing.stage_loaded as Record<string, ResolvedStage> | undefined;
      if (!stageLoaded) {
        throw new Error(`No stage_loaded in tasks.yml. Was the workflow created with --workflow-file?`);
      }

      const stages = (existing.stages as string[]) ?? [];
      const execStages = stages.filter((s) => !s.endsWith(':intake'));

      // Validate items against known stages
      for (const item of items) {
        if (!execStages.includes(item.stage)) {
          throw new Error(`Item stage "${item.stage}" not in workflow stages: [${execStages.join(', ')}]`);
        }
      }

      const envMap = buildEnvMap(config);

      // Expand items into tasks using pre-resolved stage data
      const tasks: Array<{
        id: string;
        title: string;
        type: string;
        stage: string;
        files: string[];
        depends_on: string[];
        params: Record<string, unknown>;
        task_file: string;
        rules: string[];
        config_rules: string[];
        config_instructions: string[];
      }> = [];
      const taskIdsByStage = new Map<string, string[]>();

      for (const stage of execStages) {
        const stageItems = items.filter((i) => i.stage === stage);
        if (stageItems.length === 0) continue;

        taskIdsByStage.set(stage, []);
        const resolved = stageLoaded[stage];
        if (!resolved) {
          throw new Error(`No stage_loaded entry for stage "${stage}"`);
        }

        const taskFm = parseFrontmatter(resolved.task_file);
        const schemaParams = (taskFm?.params ?? {}) as Record<string, unknown>;
        const fileTemplates = (taskFm?.files ?? []) as string[];

        for (const item of stageItems) {
          const mergedParams = validateAndMergeParams({ ...globalParams, ...item.params }, schemaParams, stage);
          const taskId = generateTaskId(stage, mergedParams, schemaParams);
          const title = generateTaskTitle(stage, mergedParams, schemaParams);
          const type = inferTaskType(stage);
          const files = expandFilePaths(fileTemplates, mergedParams, envMap);

          tasks.push({
            id: taskId,
            title,
            type,
            stage,
            files,
            depends_on: [],
            params: mergedParams,
            task_file: resolved.task_file,
            rules: resolved.rules ?? [],
            config_rules: resolved.config_rules ?? [],
            config_instructions: resolved.config_instructions ?? [],
          });

          taskIdsByStage.get(stage)!.push(taskId);
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

      // Rebuild taskIdsByStage after dedup
      taskIdsByStage.clear();
      for (const task of tasks) {
        if (!taskIdsByStage.has(task.stage)) taskIdsByStage.set(task.stage, []);
        taskIdsByStage.get(task.stage)!.push(task.id);
      }

      // Compute depends_on
      const depsMap = computeDependsOn(execStages, taskIdsByStage);
      for (const task of tasks) {
        task.depends_on = depsMap.get(task.id) ?? [];
      }

      // Write to tasks.yml (skip in dry-run mode)
      if (!opts.dryRun) {
        workflowPlan(config.dist, opts.workflow, tasks, undefined, globalParams);
      }

      // Output plan JSON
      console.log(JSON.stringify({ params: globalParams, stages: execStages, tasks }, null, 2));
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
    const changesDir = resolve(config.dist, 'workflows', 'changes', opts.workflow);
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
      workflowAddFile(config.dist, opts.workflow, opts.task, opts.file);
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
      const result = workflowDone(config.dist, opts.workflow, opts.task, loaded);
      const { data } = result;

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
      const data = workflowAbandon(config.dist, opts.workflow);
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
      const result = workflowUpdate(config.dist, name, taskId, opts.status, opts.files);
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
        config.dist,
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

program.parse();
