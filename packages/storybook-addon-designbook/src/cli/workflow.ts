import { resolve, dirname } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import type { Command } from 'commander';
import { loadConfig, findConfig, resolveSkillsRoot } from '../config.js';
import {
  workflowCreate,
  workflowResult,
  workflowGetFile,
  workflowList,
  workflowDone,
  workflowAbandon,
  workflowWait,
  workflowResume,
  workflowMerge,
  readWorkflow,
  expandTasksFromParams,
} from '../workflow.js';
import { load as parseYaml } from 'js-yaml';
import { globSync } from 'glob';
import {
  resolveAllStages,
  parseFrontmatter,
  buildEnvMap,
  expandResultDeclarations,
  resolveSchemaRef,
  rewriteRefsInSchema,
  type ResolvedStep,
  type ResultDeclaration,
} from '../workflow-resolve.js';
import { resolveParams } from '../resolvers/registry.js';
import type { ResolverContext } from '../resolvers/types.js';
import { renderSubmitResultsHint } from './submit-results-hint.js';
import { initLogger, log } from '../logger.js';

// Resolve a workflow .md file from a workflow ID by scanning skills directories (same glob mechanism as tasks/rules).
function resolveWorkflowFile(workflowId: string, agentsDir: string): string {
  const matches = globSync(`skills/**/workflows/${workflowId}.md`, { cwd: agentsDir, absolute: true });
  if (matches.length === 0) {
    throw new Error(`Workflow file not found for "${workflowId}". No match for skills/**/workflows/${workflowId}.md`);
  }
  return matches[0]!;
}

export interface InstructionsResult {
  stage: string;
  task_file: string | undefined;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  schema?: import('../schema-block.js').SchemaBlock;
  submit_results?: string;
}

export type InstructionsError = { error: string; availableStages: string[] | null };

/**
 * Build the instructions payload for a given (workflow, stage) pair by reading the tasks.yml
 * at `<dataDir>/workflows/changes/<workflow>/tasks.yml`. Exported for integration testing.
 */
export function buildInstructions(
  dataDir: string,
  workflowName: string,
  stageName: string,
): InstructionsResult | InstructionsError {
  const tasksYmlPath = resolve(dataDir, 'workflows', 'changes', workflowName, 'tasks.yml');
  if (!existsSync(tasksYmlPath)) {
    return { error: `workflow not found: ${workflowName}`, availableStages: null };
  }

  const data = readWorkflow(tasksYmlPath);

  // Resolve stage name: try direct key first, then look up via stages definition
  let resolvedKey = stageName;
  if (data.stage_loaded && !data.stage_loaded[resolvedKey]) {
    const stageEntry = data.stages?.[stageName];
    if (stageEntry?.steps?.[0] && data.stage_loaded[stageEntry.steps[0]]) {
      resolvedKey = stageEntry.steps[0];
    }
  }

  if (!data.stage_loaded || !data.stage_loaded[resolvedKey]) {
    return {
      error: `no resolved data for stage "${stageName}"`,
      availableStages: data.stage_loaded ? Object.keys(data.stage_loaded) : [],
    };
  }

  // Paths already resolved by readWorkflow
  const rawStage = data.stage_loaded[resolvedKey]!;
  const stage = Array.isArray(rawStage) ? rawStage[0]! : rawStage;
  const taskFile = stage.task_file || undefined;
  const rules = stage.rules ?? [];
  const blueprints = stage.blueprints ?? [];

  // Include schema if present (unified schema block from resolution time)
  const schema = stage.schema;
  const submitResults = schema ? renderSubmitResultsHint(resolvedKey, schema.result) : null;

  return {
    stage: stageName,
    task_file: taskFile,
    rules,
    blueprints,
    config_rules: stage.config_rules ?? [],
    config_instructions: stage.config_instructions ?? [],
    ...(schema ? { schema } : {}),
    ...(submitResults ? { submit_results: submitResults } : {}),
  };
}

export function register(program: Command): void {
  const workflow = program.command('workflow').description('Manage workflow tracking');

  workflow.option('--log', 'Tag this CLI call in dbo.log (for post-workflow audit via --research)');

  // Initialize logger before every subcommand
  workflow.hook('preAction', () => {
    const config = loadConfig();
    const logTag = !!(workflow.opts() as { log?: boolean }).log;
    initLogger(config.data, logTag);
  });

  workflow
    .command('list')
    .description('List workflows for a given workflow id')
    .requiredOption('--workflow <id>', 'Workflow identifier (e.g., debo-design-shell)')
    .option('--include-archived', 'Also include archived workflows')
    .action((opts: { workflow: string; includeArchived?: boolean }) => {
      const config = loadConfig();
      const names = workflowList(config.data, opts.workflow, opts.includeArchived);
      log({ cmd: 'workflow list', args: { workflow: opts.workflow }, result: names });
      for (const n of names) console.log(n);
    });

  workflow
    .command('create')
    .description('Create a new workflow tracking file.')
    .requiredOption('--workflow <id>', 'Workflow identifier (e.g., vision)')
    .option('--title <title>', 'Human-readable workflow title')
    .option('--parent <name>', 'Triggering workflow name when started via a hook')
    .option('--params <json>', 'JSON object of initial params (e.g. from parent dispatch)')
    .action(async (opts: { workflow: string; title?: string; parent?: string; params?: string }) => {
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
        const workflowFilePath = resolveWorkflowFile(opts.workflow, agentsDir);
        const resolved = await resolveAllStages(workflowFilePath, config, rawConfig, agentsDir);

        // ── Resolve phase: run param resolvers ────────────────────────
        const wfFm = parseFrontmatter(workflowFilePath) as Record<string, unknown> | null;
        const wfParamsRaw = wfFm?.params as Record<string, Record<string, unknown>> | undefined;

        // Merge task-declared resolvers into the workflow-level param schema so
        // one resolver pass covers both levels. Task-level `resolve:` takes
        // precedence over a missing workflow-level entry; existing workflow-level
        // resolvers stay untouched.
        const wfParams: Record<string, Record<string, unknown>> | undefined = wfParamsRaw
          ? { ...wfParamsRaw }
          : Object.values(resolved.expected_params).some((p) => p.resolve)
            ? {}
            : undefined;
        if (wfParams) {
          for (const [key, expected] of Object.entries(resolved.expected_params)) {
            if (!expected.resolve) continue;
            const existing = wfParams[key];
            if (existing && 'resolve' in existing) continue;
            const base: Record<string, unknown> = existing
              ? { ...existing }
              : { type: 'string', ...(expected.default !== undefined ? { default: expected.default } : {}) };
            base.resolve = expected.resolve;
            if (expected.from) base.from = expected.from;
            wfParams[key] = base;
          }
        }

        // Apply workflow-level param defaults before resolver/task-expansion so
        // downstream steps see them without the caller having to repeat defaults.
        if (wfParams) {
          initialParams = initialParams ?? {};
          for (const [key, decl] of Object.entries(wfParams)) {
            if (initialParams[key] !== undefined) continue;
            if (decl && typeof decl === 'object' && 'default' in decl) {
              initialParams[key] = (decl as { default: unknown }).default;
            }
          }
        }

        if (initialParams && wfParams) {
          const hasResolvers = Object.values(wfParams).some(
            (decl) => decl && typeof decl === 'object' && 'resolve' in decl,
          );

          if (hasResolvers) {
            const resolverContext: ResolverContext = { config, params: initialParams };
            const resolveResult = await resolveParams(wfParams, resolverContext);
            initialParams = resolveResult.params as Record<string, unknown>;
          }
        }

        const title = opts.title ?? resolved.title;

        // Find first stage with a resolved step
        let firstStepName: string | undefined;
        let firstStageName: string | undefined;
        let firstResolved: ResolvedStep | undefined;
        if (resolved.stages) {
          for (const [stageName, stageDef] of Object.entries(resolved.stages)) {
            const step = (stageDef as { steps?: string[] }).steps?.[0];
            if (!step) continue;
            const raw = resolved.step_resolved[step];
            const res = raw && !Array.isArray(raw) ? raw : undefined;
            if (res) {
              firstStepName = step;
              firstStageName = stageName;
              firstResolved = res;
              break;
            }
          }
        }
        // Build result declarations from first task's frontmatter, resolving $ref schemas
        let firstResult: Record<string, { path?: string; schema?: object; validators?: string[] }> | undefined;
        const firstSchemas: Record<string, object> = {};
        if (firstResolved) {
          const firstFm = parseFrontmatter(firstResolved.task_file);
          const resultDecl = firstFm?.result as Record<string, unknown> | undefined;
          const resultDeclProperties = resultDecl?.properties as Record<string, ResultDeclaration> | undefined;
          const envMap = buildEnvMap(config);
          firstResult = await expandResultDeclarations(
            resultDecl,
            undefined,
            initialParams ?? {},
            envMap,
            undefined,
            true,
          );

          // Resolve $ref in result schemas inline
          if (firstResult && resultDeclProperties) {
            const skillsRoot = resolve(agentsDir, 'skills');
            for (const [key, decl] of Object.entries(resultDeclProperties)) {
              // Top-level $ref: replace schema with the resolved definition
              if (decl.$ref && firstResult[key]) {
                const { typeName, schema } = resolveSchemaRef(decl.$ref, firstResolved.task_file, skillsRoot);
                firstSchemas[typeName] = schema;
                firstResult[key]!.schema = schema;
              }
              // Nested $ref at any depth (e.g. items.$ref, properties.foo.$ref):
              // rewrite file-system refs to AJV-compatible local refs
              if (firstResult[key]?.schema && typeof firstResult[key]!.schema === 'object') {
                rewriteRefsInSchema(
                  firstResult[key]!.schema as Record<string, unknown>,
                  firstResolved.task_file,
                  skillsRoot,
                  firstSchemas,
                );
              }
            }
          }
        }

        const firstTaskId = firstStepName ?? 'task-1';

        // Intake-skip: when caller passes a non-empty `components` param to
        // design-component, seed scope from it and pre-expand the next stage's
        // tasks at create-time (same logic the engine runs at stage transitions).
        const skipIntake =
          opts.workflow === 'design-component' &&
          Array.isArray(initialParams?.components) &&
          (initialParams!.components as unknown[]).length > 0;
        const initialScope: Record<string, unknown> | undefined = skipIntake
          ? { components: initialParams!.components }
          : undefined;

        const workspaceRoot = (config.workspace as string | undefined) ?? configDir;
        const envMap = buildEnvMap(config);

        // Build the initial task list. Default: a singleton first task for the
        // first resolved stage. Skip-intake: pre-expand the second stage from
        // seeded scope and use those expanded tasks instead.
        type CreateTask = Parameters<typeof workflowCreate>[3][number];
        let firstTask: CreateTask[] = [];
        const taskIds: Record<string, string> = {};

        if (skipIntake && resolved.stages) {
          // Find the stage immediately after the first one (the intake stage we're skipping).
          const stageNames = Object.keys(resolved.stages);
          const skipStageIdx = firstStageName ? stageNames.indexOf(firstStageName) : 0;
          const nextStageName = stageNames[skipStageIdx + 1];
          const nextStageDef = nextStageName ? resolved.stages[nextStageName] : undefined;
          if (nextStageName && nextStageDef) {
            const expanded = await expandTasksFromParams(
              resolved.step_resolved,
              { [nextStageName]: nextStageDef },
              initialParams ?? {},
              [],
              envMap,
              initialScope,
              config,
            );
            firstTask = expanded.map((t) => ({
              id: t.id,
              title: t.title,
              type: t.type,
              step: t.step,
              stage: t.stage,
              files: t.files,
              ...(t.result ? { result: t.result } : {}),
              task_file: t.task_file,
              rules: t.rules,
              blueprints: t.blueprints,
              config_rules: t.config_rules,
              config_instructions: t.config_instructions,
            }));
            for (const t of firstTask) {
              if (t.step) taskIds[t.step] = t.id;
            }
          }
        } else if (firstStepName && firstStageName && firstResolved) {
          firstTask = [
            {
              id: firstTaskId,
              title: `${title}: ${firstStepName}`,
              type: 'data' as const,
              step: firstStepName,
              stage: firstStageName,
              files: [] as Array<{ path: string; key: string; validators: string[] }>,
              ...(firstResult ? { result: firstResult } : {}),
              task_file: firstResolved.task_file,
              rules: firstResolved.rules,
              blueprints: firstResolved.blueprints,
              config_rules: firstResolved.config_rules,
              config_instructions: firstResolved.config_instructions,
            },
          ];
          taskIds[firstStepName] = firstTaskId;
        }

        const name = workflowCreate(
          config.data,
          opts.workflow,
          title,
          firstTask,
          resolved.stages,
          opts.parent,
          resolved.step_resolved,
          resolved.engine,
          initialParams,
          workspaceRoot,
          firstSchemas,
          envMap,
          initialScope,
        );

        // Output JSON with workflow name + all resolved steps
        const createResult = {
          name,
          steps: resolved.steps,
          ...(resolved.stages ? { stages: resolved.stages } : {}),
          ...(resolved.engine ? { engine: resolved.engine } : {}),
          step_resolved: resolved.step_resolved,
          expected_params: resolved.expected_params,
          ...(Object.keys(taskIds).length > 0 ? { task_ids: taskIds } : {}),
        };
        log({ cmd: 'workflow create', args: { workflow: opts.workflow, title }, result: { name } });
        console.log(JSON.stringify(createResult, null, 2));
      } catch (err) {
        log({ cmd: 'workflow create', args: { workflow: opts.workflow }, error: (err as Error).message });
        console.error(`Error: ${(err as Error).message}`);
        console.error((err as Error).stack);
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
      const result = buildInstructions(config.data, opts.workflow, opts.stage);

      if ('error' in result) {
        const suffix =
          result.availableStages === null
            ? ''
            : `. Available stages: ${result.availableStages.length > 0 ? result.availableStages.join(', ') : 'none'}.`;
        console.error(`Error: ${result.error}${suffix}`);
        process.exitCode = 1;
        return;
      }

      log({
        cmd: 'workflow instructions',
        args: { workflow: opts.workflow, stage: opts.stage },
        result: { stage: opts.stage, rules: result.rules.length, blueprints: result.blueprints.length },
      });
      console.log(JSON.stringify(result, null, 2));
    });

  workflow
    .command('get-file <workflow-name> <task-id>')
    .description('Return the staged path for a file key (for external writers like Playwright)')
    .requiredOption('--key <key>', 'File key as declared in task frontmatter')
    .action((workflowName: string, taskId: string, opts: { key: string }) => {
      const config = loadConfig();
      try {
        const result = workflowGetFile(config.data, workflowName, taskId, opts.key);
        log({ cmd: 'workflow get-file', args: { workflow: workflowName, task: taskId, key: opts.key }, result });
        console.log(JSON.stringify(result));
      } catch (err) {
        log({
          cmd: 'workflow get-file',
          args: { workflow: workflowName, task: taskId, key: opts.key },
          error: (err as Error).message,
        });
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  // ── workflow result ─────────────────────────────────────────────────────────
  workflow
    .command('result')
    .description(
      'Register an externally-written file result (submission: direct). For data results use --json. All other file results go via workflow done --data.',
    )
    .requiredOption('--workflow <name>', 'Workflow name')
    .requiredOption('--task <id>', 'Task id')
    .requiredOption('--key <key>', 'Result key as declared in task result: frontmatter')
    .option('--json <data>', 'Data result value (inline JSON).')
    .action(async (opts: { workflow: string; task: string; key: string; json?: string }) => {
      const config = loadConfig();
      try {
        let content: unknown | null;
        if (opts.json !== undefined) {
          // Data result via --json
          try {
            content = JSON.parse(opts.json);
          } catch (err) {
            console.error(`Error parsing --json: ${(err as Error).message}`);
            process.exitCode = 1;
            return;
          }
        } else {
          // External file result: already written by external tool
          content = null;
        }

        const result = await workflowResult(config.data, opts.workflow, opts.task, opts.key, content, config);
        log({
          cmd: 'workflow result',
          args: { workflow: opts.workflow, task: opts.task, key: opts.key },
          result: { valid: result.valid },
        });
        console.log(JSON.stringify(result));
        if (!result.valid) process.exitCode = 1;
      } catch (err) {
        log({
          cmd: 'workflow result',
          args: { workflow: opts.workflow, task: opts.task, key: opts.key },
          error: (err as Error).message,
        });
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

        log({
          cmd: 'workflow done',
          args: { workflow: opts.workflow, task: opts.task },
          result: { archived: result.archived, stage_complete: response?.stage_complete },
        });

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
        log({
          cmd: 'workflow done',
          args: { workflow: opts.workflow, task: opts.task },
          error: (err as Error).message,
        });
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
        log({ cmd: 'workflow wait', args: { workflow: opts.workflow } });
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
    .command('resume')
    .description('Transition workflow status from waiting to running (call after user answers).')
    .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
    .action((opts: { workflow: string }) => {
      const config = loadConfig();
      try {
        workflowResume(config.data, opts.workflow);
        log({ cmd: 'workflow resume', args: { workflow: opts.workflow } });
        console.log(JSON.stringify({ status: 'running', workflow: opts.workflow }));
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });

  workflow
    .command('config')
    .description(
      'Return a single config variable value. For task bodies that need one $DESIGNBOOK_* var without full eval.',
    )
    .requiredOption('--var <name>', 'Variable name (e.g. DESIGNBOOK_DIRS_CSS)')
    .action((opts: { var: string }) => {
      const config = loadConfig();
      const env = buildEnvMap(config);
      const value = env[opts.var];
      if (value === undefined) {
        console.error(`Error: unknown variable "${opts.var}"`);
        process.exitCode = 1;
        return;
      }
      console.log(value);
    });

  workflow
    .command('abandon')
    .description('Archive a workflow as incomplete (user declined to resume).')
    .requiredOption('--workflow <name>', 'Workflow name (e.g., debo-vision-2026-03-17-a3f7)')
    .action((opts: { workflow: string }) => {
      const config = loadConfig();
      try {
        const data = workflowAbandon(config.data, opts.workflow);
        log({ cmd: 'workflow abandon', args: { workflow: opts.workflow } });
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
        log({ cmd: 'workflow merge', args: { workflow: opts.workflow }, result: { branch: result.branch } });
        console.log(`✓ Workflow ${opts.workflow} merged and archived`);
        console.log(`  Branch:  ${result.branch} (deleted)`);
        console.log(`  Commit:  workflow: ${opts.workflow}`);
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`);
        process.exitCode = 1;
      }
    });
}
