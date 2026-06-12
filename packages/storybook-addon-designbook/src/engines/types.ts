import type { WorkflowFile, WorkflowTask } from '../workflow.js';

export interface TransitionContext {
  /** Current workflow data. */
  data: WorkflowFile;
}

export interface TransitionResult {
  /** Whether to archive the workflow. */
  archive?: boolean;
}

export interface WorkflowEngine {
  /** Write file content. Returns the path where the file was written. */
  writeFile(data: WorkflowFile, task: WorkflowTask, key: string, content: string | Buffer): { path: string };
  /** Return the staged path for a file key (for external writers like Playwright). */
  getStagedPath(data: WorkflowFile, task: WorkflowTask, key: string): string;
  /** Flush stashed files to target paths. Called at stage boundaries. */
  flush(data: WorkflowFile, tasks: WorkflowTask[]): void | Promise<void>;
  /** Hook called when all tasks are done. Returns action to take. */
  done(data: WorkflowFile): { archive: boolean };
  /** Tear down any per-run staging on abandon. Called from workflowAbandon. */
  cleanup(data: WorkflowFile): void;
  /** Handle a lifecycle stage transition. */
  onTransition(from: string, to: string, ctx: TransitionContext): TransitionResult | Promise<TransitionResult>;
}
