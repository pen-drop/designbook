import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { dump as stringifyYaml } from 'js-yaml';
import { buildSchemaBlock } from '../../schema-block.js';
import type { BuildSchemaBlockInput } from '../../schema-block.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `schema-block-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeYaml(filePath: string, data: unknown): void {
  mkdirSync(resolve(filePath, '..'), { recursive: true });
  writeFileSync(filePath, stringifyYaml(data));
}

// ── setup / teardown ──────────────────────────────────────────────────────────

let tmpDir: string;

beforeEach(() => {
  tmpDir = makeTmpDir();
});

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('buildSchemaBlock()', () => {
  // Test 1: resolves param with path: on existing YAML file
  it('resolves param with path: on existing YAML file', () => {
    const dataFile = resolve(tmpDir, 'vision.yml');
    writeYaml(dataFile, { title: 'My Vision', description: 'Some text' });

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          vision: { path: dataFile, type: 'string' },
        },
      },
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.params.vision).toBeDefined();
    expect(block.params.vision!.path).toBe(dataFile);
    expect(block.params.vision!.exists).toBe(true);
    expect(block.params.vision!.content).toEqual({ title: 'My Vision', description: 'Some text' });
    expect(block.params.vision!.type).toBe('string');
  });

  // Test 2: returns exists: false and content: null for missing file
  it('returns exists: false and content: null for missing file', () => {
    const missingFile = resolve(tmpDir, 'nonexistent.yml');

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          data: { path: missingFile },
        },
      },
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.params.data!.path).toBe(missingFile);
    expect(block.params.data!.exists).toBe(false);
    expect(block.params.data!.content).toBeNull();
  });

  // Test 3: expands $ENV_VAR in path
  it('expands $ENV_VAR in path', () => {
    const dataDir = resolve(tmpDir, 'data');
    mkdirSync(dataDir, { recursive: true });
    const visionFile = resolve(dataDir, 'vision.yml');
    writeYaml(visionFile, { title: 'Vision' });

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          vision: { path: '$DESIGNBOOK_DATA/vision.yml' },
        },
      },
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: { DESIGNBOOK_DATA: dataDir },
    };

    const block = buildSchemaBlock(input);

    expect(block.params.vision!.path).toBe(visionFile);
    expect(block.params.vision!.exists).toBe(true);
    expect(block.params.vision!.content).toEqual({ title: 'Vision' });
  });

  // Test 4: resolves $ref into definitions for param
  it('resolves $ref into definitions for param', () => {
    // Create schemas.yml in schemaDir/schemas.yml, task at schemaDir/tasks/task.md
    const schemaDir = resolve(tmpDir, 'myskill');
    const tasksDir = resolve(schemaDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    const schemasFile = resolve(schemaDir, 'schemas.yml');
    writeYaml(schemasFile, {
      Vision: {
        type: 'object',
        properties: {
          title: { type: 'string' },
        },
      },
    });

    const taskFilePath = resolve(tasksDir, 'task.md');
    writeFileSync(taskFilePath, '---\ntitle: Test\n---\n');

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          vision: { $ref: '../schemas.yml#/Vision' },
        },
      },
      result: undefined,
      taskFilePath,
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.params.vision!.$ref).toBe('#/definitions/Vision');
    expect(block.definitions['Vision']).toBeDefined();
    expect(block.definitions['Vision']).toEqual({
      type: 'object',
      properties: { title: { type: 'string' } },
    });
  });

  // Test 5: resolves $ref, path, exists, and content for result entries (same logic as params)
  it('resolves $ref, path, exists, and content for result entries', () => {
    const schemaDir = resolve(tmpDir, 'myskill');
    const tasksDir = resolve(schemaDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    const schemasFile = resolve(schemaDir, 'schemas.yml');
    writeYaml(schemasFile, {
      DataModel: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
    });

    const outputFile = resolve(tmpDir, 'output.yml');
    writeYaml(outputFile, { name: 'test-model' });

    const taskFilePath = resolve(tasksDir, 'task.md');
    writeFileSync(taskFilePath, '---\ntitle: Test\n---\n');

    const input: BuildSchemaBlockInput = {
      params: undefined,
      result: {
        properties: {
          model: { $ref: '../schemas.yml#/DataModel', path: outputFile },
        },
      },
      taskFilePath,
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.result.model!.$ref).toBe('#/definitions/DataModel');
    expect(block.result.model!.path).toBe(outputFile);
    expect(block.result.model!.exists).toBe(true);
    expect(block.result.model!.content).toEqual({ name: 'test-model' });
    expect(block.definitions['DataModel']).toBeDefined();
  });

  // Test 6: result entry with missing file gets exists: false and content: null
  it('result entry with missing file gets exists: false and content: null', () => {
    const missingFile = resolve(tmpDir, 'missing-output.yml');

    const input: BuildSchemaBlockInput = {
      params: undefined,
      result: {
        properties: {
          output: { path: missingFile },
        },
      },
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.result.output!.path).toBe(missingFile);
    expect(block.result.output!.exists).toBe(false);
    expect(block.result.output!.content).toBeNull();
  });

  // Test 7: deduplicates definitions when same schema used in param and result
  it('deduplicates definitions when same schema used in param and result', () => {
    const schemaDir = resolve(tmpDir, 'myskill');
    const tasksDir = resolve(schemaDir, 'tasks');
    mkdirSync(tasksDir, { recursive: true });

    const schemasFile = resolve(schemaDir, 'schemas.yml');
    writeYaml(schemasFile, {
      SharedType: {
        type: 'object',
        properties: { id: { type: 'string' } },
      },
    });

    const taskFilePath = resolve(tasksDir, 'task.md');
    writeFileSync(taskFilePath, '---\ntitle: Test\n---\n');

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          input: { $ref: '../schemas.yml#/SharedType' },
        },
      },
      result: {
        properties: {
          output: { $ref: '../schemas.yml#/SharedType' },
        },
      },
      taskFilePath,
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    // Only one entry for SharedType in definitions
    expect(Object.keys(block.definitions)).toHaveLength(1);
    expect(block.definitions['SharedType']).toBeDefined();

    // Both params and result reference it
    expect(block.params.input!.$ref).toBe('#/definitions/SharedType');
    expect(block.result.output!.$ref).toBe('#/definitions/SharedType');
  });

  // Test 8: handles directory params — exists check only, no content
  it('handles directory params — exists check only, no content', () => {
    const actualDir = resolve(tmpDir, 'some-dir');
    mkdirSync(actualDir, { recursive: true });
    // Use a trailing slash so the implementation recognises it as a directory path
    const dirPath = actualDir + '/';

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          dir: { path: dirPath },
        },
      },
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.params.dir!.path).toBe(dirPath);
    expect(block.params.dir!.exists).toBe(true);
    // No content for directories
    expect(block.params.dir!.content).toBeUndefined();
  });

  // Test 9: passes through pattern paths without resolving
  it('passes through pattern paths without resolving', () => {
    const patternPath = resolve(tmpDir, '[component]/vision.yml');

    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          vision: { path: patternPath },
        },
      },
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.params.vision!.path).toBe(patternPath);
    // Pattern paths should NOT have exists or content set
    expect(block.params.vision!.exists).toBeUndefined();
    expect(block.params.vision!.content).toBeUndefined();
  });

  // Test 10: handles empty params and result
  it('handles empty params and result (undefined inputs)', () => {
    const input: BuildSchemaBlockInput = {
      params: undefined,
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.definitions).toEqual({});
    expect(block.params).toEqual({});
    expect(block.result).toEqual({});
  });

  // Test 11: handles CLI-only params (no path:) — passes through without file resolution
  it('handles CLI-only params (no path:) — passes through without file resolution', () => {
    const input: BuildSchemaBlockInput = {
      params: {
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
          flag: { type: 'boolean' },
        },
      },
      result: undefined,
      taskFilePath: resolve(tmpDir, 'tasks', 'task.md'),
      skillsRoot: tmpDir,
      envMap: {},
    };

    const block = buildSchemaBlock(input);

    expect(block.params.name).toEqual({ type: 'string' });
    expect(block.params.count).toEqual({ type: 'number' });
    expect(block.params.flag).toEqual({ type: 'boolean' });

    // No path resolution
    expect(block.params.name!.path).toBeUndefined();
    expect(block.params.name!.exists).toBeUndefined();
    expect(block.params.name!.content).toBeUndefined();
  });
});
