/** Canonical agent-authored workflow definition and mutable execution state. */
import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { getValidatorKeys } from './validation-registry.js';

export interface EmbeddedContent {
  source: string;
  content: string;
}

export interface OutputDefinition {
  required: boolean;
  schema: object;
  path?: string;
  submission: 'data' | 'direct';
  validators: string[];
}

export interface TaskDefinition {
  id: string;
  title: string;
  type: string;
  target: string;
  depends_on: string[];
  params: Record<string, unknown>;
  params_schema: object;
  inputs: Record<string, { task: string; result: string }>;
  instructions: EmbeddedContent;
  context: string[];
  outputs: Record<string, OutputDefinition>;
}

export interface WorkflowDefinition {
  id: string;
  title: string;
  template: EmbeddedContent;
  workspace_root: string;
  config: Record<string, unknown>;
  inputs: Record<string, unknown>;
  inputs_schema: object;
  context: Record<string, EmbeddedContent>;
  schemas: Record<string, object>;
  tasks: TaskDefinition[];
}

export interface OutputState {
  value?: unknown;
  valid: boolean;
  errors: string[];
  validated_at: string;
}

export interface TaskState {
  status: 'pending' | 'in-progress' | 'blocked' | 'done';
  attempts: number;
  started_at?: string;
  completed_at?: string;
  summary?: string;
  blocker?: string;
  corrections: Array<{ at: string; action: string }>;
  results: Record<string, OutputState>;
  errors: string[];
}

export interface WorkflowDocument {
  definition: WorkflowDefinition;
  state: {
    status: 'pending' | 'running' | 'blocked' | 'completed';
    /** Digest of the definition as saved; any later edit to it invalidates the run. */
    definition_digest: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    tasks: Record<string, TaskState>;
  };
}

const text = { type: 'string', minLength: 1 };
const stringList = { type: 'array', items: text, uniqueItems: true };
const object = { type: 'object' };
const content = {
  type: 'object',
  required: ['source', 'content'],
  additionalProperties: false,
  properties: { source: text, content: text },
};

/** Structural schema; graph, schema references and concrete targets are checked below. */
export const workflowDefinitionSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'id',
    'title',
    'template',
    'workspace_root',
    'config',
    'inputs',
    'inputs_schema',
    'context',
    'schemas',
    'tasks',
  ],
  properties: {
    id: { ...text, pattern: '^[a-z0-9][a-z0-9_-]*$' },
    title: text,
    template: content,
    workspace_root: text,
    config: object,
    inputs: object,
    inputs_schema: object,
    context: { type: 'object', additionalProperties: content },
    schemas: { type: 'object', additionalProperties: object },
    tasks: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id',
          'title',
          'type',
          'target',
          'depends_on',
          'params',
          'params_schema',
          'inputs',
          'instructions',
          'context',
          'outputs',
        ],
        properties: {
          id: { ...text, pattern: '^[a-z0-9][a-z0-9_-]*$' },
          title: text,
          type: text,
          target: text,
          depends_on: stringList,
          params: object,
          params_schema: object,
          instructions: content,
          context: stringList,
          inputs: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              required: ['task', 'result'],
              additionalProperties: false,
              properties: { task: text, result: text },
            },
          },
          outputs: {
            type: 'object',
            minProperties: 1,
            additionalProperties: {
              type: 'object',
              required: ['required', 'schema', 'submission', 'validators'],
              additionalProperties: false,
              properties: {
                required: { type: 'boolean' },
                schema: object,
                path: text,
                submission: { enum: ['data', 'direct'] },
                validators: stringList,
              },
            },
          },
        },
      },
    },
  },
};

export function schemaValidator(schemas: Record<string, object>): Ajv {
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const [name, schema] of Object.entries(schemas)) ajv.addSchema(schema, `#/definitions/${name}`);
  return ajv;
}

function assertConcrete(value: unknown, label: string): void {
  if (/\{\{|\$DESIGNBOOK_|\$\{/.test(JSON.stringify(value))) {
    throw new Error(`${label} contains unresolved structural inputs`);
  }
}

export function validateDefinition(raw: unknown): asserts raw is WorkflowDefinition {
  const structural = new Ajv({ allErrors: true }).compile(workflowDefinitionSchema);
  if (!structural(raw)) throw new Error(`Invalid workflow definition: ${JSON.stringify(structural.errors)}`);
  const def = raw as unknown as WorkflowDefinition;
  if (!isAbsolute(def.workspace_root)) throw new Error('workspace_root must be absolute');
  assertConcrete(def.inputs, 'Workflow inputs');
  const ajv = schemaValidator(def.schemas);
  if (!ajv.validate(def.inputs_schema, def.inputs)) throw new Error(`Invalid workflow inputs: ${ajv.errorsText()}`);
  const tasks = new Map(def.tasks.map((task) => [task.id, task]));
  if (tasks.size !== def.tasks.length) throw new Error('Duplicate task IDs');
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string): void {
    if (visiting.has(id)) throw new Error(`Dependency cycle at ${id}`);
    if (visited.has(id)) return;
    const task = tasks.get(id);
    if (!task) throw new Error(`Unknown dependency ${id}`);
    visiting.add(id);
    task.depends_on.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  def.tasks.forEach((task) => visit(task.id));
  function predecessors(task: TaskDefinition): Set<string> {
    return new Set(task.depends_on.flatMap((id) => [id, ...predecessors(tasks.get(id)!)]));
  }
  const validatorKeys = getValidatorKeys();
  const paths = new Map<string, string[]>();
  for (const task of def.tasks) {
    assertConcrete([task.target, task.params], `Task ${task.id}`);
    if (!ajv.validate(task.params_schema, task.params))
      throw new Error(`Invalid params for ${task.id}: ${ajv.errorsText()}`);
    for (const ref of task.context) {
      if (!Object.hasOwn(def.context, ref)) throw new Error(`Unknown context ${ref} in ${task.id}`);
    }
    for (const input of Object.values(task.inputs)) {
      if (!predecessors(task).has(input.task))
        throw new Error(`Input ${input.task} is not a predecessor of ${task.id}`);
      if (!Object.hasOwn(tasks.get(input.task)!.outputs, input.result))
        throw new Error(`Unknown result ${input.task}.${input.result}`);
    }
    for (const output of Object.values(task.outputs)) {
      ajv.compile(output.schema);
      if (output.submission === 'direct' && !output.path)
        throw new Error(`Direct output in ${task.id} requires a path`);
      if (output.validators.length && !output.path) throw new Error(`File validators in ${task.id} require a path`);
      for (const key of output.validators) {
        if (!validatorKeys.includes(key) && !key.startsWith('cmd:')) throw new Error(`Unknown validator ${key}`);
      }
      if (output.path) {
        assertConcrete(output.path, `Output path in ${task.id}`);
        if (!isAbsolute(output.path)) throw new Error(`Output path must be absolute: ${output.path}`);
        const writers = paths.get(output.path) ?? [];
        for (const writer of writers) {
          if (!predecessors(task).has(writer) && !predecessors(tasks.get(writer)!).has(task.id))
            throw new Error(`Unordered writers for output path ${output.path}`);
        }
        paths.set(output.path, [...writers, task.id]);
      }
    }
  }
}

/** Stable fingerprint of a definition; key order is fixed by the authored document. */
export function definitionDigest(definition: WorkflowDefinition): string {
  return createHash('sha256').update(JSON.stringify(definition)).digest('hex');
}

export function createDocument(definition: WorkflowDefinition): WorkflowDocument {
  validateDefinition(definition);
  return {
    definition: structuredClone(definition),
    state: {
      status: 'pending',
      definition_digest: definitionDigest(definition),
      created_at: new Date().toISOString(),
      tasks: Object.fromEntries(
        definition.tasks.map((task) => [
          task.id,
          {
            status: 'pending',
            attempts: 0,
            corrections: [],
            results: {},
            errors: [],
          },
        ]),
      ),
    },
  };
}

export function validateDocument(raw: unknown): asserts raw is WorkflowDocument {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid workflow document');
  const doc = raw as WorkflowDocument;
  validateDefinition(doc.definition);
  if (
    !doc.state ||
    !['pending', 'running', 'blocked', 'completed'].includes(doc.state.status) ||
    !doc.state.created_at ||
    !doc.state.tasks
  ) {
    throw new Error('Invalid workflow state');
  }
  if (doc.state.definition_digest !== definitionDigest(doc.definition))
    throw new Error('The workflow definition was edited after the run was created');
  const ids = doc.definition.tasks.map((task) => task.id).sort();
  if (JSON.stringify(Object.keys(doc.state.tasks).sort()) !== JSON.stringify(ids))
    throw new Error('Run state does not match the fixed task definition');
  for (const task of doc.definition.tasks) {
    const state = doc.state.tasks[task.id]!;
    if (
      !['pending', 'in-progress', 'blocked', 'done'].includes(state.status) ||
      !Number.isInteger(state.attempts) ||
      state.attempts < 0 ||
      !Array.isArray(state.corrections) ||
      !Array.isArray(state.errors) ||
      !state.results
    )
      throw new Error(`Invalid state for ${task.id}`);
    for (const [key, result] of Object.entries(state.results)) {
      if (
        !Object.hasOwn(task.outputs, key) ||
        typeof result.valid !== 'boolean' ||
        !Array.isArray(result.errors) ||
        !result.validated_at
      )
        throw new Error(`Invalid result state for ${task.id}.${key}`);
    }
    if (state.status === 'done') {
      if (
        !state.completed_at ||
        state.errors.length ||
        task.depends_on.some((id) => doc.state.tasks[id]!.status !== 'done')
      )
        throw new Error(`Invalid completion state for ${task.id}`);
      for (const [key, output] of Object.entries(task.outputs)) {
        if (output.required && state.results[key]?.valid !== true)
          throw new Error(`Missing validated required result ${task.id}.${key}`);
      }
    }
    if (state.status === 'blocked' && !state.blocker) throw new Error(`Missing blocker for ${task.id}`);
  }
  if (
    doc.state.status === 'completed' &&
    (!doc.state.completed_at || Object.values(doc.state.tasks).some((task) => task.status !== 'done'))
  )
    throw new Error('Invalid workflow completion state');
}
