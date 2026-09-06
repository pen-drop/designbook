/** Runtime operations consume only the saved definition, never skill discovery. */
import { mkdir, readFile, rename, writeFile, unlink, link } from 'node:fs/promises';
import { dirname, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { dump, load } from 'js-yaml';
import {
  createDocument,
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

/** flock holds a kernel-owned cross-process lock; process exit releases it. */
async function withLock<T>(path: string, action: () => Promise<T>): Promise<T> {
  const { spawn } = await import('node:child_process');
  const child = spawn('flock', ['-x', `${path}.lock`, 'sh', '-c', 'printf ready; cat >/dev/null'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Workflow lock failed (${code})`)));
    child.stdout.once('data', () => resolve());
  });
  try {
    return await action();
  } finally {
    child.stdin.end();
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
    const doc = await readDocument(path);
    const definition = JSON.stringify(doc.definition);
    let result: T;
    try {
      result = await action(doc);
    } catch (error) {
      if (definition !== JSON.stringify(doc.definition)) throw new Error('Runtime modified the workflow definition');
      await writeAtomic(path, doc);
      throw error;
    }
    if (definition !== JSON.stringify(doc.definition)) throw new Error('Runtime modified the workflow definition');
    await writeAtomic(path, doc);
    return result;
  });
}

function taskDefinition(doc: WorkflowDocument, id: string): TaskDefinition {
  const task = doc.definition.tasks.find((task) => task.id === id);
  if (!task) throw new Error(`Unknown task ${id}`);
  return task;
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
    if (state.status === 'blocked' && !correction?.trim())
      throw new Error('Resuming a blocked task requires a concrete corrective action');
    if (correction) state.corrections.push({ at: new Date().toISOString(), action: correction });
    state.status = 'in-progress';
    state.started_at ??= new Date().toISOString();
    delete state.blocker;
    doc.state.status = 'running';
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
            validationPath = `${output.path}.${doc.definition.id}.${id}.debo`;
            await mkdir(dirname(validationPath), { recursive: true });
            await writeFile(validationPath, serializeForPath(output.path, value, output.schema as SchemaProperty));
            staged.push({ path: validationPath, target: output.path });
          }
          if (validationPath && output.validators.length && errors.length === 0) {
            const findings = await validateByKeys(
              output.validators,
              validationPath,
              doc.definition.config as unknown as DesignbookConfig,
            );
            if (findings.valid !== true) errors.push(findings.error ?? 'File validation did not pass');
          }
        } catch (error) {
          if (!output.required && output.submission === 'direct' && (error as NodeJS.ErrnoException).code === 'ENOENT')
            continue;
          errors.push((error as Error).message);
        }
        state.results[key] = {
          ...(value !== undefined ? { value } : {}),
          valid: errors.length === 0,
          errors,
          validated_at: new Date().toISOString(),
        };
        state.errors.push(...errors.map((error) => `${key}: ${error}`));
      }
      if (state.errors.length) throw new Error(`Task ${id} validation failed: ${state.errors.join('; ')}`);
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
      await Promise.all(staged.map((file) => unlink(file.path).catch(() => {})));
    }
  });
}
