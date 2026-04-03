import { resolve, dirname } from 'node:path';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolveUrl } from './resolve-url.js';
import { findFreePort, StorybookDaemon } from './storybook.js';
import { Command } from 'commander';
import { loadConfig, findConfig, normalizeExtensions, getExtensionIds, getExtensionSkillIds, resolveSkillsRoot } from './config.js';
import { validateData } from './validators/data.js';
import { validateTokens } from './validators/tokens.js';
import { validateComponent } from './validators/component.js';
import { validateDataModel } from './validators/data-model.js';
import { validateEntityMapping } from './validators/entity-mapping.js';
import {
  workflowCreate,
  workflowPlan,
  workflowWriteFile,
  workflowList,
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
  expandFileDeclarations,
  type TaskFileDeclaration,
  type ResolvedStep,
} from './workflow-resolve.js';
import { getValidatorKeys } from './validation-registry.js';

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
  .description('Create a new workflow tracking file. With --workflow-file, auto-resolves all stages.')
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
        const agentsDir = resolveSkillsRoot(configDir);

        try {
          const resolved = resolveAllStages(resolve(opts.workflowFile), config, rawConfig, agentsDir);

          const title = opts.title ?? resolved.title;

          // Find intake stage (if declared in stages frontmatter)
          const intakeStage = resolved.stages?.intake;
          const intakeStep = intakeStage ? 'intake' : undefined;
          const intakeRaw = intakeStep ? resolved.step_resolved[intakeStep] : undefined;
          const intakeResolved = intakeRaw && !Array.isArray(intakeRaw) ? intakeRaw : undefined;
          const intakeTask =
            intakeStep && intakeResolved
              ? [
                  {
                    id: 'intake',
                    title: `Intake: ${title}`,
                    type: 'data' as const,
                    step: intakeStep,
                    stage: 'intake' as const,
                    files: [] as Array<{ path: string; key: string; validators: string[] }>,
                    task_file: intakeResolved.task_file,
                    rules: intakeResolved.rules,
                    blueprints: intakeResolved.blueprints,
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
                expected_params: resolved.expected_params,
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
      let tasks: Array<{
        id: string;
        title: string;
        type: string;
        stage?: string;
        files?: Array<{ path: string; key: string; validators: string[] }>;
      }> = [];

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
  .option('--params <json>', 'Intake params JSON (iterables are arrays keyed by each name)')
  .option('--engine <name>', 'Write engine: git-worktree or direct (overrides workflow frontmatter)')
  .option('--dry-run', 'Preview plan output without writing to tasks.yml')
  .action((opts: { workflow: string; params?: string; engine?: string; dryRun?: boolean }) => {
    const config = loadConfig();

    const items: Array<{ step: string; params?: Record<string, unknown> }> = [];

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
      const stageLoaded = existing.stage_loaded as Record<string, ResolvedStep | ResolvedStep[]> | undefined;
      if (!stageLoaded) {
        throw new Error(`No stage_loaded in tasks.yml. Was the workflow created with --workflow-file?`);
      }

      // Extract steps from stages (grouped format) or legacy flat format
      const rawStages = existing.stages;
      let allSteps: string[];
      let stageDefinitions: Record<string, { steps: string[]; each?: string }> | undefined;
      if (rawStages && !Array.isArray(rawStages)) {
        // Grouped format: { execute: { steps: [...] }, test: { each: 'scene', steps: [...] } }
        stageDefinitions = rawStages as Record<string, { steps: string[]; each?: string }>;
        allSteps = [];
        for (const def of Object.values(stageDefinitions)) {
          allSteps.push(...(def.steps ?? []));
        }
      } else {
        allSteps = (rawStages as string[] | undefined) ?? [];
      }
      // Build step → parent stage mapping and step → each mapping
      const stepToStage = new Map<string, string>();
      const stepToEach = new Map<string, string>();
      if (stageDefinitions) {
        for (const [stageName, def] of Object.entries(stageDefinitions)) {
          for (const step of def.steps) {
            stepToStage.set(step, stageName);
            if (def.each) stepToEach.set(step, def.each);
          }
        }
      }

      // Expand each-based items from params: for steps with `each`, create items from params[eachName]
      if (stageDefinitions) {
        for (const [, def] of Object.entries(stageDefinitions)) {
          if (!def.each) continue;
          const iterables = globalParams[def.each] as Array<Record<string, unknown>> | undefined;
          if (!iterables || !Array.isArray(iterables)) continue;
          for (const step of def.steps) {
            // Skip if explicit items were provided for this step (legacy mode)
            if (items.some((i) => i.step === step)) continue;
            for (const iterableItem of iterables) {
              items.push({ step, params: iterableItem });
            }
          }
        }
      }

      // For steps without `each` and no explicit items, create a singleton item
      for (const step of allSteps) {
        if (items.some((i) => i.step === step)) continue;
        if (stepToEach.has(step)) continue; // each-step with empty iterable — skip
        items.push({ step, params: {} });
      }

      // Validate items against known steps
      for (const item of items) {
        if (!allSteps.includes(item.step)) {
          throw new Error(`Item step "${item.step}" not in workflow steps: [${allSteps.join(', ')}]`);
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
        files: Array<{ path: string; key: string; validators: string[] }>;
        params: Record<string, unknown>;
        task_file: string;
        rules: string[];
        blueprints: string[];
        config_rules: string[];
        config_instructions: string[];
      }> = [];

      for (const step of allSteps) {
        const stepItems = items.filter((i) => i.step === step);
        if (stepItems.length === 0) continue;

        const preResolved = stageLoaded[step];
        if (!preResolved) {
          console.debug(`[Designbook] workflow plan: step "${step}" skipped — no stage_loaded entry`);
          continue;
        }

        // Normalize to array for multi-task support
        const resolvedEntries: ResolvedStep[] = Array.isArray(preResolved) ? preResolved : [preResolved];

        for (const resolved of resolvedEntries) {
          const taskFm = parseFrontmatter(resolved.task_file);
          const schemaParams = (taskFm?.params ?? {}) as Record<string, unknown>;
          const fileDeclarations = (taskFm?.files ?? []) as TaskFileDeclaration[];

          for (const item of stepItems) {
            const mergedParams = validateAndMergeParams({ ...globalParams, ...item.params }, schemaParams, step);
            const taskId = generateTaskId(step, mergedParams, schemaParams);
            const title = generateTaskTitle(step, mergedParams, schemaParams);
            const type = inferTaskType(step);
            const knownValidators = new Set(getValidatorKeys());
            const files = expandFileDeclarations(fileDeclarations, mergedParams, filesEnvMap, knownValidators);

            tasks.push({
              id: taskId,
              title,
              type,
              step,
              stage: stepToStage.get(step) ?? 'execute',
              files,
              params: mergedParams,
              task_file: resolved.task_file,
              rules: resolved.rules ?? [],
              blueprints: resolved.blueprints ?? [],
              config_rules: resolved.config_rules ?? [],
              config_instructions: resolved.config_instructions ?? [],
            });
          }
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
        steps: allSteps,
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
  .requiredOption('--stage <name>', 'Stage name (e.g., intake, create-component)')
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
    const taskFile = stage.task_file as string | undefined;

    // Read expected_params from task file frontmatter
    const expectedParams: Record<string, { required: boolean; default?: unknown }> = {};
    if (taskFile && existsSync(taskFile)) {
      const taskFm = parseFrontmatter(taskFile) as Record<string, unknown> | null;
      const params = taskFm?.params as Record<string, unknown> | undefined;
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          expectedParams[key] = value === null ? { required: true } : { required: false, default: value };
        }
      }
    }

    console.log(
      JSON.stringify(
        {
          stage: opts.stage,
          task_file: taskFile,
          rules: stage.rules ?? [],
          blueprints: stage.blueprints ?? [],
          config_rules: stage.config_rules ?? [],
          config_instructions: stage.config_instructions ?? [],
          expected_params: expectedParams,
        },
        null,
        2,
      ),
    );
  });

workflow
  .command('write-file <workflow-name> <task-id>')
  .description('Write file content from stdin, validate, and update task state')
  .requiredOption('--key <key>', 'File key as declared in task frontmatter')
  .action(async (workflowName: string, taskId: string, opts: { key: string }) => {
    const config = loadConfig();
    try {
      // Read stdin
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(chunk as Buffer);
      }
      const content = Buffer.concat(chunks).toString('utf-8');
      if (!content.trim()) {
        console.error('Error: No content provided on stdin');
        process.exitCode = 1;
        return;
      }

      const result = await workflowWriteFile(config.data, workflowName, taskId, opts.key, content, config);
      console.log(JSON.stringify(result));
      if (!result.valid) process.exitCode = 1;
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
  .action(async (opts: { workflow: string; task: string; loaded?: string }) => {
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
      const result = await workflowDone(config.data, opts.workflow, opts.task, loaded);
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

program
  .command('resolve-url')
  .description('Resolve scene reference to Storybook iframe URL')
  .requiredOption('--scene <ref>', 'Scene reference (e.g. design-system:shell, galerie:product-detail)')
  .option('--file <path>', 'Explicit scenes.yml file path')
  .action(async (opts: { scene: string; file?: string }) => {
    const config = loadConfig();
    try {
      await resolveUrl(config, { scene: opts.scene, file: opts.file });
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exitCode = 1;
    }
  });

// ── helpers ──────────────────────────────────────────────────────────────────

// findFreePort and fetchJson are re-exported from ./storybook.js

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

  // For direct engine workflows, reuse an already-running Storybook instance
  const isDirect = workflow.engine === 'direct' || !workflow.engine;
  const sb = new StorybookDaemon(dataDir);
  const status = sb.status();

  let startupErrors: string[] = [];
  let pid: number | undefined;
  let port = 0;

  if (isDirect && status.running && status.port) {
    // Reuse existing Storybook — no restart needed
    pid = status.pid;
    port = status.port;
  } else {
    // Start Storybook — no --port: storybook start auto-detects a free port
    // storybook start exits 0 when ready, writing JSON to stdout
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
  }

  // Screenshot each scene declared in task params
  const changesDir = resolve(dataDir, 'workflows', 'changes', name);
  const screenshotDir = resolve(changesDir, 'screenshots');
  mkdirSync(screenshotDir, { recursive: true });
  const screenshotPaths: string[] = [];

  const scenes = workflow.tasks
    .filter((t) => t.params?.scene)
    .map((t) => {
      const s = t.params!['scene'];
      return typeof s === 'string' ? s : (((s as Record<string, unknown>)['scene'] as string) ?? String(s));
    })
    .filter((v): v is string => typeof v === 'string')
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const previewUrl = `http://localhost:${port}`;
  for (const scene of scenes) {
    const safeName = scene.replace(/[:/]/g, '-');
    const screenshotPath = resolve(screenshotDir, `${safeName}.png`);
    try {
      execFileSync(cliExec, [...cliBaseArgs, 'resolve-url', '--scene', scene], {
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
  .option('--force', 'Stop any running Storybook before starting')
  .action(async (opts: { port?: string; force?: boolean }) => {
    const config = loadConfig(process.env['DESIGNBOOK_HOME']);
    const storybookCmdStr = config['designbook.cmd'] as string | undefined;
    if (!storybookCmdStr) {
      console.error('Error: designbook.cmd not configured in designbook.config.yml');
      process.exitCode = 1;
      return;
    }

    const sb = new StorybookDaemon(config.data);
    const port = opts.port ? parseInt(opts.port, 10) : opts.force ? undefined : await findFreePort();
    const result = await sb.start({
      cmd: storybookCmdStr,
      port,
      cwd: config['designbook.home'] as string | undefined,
      force: opts.force,
    });

    console.log(JSON.stringify(result));
    process.exit(result.ready ? 0 : 1);
  });

storybookCmd
  .command('stop')
  .description('Stop a Storybook process started by storybook start')
  .action(async () => {
    const config = loadConfig(process.env['DESIGNBOOK_HOME']);
    const sb = new StorybookDaemon(config.data);
    await sb.stop();
    process.exit(0);
  });

storybookCmd
  .command('status')
  .description('Check if a Storybook daemon is running')
  .action(() => {
    const config = loadConfig(process.env['DESIGNBOOK_HOME']);
    const sb = new StorybookDaemon(config.data);
    console.log(JSON.stringify(sb.status()));
  });

storybookCmd
  .command('logs')
  .description('Print Storybook daemon log output')
  .option('-f, --follow', 'Follow the log (tail with polling)')
  .action(async (opts: { follow?: boolean }) => {
    const config = loadConfig(process.env['DESIGNBOOK_HOME']);
    const sb = new StorybookDaemon(config.data);

    const content = sb.logs();
    if (content === undefined) {
      console.error('Error: no storybook.log found');
      process.exitCode = 1;
      return;
    }

    if (!opts.follow) {
      process.stdout.write(content);
      return;
    }

    // Follow mode via async generator
    for await (const chunk of sb.tailLogs()) {
      process.stdout.write(chunk);
    }
  });

storybookCmd
  .command('restart')
  .description('Restart the Storybook daemon (stop + start)')
  .option('--port <port>', 'Port to start Storybook on (auto-detected when omitted)')
  .action(async (opts: { port?: string }) => {
    const config = loadConfig(process.env['DESIGNBOOK_HOME']);
    const storybookCmdStr = config['designbook.cmd'] as string | undefined;
    if (!storybookCmdStr) {
      console.error('Error: designbook.cmd not configured in designbook.config.yml');
      process.exitCode = 1;
      return;
    }

    const sb = new StorybookDaemon(config.data);
    const port = opts.port ? parseInt(opts.port, 10) : undefined;
    const result = await sb.restart({
      cmd: storybookCmdStr,
      port,
      cwd: config['designbook.home'] as string | undefined,
    });

    console.log(JSON.stringify(result));
    process.exit(result.ready ? 0 : 1);
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
      const result = await workflowDone(config.data, opts.workflow, opts.task, {
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
