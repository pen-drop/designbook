import { describe, it, expect } from 'vitest';
import { classifyInputs, type PriorTaskOutput } from '../sources.js';

describe('classifyInputs', () => {
  const priorOutputs: PriorTaskOutput[] = [
    { stage: 'reference', task: 'extract-reference', properties: { extract: { type: 'object' } } },
    { stage: 'triage', task: 'triage', properties: { issues: { type: 'array' } } },
    { stage: 'intake', task: 'intake', properties: { components: { type: 'array' } } },
  ];

  it('classifies a param with `path:` as file', () => {
    expect(classifyInputs({ vision: { path: '$D/vision.yml', type: 'object' } }, {}, priorOutputs)).toEqual([
      { kind: 'file', name: 'vision', path: '$D/vision.yml' },
    ]);
  });

  it('classifies a param matching an earlier task result by name as produced', () => {
    expect(classifyInputs({ components: { type: 'array' } }, {}, priorOutputs)).toEqual([
      { kind: 'produced', name: 'components', stage: 'intake', task: 'intake' },
    ]);
  });

  it('classifies an each-key as iteration with its expr', () => {
    const eachKeys = { issue: { expr: 'issues' } };
    expect(classifyInputs({ issue: { type: 'object' } }, eachKeys, priorOutputs)).toEqual([
      { kind: 'iteration', name: 'issue', expr: 'issues' },
    ]);
  });

  it('iteration takes precedence over produced when names collide', () => {
    // `issues` is produced by triage, but if a task declares `each: { issues: ... }`
    // we want iteration semantics, not produced.
    const eachKeys = { issues: { expr: 'issues' } };
    expect(classifyInputs({ issues: { type: 'array' } }, eachKeys, priorOutputs)).toEqual([
      { kind: 'iteration', name: 'issues', expr: 'issues' },
    ]);
  });

  it('classifies a param with no path/each/upstream match as workflow', () => {
    expect(classifyInputs({ scene_id: { type: 'string' } }, {}, priorOutputs)).toEqual([
      { kind: 'workflow', name: 'scene_id' },
    ]);
  });

  it('preserves declaration order in output', () => {
    const out = classifyInputs(
      {
        scenes: { type: 'array' },
        vision: { path: '/v.yml', type: 'object' },
        scene_id: { type: 'string' },
      },
      {},
      [{ stage: 'intake', task: 'intake', properties: { scenes: {} } }],
    );
    expect(out.map((s) => [s.name, s.kind])).toEqual([
      ['scenes', 'produced'],
      ['vision', 'file'],
      ['scene_id', 'workflow'],
    ]);
  });

  it('matches the EARLIEST prior task when name appears in multiple stages', () => {
    const dup: PriorTaskOutput[] = [
      { stage: 's1', task: 't1', properties: { x: {} } },
      { stage: 's2', task: 't2', properties: { x: {} } },
    ];
    expect(classifyInputs({ x: {} }, {}, dup)).toEqual([{ kind: 'produced', name: 'x', stage: 's1', task: 't1' }]);
  });

  it('returns an empty array for empty params', () => {
    expect(classifyInputs({}, {}, priorOutputs)).toEqual([]);
  });
});
