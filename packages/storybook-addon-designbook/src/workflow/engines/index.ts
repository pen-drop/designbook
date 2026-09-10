export type { WorkflowEngine, TransitionContext, TransitionResult } from './types.js';
export { directEngine } from './direct.js';

import { directEngine } from './direct.js';
import type { WorkflowEngine } from './types.js';

export const engines: Record<string, WorkflowEngine> = {
  direct: directEngine,
};
