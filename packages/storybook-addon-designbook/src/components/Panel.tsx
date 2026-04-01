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
  blueprints?: string[];
  config_rules?: string[];
  config_instructions?: string[];
  files?: TaskFile[];
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

/** Find the currently active task across all workflow tasks. */
function getActiveTask(wf: WorkflowData): WorkflowTask | undefined {
  return wf.tasks.find((t) => t.status === 'in-progress');
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
  stepHeading: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#7B8794',
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
  // -- Workflow sub-tabs --
  tabBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '1px solid #E2E8F0',
    marginBottom: 8,
  },
  tabButton: {
    padding: '6px 12px',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    color: '#64748B',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
  },
  tabButtonActive: {
    color: '#0F172A',
    borderBottomColor: '#3B82F6',
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
    color: '#64748B',
  },
  stageHeaderLine: {
    flex: 1,
    height: 1,
    background: '#E2E8F0',
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
    border: '1px solid #CBD5E1',
    background: 'transparent',
    color: '#64748B',
    cursor: 'pointer',
  },
  filterBadgeActive: {
    background: '#3B82F6',
    borderColor: '#3B82F6',
    color: '#fff',
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
    color: '#94A3B8',
    borderBottom: '1px solid #E2E8F0',
  },
  contextTd: {
    padding: '3px 8px',
    borderBottom: '1px solid #F1F5F9',
    color: 'inherit',
  },
  // -- Summary tab --
  progressBarOuter: {
    flex: 1,
    height: 6,
    background: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden' as const,
  },
  progressBarInner: {
    height: '100%',
    background: 'rgb(102, 191, 60)',
    borderRadius: 3,
    transition: 'width 0.3s ease',
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
// WorkflowSummaryTab
// ---------------------------------------------------------------------------

function WorkflowSummaryTab({ wf }: { wf: WorkflowData }) {
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
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748B', marginBottom: 8 }}>
        {wf.started_at && (
          <span>Started: {new Date(wf.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        )}
        {wf.started_at && <span>Duration: {formatDuration(wf.started_at, wf.completed_at ?? null)}</span>}
      </div>

      {/* Summary text */}
      {wf.summary && (
        <div style={{ fontSize: 12, color: '#475569', marginBottom: 10, whiteSpace: 'pre-wrap' as const }}>
          {wf.summary}
        </div>
      )}

      {/* Current task */}
      {activeTask && (
        <DeboCollapsible
          title={
            <span style={S.taskRow}>
              <StatusDot status="in-progress" />
              <span style={S.taskTitle}>{activeTask.title}</span>
              <LiveDuration startedAt={activeTask.started_at} completedAt={activeTask.completed_at} />
            </span>
          }
          variant="action-inline"
          status="running"
          defaultOpen={true}
        >
          <div style={{ fontSize: 11, color: '#64748B', display: 'flex', gap: 8, marginBottom: 4 }}>
            {activeTask.stage && <span>Stage: {activeTask.stage}</span>}
            {activeTask.step && <span>Step: {activeTask.step}</span>}
          </div>
          {activeTask.files && activeTask.files.length > 0 && (
            <div style={S.taskFileBadges}>
              {activeTask.files.map((f) => (
                <FileBadge
                  key={f.path}
                  path={f.path}
                  isAbsolute={true}
                  label={f.key}
                  variant={fileBadgeVariant(f)}
                  validation={f.validation_result ?? undefined}
                />
              ))}
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

function getTaskRowStyle(status: string): React.CSSProperties {
  if (status === 'done') return S.taskRowDone;
  if (status === 'in-progress') return S.taskRowRunning;
  return S.taskRowPending;
}

function WorkflowTasksTab({ wf }: { wf: WorkflowData }) {
  const stageGroups = groupTasksByStage(wf);
  const hasRunning = wf.tasks.some((t) => t.status === 'in-progress');
  useTick(hasRunning);

  return (
    <div>
      {stageGroups.map(({ stage, tasks }) => {
        const done = tasks.filter((t) => t.status === 'done').length;
        const total = tasks.length;
        const allDone = done === total;
        const hasPending = tasks.every((t) => t.status === 'pending');

        return (
          <div key={stage || '__flat__'}>
            {stage !== '' && (
              <div style={S.stageHeader}>
                <span style={S.stageHeaderLine} />
                <span>{stage}</span>
                <ManagerBadge variant={allDone ? 'green' : 'gray'}>
                  {hasPending ? 'pending' : `${done}/${total}`}
                </ManagerBadge>
                <span style={S.stageHeaderLine} />
              </div>
            )}
            {tasks.map((task) => (
              <div key={task.id} style={getTaskRowStyle(task.status)}>
                <StatusDot status={task.status} />
                <span style={{ ...S.taskTitle, opacity: task.status === 'done' ? 0.7 : 1 }}>{task.title}</span>
                <LiveDuration startedAt={task.started_at} completedAt={task.completed_at} />
              </div>
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
  step: string;
  fullPath: string;
}

function collectAllContext(wf: WorkflowData): ContextEntry[] {
  const entries: ContextEntry[] = [];
  for (const [step, loaded] of Object.entries(wf.stage_loaded ?? {})) {
    if (loaded.task_file) {
      entries.push({ type: 'task', name: shortenPath(loaded.task_file), step, fullPath: loaded.task_file });
    }
    for (const r of loaded.rules ?? []) {
      entries.push({ type: 'rule', name: shortenPath(r), step, fullPath: r });
    }
    for (const b of loaded.blueprints ?? []) {
      entries.push({ type: 'blueprint', name: shortenPath(b), step, fullPath: b });
    }
    for (const cr of loaded.config_rules ?? []) {
      entries.push({ type: 'config', name: shortenPath(cr), step, fullPath: cr });
    }
    for (const ci of loaded.config_instructions ?? []) {
      entries.push({ type: 'instruction', name: shortenPath(ci), step, fullPath: ci });
    }
  }
  // Deduplicate by fullPath + step
  const seen = new Set<string>();
  return entries.filter((e) => {
    const key = `${e.fullPath}::${e.step}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function WorkflowContextTab({ wf }: { wf: WorkflowData }) {
  const allEntries = collectAllContext(wf);
  const allSteps = [...new Set(allEntries.map((e) => e.step))];
  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (step: string) => {
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(step)) next.delete(step);
      else next.add(step);
      return next;
    });
  };

  const filtered = selectedSteps.size === 0 ? allEntries : allEntries.filter((e) => selectedSteps.has(e.step));

  if (allEntries.length === 0) {
    return <div style={{ ...S.empty, padding: '1rem' }}>No context loaded yet.</div>;
  }

  return (
    <div>
      {/* Step filter badges */}
      <div style={S.filterBadgeRow}>
        {allSteps.map((step) => {
          const isActive = selectedSteps.has(step);
          return (
            <button
              key={step}
              style={{ ...S.filterBadge, ...(isActive ? S.filterBadgeActive : {}) }}
              onClick={() => toggleStep(step)}
            >
              {step}
            </button>
          );
        })}
      </div>

      {/* Context table */}
      <table style={S.contextTable}>
        <thead>
          <tr>
            <th style={S.contextTh}>Type</th>
            <th style={S.contextTh}>Name</th>
            <th style={S.contextTh}>Step</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((entry, i) => (
            <tr key={`${entry.fullPath}-${entry.step}-${i}`} title={entry.fullPath}>
              <td style={S.contextTd}>
                <ManagerBadge variant="gray">{entry.type}</ManagerBadge>
              </td>
              <td style={S.contextTd}>{entry.name}</td>
              <td style={{ ...S.contextTd, color: '#64748B', fontSize: 10 }}>{entry.step}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowsTab
// ---------------------------------------------------------------------------

type WorkflowSubTab = 'summary' | 'tasks' | 'context';

function WorkflowTabs({ wf }: { wf: WorkflowData }) {
  const [tab, setTab] = useState<WorkflowSubTab>('summary');

  const tabs: { id: WorkflowSubTab; label: string }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'context', label: 'Context' },
  ];

  return (
    <div>
      <div style={S.tabBar}>
        {tabs.map((t) => (
          <button
            key={t.id}
            style={{ ...S.tabButton, ...(tab === t.id ? S.tabButtonActive : {}) }}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'summary' && <WorkflowSummaryTab wf={wf} />}
      {tab === 'tasks' && <WorkflowTasksTab wf={wf} />}
      {tab === 'context' && <WorkflowContextTab wf={wf} />}
    </div>
  );
}

function WorkflowsTab({ workflows, designbookDir }: { workflows: WorkflowData[]; designbookDir: string }) {
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

        const wfSummary = (
          <span style={S.summaryRow}>
            <WorkflowStatusDot status={wf.status} />
            <span style={S.summaryTitle}>{wf.title}</span>
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
            <WorkflowTabs wf={wf} />
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
