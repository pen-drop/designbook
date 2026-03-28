import type { WorkflowEngine, TransitionResult } from './types.js';

export const directEngine: WorkflowEngine = {
  setup(ctx) {
    return { envMap: ctx.envMap };
  },
  commit() {
    /* noop — files already written to real paths */
  },
  merge() {
    throw new Error('Engine "direct" does not support merge — files are already written to real paths');
  },
  done() {
    return { archive: true };
  },
  cleanup() {
    /* noop */
  },
  onTransition(from: string, to: string): TransitionResult {
    switch (`${from}→${to}`) {
      case 'finalizing→done':
        return { archive: true };
      default:
        return {};
    }
  },
};
