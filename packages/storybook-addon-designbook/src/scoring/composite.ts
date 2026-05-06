import vm from 'node:vm';

export interface FlowRateInput {
  successRate?: number;
  errors?: number;
  retries?: number;
  unresolved?: number;
}

export interface FlowRateResult {
  flowRate: number;
  successRate?: number;
  metrics: { errors: number; retries: number; unresolved: number };
}

export const FRICTION_WEIGHTS = { error: 5, retry: 2, unresolved: 3 } as const;

export function computeFlowRate(input: FlowRateInput): FlowRateResult {
  const errors = input.errors ?? 0;
  const retries = input.retries ?? 0;
  const unresolved = input.unresolved ?? 0;
  const friction =
    errors * FRICTION_WEIGHTS.error + retries * FRICTION_WEIGHTS.retry + unresolved * FRICTION_WEIGHTS.unresolved;
  const base = typeof input.successRate === 'number' ? input.successRate * 100 : 0;
  return {
    flowRate: base - friction,
    ...(typeof input.successRate === 'number' ? { successRate: input.successRate } : {}),
    metrics: { errors, retries, unresolved },
  };
}

export interface Assertion {
  type: string;
  value: string;
}
export interface AssertionResult {
  passed: number;
  total: number;
  failures: string[];
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
      if (vm.runInContext(a.value, ctx, { timeout: ASSERTION_TIMEOUT_MS })) {
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
