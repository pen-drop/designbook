/** Runtime operations consume only the saved definition, never skill discovery. */
import { mkdir, readFile, rename, rm, rmdir, stat, writeFile, unlink, link, open } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { createHash, randomUUID } from 'node:crypto';
import { dump, load } from 'js-yaml';
import {
  createDocument,
  definitionDigest,
  validateDocument,
  schemaValidator,
  type WorkflowDefinition,
  type WorkflowDocument,
  type TaskDefinition,
} from './workflow-document.js';
import { serializeForPath, type SchemaProperty } from './workflow-serialize.js';
import { validateByKeys } from './validation-registry.js';
import type { DesignbookConfig } from './config.js';

export async function readDocument(path: string): Promise<WorkflowDocument> {
  const doc = load(await readFile(path, 'utf8')) as WorkflowDocument;
  validateDocument(doc);
  return doc;
}

async function writeAtomic(path: string, document: WorkflowDocument): Promise<void> {
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, dump(document, { noRefs: true }));
    await rename(tmp, path);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

/** A held lock waits this long for its holder before the caller gives up. */
const LOCK_WAIT_MS = 30_000;
/** A lock file older than this belongs to a process that died without releasing it. */
const LOCK_STALE_MS = 120_000;

/**
 * Cross-process lock built from an exclusive create, so every platform that runs
 * the CLI locks identically and no external binary is required.
 */
async function withLock<T>(path: string, action: () => Promise<T>): Promise<T> {
  const lock = `${path}.lock`;
  const deadline = Date.now() + LOCK_WAIT_MS;
  for (;;) {
    try {
      const handle = await open(lock, 'wx');
      await handle.writeFile(`${process.pid} ${new Date().toISOString()}\n`);
      await handle.close();
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      const age = await stat(lock).then(
        (stats) => Date.now() - stats.mtimeMs,
        () => 0,
      );
      if (age > LOCK_STALE_MS) await unlink(lock).catch(() => {});
      else if (Date.now() > deadline) throw new Error(`Workflow lock ${lock} is still held after ${LOCK_WAIT_MS}ms`);
      else await sleep(25);
    }
  }
  try {
    return await action();
  } finally {
    await unlink(lock).catch(() => {});
  }
}

export async function saveDefinition(path: string, definition: WorkflowDefinition): Promise<WorkflowDocument> {
  const doc = createDocument(definition);
  await mkdir(dirname(path), { recursive: true });
  // Exclusive create prevents replacing an existing run, including its immutable definition.
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, dump(doc, { noRefs: true }), { flag: 'wx' });
    await link(tmp, path);
  } finally {
    await unlink(tmp).catch(() => {});
  }
  return doc;
}

async function mutate<T>(path: string, action: (doc: WorkflowDocument) => Promise<T>): Promise<T> {
  return withLock(path, async () => {
    // readDocument already rejected any definition edited between two CLI calls; this guards the
    // remaining window, where the running action itself would alter it.
    const doc = await readDocument(path);
    const assertUnchanged = (cause?: unknown) => {
      if (doc.state.definition_digest !== definitionDigest(doc.definition))
        throw new Error('Runtime modified the workflow definition', { cause });
    };
    let result: T;
    try {
      result = await action(doc);
    } catch (error) {
      assertUnchanged(error);
      await writeAtomic(path, doc);
      throw error;
    }
    assertUnchanged();
    await writeAtomic(path, doc);
    return result;
  });
}

function taskDefinition(doc: WorkflowDocument, id: string): TaskDefinition {
  const task = doc.definition.tasks.find((task) => task.id === id);
  if (!task) throw new Error(`Unknown task ${id}`);
  return task;
}

/** Private staging directory for one task's submitted files, next to their target. */
function stageDir(target: string, workflow: string, task: string): string {
  return join(dirname(target), '.debo-stage', `${workflow}.${task}`);
}

/** A recorded blockade outranks the tasks still running around it. */
function workflowStatus(doc: WorkflowDocument): WorkflowDocument['state']['status'] {
  return Object.values(doc.state.tasks).some((task) => task.status === 'blocked') ? 'blocked' : 'running';
}

function assertReady(doc: WorkflowDocument, task: TaskDefinition): void {
  if (doc.state.tasks[task.id]!.status === 'done') throw new Error(`Task ${task.id} is already done`);
  const pending = task.depends_on.filter((id) => doc.state.tasks[id]!.status !== 'done');
  if (pending.length) throw new Error(`Unfinished dependencies: ${pending.join(', ')}`);
}

export async function taskContext(path: string, id: string) {
  const doc = await readDocument(path);
  const task = taskDefinition(doc, id);
  return {
    task,
    state: doc.state.tasks[id],
    config: doc.definition.config,
    context: task.context.map((ref) => doc.definition.context[ref]),
    schemas: doc.definition.schemas,
    inputs: Object.fromEntries(
      Object.entries(task.inputs).map(([key, ref]) => [
        key,
        {
          definition: taskDefinition(doc, ref.task).outputs[ref.result],
          state: doc.state.tasks[ref.task]!.results[ref.result],
        },
      ]),
    ),
  };
}

export async function startTask(path: string, id: string, correction?: string): Promise<WorkflowDocument> {
  return mutate(path, async (doc) => {
    const task = taskDefinition(doc, id);
    assertReady(doc, task);
    const state = doc.state.tasks[id]!;
    // Every resumption — blocked, claimed by another agent, or failed validation — needs a new
    // action, so an identical attempt can never be repeated as if it were progress.
    if ((state.status !== 'pending' || state.attempts > 0) && !correction?.trim())
      throw new Error(
        `Task ${id} was already attempted (status ${state.status}, ${state.attempts} attempt(s)); resuming it requires a concrete corrective action`,
      );
    if (correction) state.corrections.push({ at: new Date().toISOString(), action: correction });
    state.status = 'in-progress';
    state.started_at ??= new Date().toISOString();
    delete state.blocker;
    doc.state.status = workflowStatus(doc);
    doc.state.started_at ??= state.started_at;
    return doc;
  });
}

export async function blockTask(
  path: string,
  id: string,
  reason: string,
  correction: string,
): Promise<WorkflowDocument> {
  if (!reason.trim() || !correction.trim()) throw new Error('Blockade requires a reason and attempted correction');
  return mutate(path, async (doc) => {
    assertReady(doc, taskDefinition(doc, id));
    const state = doc.state.tasks[id]!;
    state.status = 'blocked';
    state.blocker = reason;
    state.corrections.push({ at: new Date().toISOString(), action: correction });
    doc.state.status = 'blocked';
    return doc;
  });
}

export async function completeTask(
  path: string,
  id: string,
  payload: Record<string, unknown>,
  summary?: string,
): Promise<WorkflowDocument> {
  return mutate(path, async (doc) => {
    const task = taskDefinition(doc, id);
    assertReady(doc, task);
    const state = doc.state.tasks[id]!;
    if (state.status !== 'in-progress') throw new Error(`Start task ${id} before submitting results`);
    const unknown = Object.keys(payload).filter((key) => !Object.hasOwn(task.outputs, key));
    if (unknown.length) throw new Error(`Unknown output keys: ${unknown.join(', ')}`);
    state.attempts++;
    state.errors = [];
    state.results = {};
    const staged: Array<{ path: string; target: string }> = [];
    const ajv = schemaValidator(doc.definition.schemas);
    try {
      for (const [key, output] of Object.entries(task.outputs)) {
        let value: unknown;
        let sha256: string | undefined;
        const errors: string[] = [];
        const submitted = Object.hasOwn(payload, key);
        if (!submitted && output.submission === 'data') {
          if (output.required) errors.push('Required result was not submitted');
          else continue;
        }
        let validationPath = output.path;
        try {
          if (output.submission === 'direct') {
            const bytes = await readFile(output.path!);
            sha256 = createHash('sha256').update(bytes).digest('hex');
            const extension = extname(output.path!).toLowerCase();
            value = Object.keys(output.schema).length
              ? extension === '.yml' || extension === '.yaml'
                ? load(bytes.toString('utf8'))
                : extension === '.json'
                  ? JSON.parse(bytes.toString('utf8'))
                  : bytes.toString('utf8')
              : null;
          } else value = payload[key];
          const validate = ajv.compile(output.schema);
          if (!validate(value)) errors.push(ajv.errorsText(validate.errors));
          if (submitted && output.path && output.submission === 'data' && errors.length === 0) {
            // Staged beside the target under its own directory, so the file name a validator
            // sees — extension included — is exactly the one it will have on disk.
            validationPath = join(stageDir(output.path, doc.definition.id, id), basename(output.path));
            await mkdir(dirname(validationPath), { recursive: true });
            await writeFile(validationPath, serializeForPath(output.path, value, output.schema as SchemaProperty));
            staged.push({ path: validationPath, target: output.path });
          }
          if (!sha256 && validationPath && errors.length === 0)
            sha256 = createHash('sha256')
              .update(await readFile(validationPath))
              .digest('hex');
          if (validationPath && output.validators.length && errors.length === 0) {
            const findings = await validateByKeys(
              output.validators,
              validationPath,
              doc.definition.config as unknown as DesignbookConfig,
            );
            if (findings.valid !== true) errors.push(findings.error ?? 'File validation did not pass');
          }
          if (
            sha256 &&
            validationPath &&
            createHash('sha256')
              .update(await readFile(validationPath))
              .digest('hex') !== sha256
          )
            errors.push('Artifact changed during validation');
        } catch (error) {
          if (!output.required && output.submission === 'direct' && (error as NodeJS.ErrnoException).code === 'ENOENT')
            continue;
          errors.push((error as Error).message);
        }
        state.results[key] = {
          ...(value !== undefined ? { value } : {}),
          ...(sha256 && errors.length === 0 ? { sha256 } : {}),
          valid: errors.length === 0,
          errors,
          validated_at: new Date().toISOString(),
        };
        state.errors.push(...errors.map((error) => `${key}: ${error}`));
      }
      if (state.errors.length) {
        // The attempt ended; only a start carrying a corrective action reopens the task.
        state.status = 'pending';
        throw new Error(`Task ${id} validation failed: ${state.errors.join('; ')}`);
      }
      for (const file of staged) await rename(file.path, file.target);
      state.status = 'done';
      state.completed_at = new Date().toISOString();
      if (summary) state.summary = summary;
      if (Object.values(doc.state.tasks).every((task) => task.status === 'done')) {
        doc.state.status = 'completed';
        doc.state.completed_at = state.completed_at;
      }
      return doc;
    } finally {
      const stageDirs = new Set(staged.map((file) => dirname(file.path)));
      await Promise.all([...stageDirs].map((dir) => rm(dir, { recursive: true, force: true })));
      // Best-effort: the shared parent disappears once the last task released its own directory.
      await Promise.all([...new Set([...stageDirs].map(dirname))].map((dir) => rmdir(dir).catch(() => {})));
    }
  });
}
