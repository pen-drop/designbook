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
