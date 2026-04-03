export type TaskStatus = 'pending' | 'in-progress' | 'done' | 'incomplete';

export type TaskType = 'component' | 'scene' | 'data' | 'tokens' | 'view-mode' | 'css' | 'validation';

export interface ValidationFileResult {
  file: string; // relative to designbook dir
  type: string; // 'component' | 'story' | 'tokens' | 'data' | 'data-model' | 'view-mode' | 'unknown'
  valid: boolean | null;
  error?: string;
  html?: string; // story only
  skipped?: boolean; // when Storybook not running
  last_validated: string; // ISO timestamp — set on every validate run
  last_passed?: string; // ISO timestamp — when this file last passed
  last_failed?: string; // ISO timestamp — when this file last failed
}

export interface TaskFile {
  path: string; // resolved absolute target path
  key: string; // stable identifier used by write-file --key
  validators: string[]; // validator keys (e.g. ['tokens', 'component'])
  validation_result?: ValidationFileResult; // absent = not yet written; present = written + validated
  flushed_at?: string; // ISO timestamp — set when engine flushes stash to final path
}

export interface StageLoaded {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
}

export interface StageParam {
  type: string;
  prompt: string;
}

export interface StageDefinition {
  steps: string[];
  each?: string;
  params?: Record<string, StageParam>;
}

export interface WorkflowTask {
  id: string;
  title: string;
  type: TaskType;
  step?: string; // canonical step name (e.g. create-component, create-scene) — was: stage
  stage?: string; // parent stage name (execute, test, preview)
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  depends_on?: string[]; // task IDs this task depends on (computed from step ordering)
  params?: Record<string, unknown>; // per-task params from intake (e.g. component name, slots)
  task_file?: string; // absolute path to resolved skill task file
  rules?: string[]; // absolute paths to matched skill rule files
  blueprints?: string[]; // absolute paths to matched skill blueprint files
  config_rules?: string[]; // strings from designbook.config.yml → workflow.rules.<step>
  config_instructions?: string[]; // strings from designbook.config.yml → workflow.tasks.<step>
  files?: TaskFile[]; // produced files, each with its own validation state
}

export interface WorkflowTaskFile {
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed' | 'incomplete';
  parent?: string;
  params?: Record<string, unknown>; // global intake params (accessible to all subagents)
  current_stage?: string; // current lifecycle stage (planned, execute, committed, test, preview, finalizing, done)
  stages?: Record<string, StageDefinition>; // keyed by stage name (execute, test, preview)
  stage_loaded?: Record<string, StageLoaded>; // keyed by step name, populated via workflow done --loaded
  started_at: string | null;
  completed_at: string | null;
  summary?: string;
  /** Absolute path to the isolated WORKTREE directory for this workflow run. Set at workflow plan time. */
  write_root?: string;
  /** Absolute path to DESIGNBOOK_HOME (theme/Storybook app dir). Stored so workflowDone can copy WORKTREE → home. */
  root_dir?: string;
  tasks: WorkflowTask[];
}

export interface WorkflowTaskFileWithMeta extends WorkflowTaskFile {
  changeName: string;
  source: 'active' | 'archived';
}
