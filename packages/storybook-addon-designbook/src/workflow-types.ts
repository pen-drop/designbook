export type TaskStatus = 'pending' | 'in-progress' | 'done';

export type TaskType = 'component' | 'scene' | 'data' | 'tokens' | 'view-mode' | 'css' | 'validation';

export interface WorkflowTask {
  id: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowTaskFile {
  title: string;
  workflow: string;
  started_at: string | null;
  completed_at: string | null;
  summary?: string;
  tasks: WorkflowTask[];
}

export interface WorkflowTaskFileWithMeta extends WorkflowTaskFile {
  changeName: string;
  source: 'active' | 'archived';
}
