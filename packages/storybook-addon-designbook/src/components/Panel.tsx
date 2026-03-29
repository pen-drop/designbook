import React, { memo, useState, useEffect } from 'react';
import { AddonPanel, TabsView } from 'storybook/internal/components';
import { addons } from 'storybook/manager-api';
import { ManagerBadge } from './manager-utils.js';
import { DeboCollapsible } from './ui/DeboCollapsible.jsx';
import { ContextAction } from './ui/ContextAction.jsx';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationFileResult {
  file: string;
  type: string;
  valid: boolean | null;
  error?: string;
  skipped?: boolean;
  last_validated?: string;
}

interface TaskFile {
  path: string;
  key: string;
  validators: string[];
  validation_result?: ValidationFileResult;
}

interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  step?: string; // canonical step name (was: stage)
  stage?: string; // parent stage name (execute, test, preview)
  status: 'pending' | 'in-progress' | 'done' | 'incomplete';
  started_at: string | null;
  completed_at: string | null;
  params?: Record<string, unknown>;
  task_file?: string;
  rules?: string[];
  config_rules?: string[];
  config_instructions?: string[];
  files?: TaskFile[];
}

interface StageLoaded {
  task_file: string;
  rules: string[];
  config_rules: string[];
  config_instructions: string[];
}

interface WorkflowData {
  changeName: string;
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed' | 'incomplete';
  parent?: string;
  engine?: 'git-worktree' | 'direct';
  write_root?: string;
  worktree_branch?: string;
  current_stage?: string;
  stages?: Record<string, { steps: string[] }> | string[];
  stage_loaded?: Record<string, StageLoaded>;
  params?: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  summary?: string;
  tasks: WorkflowTask[];
  source: 'active' | 'archived';
}

interface StatusData {
  vision: { exists: boolean };
  designSystem: { guidelines: boolean; tokens: boolean };
  dataModel: { exists: boolean };
  shell: { exists: boolean };
  sections: Array<{ id: string; title: string; hasScenes: boolean }>;
}

interface PanelProps {
  active?: boolean;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** Triggers a re-render every `intervalMs` while `active` is true. */
function useTick(active: boolean, intervalMs = 1000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return tick;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_LOG_ENTRIES = 10;

const shortenPath = (p: string): string => {
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-1).join('/');
};

/** Format a live duration from `start` to now (or `end`) as "Xm Ys". */
const formatDuration = (start: string | null, end?: string | null): string => {
  if (!start) return '';
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
};

function WorkflowStatusDot({ status }: { status?: string }) {
  const mapped = status === 'completed' ? 'done' : status === 'running' ? 'in-progress' : 'pending';
  return <StatusDot status={mapped} />;
}

const collapsibleStatus = (status?: string): 'done' | 'running' | 'pending' => {
  if (status === 'completed') return 'done';
  if (status === 'running') return 'running';
  return 'pending';
};

const stageStatus = (tasks: WorkflowTask[]): 'done' | 'running' | 'pending' => {
  if (tasks.every((t) => t.status === 'done')) return 'done';
  if (tasks.some((t) => t.status === 'in-progress')) return 'running';
  return 'pending';
};

const STATUS_DOT: Record<string, { bg: string; border?: string; icon?: 'check' | 'x' | 'dot' }> = {
  done: { bg: 'rgb(102, 191, 60)', icon: 'check' },
  incomplete: { bg: '#DC2626', icon: 'x' },
  'in-progress': { bg: '#FEF3C7', icon: 'dot' },
  pending: { bg: 'transparent', border: '#CBD5E1' },
};

function StatusDot({ status }: { status: string }) {
  const s = STATUS_DOT[status] ?? STATUS_DOT.pending!;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: '50%',
        flexShrink: 0,
        background: s.bg,
        border: s.border ? `2px solid ${s.border}` : 'none',
      }}
    >
      {s.icon === 'check' && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {s.icon === 'x' && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
      {s.icon === 'dot' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#92400E' }} />}
    </span>
  );
}

/** Intake icon — speech bubble SVG for conversation/intake tasks. */
function IntakeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#7C3AED"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const isIntakeStep = (step?: string): boolean => !!step && step.endsWith(':intake');

const fileBadgeVariant = (f: TaskFile): 'green' | 'yellow' | 'gray' => {
  if (!f.validation_result) return 'gray';
  if (f.validation_result.valid === true) return 'green';
  if (f.validation_result.valid === false) return 'yellow';
  return 'gray';
};

const logPath = (designbookDir: string, wf: WorkflowData): string => {
  const dir = wf.source === 'archived' ? 'archive' : 'changes';
  return `${designbookDir}/workflows/${dir}/${wf.changeName}/tasks.yml`;
};

function groupByStep(wf: WorkflowData): { step: string; tasks: WorkflowTask[] }[] {
  // Extract step order from stages (grouped or legacy flat format)
  let stepOrder: string[];
  if (wf.stages && !Array.isArray(wf.stages)) {
    stepOrder = [];
    for (const def of Object.values(wf.stages)) {
      stepOrder.push(...(def.steps ?? []));
    }
  } else if (Array.isArray(wf.stages)) {
    stepOrder = wf.stages;
  } else {
    stepOrder = [...new Set(wf.tasks.map((t) => t.step ?? t.stage).filter(Boolean) as string[])];
  }

  const byStep = new Map<string, WorkflowTask[]>();
  const unstepped: WorkflowTask[] = [];

  for (const task of wf.tasks) {
    const stepName = task.step ?? task.stage;
    if (stepName) {
      const group = byStep.get(stepName) ?? [];
      group.push(task);
      byStep.set(stepName, group);
    } else {
      unstepped.push(task);
    }
  }

  const groups: { step: string; tasks: WorkflowTask[] }[] = [];
  for (const step of stepOrder) {
    const group = byStep.get(step);
    if (group?.length) groups.push({ step, tasks: group });
  }
  if (unstepped.length) groups.push({ step: '(unassigned)', tasks: unstepped });
  return groups;
}

/** Find the currently active task across all workflow tasks. */
function getActiveTask(wf: WorkflowData): WorkflowTask | undefined {
  return wf.tasks.find((t) => t.status === 'in-progress');
}

/** Collect all loaded file references from a StageLoaded or task into a flat list. */
interface LoadedFile {
  label: string;
  path: string;
  isAbsolute: boolean;
}

function collectLoaded(loaded?: StageLoaded | null, task?: WorkflowTask | null): LoadedFile[] {
  const files: LoadedFile[] = [];
  const src = loaded ?? task;
  if (!src) return files;

  const taskFile = 'task_file' in src ? src.task_file : undefined;
  const rules = 'rules' in src ? src.rules : undefined;
  const configRules = 'config_rules' in src ? src.config_rules : undefined;
  const configInstructions = 'config_instructions' in src ? src.config_instructions : undefined;

  if (taskFile) files.push({ label: 'task', path: taskFile, isAbsolute: true });
  if (rules) {
    for (const r of rules) files.push({ label: 'rule', path: r, isAbsolute: true });
  }
  if (configRules) {
    for (const cr of configRules) files.push({ label: 'config-rule', path: cr, isAbsolute: false });
  }
  if (configInstructions) {
    for (const ci of configInstructions) files.push({ label: 'instruction', path: ci, isAbsolute: false });
  }
  return files;
}

// ---------------------------------------------------------------------------
// Inline Styles (manager components must not use styled/theme)
// ---------------------------------------------------------------------------

const S = {
  container: {
    padding: '0.75rem',
    fontFamily: 'inherit',
    fontSize: 13,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  empty: { padding: '2rem 1rem', textAlign: 'center' as const, color: '#7B8794' },
  badgeRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '8px 0' },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#7B8794',
    marginTop: 12,
    marginBottom: 6,
  },
  summaryRow: { display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' as const },
  summaryTitle: { overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 0',
    fontSize: 12,
    color: 'inherit',
    flexWrap: 'wrap' as const,
  },
  taskTitle: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  taskFileBadges: { display: 'inline-flex', gap: 4, flexWrap: 'wrap' as const, alignItems: 'center' },
  overviewSection: { marginBottom: 8 },
  overviewLabel: {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#7B8794',
    marginBottom: 6,
    marginTop: 6,
  },
  overviewRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 12, color: 'inherit' },
  overviewValue: { color: '#7B8794', fontSize: 11 },
  badgeWrap: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, alignItems: 'center' },
  contextFileRow: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 0',
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: 600,
    color: '#94A3B8',
    flexShrink: 0,
    fontFamily: 'monospace',
  },
  durationRunning: {
    fontSize: 10,
    fontWeight: 600,
    color: '#92400E',
    flexShrink: 0,
    fontFamily: 'monospace',
  },
  activeTaskHint: {
    fontSize: 10,
    color: '#64748B',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    maxWidth: 180,
    flexShrink: 0,
  },
  worktreeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#7C3AED',
    background: '#F5F3FF',
    padding: '2px 8px',
    borderRadius: 9999,
    fontWeight: 600,
  },
  intakeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 0',
    fontSize: 12,
    color: '#7C3AED',
    fontStyle: 'italic' as const,
  },
};

// ---------------------------------------------------------------------------
// FileBadge — badge with ContextAction inside dropdown
// ---------------------------------------------------------------------------

function FileBadge({
  path,
  isAbsolute,
  label,
  variant = 'gray',
  validation,
}: {
  path: string;
  isAbsolute: boolean;
  label?: string;
  variant?: 'green' | 'yellow' | 'gray' | 'white';
  validation?: ValidationFileResult;
}) {
  return (
    <span style={S.contextFileRow}>
      <ManagerBadge variant={variant} title={path}>
        {label || shortenPath(path)}
      </ManagerBadge>
      {isAbsolute && <ContextAction path={path} validation={validation} />}
    </span>
  );
}

/** Group loaded files by label and render with section headers. */
function GroupedFileBadges({ files }: { files: LoadedFile[] }) {
  const groups = new Map<string, LoadedFile[]>();
  for (const f of files) {
    const group = groups.get(f.label) ?? [];
    group.push(f);
    groups.set(f.label, group);
  }

  const groupLabels: Record<string, string> = {
    task: 'Tasks',
    rule: 'Rules',
    'config-rule': 'Config Rules',
    instruction: 'Instructions',
  };

  return (
    <>
      {[...groups.entries()].map(([label, groupFiles]) => (
        <div key={label}>
          <div style={S.overviewLabel}>{groupLabels[label] ?? label}</div>
          <div style={S.badgeWrap}>
            {groupFiles.map((f, i) => (
              <FileBadge key={`${f.path}-${i}`} path={f.path} isAbsolute={f.isAbsolute} variant="gray" />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// LiveDuration — shows "running: 3m 12s" or "took: 18m 0s"
// ---------------------------------------------------------------------------

function LiveDuration({ startedAt, completedAt }: { startedAt: string | null; completedAt: string | null }) {
  const isRunning = !!startedAt && !completedAt;
  useTick(isRunning);

  if (!startedAt) return null;

  if (completedAt) {
    const dur = formatDuration(startedAt, completedAt);
    if (dur === '0s') return null;
    return <span style={S.durationLabel}>took: {dur}</span>;
  }

  return <span style={S.durationRunning}>running: {formatDuration(startedAt)}</span>;
}

// ---------------------------------------------------------------------------
// ContextCollapsible — shows all loaded files for a stage or workflow
// ---------------------------------------------------------------------------

function ContextCollapsible({
  files,
  worktreeBranch,
  engine,
  params,
}: {
  files: LoadedFile[];
  worktreeBranch?: string;
  engine?: string;
  params?: Record<string, unknown>;
}) {
  const hasContent = files.length > 0 || worktreeBranch || (params && Object.keys(params).length > 0);
  if (!hasContent) return null;

  return (
    <DeboCollapsible title="Context" variant="action-inline" status="pending" defaultOpen={false}>
      {worktreeBranch && (
        <div style={{ ...S.overviewRow, marginBottom: 4 }}>
          <span style={S.worktreeTag}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            {worktreeBranch}
          </span>
          {engine && <span style={S.overviewValue}>({engine})</span>}
        </div>
      )}

      {params && Object.keys(params).length > 0 && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Params</div>
          {Object.entries(params).map(([k, v]) => (
            <div style={S.overviewRow} key={k}>
              <span style={{ fontWeight: 600, fontSize: 11 }}>{k}:</span>
              <span style={S.overviewValue}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && <GroupedFileBadges files={files} />}
    </DeboCollapsible>
  );
}

// ---------------------------------------------------------------------------
// WorkflowOverview — summary info for a workflow (shown inside workflow collapsible)
// ---------------------------------------------------------------------------

function WorkflowOverview({ wf, designbookDir }: { wf: WorkflowData; designbookDir: string }) {
  // Collect all loaded files across all stages
  const allFiles: LoadedFile[] = [];
  for (const [, loaded] of Object.entries(wf.stage_loaded ?? {})) {
    allFiles.push(...collectLoaded(loaded));
  }
  // Deduplicate by path
  const seen = new Set<string>();
  const uniqueFiles = allFiles.filter((f) => {
    if (seen.has(f.path)) return false;
    seen.add(f.path);
    return true;
  });

  return (
    <div>
      <div style={S.overviewSection}>
        <div style={S.overviewRow}>
          <WorkflowStatusDot status={wf.status} />
          <span style={{ fontWeight: 600 }}>{wf.status ?? 'running'}</span>
          <LiveDuration startedAt={wf.started_at} completedAt={wf.completed_at ?? null} />
          {wf.parent && <span style={S.overviewValue}>\u21b3 {wf.parent}</span>}
        </div>
        {designbookDir && (
          <div style={S.overviewRow}>
            <span style={{ ...S.overviewValue, fontFamily: 'monospace', fontSize: 10 }}>
              {shortenPath(logPath(designbookDir, wf))}
            </span>
            <ContextAction path={logPath(designbookDir, wf)} />
          </div>
        )}
      </div>

      {wf.summary && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Summary</div>
          <span style={{ ...S.overviewValue, whiteSpace: 'pre-wrap', fontSize: 11 }}>{wf.summary}</span>
        </div>
      )}

      <ContextCollapsible
        files={uniqueFiles}
        worktreeBranch={wf.worktree_branch}
        engine={wf.engine}
        params={wf.params}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowsTab
// ---------------------------------------------------------------------------

function WorkflowsTab({ workflows, designbookDir }: { workflows: WorkflowData[]; designbookDir: string }) {
  // Keep tick alive for any running workflow
  const hasRunning = workflows.some((wf) => wf.status === 'running');
  useTick(hasRunning);

  if (workflows.length === 0) {
    return <div style={S.empty}>No workflow activity yet. Run a /debo * command to see progress here.</div>;
  }

  return (
    <div style={S.container}>
      {workflows.map((wf) => {
        const done = wf.tasks.filter((t) => t.status === 'done').length;
        const total = wf.tasks.length;
        const isOpen = wf.status === 'running' || wf.status === 'planning';
        const groups = groupByStep(wf);
        const activeTask = getActiveTask(wf);

        const wfSummary = (
          <span style={S.summaryRow}>
            <WorkflowStatusDot status={wf.status} />
            <span style={S.summaryTitle}>{wf.title}</span>
            {activeTask && (
              <span style={S.activeTaskHint} title={activeTask.title}>
                {isIntakeStep(activeTask.step ?? activeTask.stage) ? '\ud83d\udcac' : '\u25b6'} {activeTask.title}
              </span>
            )}
            {designbookDir && <ContextAction path={logPath(designbookDir, wf)} />}
            <ManagerBadge variant={done === total ? 'green' : 'gray'}>
              {done}/{total}
            </ManagerBadge>
          </span>
        );

        return (
          <DeboCollapsible
            key={wf.changeName}
            title={wfSummary}
            variant="action-summary"
            status={collapsibleStatus(wf.status)}
            progress={{ done, total }}
            defaultOpen={isOpen}
          >
            <WorkflowOverview wf={wf} designbookDir={designbookDir} />
            {wf.current_stage && <div style={S.overviewLabel}>Stage: {wf.current_stage}</div>}
            <div style={S.overviewLabel}>Steps</div>
            {groups.map(({ step, tasks }) => {
              const stepDone = tasks.filter((t) => t.status === 'done').length;
              const stepTotal = tasks.length;
              const stepIsOpen = tasks.some((t) => t.status === 'in-progress' || t.status === 'pending');
              const loaded = wf.stage_loaded?.[step];
              const stepFiles = collectLoaded(loaded);
              const isIntake = isIntakeStep(step);

              const stepSummary = (
                <span style={S.summaryRow}>
                  {isIntake && <IntakeIcon />}
                  <span style={S.summaryTitle}>{step}</span>
                  <ManagerBadge variant={stepDone === stepTotal ? 'green' : 'gray'}>
                    {stepDone}/{stepTotal}
                  </ManagerBadge>
                </span>
              );

              const currentStepStatus = stageStatus(tasks);

              const taskStatus2collapsible = (s: string): 'done' | 'running' | 'pending' => {
                if (s === 'done') return 'done';
                if (s === 'in-progress') return 'running';
                return 'pending';
              };

              const tasksContent = () => (
                <div>
                  {tasks.map((task) => {
                    const hasFiles = task.files && task.files.length > 0;
                    const taskIsIntake = isIntakeStep(task.step ?? task.stage);
                    const taskLoadedFiles = collectLoaded(null, task);

                    const taskSummary = (
                      <span style={taskIsIntake ? S.intakeRow : S.taskRow}>
                        {taskIsIntake ? <IntakeIcon /> : <StatusDot status={task.status} />}
                        <span
                          style={task.status === 'done' ? { ...S.taskTitle, opacity: 0.5 } : S.taskTitle}
                          title={task.title}
                        >
                          {task.title}
                        </span>
                        {task.task_file && <ContextAction path={task.task_file} />}
                        <LiveDuration startedAt={task.started_at} completedAt={task.completed_at} />
                      </span>
                    );

                    const hasTaskContext = taskLoadedFiles.length > 0;
                    const hasAnyContent = hasFiles || hasTaskContext;

                    if (!hasAnyContent) {
                      return (
                        <div key={task.id} style={{ padding: '3px 0' }}>
                          {taskSummary}
                        </div>
                      );
                    }

                    return (
                      <DeboCollapsible
                        key={task.id}
                        title={taskSummary}
                        variant="action-inline"
                        status={taskStatus2collapsible(task.status)}
                      >
                        {hasTaskContext && <GroupedFileBadges files={taskLoadedFiles} />}
                        {hasFiles && (
                          <>
                            <div style={S.overviewLabel}>Files</div>
                            <div style={S.taskFileBadges}>
                              {task.files!.map((f) => {
                                const absPath = designbookDir ? `${designbookDir}/${f.path}` : f.path;
                                return (
                                  <FileBadge
                                    key={f.path}
                                    path={absPath}
                                    isAbsolute={true}
                                    label={f.key}
                                    variant={fileBadgeVariant(f)}
                                    validation={f.validation_result ?? undefined}
                                  />
                                );
                              })}
                            </div>
                          </>
                        )}
                      </DeboCollapsible>
                    );
                  })}
                </div>
              );

              return (
                <DeboCollapsible
                  key={step}
                  title={stepSummary}
                  variant="action-item"
                  status={currentStepStatus}
                  defaultOpen={stepIsOpen}
                >
                  {stepFiles.length > 0 && <ContextCollapsible files={stepFiles} />}
                  {tasksContent()}
                </DeboCollapsible>
              );
            })}
          </DeboCollapsible>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatusTab
// ---------------------------------------------------------------------------

function StatusTab({ status }: { status: StatusData | null }) {
  if (!status) {
    return <div style={S.empty}>Loading status...</div>;
  }

  return (
    <div style={S.container}>
      <div style={S.badgeRow}>
        <ManagerBadge variant={status.vision.exists ? 'green' : 'gray'}>vision</ManagerBadge>
        <ManagerBadge variant={status.designSystem.guidelines ? 'green' : 'gray'}>guidelines</ManagerBadge>
        <ManagerBadge variant={status.designSystem.tokens ? 'green' : 'gray'}>tokens</ManagerBadge>
        <ManagerBadge variant={status.dataModel.exists ? 'green' : 'gray'}>data-model</ManagerBadge>
        <ManagerBadge variant={status.shell.exists ? 'green' : 'gray'}>shell</ManagerBadge>
      </div>

      {status.sections && status.sections.length > 0 && (
        <>
          <div style={S.sectionLabel}>Sections</div>
          <div style={S.badgeRow}>
            {status.sections.map((section) => (
              <ManagerBadge key={section.id} variant={section.hasScenes ? 'green' : 'gray'}>
                {section.title}
              </ManagerBadge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

// eslint-disable-next-line react/prop-types
export const Panel: React.FC<PanelProps> = memo(function DesignbookPanel({ active }) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [status, setStatus] = useState<StatusData | null>(null);
  const [designbookDir, setDesignbookDir] = useState<string>('');

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    const poll = async () => {
      try {
        const [wfRes, statusRes] = await Promise.all([fetch('/__designbook/workflows'), fetch('/__designbook/status')]);
        if (!mounted) return;
        if (wfRes.ok) {
          const json = await wfRes.json();
          const data: WorkflowData[] = json.workflows ?? json;
          setWorkflows(data.slice(0, MAX_LOG_ENTRIES));
          if (json.designbookDir) setDesignbookDir(json.designbookDir);
        }
        if (statusRes.ok) {
          setStatus(await statusRes.json());
        }
      } catch {
        // Network error, skip
      }
    };

    poll();

    const channel = addons.getChannel();
    const onTaskFileChange = (event: { fileType: string }) => {
      if (event.fileType === 'task') poll();
    };
    channel.on('designbook:file-add', onTaskFileChange);
    channel.on('designbook:file-update', onTaskFileChange);
    channel.on('designbook:file-delete', onTaskFileChange);

    return () => {
      mounted = false;
      channel.off('designbook:file-add', onTaskFileChange);
      channel.off('designbook:file-update', onTaskFileChange);
      channel.off('designbook:file-delete', onTaskFileChange);
    };
  }, [active]);

  return (
    <AddonPanel active={active ?? false}>
      <TabsView
        defaultSelected="workflows"
        tabs={[
          {
            id: 'workflows',
            title: 'Workflows',
            children: () => <WorkflowsTab workflows={workflows} designbookDir={designbookDir} />,
          },
          {
            id: 'status',
            title: 'Status',
            children: () => <StatusTab status={status} />,
          },
        ]}
      />
    </AddonPanel>
  );
});
