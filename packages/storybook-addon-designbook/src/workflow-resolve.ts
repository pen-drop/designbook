/**
 * Workflow plan resolution engine.
 *
 * Resolves task files, file paths, dependencies, rules, and config
 * constraints at plan time — so subagents receive fully-resolved tasks.
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import fm from 'front-matter';
import { globSync } from 'glob';
import { load as parseYaml } from 'js-yaml';
import { normalizeExtensions, getExtensionIds, getExtensionSkillIds, type DesignbookConfig } from './config.js';
import { buildSchemaBlock } from './schema-block.js';
import type { SchemaBlock } from './schema-block.js';
import { computeMergedSchema } from './workflow-schema-merge.js';

// ── Types ──────────────────────────────────────────────────────────

export interface PlanItem {
  step: string;
  params?: Record<string, unknown>;
}

export interface ResolvedTask {
  id: string;
  title: string;
  type: string;
  step: string; // canonical step name (e.g. create-component) — was: stage
  stage: string; // parent stage name (execute, test, preview)
  params: Record<string, unknown>;
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  files: Array<{ path: string; key: string; validators: string[] }>;
  result?: Record<string, { path?: string; schema?: object; validators?: string[] }>;
}

export interface ResolvedPlan {
  params: Record<string, unknown>;
  steps: string[]; // ordered step names — was: stages
  tasks: ResolvedTask[];
  schemas?: Record<string, object>; // resolved JSON Schema definitions from $ref
}

export interface ResolvedFile {
  path: string;
  name: string;
  specificity: number;
  frontmatter: Record<string, unknown> | null;
}

export interface TaskFileDeclaration {
  file?: string; // path template (supports $ENV, {{ param }}, and {param})
  path?: string; // alias for file — task files use `path:` by convention
  key: string; // stable identifier used by write-file --key
  validators?: string[]; // validator keys (e.g. ['tokens']); defaults to []
}

/** Result declaration entry in task frontmatter — file results have `path:`, data results don't. */
export interface ResultDeclaration {
  path?: string; // file result path template
  $ref?: string; // schema reference (e.g. ../schemas.yml#/Check)
  validators?: string[]; // semantic validator keys
  flush?: 'immediately'; // flush policy: 'immediately' writes to final path on result write
  type?: string; // inline JSON Schema type
  items?: unknown; // inline JSON Schema items (for arrays)
  [key: string]: unknown; // additional JSON Schema properties
}

interface TaskFileFrontmatter {
  when?: Record<string, unknown>;
  params?: {
    type?: string; // always 'object'
    required?: string[];
    properties?: Record<string, unknown>;
    $ref?: string;
    [key: string]: unknown;
  };
  files?: TaskFileDeclaration[];
  result?: {
    type?: string; // always 'object'
    required?: string[];
    properties?: Record<string, ResultDeclaration>;
    [key: string]: unknown;
  };
  each?: Record<string, unknown>; // iteration declaration { <scope-key>: <schema> }
}

interface StageDefinitionFm {
  steps?: string[];
  workflow?: string;
  each?: string;
  domain?: string[];
  params?: Record<string, { type: string; prompt: string }>;
}

interface WorkflowFrontmatter {
  // New grouped format: stages map stage names to step lists
  title?: string;
  stages?: Record<string, StageDefinitionFm> | string[];
  engine?: string;
  // Legacy nested format: workflow.title, workflow.stages
  workflow?: {
    title?: string;
    stages?: string[];
  };
}

// ── Schema Infrastructure ─────────────────────────────────────────────

/**
 * Load a schemas.yml file and return a map of PascalCase type names to JSON Schema definitions.
 * Validates that all keys are PascalCase and all values are objects.
 */
export function loadSchemaFile(schemaFilePath: string): Record<string, object> {
  if (!existsSync(schemaFilePath)) {
    throw new Error(`Schema file not found: ${schemaFilePath}`);
  }
  const raw = readFileSync(schemaFilePath, 'utf-8');
  const parsed = parseYaml(raw) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Schema file is not a valid YAML map: ${schemaFilePath}`);
  }
  const schemas: Record<string, object> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(key)) {
      throw new Error(`Schema key '${key}' in ${schemaFilePath} must be PascalCase`);
    }
    if (!value || typeof value !== 'object') {
      throw new Error(`Schema '${key}' in ${schemaFilePath} must be a JSON Schema object`);
    }
    schemas[key] = value as object;
  }
  return schemas;
}

/**
 * Resolve a $ref path to a schema definition.
 * Supports two forms:
 *   - Relative: `../schemas.yml#/Check` — resolved from the task file's directory
 *   - Skill-qualified: `designbook/design/schemas.yml#/Check` — resolved from skills root
 *
 * @param ref - The $ref string (e.g. "../schemas.yml#/Check")
 * @param taskFilePath - Absolute path to the task file containing the $ref
 * @param skillsRoot - Absolute path to the skills root directory (.agents/skills/)
 * @returns The resolved JSON Schema object
 */
export function resolveSchemaRef(
  ref: string,
  taskFilePath: string,
  skillsRoot: string,
): { typeName: string; schema: object } {
  const hashIdx = ref.indexOf('#/');
  if (hashIdx === -1) {
    throw new Error(`Invalid $ref '${ref}' — must contain '#/' fragment (e.g. ../schemas.yml#/TypeName)`);
  }
  const filePart = ref.slice(0, hashIdx);
  const typeName = ref.slice(hashIdx + 2);

  // Resolve file path: relative (starts with . or /) vs skill-qualified
  let schemaFilePath: string;
  if (filePart.startsWith('.') || filePart.startsWith('/')) {
    schemaFilePath = resolve(dirname(taskFilePath), filePart);
  } else {
    schemaFilePath = resolve(skillsRoot, filePart);
  }

  const schemas = loadSchemaFile(schemaFilePath);
  if (!(typeName in schemas)) {
    const available = Object.keys(schemas).join(', ');
    throw new Error(`Type '${typeName}' not found in ${schemaFilePath}. Available: ${available}`);
  }
  return { typeName, schema: schemas[typeName]! };
}

/**
 * Collect all $ref entries from resolved tasks and resolve them into a schemas map.
 * Called at workflow create time to inline all schemas into tasks.yml.
 */
export function collectAndResolveSchemas(tasks: ResolvedTask[], skillsRoot: string): Record<string, object> {
  const schemas: Record<string, object> = {};

  for (const task of tasks) {
    if (!task.result) continue;
    const taskFilePath = task.task_file;

    // Re-read frontmatter to get the original $ref strings
    const taskFm = parseFrontmatter(taskFilePath) as TaskFileFrontmatter | null;
    if (!taskFm?.result) continue;

    const resultProperties = (taskFm.result as Record<string, unknown>).properties as
      | Record<string, Record<string, unknown>>
      | undefined;
    if (!resultProperties) continue;

    for (const [key, resultDecl] of Object.entries(resultProperties)) {
      // Save original $ref before resolveRefsInDeclaration rewrites it to AJV-local form
      const originalRef = resultDecl.$ref as string | undefined;

      // Resolve $ref in the frontmatter copy (populates schemas map)
      resolveRefsInDeclaration(resultDecl, taskFilePath, skillsRoot, schemas);

      // Update the task's actual result schema:
      // For top-level $ref, replace schema with the resolved definition
      if (task.result[key] && originalRef) {
        const { typeName, schema } = resolveSchemaRef(originalRef, taskFilePath, skillsRoot);
        schemas[typeName] = schema;
        task.result[key]!.schema = schema;
      }

      // For nested $ref (e.g. items.$ref, properties.foo.$ref at any depth),
      // rewrite file-system refs to AJV-compatible local refs in the task's schema
      if (task.result[key]?.schema && typeof task.result[key]!.schema === 'object') {
        rewriteRefsInSchema(task.result[key]!.schema as Record<string, unknown>, taskFilePath, skillsRoot, schemas);
      }
    }

    // Collect $ref from each: declaration
    if (taskFm.each) {
      for (const eachValue of Object.values(taskFm.each)) {
        if (eachValue && typeof eachValue === 'object') {
          resolveRefsInDeclaration(eachValue as Record<string, unknown>, taskFilePath, skillsRoot, schemas);
        }
      }
    }

    // Collect $ref from params: declaration
    if (taskFm.params && typeof taskFm.params === 'object' && '$ref' in taskFm.params) {
      const ref = (taskFm.params as Record<string, unknown>)['$ref'] as string;
      const { typeName, schema: refSchema } = resolveSchemaRef(ref, taskFilePath, skillsRoot);
      schemas[typeName] = refSchema;
    }
  }

  return schemas;
}

/** Recursively resolve $ref entries in a declaration object.
 * Replaces file-system $ref (e.g. ../schemas.yml#/Component) with
 * local AJV-compatible $ref (e.g. #/Component) so validation works. */
function resolveRefsInDeclaration(
  obj: Record<string, unknown>,
  taskFilePath: string,
  skillsRoot: string,
  schemas: Record<string, object>,
): void {
  if (obj.$ref && typeof obj.$ref === 'string') {
    const { typeName, schema } = resolveSchemaRef(obj.$ref, taskFilePath, skillsRoot);
    schemas[typeName] = schema;
    // Replace file-system $ref with local AJV reference
    obj.$ref = `#/${typeName}`;
  }
  // Check nested objects (e.g. items: { $ref: ... })
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      resolveRefsInDeclaration(value as Record<string, unknown>, taskFilePath, skillsRoot, schemas);
    }
  }
}

/**
 * Rewrite file-system $ref strings to AJV-compatible local refs in a schema object.
 * Walks the schema tree at any depth, converting e.g. `../schemas.yml#/Component`
 * to `#/Component` (matching the key used in `ajv.addSchema`).
 *
 * Unlike `resolveRefsInDeclaration`, this does NOT load schema files — it relies
 * on the schemas map being already populated. Any $ref not matching an existing
 * schema key is resolved from disk and added.
 */
export function rewriteRefsInSchema(
  obj: Record<string, unknown>,
  taskFilePath: string,
  skillsRoot: string,
  schemas: Record<string, object>,
): void {
  if (obj.$ref && typeof obj.$ref === 'string') {
    const ref = obj.$ref as string;
    // Only rewrite file-system $ref (contains '#/'); skip already-local refs like '#/TypeName'
    if (ref.includes('#/') && !ref.startsWith('#/')) {
      const { typeName, schema } = resolveSchemaRef(ref, taskFilePath, skillsRoot);
      schemas[typeName] = schema;
      obj.$ref = `#/${typeName}`;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      rewriteRefsInSchema(value as Record<string, unknown>, taskFilePath, skillsRoot, schemas);
    }
  }
}

// ── Workflow Steps ────────────────────────────────────────────────────

/**
 * Extract steps from workflow frontmatter.
 * Supports three formats:
 * - Grouped: stages: { execute: { steps: [...] }, test: { steps: [...] } }
 * - Flat: stages: [step1, step2, ...] (legacy)
 * - Nested: workflow.stages: [...] (legacy)
 */
function getWorkflowSteps(fm: WorkflowFrontmatter): string[] | undefined {
  const stages = fm.stages ?? fm.workflow?.stages;
  if (!stages) return undefined;
  if (Array.isArray(stages)) return stages;
  // Grouped format: flatten all steps from all stages in order
  const steps: string[] = [];
  for (const def of Object.values(stages)) {
    steps.push(...(def.steps ?? []));
  }
  return steps;
}

/** Extract grouped stage definitions from frontmatter (new format only). */
function getWorkflowStageDefinitions(fm: WorkflowFrontmatter): Record<string, StageDefinitionFm> | undefined {
  if (fm.stages && !Array.isArray(fm.stages)) return fm.stages;
  return undefined;
}

/** Extract title from workflow frontmatter (supports both flat and nested format). */
function getWorkflowTitle(fm: WorkflowFrontmatter): string {
  return fm.title ?? fm.workflow?.title ?? '';
}

// ── Artifact Name Derivation ──────────────────────────────────────

/**
 * Derive namespaced artifact name from file path relative to agentsDir.
 *
 * Convention: `<skill>:<concern>:<artifact>` for nested skills,
 * `<skill>:<artifact>` for flat skills.
 *
 * Examples:
 * - `skills/designbook/design/tasks/screenshot-reference.md` → `designbook:design:screenshot-reference`
 * - `skills/designbook-stitch/tasks/stitch-inspect.md` → `designbook-stitch:stitch-inspect`
 * - `skills/designbook/design/rules/playwright-session.md` → `designbook:design:playwright-session`
 * - `skills/designbook-sdc/blueprints/component.md` with type=component, name=section → `designbook-sdc:blueprints:component/section`
 */
export function deriveArtifactName(
  filePath: string,
  agentsDir: string,
  frontmatter?: Record<string, unknown> | null,
): string {
  // Blueprint legacy: derive from type+name (check BEFORE explicit name,
  // because blueprint `name` is the short component name, not a namespace)
  if (frontmatter?.type && typeof frontmatter.type === 'string') {
    // If name contains ':', it's an explicit namespaced name — use it directly
    if (frontmatter.name && typeof frontmatter.name === 'string' && frontmatter.name.includes(':')) {
      return frontmatter.name;
    }
    const bpName = frontmatter.name ?? filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '') ?? '';
    const rel = relative(resolve(agentsDir, 'skills'), filePath).replace(/\\/g, '/');
    const skill = rel.split('/')[0] ?? '';
    return `${skill}:blueprints:${frontmatter.type}/${bpName}`;
  }

  // Use explicit name if set in frontmatter (non-blueprint)
  if (frontmatter?.name && typeof frontmatter.name === 'string') {
    return frontmatter.name;
  }

  // Derive from filesystem path: skills/<skill>[/<concern>]/<kind>/<artifact>.md
  const rel = relative(resolve(agentsDir, 'skills'), filePath).replace(/\\/g, '/');
  const parts = rel.split('/');
  const skill = parts[0] ?? '';
  const artifact = (parts[parts.length - 1] ?? '').replace(/\.md$/, '');

  // Kind directory is tasks/, rules/, or blueprints/
  // If there's a concern dir between skill and kind: skill/concern/kind/file → 4 parts
  // Flat: skill/kind/file → 3 parts
  if (parts.length >= 4) {
    // Nested: skill/concern/kind/artifact.md (or deeper — take segment after skill)
    const concern = parts[1]!;
    return `${skill}:${concern}:${artifact}`;
  }

  // Flat: skill/kind/artifact.md
  return `${skill}:${artifact}`;
}

/**
 * Resolve short name to full namespaced name within the same skill context.
 * E.g., `design:screenshot-reference` in skill `designbook` → `designbook:design:screenshot-reference`
 */
export function resolveShortName(shortName: string, skillName: string): string {
  const segments = shortName.split(':');
  if (segments.length >= 3) return shortName; // Already fully qualified
  return `${skillName}:${shortName}`;
}

// ── Frontmatter Parsing ────────────────────────────────────────────

/**
 * Extract YAML frontmatter from a markdown file.
 * Returns parsed YAML object, or null if no frontmatter found.
 */
export function parseFrontmatter(filePath: string): Record<string, unknown> | null {
  const content = readFileSync(filePath, 'utf-8');
  const result = fm<Record<string, unknown>>(content);
  if (!result.frontmatter) return null;
  return result.attributes ?? {};
}

// ── When Condition Matching ────────────────────────────────────────

/**
 * Look up a key in context first, then config. Config supports dot-path traversal
 * as fallback (e.g. `frameworks.css` walks into `config.frameworks.css`).
 */
export function lookup(key: string, context: Record<string, unknown>, config: Record<string, unknown>): unknown {
  if (context[key] !== undefined) return context[key];
  if (config[key] !== undefined) return config[key];
  // Dot-path traversal into config (forward-compat for non-flattened configs)
  return key
    .split('.')
    .reduce(
      (obj, part) => (obj != null && typeof obj === 'object' ? (obj as Record<string, unknown>)[part] : undefined),
      config as unknown,
    );
}

/**
 * Check whether all `when` conditions match against context + config.
 *
 * Lookup order per key: context first, config fallback (with dot-path traversal).
 * Matching rules:
 * - Array value in `when` → looked-up value must be one of those values
 * - Array looked-up value → `when` value must be present in that array
 * - Scalar vs scalar → exact string match
 *
 * Returns specificity count (number of matched keys) on success, or `false` if any key fails.
 */
export function checkWhen(
  when: Record<string, unknown>,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
): number | false {
  for (const [key, value] of Object.entries(when)) {
    const actual = lookup(key, context, config);
    // Key not found in context or config → skip (deferred to expansion time)
    if (actual === undefined) continue;
    if (Array.isArray(value)) {
      if (!value.map(String).includes(String(actual ?? ''))) return false;
    } else if (Array.isArray(actual)) {
      if (!actual.map(String).includes(String(value))) return false;
    } else {
      if (String(actual ?? '') !== String(value)) return false;
    }
  }
  return Object.keys(when).length;
}

/**
 * Check whether a rule's domain matches any of the effective domains.
 *
 * Matching rules (dot-delimited prefix matching):
 * - Exact: "components" matches "components"
 * - Rule is child of need: need "components" matches rule "components.layout"
 * - Rule is parent of need: need "components.layout" matches rule "components"
 * - No partial segment: "components" does NOT match "components-extra"
 */
export function matchDomain(ruleDomain: string, effectiveDomains: string[]): boolean {
  for (const need of effectiveDomains) {
    if (ruleDomain === need) return true;
    if (ruleDomain.startsWith(need + '.')) return true;
    if (need.startsWith(ruleDomain + '.')) return true;
  }
  return false;
}

/**
 * Build runtime context for `when` evaluation (step-specific, not config).
 * Sets both `steps` (new) and `stages` (legacy) keys for backwards compatibility
 * with existing rule files that use `when: stages:`.
 */
export function buildRuntimeContext(step?: string, extraConditions?: Record<string, string>): Record<string, unknown> {
  const context: Record<string, unknown> = {};
  if (step !== undefined) {
    context['steps'] = step;
    context['stages'] = step; // Legacy compat: rule files may use when: stages:
  }
  if (extraConditions) Object.assign(context, extraConditions);
  return context;
}

/**
 * Enrich config with derived DESIGNBOOK_* env vars and normalized extensions array.
 */
export function buildEnrichedConfig(config: DesignbookConfig): Record<string, unknown> {
  const enriched: Record<string, unknown> = { ...(config as Record<string, unknown>) };
  Object.assign(enriched, buildEnvMap(config));
  const extensions = normalizeExtensions(config['extensions']);
  enriched['extensions'] = getExtensionIds(extensions).split(',').filter(Boolean);
  return enriched;
}

// ── Environment Variable Map ───────────────────────────────────────

/**
 * Build a map of DESIGNBOOK_* env vars from config for template expansion.
 *
 * Emits:
 * - DESIGNBOOK_WORKSPACE from `workspace`
 * - DESIGNBOOK_HOME / DESIGNBOOK_DATA / DESIGNBOOK_URL / DESIGNBOOK_CMD from `designbook.*` keys
 * - DESIGNBOOK_DIRS_* from `dirs.*` keys
 * - All other scalar config values → DESIGNBOOK_<KEY>
 */
export function buildEnvMap(config: DesignbookConfig): Record<string, string> {
  const env: Record<string, string> = {};

  // Dynamic: all scalar config values → DESIGNBOOK_<KEY>
  // Dot-path keys are split and rejoined with '_'. The 'frameworks' segment is
  // renamed to 'FRAMEWORK' (singular) to match the shell `config` output
  // (e.g. frameworks.css → DESIGNBOOK_FRAMEWORK_CSS).
  // Skip internal properties and designbook.* keys (handled explicitly below)
  for (const [key, value] of Object.entries(config)) {
    if (value == null || typeof value === 'object') continue;
    if (key === 'data' || key === 'workspace') continue;
    if (key.startsWith('designbook.')) continue;
    const parts = key.split('.');
    const envParts = parts.map((p) => (p === 'frameworks' ? 'FRAMEWORK' : p.toUpperCase()));
    env[`DESIGNBOOK_${envParts.join('_')}`] = String(value);
  }

  // Explicit: DESIGNBOOK_WORKSPACE, DESIGNBOOK_HOME, DESIGNBOOK_DATA, DESIGNBOOK_URL, DESIGNBOOK_CMD
  if (config.workspace) env['DESIGNBOOK_WORKSPACE'] = String(config.workspace);
  if (config['designbook.home']) env['DESIGNBOOK_HOME'] = String(config['designbook.home']);
  if (config['designbook.data']) env['DESIGNBOOK_DATA'] = String(config['designbook.data']);
  if (config['designbook.url']) env['DESIGNBOOK_URL'] = String(config['designbook.url']);
  if (config['designbook.cmd']) env['DESIGNBOOK_CMD'] = String(config['designbook.cmd']);

  // Derived: extensions as comma-sep IDs + skill IDs
  const extensions = normalizeExtensions(config['extensions']);
  env['DESIGNBOOK_EXTENSIONS'] = getExtensionIds(extensions);
  env['DESIGNBOOK_EXTENSION_SKILLS'] = getExtensionSkillIds(extensions);

  return env;
}

/**
 * Build a remapped env map for an isolated git WORKTREE.
 *
 * Swaps DESIGNBOOK_WORKSPACE to the worktree path. All DESIGNBOOK_DIRS_* vars are
 * re-derived by resolving their workspace-relative paths against the new workspace.
 * DESIGNBOOK_HOME and DESIGNBOOK_DATA are re-resolved the same way.
 *
 * This preserves directory structure so that `cp -r WORKTREE/* DESIGNBOOK_HOME/`
 * restores files to their correct locations.
 */
export function buildWorktreeEnvMap(
  envMap: Record<string, string>,
  worktreePath: string,
  rootDir: string,
): Record<string, string> {
  const remapped = { ...envMap };

  // Swap workspace anchor
  remapped['DESIGNBOOK_WORKSPACE'] = worktreePath;

  // Re-resolve DESIGNBOOK_DIRS_* relative to new workspace
  for (const [key, value] of Object.entries(envMap)) {
    if (!key.startsWith('DESIGNBOOK_DIRS_')) continue;
    const relPath = relative(rootDir, value);
    remapped[key] = resolve(worktreePath, relPath);
  }

  // Re-resolve DESIGNBOOK_HOME and DESIGNBOOK_DATA relative to new workspace
  if (envMap['DESIGNBOOK_HOME']) {
    remapped['DESIGNBOOK_HOME'] = resolve(worktreePath, relative(rootDir, envMap['DESIGNBOOK_HOME']));
  }
  if (envMap['DESIGNBOOK_DATA']) {
    remapped['DESIGNBOOK_DATA'] = resolve(worktreePath, relative(rootDir, envMap['DESIGNBOOK_DATA']));
  }

  return remapped;
}

// ── Unified File Resolution ─────────────────────────────────────────

/**
 * Find markdown files matching a glob pattern and filter by `when` frontmatter
 * conditions against context (runtime) and config (project).
 *
 * Returns all matches with their specificity (number of `when` keys matched).
 *
 * When `requireWhen` is true (default), files without `when` (or empty `when`)
 * are skipped — at least one `when` condition is required. Set to false for
 * task files where unconditional matching is expected.
 *
 * When `effectiveDomains` is provided (non-empty), domain-tagged files are matched
 * via `matchDomain()` instead of `when.steps`. Files with `domain:` but no
 * `effectiveDomains` are skipped. Files without `domain:` use the legacy `when.steps` path.
 */
export function resolveFiles(
  globPattern: string,
  context: Record<string, unknown>,
  config: Record<string, unknown>,
  agentsDir: string,
  requireWhen = true,
  effectiveDomains?: string[],
): ResolvedFile[] {
  const results: ResolvedFile[] = [];
  const paths = globSync(globPattern, { cwd: agentsDir, absolute: true });

  for (const filePath of paths) {
    const frontmatter = parseFrontmatter(filePath);
    const when = frontmatter?.when as Record<string, unknown> | undefined;
    const name = deriveArtifactName(filePath, agentsDir, frontmatter);

    // ── Domain-tagged files ──────────────────────────────────────────
    const rawDomain = frontmatter?.domain;
    if (rawDomain !== undefined && effectiveDomains && effectiveDomains.length > 0) {
      // Normalise domain: string or string[] → string[]
      const ruleDomains: string[] = Array.isArray(rawDomain)
        ? (rawDomain as string[]).map(String)
        : [String(rawDomain)];

      // Check if at least one rule domain matches any effective domain
      const domainMatched = ruleDomains.some((rd) => matchDomain(rd, effectiveDomains));
      if (!domainMatched) {
        continue;
      }

      // Also check remaining `when:` conditions (excluding steps/stages) against config
      if (when && Object.keys(when).length > 0) {
        // Build a filtered `when` without steps/stages keys (those are replaced by domain matching)
        const configWhen: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(when)) {
          if (k !== 'steps' && k !== 'stages') {
            configWhen[k] = v;
          }
        }
        if (Object.keys(configWhen).length > 0) {
          const configSpecificity = checkWhen(configWhen, {}, config);
          if (configSpecificity === false) {
            continue;
          }
        }
      }

      // Count matched conditions: each matched domain counts as 1, plus config conditions
      const domainCount = ruleDomains.filter((rd) => matchDomain(rd, effectiveDomains)).length;
      const configConditions =
        when && Object.keys(when).length > 0
          ? Object.keys(when).filter((k) => k !== 'steps' && k !== 'stages').length
          : 0;
      results.push({ path: filePath, name, specificity: domainCount + configConditions, frontmatter });
      continue;
    }
    // When domain: is present but effectiveDomains is not provided,
    // fall through to when.steps matching (domain is informational in task resolution)

    // ── Legacy when.steps path ───────────────────────────────────────
    if (!when || Object.keys(when).length === 0) {
      if (requireWhen) {
        continue;
      }
      results.push({ path: filePath, name, specificity: 0, frontmatter });
      continue;
    }

    const specificity = checkWhen(when, context, config);
    if (specificity !== false) {
      results.push({ path: filePath, name, specificity, frontmatter });
    }
  }

  return results;
}

// ── Name/As Deduplication & Priority Sorting ─────────────────────────

/**
 * Apply name/as deduplication and priority sorting to resolved files.
 *
 * 1. Collect all files
 * 2. Group by effective name (own `name` for standalone, `as` target for overrides)
 * 3. Within each group, highest `priority` wins (tiebreak: alphabetical skill name, last wins)
 * 4. Return remaining files sorted by priority (lowest first)
 *
 * Emits warnings for `as` targets that don't exist in the resolved set.
 */
export function deduplicateByNameAs(files: ResolvedFile[], agentsDir: string, warnings: string[] = []): ResolvedFile[] {
  // Separate files into standalone (no `as`) and overrides (with `as`)
  const standalone: ResolvedFile[] = [];
  const overrides: Array<{ file: ResolvedFile; asTarget: string; priority: number }> = [];

  for (const file of files) {
    const asValue = file.frontmatter?.as as string | undefined;
    if (asValue) {
      // Resolve short name: derive skill from file path
      const rel = relative(resolve(agentsDir, 'skills'), file.path).replace(/\\/g, '/');
      const skill = rel.split('/')[0] ?? '';
      const resolvedAs = resolveShortName(asValue, skill);
      const priority = typeof file.frontmatter?.priority === 'number' ? (file.frontmatter.priority as number) : 0;
      overrides.push({ file, asTarget: resolvedAs, priority });
    } else {
      standalone.push(file);
    }
  }

  // Build a map of standalone files by name for override lookup
  const standaloneByName = new Map<string, ResolvedFile>();
  for (const file of standalone) {
    standaloneByName.set(file.name, file);
  }

  // Apply overrides: group by asTarget, highest priority wins
  const overridesByTarget = new Map<string, Array<{ file: ResolvedFile; priority: number }>>();
  for (const o of overrides) {
    if (!overridesByTarget.has(o.asTarget)) {
      overridesByTarget.set(o.asTarget, []);
    }
    overridesByTarget.get(o.asTarget)!.push({ file: o.file, priority: o.priority });
  }

  for (const [target, candidates] of overridesByTarget) {
    const original = standaloneByName.get(target);
    if (!original) {
      // as target doesn't exist — warn and run as additive
      warnings.push(`as target '${target}' not found — task runs as additive`);
      for (const c of candidates) {
        standalone.push(c.file);
      }
      continue;
    }

    // Compare original priority with override candidates
    const originalPriority =
      typeof original.frontmatter?.priority === 'number' ? (original.frontmatter.priority as number) : 0;

    // Find highest priority override
    candidates.sort((a, b) => b.priority - a.priority);
    const winner = candidates[0]!;

    if (winner.priority > originalPriority) {
      // Override wins — remove original, add winner
      standaloneByName.delete(target);
      standalone.splice(standalone.indexOf(original), 1);
      standalone.push(winner.file);
    } else if (winner.priority === originalPriority) {
      // Equal priority — alphabetical tiebreak (last wins)
      const originalSkill = original.name.split(':')[0] ?? '';
      const winnerSkill = winner.file.name.split(':')[0] ?? '';
      if (winnerSkill >= originalSkill) {
        standaloneByName.delete(target);
        standalone.splice(standalone.indexOf(original), 1);
        standalone.push(winner.file);
      }
      // else original wins
    }
    // else original priority is higher — original stays
  }

  // Sort by priority (lowest first)
  standalone.sort((a, b) => {
    const pa = typeof a.frontmatter?.priority === 'number' ? (a.frontmatter.priority as number) : 0;
    const pb = typeof b.frontmatter?.priority === 'number' ? (b.frontmatter.priority as number) : 0;
    return pa - pb;
  });

  return standalone;
}

// ── Task File Resolution ────────────────────────────────────────────

/**
 * Resolve a stage name to task file paths.
 *
 * Named stages (skill:task format): first try direct skill-dir resolution, then
 * fall back to glob for workflow-qualified tasks (task--workflow-id.md pattern).
 * Named stages always return at most one result.
 *
 * Generic stages return ALL matching task files (multiple skills can contribute).
 * Returns empty array if no task files match (callers skip the step).
 */
export function resolveTaskFiles(stage: string, config: DesignbookConfig, agentsDir: string): string[] {
  const context = buildRuntimeContext(stage);
  const enrichedConfig = buildEnrichedConfig(config);

  // Primary: broad scan — find all tasks with when.steps matching this stage
  const broadMatches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, true);

  // Named stage (skill:task format): return single best match
  if (stage.includes(':')) {
    if (broadMatches.length > 0) {
      broadMatches.sort((a, b) => b.specificity - a.specificity);
      return [broadMatches[0]!.path];
    }
    // Fallback: direct skill-dir resolution (e.g. designbook-drupal:create-component)
    const parts = stage.split(':', 2);
    const skillName = parts[0] ?? '';
    const taskName = parts[1] ?? '';
    const taskPath = resolve(agentsDir, 'skills', skillName, 'tasks', `${taskName}.md`);
    if (existsSync(taskPath)) {
      console.warn(`[designbook] task "${taskPath}" resolved by filename — add when.steps: [${stage}] to frontmatter`);
      return [taskPath];
    }
    return [];
  }

  // Generic stage: return ALL broad-scan matches
  if (broadMatches.length > 0) {
    return broadMatches.map((m) => m.path);
  }

  // Fallback: filename-based resolution with deprecation warning
  const filenameMatches = resolveFiles(`skills/**/tasks/${stage}.md`, context, enrichedConfig, agentsDir, false);
  if (filenameMatches.length > 0) {
    for (const m of filenameMatches) {
      console.warn(`[designbook] task "${m.path}" resolved by filename — add when.steps: [${stage}] to frontmatter`);
    }
    return filenameMatches.map((m) => m.path);
  }

  return [];
}

/**
 * Resolve a stage name to ResolvedFile[] with name/as deduplication and priority sorting.
 * Used by resolveAllStages for the unified extension model.
 */
export function resolveTaskFilesRich(stage: string, config: DesignbookConfig, agentsDir: string): ResolvedFile[] {
  const context = buildRuntimeContext(stage);
  const enrichedConfig = buildEnrichedConfig(config);

  // Primary: broad scan — find all tasks with when.steps matching this stage
  const broadMatches = resolveFiles('skills/**/tasks/*.md', context, enrichedConfig, agentsDir, true);

  // Named stage (skill:task format): return single best match, no dedup needed
  if (stage.includes(':')) {
    if (broadMatches.length > 0) {
      broadMatches.sort((a, b) => b.specificity - a.specificity);
      return [broadMatches[0]!];
    }
    // Fallback: direct skill-dir resolution
    const parts = stage.split(':', 2);
    const skillName = parts[0] ?? '';
    const taskName = parts[1] ?? '';
    const taskPath = resolve(agentsDir, 'skills', skillName, 'tasks', `${taskName}.md`);
    if (existsSync(taskPath)) {
      console.warn(`[designbook] task "${taskPath}" resolved by filename — add when.steps: [${stage}] to frontmatter`);
      const frontmatter = parseFrontmatter(taskPath);
      const name = deriveArtifactName(taskPath, agentsDir, frontmatter);
      return [{ path: taskPath, name, specificity: 0, frontmatter }];
    }
    return [];
  }

  // Generic stage: return ALL broad-scan matches, deduplicated
  if (broadMatches.length > 0) {
    return deduplicateByNameAs(broadMatches, agentsDir);
  }

  // Fallback: filename-based resolution with deprecation warning
  const filenameMatches = resolveFiles(`skills/**/tasks/${stage}.md`, context, enrichedConfig, agentsDir, false);
  if (filenameMatches.length > 0) {
    for (const m of filenameMatches) {
      console.warn(`[designbook] task "${m.path}" resolved by filename — add when.steps: [${stage}] to frontmatter`);
    }
    return deduplicateByNameAs(filenameMatches, agentsDir);
  }

  return [];
}

// ── Rule File Matching ──────────────────────────────────────────────

/**
 * Scan all rule files and return paths matching the given stage and config.
 *
 * When `effectiveDomains` is provided, domain-tagged rule files are matched
 * via `matchDomain()` in addition to the legacy `when.steps` path.
 */
export function matchRuleFiles(
  stage: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
  effectiveDomains?: string[],
): string[] {
  const context = buildRuntimeContext(stage, extraConditions);
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/rules/*.md', context, enrichedConfig, agentsDir, true, effectiveDomains);
  return matches.map((m) => m.path);
}

// ── Blueprint File Matching ───────────────────────────────────────────

/**
 * Scan all blueprint files and return paths matching the given stage and config.
 * Blueprints use the same when-frontmatter matching as rules.
 *
 * Unlike rules (which are additive), blueprints are unique per `type`+`name`.
 * If multiple skills define the same type+name blueprint, the one with the
 * highest `priority` frontmatter field wins (default: 0). Equal priority
 * uses last-match-wins (skills are globbed alphabetically).
 *
 * When `effectiveDomains` is provided, domain-tagged blueprint files are matched
 * via `matchDomain()` in addition to the legacy `when.steps` path.
 */
export function matchBlueprintFiles(
  stage: string,
  config: DesignbookConfig,
  agentsDir: string,
  extraConditions?: Record<string, string>,
  effectiveDomains?: string[],
): string[] {
  const context = buildRuntimeContext(stage, extraConditions);
  const enrichedConfig = buildEnrichedConfig(config);
  const matches = resolveFiles('skills/**/blueprints/*.md', context, enrichedConfig, agentsDir, true, effectiveDomains);

  // Deduplicate by type+name — highest priority wins, equal priority = last match wins
  const byKey = new Map<string, { path: string; priority: number }>();
  for (const m of matches) {
    const type = m.frontmatter?.['type'] as string | undefined;
    const name = m.frontmatter?.['name'] as string | undefined;
    if (type && name) {
      const key = `${type}:${name}`;
      const priority = typeof m.frontmatter?.['priority'] === 'number' ? (m.frontmatter['priority'] as number) : 0;
      const existing = byKey.get(key);
      if (!existing || priority >= existing.priority) {
        byKey.set(key, { path: m.path, priority });
      }
    }
  }
  return Array.from(byKey.values()).map((v) => v.path);
}

// ── File Path Expansion ─────────────────────────────────────────────

/**
 * Expand a file path template by substituting {{ param }} and ${ENV_VAR} placeholders.
 */
/**
 * Expand {param} and {{ param }} placeholders in a template string.
 * Unknown {param} placeholders are left as-is (for runtime resolution).
 * Unknown {{ param }} placeholders throw (strict mode for legacy paths).
 */
export function expandParams(template: string, params: Record<string, unknown>): string {
  let result = template;

  const stringifyParam = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'object') return String(value);
    if (Array.isArray(value)) {
      const first = value[0];
      if (first && typeof first === 'object') {
        if ('scene' in first) return String(first.scene);
        if ('storyId' in first) return String(first.storyId);
      }
      return JSON.stringify(value);
    }
    return JSON.stringify(value);
  };

  // Expand {{ param }} patterns (strict — throws on unknown)
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, paramName) => {
    if (params[paramName] !== undefined) return stringifyParam(params[paramName]);
    throw new Error(`Unknown param: {{ ${paramName} }} in "${template}"`);
  });

  // Expand {param} patterns (lenient — leaves unknown as-is for runtime resolution)
  result = result.replace(/\{(\w+)\}/g, (match, paramName) => {
    if (params[paramName] !== undefined) return stringifyParam(params[paramName]);
    return match;
  });

  return result;
}

export function expandFilePath(
  template: string,
  params: Record<string, unknown>,
  envMap: Record<string, string>,
  /** When true, leave unknown $VARS in place instead of throwing. */
  lenient?: boolean,
): string {
  let result = template;

  // Expand ${VAR} and $VAR patterns (env vars)
  result = result.replace(/\$\{(\w+)\}/g, (match, varName) => {
    if (envMap[varName] !== undefined) return envMap[varName];
    if (lenient) return match;
    throw new Error(`Unknown environment variable: \${${varName}} in path "${template}"`);
  });
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    if (envMap[varName] !== undefined) return envMap[varName];
    if (lenient) return match;
    throw new Error(`Unknown environment variable: $${varName} in path "${template}"`);
  });

  // Expand param placeholders
  result = expandParams(result, params);

  return result;
}

/**
 * Expand all file declarations from a task file's frontmatter.
 * Expands the `file` path template, passes through `key` and `validators`.
 */
export function expandFileDeclarations(
  declarations: TaskFileDeclaration[],
  params: Record<string, unknown>,
  envMap: Record<string, string>,
  validatorKeys?: Set<string>,
): Array<{ path: string; key: string; validators: string[] }> {
  const keys = new Set<string>();
  return declarations.map((d) => {
    if (keys.has(d.key)) {
      throw new Error(`Duplicate key '${d.key}' in file declarations`);
    }
    keys.add(d.key);
    const validators = d.validators ?? [];
    if (validatorKeys) {
      for (const v of validators) {
        if (v.startsWith('cmd:')) continue; // cmd: validators are shell commands, not registry keys
        if (!validatorKeys.has(v)) {
          throw new Error(
            `Unknown validator key '${v}' in file '${d.key}'. Available: ${[...validatorKeys].join(', ')}`,
          );
        }
      }
    }
    const template = d.path ?? d.file;
    if (!template) {
      throw new Error(`File declaration '${d.key}' has no 'path' or 'file' property`);
    }
    return {
      path: expandFilePath(template, params, envMap),
      key: d.key,
      validators,
    };
  });
}

/**
 * Expand result declarations from task frontmatter.
 * Converts `result:` map entries to TaskResult-compatible objects.
 * File results (with path:) get expanded paths. Data results pass through.
 *
 * Also handles `files:` → `result:` fallback for backwards compatibility.
 */
export function expandResultDeclarations(
  resultDecl: Record<string, unknown> | undefined,
  filesDecl: TaskFileDeclaration[] | undefined,
  params: Record<string, unknown>,
  envMap: Record<string, string>,
  validatorKeys?: Set<string>,
  /** When true, leave unknown $VARS in paths instead of throwing. */
  lenient?: boolean,
): Record<string, { path?: string; schema?: object; validators?: string[]; flush?: string }> | undefined {
  // Prefer result: over files:
  if (resultDecl) {
    const properties = (resultDecl as Record<string, unknown>).properties as
      | Record<string, ResultDeclaration>
      | undefined;
    if (!properties) return undefined;

    const result: Record<string, { path?: string; schema?: object; validators?: string[]; flush?: string }> = {};
    for (const [key, decl] of Object.entries(properties)) {
      const validators = decl.validators ?? [];
      if (validatorKeys) {
        for (const v of validators) {
          if (v.startsWith('cmd:')) continue;
          if (!validatorKeys.has(v)) {
            throw new Error(
              `Unknown validator key '${v}' in result '${key}'. Available: ${[...validatorKeys].join(', ')}`,
            );
          }
        }
      }

      // Build inline schema from declaration (exclude path, validators, $ref, flush)
      let schema: object | undefined;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { path: _path, validators: _validators, $ref: _ref, flush: _flush, ...schemaProps } = decl;
      if (Object.keys(schemaProps).length > 0) {
        schema = schemaProps as object;
      }

      const entry: { path?: string; schema?: object; validators?: string[]; flush?: string } = {};
      if (decl.path) {
        entry.path = expandFilePath(decl.path, params, envMap, lenient);
      }
      if (schema) entry.schema = schema;
      if (validators.length > 0) entry.validators = validators;
      if (decl.flush) entry.flush = decl.flush;

      result[key] = entry;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }

  // Fallback: convert files: to result: format (deprecated)
  if (filesDecl && filesDecl.length > 0) {
    const result: Record<string, { path?: string; schema?: object; validators?: string[] }> = {};
    const expanded = expandFileDeclarations(filesDecl, params, envMap, validatorKeys);
    for (const f of expanded) {
      result[f.key] = {
        path: f.path,
        ...(f.validators.length > 0 && { validators: f.validators }),
      };
    }
    return result;
  }

  return undefined;
}

// ── Config Resolution ───────────────────────────────────────────────

/**
 * Resolve workflow config rules and instructions for a step.
 * Extension skills (from extensions[].skill in config) are injected into
 * config_instructions at lower priority than explicit step instructions.
 */
export function resolveConfigForStep(
  stage: string,
  rawConfig: Record<string, unknown>,
): { config_rules: string[]; config_instructions: string[] } {
  const workflow = rawConfig.workflow as Record<string, unknown> | undefined;

  const rules = workflow?.rules as Record<string, unknown> | undefined;
  const tasks = workflow?.tasks as Record<string, unknown> | undefined;

  const configRules = rules?.[stage];
  const configInstructions = tasks?.[stage];

  const explicitInstructions = Array.isArray(configInstructions) ? configInstructions.map(String) : [];

  const extensionSkills = getExtensionSkillIds(normalizeExtensions(rawConfig['extensions'])).split(',').filter(Boolean);

  return {
    config_rules: Array.isArray(configRules) ? configRules.map(String) : [],
    config_instructions: [...explicitInstructions, ...extensionSkills],
  };
}

// ── Params Validation ───────────────────────────────────────────────

/**
 * Validate and merge item params against task file's params schema.
 * Required params (value is null/~) must be provided.
 * Optional params (value is a default) are filled from schema if absent.
 */
/**
 * Resolve a `$ref` in a `params:` declaration.
 * Extracts `properties` from the referenced schema and merges with explicit entries (explicit wins).
 */
export function resolveParamsRef(
  params: Record<string, unknown>,
  taskFilePath: string,
  skillsRoot: string,
): Record<string, unknown> {
  const ref = params['$ref'] as string;
  const { schema } = resolveSchemaRef(ref, taskFilePath, skillsRoot);

  const schemaObj = schema as Record<string, unknown>;
  const schemaProps = schemaObj.properties as Record<string, unknown> | undefined;
  if (!schemaProps) {
    throw new Error(
      `$ref '${ref}' in params: resolved to a schema without 'properties'. ` +
        `params: $ref must point to an object schema with properties.`,
    );
  }

  // Merge properties: $ref first, explicit overrides
  const explicitProps = (params.properties ?? {}) as Record<string, unknown>;
  const mergedProperties: Record<string, unknown> = { ...schemaProps, ...explicitProps };

  // Concatenate required arrays
  const schemaRequired = (schemaObj.required ?? []) as string[];
  const explicitRequired = (params.required ?? []) as string[];
  const mergedRequired = [...schemaRequired, ...explicitRequired];

  // Build merged result: copy all non-special keys, then set merged values
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key === '$ref' || key === 'properties' || key === 'required') continue;
    resolved[key] = value;
  }
  resolved.properties = mergedProperties;
  if (mergedRequired.length > 0) {
    resolved.required = mergedRequired;
  }

  return resolved;
}

/**
 * Check whether a param value is a valid inline JSON Schema object.
 * Valid: object with a `type` property (e.g. `{ type: 'string' }`, `{ type: 'array', default: [] }`).
 * Invalid (old format): null, bare array, bare object without `type`, scalar.
 */
export function isJsonSchemaParam(value: unknown): value is Record<string, unknown> & { type: string } {
  return typeof value === 'object' && value !== null && !Array.isArray(value) && 'type' in value;
}

/**
 * Validate that all params in a task file use inline JSON Schema format.
 * Throws with descriptive error on old-format params.
 */
export function validateParamFormats(params: Record<string, unknown>, taskFile: string): void {
  const properties = params.properties as Record<string, unknown> | undefined;
  if (!properties) return; // No properties declared — nothing to validate

  for (const [key, value] of Object.entries(properties)) {
    if (isJsonSchemaParam(value)) continue;

    const got =
      value === null
        ? 'null'
        : Array.isArray(value)
          ? 'array'
          : typeof value === 'object'
            ? 'object without "type"'
            : typeof value;
    throw new Error(
      `Invalid param "${key}" in ${taskFile}: expected JSON Schema object with "type" property, got ${got}. ` +
        `Migrate to inline JSON Schema (e.g. { type: string } or { type: array, default: [] }).`,
    );
  }
}

/**
 * Extract the default value from a JSON Schema param, or undefined if required.
 */
function extractParamDefault(schema: Record<string, unknown>): { hasDefault: boolean; default?: unknown } {
  if ('default' in schema) {
    return { hasDefault: true, default: schema.default };
  }
  return { hasDefault: false };
}

export function validateAndMergeParams(
  itemParams: Record<string, unknown>,
  schemaParams: Record<string, unknown>,
  step: string,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...itemParams };
  const properties = (schemaParams.properties ?? {}) as Record<string, unknown>;
  const requiredKeys = new Set((schemaParams.required ?? []) as string[]);

  const missing: string[] = [];
  for (const [key, value] of Object.entries(properties)) {
    if (merged[key] !== undefined) continue;

    // Skip file-input params — they're read from disk by the AI, not provided via CLI
    if (isJsonSchemaParam(value) && 'path' in value) continue;

    if (isJsonSchemaParam(value)) {
      const def = extractParamDefault(value);
      if (def.hasDefault) {
        merged[key] = def.default;
      } else if (requiredKeys.has(key)) {
        missing.push(key);
      }
      // Not required and no default → skip (optional, caller didn't provide)
    } else if (requiredKeys.has(key)) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const paramList = Object.entries(properties)
      .filter(([, v]) => !(isJsonSchemaParam(v as Record<string, unknown>) && 'path' in (v as Record<string, unknown>)))
      .map(([k]) => {
        const isRequired = requiredKeys.has(k);
        return `${k} (${isRequired ? 'required' : 'optional'})`;
      })
      .join(', ');
    throw new Error(`Missing required param '${missing[0]}' for step '${step}'. Expected params: ${paramList}`);
  }

  return merged;
}

// ── Task ID Generation ──────────────────────────────────────────────

/**
 * Generate a task ID from stage name, params, and index.
 * Produces `<step-basename>-<6-char-hash>` for unambiguous, short IDs.
 */
export function generateTaskId(
  stage: string,
  params: Record<string, unknown>,
  _schemaParams?: Record<string, unknown>,
  index: number = 0,
): string {
  const baseName = stage.includes(':') ? stage.split(':')[1]! : stage;
  const hash = createHash('sha256')
    .update(stage + JSON.stringify(params) + index)
    .digest('hex')
    .slice(0, 6);
  return `${baseName}-${hash}`;
}

/**
 * Ensure task IDs are unique within a plan. Appends suffix for duplicates.
 * Kept as safety net — hash-based IDs should already be unique due to index input.
 */
function deduplicateTaskIds(tasks: ResolvedTask[]): void {
  const seen = new Map<string, number>();
  for (const task of tasks) {
    const count = seen.get(task.id) ?? 0;
    if (count > 0) {
      task.id = `${task.id}-${count + 1}`;
    }
    seen.set(task.id.replace(/-\d+$/, ''), count + 1);
  }
}

// ── Step Resolution (all steps at once) ────────────────────────────

export interface ResolvedStep {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
  /** Unified schema block (params, result, definitions). Only present when the task declares params/result. */
  schema?: SchemaBlock;
}

export interface ExpectedParam {
  required: boolean;
  from_step: string;
  default?: unknown;
}

export interface ResolvedSteps {
  title: string;
  steps: string[];
  stages?: Record<string, StageDefinitionFm>;
  engine?: string;
  step_resolved: Record<string, ResolvedStep | ResolvedStep[]>;
  expected_params: Record<string, ExpectedParam>;
}

/**
 * Resolve ALL steps from a workflow file at create time.
 */
export function resolveAllStages(
  workflowFilePath: string,
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
): ResolvedSteps {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  const stageDefs = wfFm ? getWorkflowStageDefinitions(wfFm) : undefined;

  const allSteps = wfFm ? getWorkflowSteps(wfFm) : undefined;
  if (!allSteps && !stageDefs) {
    throw new Error(`No steps found in frontmatter of ${workflowFilePath}`);
  }

  // Extract workflow ID from file path (e.g. vision/workflows/vision.md → "vision")
  const workflowId = workflowFilePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.md$/, '');

  const stepResolved: Record<string, ResolvedStep | ResolvedStep[]> = {};
  const resolvedSteps: string[] = [];
  const expectedParams: Record<string, ExpectedParam> = {};
  const collectedSchemas: Record<string, object> = {};

  for (const step of allSteps ?? []) {
    let resolvedTaskFiles = resolveTaskFilesRich(step, config, agentsDir);
    // If plain step didn't match, try workflow-qualified name (e.g. "intake" → "design-shell:intake")
    if (resolvedTaskFiles.length === 0 && !step.includes(':') && workflowId) {
      resolvedTaskFiles = resolveTaskFilesRich(`${workflowId}:${step}`, config, agentsDir);
    }
    if (resolvedTaskFiles.length === 0) {
      console.debug(`[Designbook] workflow: step "${step}" skipped — no matching task file`);
      continue;
    }
    const taskFilePaths = resolvedTaskFiles.map((r) => r.path);

    // Compute effectiveDomains: union of domain: from task files + stage definition
    const effectiveDomains: string[] = [];
    for (const taskFile of taskFilePaths) {
      const taskFm = parseFrontmatter(taskFile) as Record<string, unknown> | null;
      const taskDomain = taskFm?.domain;
      if (taskDomain !== undefined) {
        const domains: string[] = Array.isArray(taskDomain)
          ? (taskDomain as string[]).map(String)
          : [String(taskDomain)];
        for (const d of domains) {
          if (!effectiveDomains.includes(d)) effectiveDomains.push(d);
        }
      }
    }
    // Also include domain from the stage definition (if any)
    if (stageDefs) {
      for (const [, stageDef] of Object.entries(stageDefs)) {
        if (stageDef.steps?.includes(step) && stageDef.domain) {
          for (const d of stageDef.domain) {
            if (!effectiveDomains.includes(d)) effectiveDomains.push(d);
          }
        }
      }
    }

    // Match rules/blueprints for the step name AND variant names:
    // - If step is plain (e.g. "intake"), also try workflow-qualified ("vision:intake")
    // - If step is already qualified (e.g. "design-screen:map-entity"), also try base ("map-entity")
    const isQualified = step.includes(':');
    const baseStep = isQualified ? step.split(':').pop()! : step;
    const qualifiedStep = isQualified ? step : workflowId ? `${workflowId}:${step}` : undefined;

    // Collect from all name variants (step itself + base/qualified alternate)
    const stepsToMatch = [step];
    if (isQualified && baseStep !== step) stepsToMatch.push(baseStep);
    if (qualifiedStep && qualifiedStep !== step) stepsToMatch.push(qualifiedStep);

    const effectiveDomainsArg = effectiveDomains.length > 0 ? effectiveDomains : undefined;
    const ruleFiles: string[] = [];
    for (const s of stepsToMatch) {
      for (const r of matchRuleFiles(s, config, agentsDir, undefined, effectiveDomainsArg)) {
        if (!ruleFiles.includes(r)) ruleFiles.push(r);
      }
    }
    const blueprintFiles: string[] = [];
    for (const s of stepsToMatch) {
      for (const b of matchBlueprintFiles(s, config, agentsDir, undefined, effectiveDomainsArg)) {
        if (!blueprintFiles.includes(b)) blueprintFiles.push(b);
      }
    }
    const { config_rules, config_instructions } = resolveConfigForStep(step, rawConfig);

    // Read frontmatter from primary task file for schema block
    const primaryTaskFile = taskFilePaths[0]!;
    const taskFmForSchema = parseFrontmatter(primaryTaskFile) as TaskFileFrontmatter | null;

    // Schema composition: merge base result schemas with rule/blueprint extensions
    let mergedSchema: Record<string, object> | undefined;
    if (ruleFiles.length > 0 || blueprintFiles.length > 0) {
      if (taskFmForSchema?.result) {
        const resultProps = (taskFmForSchema.result as Record<string, unknown>).properties as
          | Record<string, Record<string, unknown>>
          | undefined;
        const baseResult: Record<string, { schema?: object }> = {};
        if (resultProps) {
          for (const [rk, rv] of Object.entries(resultProps)) {
            // Build inline schema from result declaration (excluding path/$ref/validators)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { path: _path, $ref: _ref, validators: _validators, ...schemaProps } = rv;
            if (Object.keys(schemaProps).length > 0) {
              baseResult[rk] = { schema: schemaProps };
            }
          }
        }
        if (Object.keys(baseResult).length > 0) {
          mergedSchema = computeMergedSchema(baseResult, {
            blueprintFiles,
            ruleFiles,
            skillsRoot: resolve(agentsDir, 'skills'),
            schemas: collectedSchemas,
          });
        }
      }
    }

    // Build unified schema block from task frontmatter
    const envMap = buildEnvMap(config);
    const schemaBlock = buildSchemaBlock({
      params: taskFmForSchema?.params as Record<string, unknown> | undefined,
      result: taskFmForSchema?.result as Record<string, unknown> | undefined,
      taskFilePath: primaryTaskFile,
      skillsRoot: resolve(agentsDir, 'skills'),
      envMap,
    });

    // Merge schema composition results into schema block definitions
    if (mergedSchema) {
      for (const [resultKey, composedSchema] of Object.entries(mergedSchema)) {
        const resultEntry = schemaBlock.result[resultKey];
        if (resultEntry?.$ref) {
          // Result references a definition — merge into that definition
          const defName = resultEntry.$ref.replace('#/definitions/', '');
          if (schemaBlock.definitions[defName]) {
            Object.assign(schemaBlock.definitions[defName], composedSchema);
          }
        } else {
          // Inline result — store composed schema in definitions keyed by result key
          schemaBlock.definitions[resultKey] = composedSchema;
        }
      }
    }

    const hasSchema =
      Object.keys(schemaBlock.definitions).length > 0 ||
      Object.keys(schemaBlock.params).length > 0 ||
      Object.keys(schemaBlock.result).length > 0;

    if (taskFilePaths.length === 1) {
      stepResolved[step] = {
        task_file: taskFilePaths[0]!,
        rules: ruleFiles,
        blueprints: blueprintFiles,
        config_rules,
        config_instructions,
        ...(hasSchema ? { schema: schemaBlock } : {}),
      };
    } else {
      // Multiple tasks per step: ordered by priority (from deduplicateByNameAs)
      stepResolved[step] = taskFilePaths.map((taskFile) => ({
        task_file: taskFile,
        rules: ruleFiles,
        blueprints: blueprintFiles,
        config_rules,
        config_instructions,
        ...(hasSchema ? { schema: schemaBlock } : {}),
      }));
    }
    resolvedSteps.push(step);

    // Aggregate expected_params from task file frontmatter
    const skillsRoot = resolve(agentsDir, 'skills');
    for (const taskFile of taskFilePaths) {
      const taskFm = parseFrontmatter(taskFile) as Record<string, unknown> | null;
      let params = taskFm?.params as Record<string, unknown> | undefined;
      if (!params) continue;

      // Resolve $ref in params before validation
      if ('$ref' in params) {
        params = resolveParamsRef(params, taskFile, skillsRoot);
      }

      // Validate all params use inline JSON Schema format
      validateParamFormats(params, taskFile);

      const properties = (params.properties ?? {}) as Record<string, unknown>;
      const requiredKeys = new Set((params.required ?? []) as string[]);

      for (const [key, value] of Object.entries(properties)) {
        const schema = value as Record<string, unknown>;
        const def = extractParamDefault(schema);
        const isRequired = requiredKeys.has(key) || !def.hasDefault;

        if (key in expectedParams) {
          // If ANY step marks it required, it stays required
          if (isRequired && !expectedParams[key]!.required) {
            expectedParams[key]!.required = true;
          }
        } else {
          expectedParams[key] = {
            required: isRequired,
            from_step: step,
            ...(def.hasDefault ? { default: def.default } : {}),
          };
        }
      }
    }
  }

  return {
    title: wfFm ? getWorkflowTitle(wfFm) : '',
    steps: resolvedSteps,
    ...(stageDefs ? { stages: stageDefs } : {}),
    ...(wfFm?.engine ? { engine: wfFm.engine } : {}),
    step_resolved: stepResolved,
    expected_params: expectedParams,
  };
}

// ── Main Resolution Function ────────────────────────────────────────

/**
 * Infer task type from the stage name.
 */
export function inferTaskType(stage: string): string {
  const base = stage.includes(':') ? stage.split(':')[1]! : stage;
  if (base.includes('component') || base.includes('shell')) return 'component';
  if (base.includes('scene')) return 'scene';
  if (base.includes('token')) return 'tokens';
  if (base.includes('css') || base.includes('generate')) return 'css';
  if (base.includes('data') || base.includes('model') || base.includes('sample')) return 'data';
  if (base.includes('entity') || base.includes('map') || base.includes('collect')) return 'view-mode';
  if (base.includes('validate')) return 'validation';
  return 'data';
}

/**
 * Generate a human-readable task title from stage and params.
 */
export function generateTaskTitle(
  stage: string,
  params: Record<string, unknown>,
  schemaParams?: Record<string, unknown>,
  explicitTitle?: string,
): string {
  if (explicitTitle) {
    return expandParams(explicitTitle, params);
  }

  // Derive title from step name
  const base = stage.includes(':') ? stage.split(':')[1]! : stage;
  const words = base.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  if (schemaParams) {
    for (const [key, defaultValue] of Object.entries(schemaParams)) {
      if (defaultValue === null && typeof params[key] === 'string' && (params[key] as string).length > 0) {
        return `${words}: ${params[key]}`;
      }
    }
  }

  for (const value of Object.values(params)) {
    if (typeof value === 'string' && value.length > 0) {
      return `${words}: ${value}`;
    }
  }

  return words;
}

/**
 * Resolve a full workflow plan from items + pre-resolved step data.
 */
export function resolveWorkflowPlan(
  workflowFilePath: string,
  globalParams: Record<string, unknown>,
  items: PlanItem[],
  config: DesignbookConfig,
  rawConfig: Record<string, unknown>,
  agentsDir: string,
  stepResolved?: Record<string, ResolvedStep>,
): ResolvedPlan {
  const wfFm = parseFrontmatter(workflowFilePath) as WorkflowFrontmatter | null;
  const allSteps = wfFm ? getWorkflowSteps(wfFm) : undefined;
  if (!allSteps) {
    throw new Error(`No steps found in frontmatter of ${workflowFilePath}`);
  }

  const stageDefs = wfFm ? getWorkflowStageDefinitions(wfFm) : undefined;

  // Build step → parent stage mapping
  const stepToStage = new Map<string, string>();
  if (stageDefs) {
    for (const [stageName, def] of Object.entries(stageDefs)) {
      for (const step of def.steps ?? []) {
        stepToStage.set(step, stageName);
      }
    }
  }

  for (const item of items) {
    if (!allSteps.includes(item.step)) {
      throw new Error(`Item step "${item.step}" not found in workflow steps: [${allSteps.join(', ')}]`);
    }
  }

  const envMap = buildEnvMap(config);

  const itemsByStep = new Map<string, PlanItem[]>();
  for (const step of allSteps) {
    itemsByStep.set(step, []);
  }
  for (const item of items) {
    itemsByStep.get(item.step)!.push(item);
  }

  const tasks: ResolvedTask[] = [];

  for (const step of allSteps) {
    const stepItems = itemsByStep.get(step) ?? [];
    if (stepItems.length === 0) continue;

    // Resolve task files for this step — may be pre-resolved or freshly resolved
    const preResolved = stepResolved?.[step];
    const resolvedEntries: ResolvedStep[] = preResolved
      ? Array.isArray(preResolved)
        ? preResolved
        : [preResolved]
      : resolveTaskFiles(step, config, agentsDir).map((taskFile) => ({
          task_file: taskFile,
          rules: matchRuleFiles(step, config, agentsDir),
          blueprints: matchBlueprintFiles(step, config, agentsDir),
          ...resolveConfigForStep(step, rawConfig),
        }));

    if (resolvedEntries.length === 0) {
      console.debug(`[Designbook] workflow plan: step "${step}" skipped — no matching task file`);
      continue;
    }

    for (const resolved of resolvedEntries) {
      const taskFm = parseFrontmatter(resolved.task_file) as TaskFileFrontmatter | null;
      const schemaParams = taskFm?.params ?? {};
      const fileDeclarations = taskFm?.files ?? [];

      for (const item of stepItems) {
        const mergedParams = validateAndMergeParams(item.params ?? {}, schemaParams, step);
        const taskId = generateTaskId(step, mergedParams, schemaParams);
        const title = generateTaskTitle(step, mergedParams, schemaParams);
        const type = inferTaskType(step);
        const files = expandFileDeclarations(fileDeclarations, mergedParams, envMap);

        // Expand result: declarations (new model), with files: fallback
        const result = expandResultDeclarations(taskFm?.result, taskFm?.files, mergedParams, envMap);

        tasks.push({
          id: taskId,
          title,
          type,
          step,
          stage: stepToStage.get(step) ?? 'execute',
          params: mergedParams,
          task_file: resolved.task_file,
          rules: resolved.rules,
          blueprints: resolved.blueprints,
          config_rules: resolved.config_rules,
          config_instructions: resolved.config_instructions,
          files,
          ...(result && { result }),
        });
      }
    }
  }

  deduplicateTaskIds(tasks);

  // Resolve $ref schemas from all tasks (Task 1.3 — fail-fast on unresolvable $ref)
  const skillsRoot = resolve(agentsDir, 'skills');
  const schemas = collectAndResolveSchemas(tasks, skillsRoot);

  return {
    params: globalParams,
    steps: allSteps,
    tasks,
    ...(Object.keys(schemas).length > 0 && { schemas }),
  };
}
