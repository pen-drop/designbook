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
  path: string; // relative to designbook dir
  requires_validation?: boolean; // true after workflow update --files; cleared after workflow validate
  validation_result?: ValidationFileResult;
}

export interface TaskValidationEntry {
  file: string;      // absolute path
  validator: string; // e.g. 'component', 'scene', 'tokens', 'data', 'twig'
  passed: boolean;
}

export interface StageLoaded {
  task_file: string;
  rules: string[];
  config_rules: string[];
  config_instructions: string[];
}

export interface WorkflowTask {
  id: string;
  title: string;
  type: TaskType;
  stage?: string; // canonical stage name (e.g. create-component, create-scene)
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  depends_on?: string[]; // task IDs this task depends on (computed from stage ordering)
  params?: Record<string, unknown>; // per-task params from intake (e.g. component name, slots)
  task_file?: string; // absolute path to resolved skill task file
  rules?: string[]; // absolute paths to matched skill rule files
  config_rules?: string[]; // strings from designbook.config.yml → workflow.rules.<stage>
  config_instructions?: string[]; // strings from designbook.config.yml → workflow.tasks.<stage>
  files?: TaskFile[]; // produced files, each with its own validation state
  validation?: TaskValidationEntry[]; // validators run during workflow validate
}

export interface WorkflowTaskFile {
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed' | 'incomplete';
  parent?: string;
  params?: Record<string, unknown>; // global intake params (accessible to all subagents)
  stages?: string[]; // ordered stage names from workflow frontmatter
  stage_loaded?: Record<string, StageLoaded>; // keyed by stage name, populated via workflow done --loaded
  started_at: string | null;
  completed_at: string | null;
  summary?: string;
  tasks: WorkflowTask[];
}

export interface WorkflowTaskFileWithMeta extends WorkflowTaskFile {
  changeName: string;
  source: 'active' | 'archived';
}
