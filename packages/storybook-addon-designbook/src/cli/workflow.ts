import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import type { Command } from 'commander';
import { loadConfig, findConfig, resolveSkillsRoot } from '../config.js';
import {
  workflowCreate,
  workflowPlan,
  workflowAppendTasks,
  expandTasksFromParams,
  workflowWriteFile,
  workflowResult,
  workflowGetFile,
  workflowList,
  workflowDone,
  workflowAbandon,
  workflowWait,
  workflowMerge,
  isGitRepo,
  resolveEngine,
  readWorkflow,
  writeWorkflowAtomic,
  type WorkflowTask,
} from '../workflow.js';
import { engines as engineRegistry } from '../engines/index.js';
import { load as parseYaml } from 'js-yaml';
import {
  resolveAllStages,
  parseFrontmatter,
  buildEnvMap,
  expandResultDeclarations,
  resolveSchemaRef,
  type ResolvedStep,
  type ResultDeclaration,
} from '../workflow-resolve.js';

/**
 * Unified task expansion for the CLI.
 * Reads tasks.yml, sets up engine, expands tasks via expandTasksFromParams, and persists.
 *
 * In 'plan' mode (initial expansion after intake or skip-intake):
 *   Uses workflowPlan to replace tasks and set engine fields.
 * In 'append' mode (deferred expansion on subsequent done calls):
 *   Uses workflowAppendTasks to append new tasks.
 */
function expandWorkflowTasks(
  config: ReturnType<typeof loadConfig>,
  workflowName: string,
  newParams: Record<string, unknown>,
  mode: 'plan' | 'append',
): { tasks: WorkflowTask[]; steps: string[]; engine: string; worktree_branch?: string } | null {
  const changesDir = resolve(config.data, 'workflows', 'changes', workflowName);
  const tasksYmlPath = resolve(changesDir, 'tasks.yml');
  if (!existsSync(tasksYmlPath)) {
    if (mode === 'plan') throw new Error(`Workflow not found: ${workflowName}`);
    return null;
  }

  const existing = readWorkflow(tasksYmlPath);
  const stageLoaded = existing.stage_loaded as Record<string, ResolvedStep | ResolvedStep[]> | undefined;

  if (!stageLoaded) {
    if (mode === 'plan')
      throw new Error(`No stage_loaded in tasks.yml. Was the workflow created with --workflow-file?`);
    return null;
  }

  if (!existing.stages) {
    if (mode === 'plan') throw new Error('No stages in tasks.yml');
    return null;
  }
  const stageDefinitions = existing.stages;

  const allSteps: string[] = [];
  for (const def of Object.values(stageDefinitions)) {
    allSteps.push(...(def.steps ?? []));
  }

  const existingTasks = existing.tasks;

  // Engine setup for file path expansion
  const rootDir = (config.workspace as string | undefined) ?? dirname(config.data);
  const envMap = buildEnvMap(config);
  const frontmatterEngine = existing.engine;
  const resolvedEngine = resolveEngine(undefined, frontmatterEngine, isGitRepo(rootDir));
  const workspacesBase = process.env['DESIGNBOOK_WORKSPACES'] ?? resolve(config.data, 'workspaces');
  const worktreePath = resolve(workspacesBase, workflowName);
  const workspace = (config['workspace'] as string | undefined) ?? rootDir;
  const engine = engineRegistry[resolvedEngine];
  if (!engine) {
    if (mode === 'plan') throw new Error(`Unknown engine: "${resolvedEngine}"`);
    return null;
  }
  const engineResult = engine.setup({
    envMap,
    worktreePath,
    rootDir,
    workflowName,
    workspace,
    dryRun: false,
  });

  // Merge params: in plan mode use newParams directly, in append mode merge with existing
  const globalParams = mode === 'append' ? { ...(existing.params ?? {}), ...newParams } : newParams;

  const tasks = expandTasksFromParams(
    stageLoaded,
    stageDefinitions,
    globalParams,
    existingTasks,
    engineResult.envMap,
    existing.scope,
  );

  if (tasks.length === 0) return mode === 'plan' ? { tasks: [], steps: allSteps, engine: resolvedEngine } : null;

  // Persist
  if (mode === 'plan') {
    workflowPlan(
      config.data,
      workflowName,
      tasks,
      undefined,
      globalParams,
      engineResult.write_root,
      rootDir,
      engineResult.worktree_branch,
      resolvedEngine,
      undefined, // schemas
      engineResult.envMap,
    );
  } else {
    workflowAppendTasks(config.data, workflowName, tasks, newParams);
  }

  return {
    tasks,
    steps: allSteps,
    engine: resolvedEngine,
    ...(engineResult.worktree_branch ? { worktree_branch: engineResult.worktree_branch } : {}),
  };
}

export function register(program: Command): void {
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
    .description('Create a new workflow tracking file from a workflow .md file.')
    .requiredOption('--workflow <id>', 'Workflow identifier (e.g., vision)')
    .requiredOption('--workflow-file <path>', 'Path to workflow .md file (resolves intake task + stages)')
    .option('--title <title>', 'Human-readable workflow title')
    .option('--parent <name>', 'Triggering workflow name when started via a hook')
    .option('--params <json>', 'JSON object of initial params (e.g. from parent dispatch)')
    .action((opts: { workflow: string; workflowFile: string; title?: string; parent?: string; params?: string }) => {
      const config = loadConfig();

      // Parse initial params if provided
      let initialParams: Record<string, unknown> | undefined;
      if (opts.params) {
        try {
          initialParams = JSON.parse(opts.params) as Record<string, unknown>;
        } catch (err) {
          console.error(`Error parsing --params JSON: ${(err as Error).message}`);
          process.exitCode = 1;
          return;
        }
      }

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
        const intakeStage = resolved.stages?.intake as { steps?: string[] } | undefined;
        const intakeStepName = intakeStage?.steps?.[0] ?? (intakeStage ? 'intake' : undefined);
        const intakeRaw = intakeStepName ? resolved.step_resolved[intakeStepName] : undefined;
        const intakeResolved = intakeRaw && !Array.isArray(intakeRaw) ? intakeRaw : undefined;
        // Build result declarations for intake task from frontmatter, resolving $ref schemas
        let intakeResult: Record<string, { path?: string; schema?: object; validators?: string[] }> | undefined;
        const intakeSchemas: Record<string, object> = {};
        if (intakeResolved) {
          const intakeFm = parseFrontmatter(intakeResolved.task_file);
          const resultDecl = intakeFm?.result as Record<string, ResultDeclaration> | undefined;
          const envMap = buildEnvMap(config);
          intakeResult = expandResultDeclarations(resultDecl, undefined, initialParams ?? {}, envMap);

          // Resolve $ref in result schemas inline
          if (intakeResult && resultDecl) {
            const skillsRoot = resolve(agentsDir, 'skills');
            for (const [key, decl] of Object.entries(resultDecl)) {
              if (decl.$ref && intakeResult[key]) {
                const { typeName, schema } = resolveSchemaRef(decl.$ref, intakeResolved.task_file, skillsRoot);
                intakeSchemas[typeName] = schema;
                intakeResult[key]!.schema = schema;
              }
              // Resolve nested $ref in items
              if (decl.items && typeof decl.items === 'object') {
                const items = decl.items as Record<string, unknown>;
                if (items.$ref && typeof items.$ref === 'string') {
                  const { typeName, schema } = resolveSchemaRef(items.$ref, intakeResolved.task_file, skillsRoot);
                  intakeSchemas[typeName] = schema;
                  if (intakeResult[key]?.schema) {
                    (intakeResult[key]!.schema as Record<string, unknown>).items = schema;
                  }
                }
              }
            }
          }
        }

        const intakeTask =
          intakeStepName && intakeResolved
            ? [
                {
                  id: 'intake',
                  title: `Intake: ${title}`,
                  type: 'data' as const,
                  step: intakeStepName,
                  stage: 'intake' as const,
                  files: [] as Array<{ path: string; key: string; validators: string[] }>,
                  ...(intakeResult ? { result: intakeResult } : {}),
                  task_file: intakeResolved.task_file,
                  rules: intakeResolved.rules,
                  blueprints: intakeResolved.blueprints,
                  config_rules: intakeResolved.config_rules,
                  config_instructions: intakeResolved.config_instructions,
                },
              ]
            : [];

        // Check if --params satisfies all required params → skip intake
        const skipIntake =
          initialParams &&
          resolved.expected_params &&
          Object.entries(resolved.expected_params).every(([key, meta]) => {
            const m = meta as { required?: boolean };
            return !m.required || initialParams[key] !== undefined;
          });

        const tasksForCreate = skipIntake ? [] : intakeTask;

        const workspaceRoot = (config.workspace as string | undefined) ?? configDir;
        const envMap = buildEnvMap(config);
        const name = workflowCreate(
          config.data,
          opts.workflow,
          title,
          tasksForCreate,
          resolved.stages,
          opts.parent,
          resolved.step_resolved,
          resolved.engine,
          initialParams,
          workspaceRoot,
          intakeSchemas,
          envMap,
        );

        // If intake was skipped or no intake stage exists, immediately expand tasks
        let expandedTasks: WorkflowTask[] | undefined;
        if (skipIntake || !intakeStepName) {
          try {
            const result = expandWorkflowTasks(config, name, initialParams ?? {}, 'plan');
            expandedTasks = result?.tasks;
          } catch (err) {
            console.error(`Error expanding tasks: ${(err as Error).message}`);
            process.exitCode = 1;
            return;
          }
        }

        // Build task_ids map: step name → actual task ID
        const taskIds: Record<string, string> = {};
        if (!skipIntake && intakeStepName) {
          taskIds[intakeStepName] = 'intake';
        }
        if (expandedTasks) {
          for (const t of expandedTasks) {
            if (t.step) taskIds[t.step] = t.id;
          }
        }

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
              ...(Object.keys(taskIds).length > 0 ? { task_ids: taskIds } : {}),
              ...(skipIntake ? { intake_skipped: true } : {}),
              ...(expandedTasks ? { expanded_tasks: expandedTasks } : {}),
            },
            null,
            2,
          ),
        );
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

      const data = readWorkflow(tasksYmlPath);

      // Transition from waiting back to running when AI resumes work
      if (data.status === 'waiting') {
        data.status = 'running';
        delete data.waiting_message;
        writeWorkflowAtomic(tasksYmlPath, data);
      }

      // Resolve stage name: try direct key first, then look up via stages definition
      let resolvedKey = opts.stage;
      if (data.stage_loaded && !data.stage_loaded[resolvedKey]) {
        const stageEntry = data.stages?.[opts.stage];
        if (stageEntry?.steps?.[0] && data.stage_loaded[stageEntry.steps[0]]) {
          resolvedKey = stageEntry.steps[0];
        }
      }

      if (!data.stage_loaded || !data.stage_loaded[resolvedKey]) {
        console.error(
          `Error: no resolved data for stage "${opts.stage}". ` +
            `Available stages: ${data.stage_loaded ? Object.keys(data.stage_loaded).join(', ') : 'none'}. ` +
            `Was the workflow created with --workflow-file?`,
        );
        process.exitCode = 1;
        return;
      }

      // Paths already resolved by readWorkflow
      const rawStage = data.stage_loaded[resolvedKey]!;
      const stage = Array.isArray(rawStage) ? rawStage[0]! : rawStage;
      const taskFile = stage.task_file || undefined;
      const rules = stage.rules ?? [];
      const blueprints = stage.blueprints ?? [];

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

      // Include merged_schema if present (from schema composition at resolution time)
      const mergedSchema = (stage as unknown as Record<string, unknown>).merged_schema ?? undefined;

      console.log(
        JSON.stringify(
          {
            stage: opts.stage,
            task_file: taskFile,
            rules,
            blueprints,
            config_rules: stage.config_rules ?? [],
            config_instructions: stage.config_instructions ?? [],
            expected_params: expectedParams,
            ...(mergedSchema ? { merged_schema: mergedSchema } : {}),
          },
          null,
          2,
        ),
      );
    });

  workflow
    .command('get-file <workflow-name> <task-id>')
    .description('Return the staged path for a file key (for external writers like Playwright)')
    .requiredOption('--key <key>', 'File key as declared in task frontmatter')
    .action((workflowName: string, taskId: string, opts: { key: string }) => {
      const config = loadConfig();
      try {
        const result = workflowGetFile(config.data, workflowName, taskId, opts.key);
        console.log(JSON.stringify(result));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  // ── workflow result ─────────────────────────────────────────────────────────
  workflow
    .command('result')
    .description(
      'Write a task result — file (stdin) or data (--json). Validates against schema and semantic validators.',
    )
    .requiredOption('--workflow <name>', 'Workflow name')
    .requiredOption('--task <id>', 'Task id')
    .requiredOption('--key <key>', 'Result key as declared in task result: frontmatter')
    .option('--json <data>', 'Data result value (inline JSON). Omit for file results (reads stdin).')
    .option('--external', 'Register an already-written file (skip stdin, just validate and track)')
    .option('--flush', 'Immediately move file to final path (skip waiting for stage transition)')
    .action(
      async (opts: {
        workflow: string;
        task: string;
        key: string;
        json?: string;
        external?: boolean;
        flush?: boolean;
      }) => {
        const config = loadConfig();
        try {
          let content: string | Buffer | unknown | null;
          if (opts.json !== undefined) {
            // Data result via --json
            try {
              content = JSON.parse(opts.json);
            } catch (err) {
              console.error(`Error parsing --json: ${(err as Error).message}`);
              process.exitCode = 1;
              return;
            }
          } else if (opts.external) {
            // External file: already written
            content = null;
          } else {
            // File result: read stdin
            const chunks: Buffer[] = [];
            for await (const chunk of process.stdin) {
              chunks.push(chunk as Buffer);
            }
            const buf = Buffer.concat(chunks);
            if (buf.length === 0) {
              console.error('Error: No content provided on stdin (use --json for data results)');
              process.exitCode = 1;
              return;
            }
            content = buf;
          }

          const result = await workflowResult(config.data, opts.workflow, opts.task, opts.key, content, config, {
            flush: opts.flush,
          });
          console.log(JSON.stringify(result));
          if (!result.valid) process.exitCode = 1;
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );

  // ── workflow write-file (deprecated — use workflow result) ─────────────────
  workflow
    .command('write-file <workflow-name> <task-id>')
    .description('[Deprecated: use "workflow result"] Write file content from stdin, validate, and update task state')

    .option('--key <key>', 'File key as declared in task frontmatter')
    .option('--path <path>', 'Direct file path (bypasses file key lookup, no gate check)')
    .option('--external', 'Register an already-written file (skip stdin, just validate and track)')
    .option('--flush', 'Immediately move file to final path (skip waiting for stage transition)')
    .action(
      async (
        workflowName: string,
        taskId: string,
        opts: { key?: string; path?: string; external?: boolean; flush?: boolean },
      ) => {
        if (!opts.key && !opts.path) {
          console.error('Error: Either --key or --path is required');
          process.exitCode = 1;
          return;
        }
        if (opts.key && opts.path) {
          console.error('Error: --key and --path are mutually exclusive');
          process.exitCode = 1;
          return;
        }
        const config = loadConfig();
        try {
          // Path mode: write directly without file key lookup
          if (opts.path) {
            if (opts.external) {
              if (!existsSync(opts.path)) {
                console.error(`Error: File not found at path: ${opts.path}`);
                process.exitCode = 1;
                return;
              }
              console.log(JSON.stringify({ valid: true, errors: [], file_path: opts.path }));
              return;
            }
            const chunks: Buffer[] = [];
            for await (const chunk of process.stdin) {
              chunks.push(chunk as Buffer);
            }
            const content = Buffer.concat(chunks);
            if (content.length === 0) {
              console.error('Error: No content provided on stdin');
              process.exitCode = 1;
              return;
            }
            mkdirSync(dirname(opts.path), { recursive: true });
            writeFileSync(opts.path, content);
            console.log(JSON.stringify({ valid: true, errors: [], file_path: opts.path }));
            return;
          }

          // Key mode: existing behavior
          let content: string | Buffer | null;
          if (opts.external) {
            // External mode: file already written to staged path (e.g. by Playwright)
            content = null;
          } else {
            // Read stdin
            const chunks: Buffer[] = [];
            for await (const chunk of process.stdin) {
              chunks.push(chunk as Buffer);
            }
            const buf = Buffer.concat(chunks);
            if (buf.length === 0) {
              console.error('Error: No content provided on stdin');
              process.exitCode = 1;
              return;
            }
            content = buf;
          }

          const result = await workflowWriteFile(
            config.data,
            workflowName,
            taskId,
            opts.key!,
            content,
            config,
            opts.flush,
          );
          console.log(JSON.stringify(result));
          if (!result.valid) process.exitCode = 1;
        } catch (err) {
          console.error(`Error: ${(err as Error).message}`);
          process.exitCode = 1;
        }
      },
    );

  workflow
    .command('done')
    .description('Mark a task as done. Auto-archives workflow when all tasks are done.')
    .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
    .requiredOption('--task <id>', 'Task id to mark done')
    .option(
      '--loaded <json>',
      'JSON payload with stage context (task_file, rules, config_rules, config_instructions) and task validation results',
    )
    .option('--summary <text>', 'Short human-readable result summary for the task')
    .option('--data <json>', 'JSON object with data results — keys must match declared result entries')
    .action(async (opts: { workflow: string; task: string; loaded?: string; summary?: string; data?: string }) => {
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
      let dataPayload: Record<string, unknown> | undefined;
      if (opts.data) {
        try {
          dataPayload = JSON.parse(opts.data);
          if (typeof dataPayload !== 'object' || dataPayload === null || Array.isArray(dataPayload)) {
            console.error('Error: --data must be a JSON object');
            process.exitCode = 1;
            return;
          }
        } catch {
          console.error('Error: --data must be valid JSON');
          process.exitCode = 1;
          return;
        }
      }
      try {
        const result = await workflowDone(config.data, opts.workflow, opts.task, loaded, {
          summary: opts.summary,
          data: dataPayload,
          config,
        });
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
    .command('wait')
    .description('Set workflow status to waiting (AI needs user input).')
    .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
    .option('--message <text>', 'Question or prompt to display in the workflow panel')
    .action((opts: { workflow: string; message?: string }) => {
      const config = loadConfig();
      try {
        workflowWait(config.data, opts.workflow, opts.message);
        console.log(
          JSON.stringify({
            status: 'waiting',
            workflow: opts.workflow,
            ...(opts.message ? { message: opts.message } : {}),
          }),
        );
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
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
