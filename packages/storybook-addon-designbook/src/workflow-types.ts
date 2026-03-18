export type TaskStatus = 'pending' | 'in-progress' | 'done';

export type TaskType = 'component' | 'scene' | 'data' | 'tokens' | 'view-mode' | 'css' | 'validation';

export interface ValidationFileResult {
  file: string; // relative to designbook dir
  type: string; // 'component' | 'story' | 'tokens' | 'data' | 'data-model' | 'view-mode' | 'unknown'
  valid: boolean;
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

export interface WorkflowTask {
  id: string;
  title: string;
  type: TaskType;
  stage?: string; // canonical stage name (e.g. create-component, create-scene)
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  files?: TaskFile[]; // produced files, each with its own validation state
}

export interface WorkflowTaskFile {
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed';
  stages?: string[]; // ordered stage names from workflow frontmatter
  started_at: string | null;
  completed_at: string | null;
  summary?: string;
  tasks: WorkflowTask[];
}

export interface WorkflowTaskFileWithMeta extends WorkflowTaskFile {
  changeName: string;
  source: 'active' | 'archived';
}
