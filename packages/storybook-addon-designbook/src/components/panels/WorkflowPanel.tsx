import React, { memo, useState, useEffect, useMemo } from 'react';
import { AddonPanel, TabsView } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';
import { addons } from 'storybook/manager-api';
import { ManagerBadge } from '../manager-utils.js';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { ContextAction } from '../ui/ContextAction.jsx';
import { DeboFacetFilter, useFacetFilter } from '../ui/DeboFacetFilter';
import { DeboRainbowBorder } from '../ui/DeboRainbowBorder';
import { useUrlState } from '../../hooks/useUrlState.js';

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
  flushed_at?: string;
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
  blueprints?: string[];
  config_rules?: string[];
  config_instructions?: string[];
  files?: TaskFile[];
  description?: string;
  summary?: string;
}

interface StageLoaded {
  task_file: string;
  rules: string[];
  blueprints: string[];
  config_rules: string[];
  config_instructions: string[];
}

interface WorkflowData {
  changeName: string;
  title: string;
  workflow: string;
  status?: 'running' | 'waiting' | 'completed' | 'incomplete';
  parent?: string;
  engine?: 'git-worktree' | 'direct';
  write_root?: string;
  worktree_branch?: string;
  current_stage?: string;
  stages?: Record<string, { steps: string[]; each?: string }> | string[];
  stage_loaded?: Record<string, StageLoaded | StageLoaded[]>;
  params?: Record<string, unknown>;
  started_at: string | null;
  completed_at: string | null;
  summary?: string;
  waiting_message?: string;
  root_dir?: string;
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

/** Resolve a potentially relative path to absolute using root_dir. */
const resolvePath = (p: string, rootDir?: string): string => {
  if (!p || p.startsWith('/')) return p;
  if (rootDir) return `${rootDir}/${p}`;
  return p;
};

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

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const fmtTime = (d: Date): string => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const fmtDayTime = (d: Date): string =>
  `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${fmtTime(d)}`;

/** Smart timestamp range: time-only for today, date+time otherwise, date shown only once when same day. */
const formatTimestampRange = (start: string | null, end: string | null): string => {
  if (!start) return '';
  const s = new Date(start);
  const now = new Date();
  const isToday = isSameDay(s, now);

  if (!end) {
    return isToday ? fmtTime(s) : fmtDayTime(s);
  }

  const e = new Date(end);
  if (isSameDay(s, e)) {
    return isToday ? `${fmtTime(s)} – ${fmtTime(e)}` : `${fmtDayTime(s)} – ${fmtTime(e)}`;
  }
  return `${fmtDayTime(s)} – ${fmtDayTime(e)}`;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createStatusDot(theme: any): Record<string, { bg: string; border?: string; icon?: 'check' | 'x' | 'dot' }> {
  return {
    done: { bg: theme.color.positive, icon: 'check' },
    incomplete: { bg: theme.color.negative, icon: 'x' },
    'in-progress': { bg: theme.background.warning, icon: 'dot' },
    pending: { bg: 'transparent', border: theme.appBorderColor },
  };
}

function StatusDot({ status }: { status: string }) {
  const theme = useTheme();
  const STATUS_DOT = useMemo(() => createStatusDot(theme), [theme]);
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
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={theme.color.inverseText} strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {s.icon === 'x' && (
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={theme.color.inverseText} strokeWidth="3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      )}
      {s.icon === 'dot' && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            background: (theme as any).fgColor?.warning ?? '#92400E',
          }}
        />
      )}
    </span>
  );
}

const fileBadgeVariant = (f: TaskFile): 'green' | 'yellow' | 'gray' => {
  if (f.flushed_at) return 'green';
  if (!f.validation_result) return 'gray';
  if (f.validation_result.valid === true) return 'green';
  if (f.validation_result.valid === false) return 'yellow';
  return 'gray';
};

const logPath = (designbookDir: string, wf: WorkflowData): string => {
  const dir = wf.source === 'archived' ? 'archive' : 'changes';
  return `${designbookDir}/workflows/${dir}/${wf.changeName}/tasks.yml`;
};

/** Find the currently active task across all workflow tasks. */
function getActiveTask(wf: WorkflowData): WorkflowTask | undefined {
  return wf.tasks.find((t) => t.status === 'in-progress');
}

// ---------------------------------------------------------------------------
// Inline Styles (theme-aware)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createStyles(theme: any) {
  return {
    container: {
      padding: '0.75rem',
      fontFamily: 'inherit',
      fontSize: 13,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 4,
    },
    empty: { padding: '2rem 1rem', textAlign: 'center' as const, color: theme.textMutedColor },
    badgeRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '8px 0' },
    sectionLabel: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: theme.textMutedColor,
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
    taskContent: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 1,
    },
    taskTitleText: {
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    taskDescription: {
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      opacity: 0.6,
      fontSize: '0.85em',
    },
    taskSummary: {
      opacity: 0.5,
      fontSize: '0.85em',
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      flexShrink: 0,
      maxWidth: '30%',
      textAlign: 'right' as const,
    },
    taskFileBadges: { display: 'inline-flex', gap: 4, flexWrap: 'wrap' as const, alignItems: 'center' },
    overviewSection: { marginBottom: 8 },
    overviewLabel: {
      fontSize: 10,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: theme.textMutedColor,
      marginBottom: 6,
      marginTop: 6,
    },
    overviewRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 12, color: 'inherit' },
    overviewValue: { color: theme.textMutedColor, fontSize: 11 },
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
      color: theme.textMutedColor,
      flexShrink: 0,
      fontFamily: 'monospace',
    },
    durationRunning: {
      fontSize: 10,
      fontWeight: 600,
      color: theme.fgColor?.warning ?? '#92400E',
      flexShrink: 0,
      fontFamily: 'monospace',
    },
    activeTaskHint: {
      fontSize: 10,
      color: theme.color.defaultText,
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
      background: theme.base === 'dark' ? 'rgba(124,58,237,0.15)' : '#F5F3FF',
      padding: '2px 8px',
      borderRadius: 9999,
      fontWeight: 600,
    },
    stepHeading: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: theme.textMutedColor,
      marginTop: 10,
      marginBottom: 4,
      padding: '2px 0',
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
    // -- Tasks tab --
    stageHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 0 4px',
      fontSize: 11,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: theme.color.defaultText,
    },
    stageHeaderLine: {
      flex: 1,
      height: 1,
      background: theme.appBorderColor,
    },
    taskRowDone: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 6px',
      fontSize: 12,
      borderRadius: 4,
      background: 'rgba(34, 197, 94, 0.08)',
    },
    taskRowRunning: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 6px',
      fontSize: 12,
      borderRadius: 4,
      background: 'rgba(245, 158, 11, 0.10)',
    },
    taskRowPending: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 6px',
      fontSize: 12,
      borderRadius: 4,
      background: 'transparent',
    },
    // -- Context tab --
    filterBadgeRow: {
      display: 'flex',
      flexWrap: 'wrap' as const,
      gap: 4,
      marginBottom: 8,
    },
    filterBadge: {
      padding: '2px 8px',
      fontSize: 10,
      fontWeight: 600,
      borderRadius: 9999,
      border: `1px solid ${theme.appBorderColor}`,
      background: 'transparent',
      color: theme.color.defaultText,
      cursor: 'pointer',
    },
    filterBadgeActive: {
      background: theme.color.secondary,
      borderColor: theme.color.secondary,
      color: theme.color.inverseText,
    },
    contextTable: {
      width: '100%',
      fontSize: 11,
      borderCollapse: 'collapse' as const,
    },
    contextTh: {
      textAlign: 'left' as const,
      padding: '4px 8px',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: theme.textMutedColor,
      borderBottom: `1px solid ${theme.appBorderColor}`,
    },
    contextTd: {
      padding: '3px 8px',
      borderBottom: `1px solid ${theme.background.hoverable}`,
      color: 'inherit',
    },
    // -- Summary tab --
    progressBarOuter: {
      flex: 1,
      height: 6,
      background: theme.appBorderColor,
      borderRadius: 3,
      overflow: 'hidden' as const,
    },
    progressBarInner: {
      height: '100%',
      background: theme.color.positive,
      borderRadius: 3,
      transition: 'width 0.3s ease',
    },
  };
}

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
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  return (
    <span style={S.contextFileRow}>
      <ManagerBadge variant={variant} title={path}>
        {label || shortenPath(path)}
      </ManagerBadge>
      {isAbsolute && <ContextAction path={path} validation={validation} />}
    </span>
  );
}

// ---------------------------------------------------------------------------
// LiveDuration — shows "running: 3m 12s" or "took: 18m 0s"
// ---------------------------------------------------------------------------

function LiveDuration({ startedAt, completedAt }: { startedAt: string | null; completedAt: string | null }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
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
// WorkflowSummaryTab
// ---------------------------------------------------------------------------

function WorkflowSummaryTab({ wf }: { wf: WorkflowData }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  const done = wf.tasks.filter((t) => t.status === 'done').length;
  const total = wf.tasks.length;
  const pct = total > 0 ? (done / total) * 100 : 0;
  const activeTask = getActiveTask(wf);

  return (
    <div>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <WorkflowStatusDot status={wf.status} />
        <div style={S.progressBarOuter}>
          <div style={{ ...S.progressBarInner, width: `${pct}%` }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          {done}/{total}
        </span>
      </div>

      {/* Timestamps */}
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: theme.color.defaultText, marginBottom: 8 }}>
        {wf.started_at && <span>{formatTimestampRange(wf.started_at, wf.completed_at ?? null)}</span>}
        {wf.started_at && <span>({formatDuration(wf.started_at, wf.completed_at ?? null)})</span>}
      </div>

      {/* Waiting message */}
      {wf.status === 'waiting' && wf.waiting_message && (
        <div
          style={{
            fontSize: 12,
            color: theme.color.warning,
            background: 'rgba(245,158,11,0.1)',
            borderRadius: 4,
            padding: '6px 10px',
            marginBottom: 8,
            border: '1px solid rgba(245,158,11,0.3)',
          }}
        >
          {wf.waiting_message}
        </div>
      )}

      {/* Summary text */}
      {wf.summary && (
        <div
          style={{ fontSize: 12, color: theme.color.defaultText, marginBottom: 10, whiteSpace: 'pre-wrap' as const }}
        >
          {wf.summary}
        </div>
      )}

      {/* Current task */}
      {activeTask && (
        <DeboCollapsible
          title={
            <div style={S.taskRow}>
              <StatusDot status="in-progress" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.taskTitleText}>{activeTask.title}</div>
                {activeTask.description && <div style={S.taskDescription}>{activeTask.description}</div>}
              </div>
              <LiveDuration startedAt={activeTask.started_at} completedAt={activeTask.completed_at} />
            </div>
          }
          variant="action-inline"
          status="running"
          defaultOpen={true}
        >
          <div style={{ fontSize: 11, color: theme.color.defaultText, display: 'flex', gap: 8, marginBottom: 4 }}>
            {activeTask.stage && <span>Stage: {activeTask.stage}</span>}
            {activeTask.step && <span>Step: {activeTask.step}</span>}
          </div>
          {/* Context */}
          {(() => {
            const ctx: { type: string; name: string }[] = [];
            if (activeTask.task_file) ctx.push({ type: 'task', name: shortenPath(activeTask.task_file) });
            for (const r of activeTask.rules ?? []) ctx.push({ type: 'rule', name: shortenPath(r) });
            for (const b of activeTask.blueprints ?? []) ctx.push({ type: 'blueprint', name: shortenPath(b) });
            for (const cr of activeTask.config_rules ?? []) ctx.push({ type: 'config', name: shortenPath(cr) });
            for (const ci of activeTask.config_instructions ?? [])
              ctx.push({ type: 'instruction', name: shortenPath(ci) });
            if (ctx.length === 0) return null;
            return (
              <div style={{ marginBottom: 6 }}>
                <div style={S.overviewLabel}>Context</div>
                {ctx.map((c, i) => (
                  <div
                    key={i}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '1px 0' }}
                  >
                    <ManagerBadge variant="gray">{c.type}</ManagerBadge>
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {/* Files */}
          {activeTask.files && activeTask.files.length > 0 && (
            <div>
              <div style={S.overviewLabel}>Files</div>
              <div style={S.taskFileBadges}>
                {activeTask.files.map((f) => (
                  <FileBadge
                    key={f.path}
                    path={resolvePath(f.path, wf.root_dir)}
                    isAbsolute={true}
                    label={f.key}
                    variant={fileBadgeVariant(f)}
                    validation={f.validation_result ?? undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </DeboCollapsible>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowTasksTab
// ---------------------------------------------------------------------------

interface StageTaskGroup {
  stage: string;
  tasks: WorkflowTask[];
}

function groupTasksByStage(wf: WorkflowData): StageTaskGroup[] {
  if (wf.stages && !Array.isArray(wf.stages)) {
    const groups: StageTaskGroup[] = [];
    for (const [stageName, def] of Object.entries(wf.stages)) {
      const stepNames = new Set(def.steps ?? []);
      const tasks = wf.tasks.filter((t) => stepNames.has(t.step ?? '') || t.stage === stageName);
      if (tasks.length) groups.push({ stage: stageName, tasks });
    }
    const assigned = new Set(groups.flatMap((g) => g.tasks.map((t) => t.id)));
    const unassigned = wf.tasks.filter((t) => !assigned.has(t.id));
    if (unassigned.length) groups.push({ stage: '(unassigned)', tasks: unassigned });
    return groups;
  }
  // No stage structure — single implicit group
  return [{ stage: '', tasks: wf.tasks }];
}

function getTaskRowStyle(status: string, S: ReturnType<typeof createStyles>): React.CSSProperties {
  if (status === 'done') return S.taskRowDone;
  if (status === 'in-progress') return S.taskRowRunning;
  return S.taskRowPending;
}

function WorkflowTasksTab({ wf }: { wf: WorkflowData }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  const stageGroups = groupTasksByStage(wf);
  const hasRunning = wf.tasks.some((t) => t.status === 'in-progress');
  useTick(hasRunning);

  return (
    <div>
      {stageGroups.map(({ stage, tasks }) => {
        const done = tasks.filter((t) => t.status === 'done').length;
        const total = tasks.length;
        const allDone = done === total;
        const allPending = tasks.every((t) => t.status === 'pending');
        const hasRunningTask = tasks.some((t) => t.status === 'in-progress');

        const stageBadge = (): { label: string; variant: 'green' | 'gray' | 'yellow' } => {
          if (allDone) return { label: `${done}/${total}`, variant: 'green' };
          if (allPending) return { label: 'pending', variant: 'gray' };
          if (hasRunningTask) return { label: 'running', variant: 'yellow' };
          return { label: `${done}/${total}`, variant: 'gray' };
        };
        const badge = stageBadge();

        return (
          <div key={stage || '__flat__'}>
            {stage !== '' && (
              <div style={S.stageHeader}>
                <span style={S.stageHeaderLine} />
                <span>{stage}</span>
                <ManagerBadge variant={badge.variant}>{badge.label}</ManagerBadge>
                <span style={S.stageHeaderLine} />
              </div>
            )}
            {tasks.map((task) => (
              <DeboRainbowBorder key={task.id} active={task.status === 'in-progress'} borderRadius={4} borderWidth={2}>
                <div style={getTaskRowStyle(task.status, S)}>
                  <StatusDot status={task.status} />
                  <div style={{ ...S.taskContent, opacity: task.status === 'done' ? 0.7 : 1 }}>
                    <span style={S.taskTitleText} title={task.title}>
                      {task.title}
                    </span>
                    {task.description && (
                      <span style={S.taskDescription} title={task.description}>
                        {task.description}
                      </span>
                    )}
                  </div>
                  {task.summary && task.status === 'done' && (
                    <span title={task.summary} style={S.taskSummary}>
                      {task.summary}
                    </span>
                  )}
                  <LiveDuration startedAt={task.started_at} completedAt={task.completed_at} />
                </div>
              </DeboRainbowBorder>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowContextTab
// ---------------------------------------------------------------------------

interface ContextEntry {
  type: string;
  name: string;
  step: string[];
  stage: string[];
  fullPath: string;
  isLoaded: boolean;
}

/** Build a step→stage lookup from the workflow's stages definition. */
function buildStepToStage(wf: WorkflowData): Record<string, string> {
  const map: Record<string, string> = {};
  if (wf.stages && !Array.isArray(wf.stages)) {
    for (const [stageName, def] of Object.entries(wf.stages)) {
      for (const s of def.steps ?? []) {
        map[s] = stageName;
      }
    }
  }
  return map;
}

function collectGroupedContext(wf: WorkflowData): ContextEntry[] {
  const stepToStage = buildStepToStage(wf);

  const loadedSteps = new Set<string>();
  for (const task of wf.tasks) {
    if ((task.status === 'done' || task.status === 'in-progress') && task.step) {
      loadedSteps.add(task.step);
    }
  }

  const grouped = new Map<
    string,
    { type: string; name: string; fullPath: string; steps: Set<string>; stages: Set<string>; loaded: boolean }
  >();

  function addEntry(type: string, path: string, stepName: string) {
    const existing = grouped.get(path);
    const stageName = stepToStage[stepName] ?? stepName;
    const isLoaded = loadedSteps.has(stepName);
    if (existing) {
      existing.steps.add(stepName);
      existing.stages.add(stageName);
      if (isLoaded) existing.loaded = true;
    } else {
      grouped.set(path, {
        type,
        name: shortenPath(path),
        fullPath: path,
        steps: new Set([stepName]),
        stages: new Set([stageName]),
        loaded: isLoaded,
      });
    }
  }

  for (const [stepName, rawLoaded] of Object.entries(wf.stage_loaded ?? {})) {
    const loadedArr = Array.isArray(rawLoaded) ? rawLoaded : [rawLoaded];
    for (const loaded of loadedArr) {
      if (loaded.task_file) addEntry('task', loaded.task_file, stepName);
      for (const r of loaded.rules ?? []) addEntry('rule', r, stepName);
      for (const b of loaded.blueprints ?? []) addEntry('blueprint', b, stepName);
      for (const cr of loaded.config_rules ?? []) addEntry('config', cr, stepName);
      for (const ci of loaded.config_instructions ?? []) addEntry('instruction', ci, stepName);
    }
  }

  return [...grouped.values()].map((g) => ({
    type: g.type,
    name: g.name,
    fullPath: g.fullPath,
    step: [...g.steps],
    stage: [...g.stages],
    isLoaded: g.loaded,
  }));
}

function WorkflowContextTab({ wf }: { wf: WorkflowData }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  const allEntries = collectGroupedContext(wf);
  const { facets, filtered, state, toggle, clear } = useFacetFilter(allEntries, ['stage', 'step', 'type']);

  const loaded = filtered.filter((e) => e.isLoaded);
  const pending = filtered.filter((e) => !e.isLoaded);

  if (allEntries.length === 0) {
    return <div style={{ ...S.empty, padding: '1rem' }}>No context loaded yet.</div>;
  }

  const renderRows = (entries: ContextEntry[], dimmed: boolean) =>
    entries.map((entry) => (
      <tr key={entry.fullPath} title={entry.fullPath} style={dimmed ? { opacity: 0.5 } : undefined}>
        <td style={S.contextTd}>{entry.name}</td>
        <td style={S.contextTd}>
          <ManagerBadge variant="gray">{entry.type}</ManagerBadge>
        </td>
        <td style={{ ...S.contextTd, color: theme.color.defaultText, fontSize: 10 }}>{entry.stage.join(', ')}</td>
        <td style={{ ...S.contextTd, color: theme.color.defaultText, fontSize: 10 }}>{entry.step.join(', ')}</td>
        <td style={{ ...S.contextTd, width: 28, textAlign: 'center' as const }}>
          <ContextAction path={entry.fullPath} />
        </td>
      </tr>
    ));

  return (
    <div>
      <DeboFacetFilter facets={facets} state={state} onToggle={toggle} onClear={clear} />
      <table style={S.contextTable}>
        <thead>
          <tr>
            <th style={S.contextTh}>Name</th>
            <th style={S.contextTh}>Type</th>
            <th style={S.contextTh}>Stage</th>
            <th style={S.contextTh}>Steps</th>
            <th style={{ ...S.contextTh, width: 28 }}></th>
          </tr>
        </thead>
        <tbody>
          {loaded.length > 0 && renderRows(loaded, false)}
          {pending.length > 0 && (
            <>
              <tr>
                <td colSpan={5} style={{ ...S.contextTh, paddingTop: 10, borderBottom: 'none' }}>
                  Pending
                </td>
              </tr>
              {renderRows(pending, true)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowFilesTab
// ---------------------------------------------------------------------------

interface FileEntry {
  path: string;
  key: string;
  task: string;
  stage: string;
  step: string;
  taskTitle: string;
  file: TaskFile;
}

function collectAllFiles(wf: WorkflowData): FileEntry[] {
  const entries: FileEntry[] = [];
  for (const task of wf.tasks) {
    for (const f of task.files ?? []) {
      entries.push({
        path: f.path,
        key: f.key,
        task: task.id,
        stage: task.stage ?? '',
        step: task.step ?? '',
        taskTitle: task.title,
        file: f,
      });
    }
  }
  return entries;
}

const fileRowColor = (f: TaskFile): string => {
  if (!f.validation_result) return 'inherit'; // white/neutral
  if (f.validation_result.valid === true) return 'rgba(34, 197, 94, 0.12)'; // green
  return 'rgba(245, 158, 11, 0.12)'; // orange
};

const fileStatusDot = (f: TaskFile): string => {
  if (f.flushed_at) return 'done';
  if (!f.validation_result) return 'pending';
  if (f.validation_result.valid === true) return 'done';
  return 'in-progress';
};

function WorkflowFilesTab({ wf }: { wf: WorkflowData }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  const allFiles = collectAllFiles(wf);
  const taskTitles = Object.fromEntries(wf.tasks.map((t) => [t.id, t.title]));
  const { facets, filtered, state, toggle, clear } = useFacetFilter(allFiles, ['stage', 'step', 'task'], {
    task: (v) => taskTitles[v] ?? v,
  });

  if (allFiles.length === 0) {
    return <div style={{ ...S.empty, padding: '1rem' }}>No files registered yet.</div>;
  }

  return (
    <div>
      <DeboFacetFilter facets={facets} state={state} onToggle={toggle} onClear={clear} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filtered.map((entry, i) => {
          const absPath = resolvePath(entry.path, wf.root_dir);
          return (
            <div
              key={`${entry.path}-${entry.task}-${i}`}
              title={absPath}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 6px',
                fontSize: 12,
                borderRadius: 4,
                background: fileRowColor(entry.file),
              }}
            >
              <StatusDot status={fileStatusDot(entry.file)} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shortenPath(entry.path)}
              </span>
              {entry.key && (
                <span style={{ fontSize: 10, color: theme.textMutedColor, flexShrink: 0 }}>{entry.key}</span>
              )}
              <ContextAction path={absPath} validation={entry.file.validation_result ?? undefined} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowsTab
// ---------------------------------------------------------------------------

type WorkflowSubTab = 'summary' | 'tasks' | 'context' | 'files';

const WORKFLOW_SUB_TABS: WorkflowSubTab[] = ['summary', 'tasks', 'context', 'files'];

function WorkflowTabs({ wf }: { wf: WorkflowData }) {
  const [rawTab, setRawTab] = useUrlState('debo-wf-tab', 'summary');
  const tab: WorkflowSubTab = WORKFLOW_SUB_TABS.includes(rawTab as WorkflowSubTab)
    ? (rawTab as WorkflowSubTab)
    : 'summary';

  return (
    <TabsView
      selected={tab}
      onSelectionChange={(id) => setRawTab(id)}
      tabs={[
        { id: 'summary', title: 'Summary', children: () => <WorkflowSummaryTab wf={wf} /> },
        { id: 'tasks', title: 'Tasks', children: () => <WorkflowTasksTab wf={wf} /> },
        { id: 'context', title: 'Context', children: () => <WorkflowContextTab wf={wf} /> },
        { id: 'files', title: 'Files', children: () => <WorkflowFilesTab wf={wf} /> },
      ]}
    />
  );
}

function WorkflowsTab({ workflows, designbookDir }: { workflows: WorkflowData[]; designbookDir: string }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  const hasActive = workflows.some((wf) => wf.status === 'running' || wf.status === 'waiting');
  useTick(hasActive);

  if (workflows.length === 0) {
    return <div style={S.empty}>No workflow activity yet. Run a /debo * command to see progress here.</div>;
  }

  return (
    <div style={S.container}>
      {workflows.map((wf) => {
        const done = wf.tasks.filter((t) => t.status === 'done').length;
        const total = wf.tasks.length;
        const isOpen = wf.status === 'running' || wf.status === 'waiting';

        const activeTask = wf.tasks.find((t) => t.status === 'in-progress');
        const wfSummary = (
          <span style={S.summaryRow}>
            <WorkflowStatusDot status={wf.status} />
            <span style={S.summaryTitle}>{wf.title}</span>
            {activeTask && <span style={S.activeTaskHint}>{activeTask.title}</span>}
            {designbookDir && <ContextAction path={logPath(designbookDir, wf)} />}
            <ManagerBadge variant={done === total ? 'green' : 'gray'}>
              {done}/{total}
            </ManagerBadge>
          </span>
        );

        return (
          <DeboRainbowBorder
            key={wf.changeName}
            active={wf.status === 'running' || wf.status === 'waiting'}
            variant={wf.status === 'waiting' ? 'waiting' : 'running'}
            borderRadius={8}
            borderWidth={2}
          >
            <DeboCollapsible
              title={wfSummary}
              variant="action-summary"
              status={collapsibleStatus(wf.status)}
              progress={{ done, total }}
              defaultOpen={isOpen}
            >
              <WorkflowTabs wf={wf} />
            </DeboCollapsible>
          </DeboRainbowBorder>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CopyBadge — clickable badge that copies a command to clipboard
// ---------------------------------------------------------------------------

function CopyBadge({ label, command, variant }: { label: string; command: string; variant: 'green' | 'gray' }) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <span
      onClick={handleClick}
      title={copied ? 'Copied!' : command}
      style={{
        cursor: 'pointer',
        position: 'relative' as const,
        display: 'inline-block',
      }}
    >
      <ManagerBadge variant={copied ? 'yellow' : variant}>{copied ? 'copied!' : label}</ManagerBadge>
    </span>
  );
}

// ---------------------------------------------------------------------------
// StatusTab
// ---------------------------------------------------------------------------

const STATUS_COMMANDS: Record<string, string> = {
  vision: '/designbook vision',
  guidelines: '/designbook design-guidelines',
  tokens: '/designbook tokens',
  'data-model': '/designbook data-model',
  shell: '/designbook design-shell',
};

function StatusTab({ status }: { status: StatusData | null }) {
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);
  if (!status) {
    return <div style={S.empty}>Loading status...</div>;
  }

  return (
    <div style={S.container}>
      <div style={S.badgeRow}>
        <CopyBadge label="vision" command={STATUS_COMMANDS.vision!} variant={status.vision.exists ? 'green' : 'gray'} />
        <CopyBadge
          label="guidelines"
          command={STATUS_COMMANDS.guidelines!}
          variant={status.designSystem.guidelines ? 'green' : 'gray'}
        />
        <CopyBadge
          label="tokens"
          command={STATUS_COMMANDS.tokens!}
          variant={status.designSystem.tokens ? 'green' : 'gray'}
        />
        <CopyBadge
          label="data-model"
          command={STATUS_COMMANDS['data-model']!}
          variant={status.dataModel.exists ? 'green' : 'gray'}
        />
        <CopyBadge label="shell" command={STATUS_COMMANDS.shell!} variant={status.shell.exists ? 'green' : 'gray'} />
      </div>

      {status.sections && status.sections.length > 0 && (
        <>
          <div style={S.sectionLabel}>Sections</div>
          <div style={S.badgeRow}>
            {status.sections.map((section) => (
              <CopyBadge
                key={section.id}
                label={section.title}
                command={`/designbook design-screen ${section.id}`}
                variant={section.hasScenes ? 'green' : 'gray'}
              />
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
export const WorkflowPanel: React.FC<PanelProps> = memo(function WorkflowPanel({ active }) {
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
