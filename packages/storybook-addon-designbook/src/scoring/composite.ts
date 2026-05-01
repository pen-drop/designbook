/**
 * Composite metric for research-mode loop.
 *
 * score = success_rate*100 + (assertions.passed/total)*30
 *       - errors*5 - retries*2 - unresolved*3
 *
 * Falls back to friction-only when no correctness signal is present.
 */

import vm from 'node:vm';

export interface AssertionResult {
  passed: number;
  total: number;
  failures: string[];
}

export interface ScoreInput {
  successRate?: number;
  assertions?: AssertionResult;
  errors?: number;
  retries?: number;
  unresolved?: number;
}

export interface ScoreResult {
  score: number;
  components: {
    successRate?: number;
    assertions?: AssertionResult;
    errors: number;
    retries: number;
    unresolved: number;
  };
  computedFrom: 'composite' | 'friction';
}

const SUCCESS_WEIGHT = 100;
const ASSERTIONS_WEIGHT = 30;
const ERROR_PENALTY = 5;
const RETRY_PENALTY = 2;
const UNRESOLVED_PENALTY = 3;

export function computeScore(input: ScoreInput): ScoreResult {
  const errors = input.errors ?? 0;
  const retries = input.retries ?? 0;
  const unresolved = input.unresolved ?? 0;

  const hasSuccess = typeof input.successRate === 'number';
  const hasAssertions = !!input.assertions && input.assertions.total > 0;

  let positive = 0;
  if (hasSuccess) {
    const rate = input.successRate as number;
    positive += rate * SUCCESS_WEIGHT;
  }
  if (hasAssertions) {
    const assertions = input.assertions as AssertionResult;
    const ratio = assertions.passed / assertions.total;
    positive += ratio * ASSERTIONS_WEIGHT;
  }

  const friction = errors * ERROR_PENALTY + retries * RETRY_PENALTY + unresolved * UNRESOLVED_PENALTY;
  const score = positive - friction;

  const computedFrom: 'composite' | 'friction' = hasSuccess || hasAssertions ? 'composite' : 'friction';

  return {
    score,
    components: {
      ...(hasSuccess ? { successRate: input.successRate } : {}),
      ...(hasAssertions ? { assertions: input.assertions } : {}),
      errors,
      retries,
      unresolved,
    },
    computedFrom,
  };
}

export interface Assertion {
  type: string;
  value: string;
}

const ASSERTION_TIMEOUT_MS = 1000;

export function evalAssertions(assertions: Assertion[], output: unknown): AssertionResult {
  let passed = 0;
  let total = 0;
  const failures: string[] = [];

  for (const a of assertions) {
    if (a.type !== 'javascript') continue;
    total += 1;
    const ctx = vm.createContext({ output }, { codeGeneration: { strings: false, wasm: false } });
    try {
      const result = vm.runInContext(a.value, ctx, { timeout: ASSERTION_TIMEOUT_MS });
      if (result) {
        passed += 1;
      } else {
        failures.push(a.value);
      }
    } catch {
      failures.push(a.value);
    }
  }

  return { passed, total, failures };
}
