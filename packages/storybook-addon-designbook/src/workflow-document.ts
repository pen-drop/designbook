/** Canonical agent-authored workflow definition and mutable execution state. */
import Ajv from 'ajv';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { queryReference, type FrozenReferenceQuery } from './reference-query.js';
import { getValidatorKeys } from './validation-registry.js';

export interface EmbeddedContent {
  source: string;
  content: string;
  /** Additional origins of byte-identical content, retained during initial deduplication. */
  sources?: string[];
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
  step: string;
  title: string;
  type: string;
  target: string;
  depends_on: string[];
  params: Record<string, unknown>;
  params_schema: object;
  inputs: Record<string, { task: string; result: string }>;
  instructions: string;
  context: string[];
  outputs: Record<string, OutputDefinition>;
  reference?: {
    query: FrozenReferenceQuery;
    reference_schema: object;
    extract_schema: object;
  };
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
  /** SHA-256 of the exact file bytes accepted by result validation. */
  sha256?: string;
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
  properties: { source: text, content: text, sources: stringList },
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
          'step',
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
          step: { ...text, pattern: '^[a-z0-9][a-z0-9_-]*$' },
          title: text,
          type: text,
          target: text,
          depends_on: stringList,
          params: object,
          params_schema: object,
          instructions: text,
          reference: {
            type: 'object',
            additionalProperties: false,
            required: ['query', 'reference_schema', 'extract_schema'],
            properties: {
              reference_schema: object,
              extract_schema: object,
              query: {
                type: 'object',
                additionalProperties: false,
                required: ['reference', 'package', 'subjects', 'states', 'breakpoints', 'fingerprint'],
                properties: {
                  reference: text,
                  package: { enum: ['component', 'composition', 'tokens'] },
                  subjects: { ...stringList, minItems: 1 },
                  states: { ...stringList, minItems: 1 },
                  breakpoints: { ...stringList, minItems: 1 },
                  fingerprint: { type: 'string', pattern: '^[a-f0-9]{64}$' },
                },
              },
            },
          },
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
  const stepDependencies = new Map<string, Set<string>>();
  for (const task of def.tasks) {
    const dependencies = stepDependencies.get(task.step) ?? new Set<string>();
    for (const id of task.depends_on) {
      const predecessor = tasks.get(id)!;
      if (predecessor.step === task.step) throw new Error(`Dependent tasks must use separate steps: ${id}, ${task.id}`);
      dependencies.add(predecessor.step);
    }
    stepDependencies.set(task.step, dependencies);
  }
  const stepVisited = new Set<string>();
  const stepVisiting = new Set<string>();
  function visitStep(id: string): void {
    if (stepVisiting.has(id)) throw new Error(`Step dependency cycle at ${id}`);
    if (stepVisited.has(id)) return;
    stepVisiting.add(id);
    stepDependencies.get(id)!.forEach(visitStep);
    stepVisiting.delete(id);
    stepVisited.add(id);
  }
  stepDependencies.forEach((_, id) => visitStep(id));
  function predecessors(task: TaskDefinition): Set<string> {
    return new Set(task.depends_on.flatMap((id) => [id, ...predecessors(tasks.get(id)!)]));
  }
  const validatorKeys = getValidatorKeys();
  const paths = new Map<string, string[]>();
  for (const task of def.tasks) {
    if (task.reference) {
      if (!isAbsolute(task.reference.query.reference))
        throw new Error(`Reference folder must be absolute in ${task.id}`);
      assertConcrete(task.reference.query, `Reference query in ${task.id}`);
      ajv.compile(task.reference.reference_schema);
      ajv.compile(task.reference.extract_schema);
    }
    assertConcrete([task.target, task.params], `Task ${task.id}`);
    if (!ajv.validate(task.params_schema, task.params))
      throw new Error(`Invalid params for ${task.id}: ${ajv.errorsText()}`);
    for (const ref of [task.instructions, ...task.context]) {
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
      if (
        (/\.png$/i.test(output.path ?? '') || output.validators.includes('image')) &&
        (output.submission !== 'direct' ||
          Object.keys(output.schema).length !== 0 ||
          !output.validators.includes('image'))
      )
        throw new Error(`PNG output in ${task.id} requires direct submission, an empty schema and the image validator`);
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

/** Validate all frozen reference requests before persistence, without loading them into model context. */
export function validateDefinitionReferences(definition: WorkflowDefinition): void {
  for (const task of definition.tasks) {
    if (task.reference)
      queryReference(task.reference.query, {
        referenceSchema: task.reference.reference_schema,
        extractSchema: task.reference.extract_schema,
        definitions: definition.schemas,
      });
  }
}

export interface PlanningCatalogue {
  template: EmbeddedContent;
  config: Record<string, unknown>;
  blocks: Record<
    string,
    Array<{
      instructions: EmbeddedContent;
      rules: EmbeddedContent[];
      blueprints: EmbeddedContent[];
      config_rules: EmbeddedContent[];
      config_instructions: EmbeddedContent[];
      params_schema: object;
      outputs: Record<string, OutputDefinition>;
      schemas: Record<string, object>;
    }>
  >;
}

/** Exact schema graph equivalence permits only internal definition renaming, never weaker constraints. */
function equivalentSchemas(
  left: unknown,
  right: unknown,
  leftSchemas: Record<string, object>,
  rightSchemas: Record<string, object>,
): boolean {
  const seen = new Map<object, Set<object>>();
  function internalRef(value: object): string | undefined {
    return '$ref' in value && typeof value.$ref === 'string' && value.$ref.startsWith('#/definitions/')
      ? value.$ref
      : undefined;
  }
  function dereference(ref: string, schemas: Record<string, object>): unknown {
    const parts = ref
      .slice('#/definitions/'.length)
      .split('/')
      .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
    let resolved: unknown = schemas;
    for (const part of parts)
      resolved = resolved && typeof resolved === 'object' ? (resolved as Record<string, unknown>)[part] : undefined;
    return resolved;
  }
  function equal(a: unknown, b: unknown): boolean {
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (seen.get(a)?.has(b)) return true;
      const pairs = seen.get(a) ?? new Set<object>();
      pairs.add(b);
      seen.set(a, pairs);
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      const refA = internalRef(a);
      const refB = internalRef(b);
      if (refA || refB) {
        const resolvedA = refA ? dereference(refA, leftSchemas) : a;
        const resolvedB = refB ? dereference(refB, rightSchemas) : b;
        if (resolvedA === undefined || resolvedB === undefined) return false;
        if (refA && refB) {
          const siblingsA = Object.fromEntries(Object.entries(a).filter(([key]) => key !== '$ref'));
          const siblingsB = Object.fromEntries(Object.entries(b).filter(([key]) => key !== '$ref'));
          return equal(siblingsA, siblingsB) && equal(resolvedA, resolvedB);
        }
        // A sole reference may be inlined. References with siblings retain their
        // exact conjunction shape rather than guessing equivalence by merging.
        if (Object.keys(refA ? a : b).length !== 1) return false;
        return equal(resolvedA, resolvedB);
      }
      const keys = Object.keys(a).sort();
      return (
        JSON.stringify(keys) === JSON.stringify(Object.keys(b).sort()) &&
        keys.every((key) => equal((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
      );
    }
    // Shared object identity cannot prove equality across distinct schema registries.
    return a === b;
  }
  return equal(left, right);
}

/** Planning-time fidelity gate against a saved effective catalogue; runtime never rediscovers skills. */
export function validateCatalogueDefinition(def: WorkflowDefinition, catalogue: PlanningCatalogue): void {
  validateDefinition(def);
  const sameContent = (actual: EmbeddedContent, expected: EmbeddedContent) =>
    actual.content === expected.content && [actual.source, ...(actual.sources ?? [])].includes(expected.source);
  if (!sameContent(def.template, catalogue.template)) throw new Error('Workflow template differs from catalogue');
  if (!equivalentSchemas(def.config, catalogue.config, {}, {}))
    throw new Error('Workflow config differs from catalogue');
  const blocks = Object.values(catalogue.blocks).flat();
  for (const task of def.tasks) {
    if (
      task.reference &&
      !blocks.some(
        (block) =>
          block.outputs.reference &&
          block.outputs.reference_extract &&
          equivalentSchemas(
            task.reference!.reference_schema,
            block.outputs.reference.schema,
            def.schemas,
            block.schemas,
          ) &&
          equivalentSchemas(
            task.reference!.extract_schema,
            block.outputs.reference_extract.schema,
            def.schemas,
            block.schemas,
          ),
      )
    )
      throw new Error(`Task ${task.id} reference schemas differ from catalogue`);
  }
  validateDefinitionReferences(def);
  for (const task of def.tasks) {
    const instruction = def.context[task.instructions]!;
    const matches = blocks.filter((block) => sameContent(instruction, block.instructions));
    if (!matches.length) throw new Error(`Task ${task.id} instructions differ from catalogue`);
    const valid = matches.some((block) => {
      if (!equivalentSchemas(task.params_schema, block.params_schema, def.schemas, block.schemas)) return false;
      const material = [task.instructions, ...task.context].map((id) => def.context[id]!);
      if (
        ![...block.rules, ...block.blueprints, ...block.config_rules, ...block.config_instructions].every((expected) =>
          material.some((actual) => sameContent(actual, expected)),
        )
      )
        return false;
      if (JSON.stringify(Object.keys(task.outputs).sort()) !== JSON.stringify(Object.keys(block.outputs).sort()))
        return false;
      return Object.entries(block.outputs).every(([key, expected]) => {
        const actual = task.outputs[key]!;
        return (
          actual.required === expected.required &&
          actual.submission === expected.submission &&
          JSON.stringify([...actual.validators].sort()) === JSON.stringify([...expected.validators].sort()) &&
          equivalentSchemas(actual.schema, expected.schema, def.schemas, block.schemas) &&
          (!expected.path || /\{\{|\$DESIGNBOOK_|\$\{/.test(expected.path) || actual.path === expected.path) &&
          (!expected.path || Boolean(actual.path))
        );
      });
    });
    if (!valid) throw new Error(`Task ${task.id} contracts or required context differ from catalogue`);
  }
}

/** Normalize only a newly authored reference-based definition, before its immutable snapshot. */
export function deduplicateDefinition(definition: WorkflowDefinition): WorkflowDefinition {
  validateDefinition(definition);
  const def = structuredClone(definition);
  const byContent = new Map<string, string>();
  const aliases = new Map<string, string>();
  const registry: Record<string, EmbeddedContent> = {};
  for (const key of Object.keys(def.context).sort()) {
    const entry = def.context[key]!;
    const existing = byContent.get(entry.content);
    const canonical = existing ?? key;
    aliases.set(key, canonical);
    if (existing) {
      const kept = registry[existing]!;
      kept.sources = [
        ...new Set([kept.source, ...(kept.sources ?? []), entry.source, ...(entry.sources ?? [])]),
      ].sort();
    } else {
      byContent.set(entry.content, key);
      registry[key] = entry;
    }
  }
  def.context = registry;
  for (const task of def.tasks) {
    task.instructions = aliases.get(task.instructions)!;
    task.context = [...new Set(task.context.map((key) => aliases.get(key)!))];
  }
  return def;
}

/** Stable fingerprint of a definition; key order is fixed by the authored document. */
export function definitionDigest(definition: WorkflowDefinition): string {
  return createHash('sha256').update(JSON.stringify(definition)).digest('hex');
}

export function createDocument(authored: WorkflowDefinition): WorkflowDocument {
  const definition = deduplicateDefinition(authored);
  validateDefinitionReferences(definition);
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
        (result.valid && task.outputs[key]?.path && !/^[a-f0-9]{64}$/.test(result.sha256 ?? '')) ||
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
