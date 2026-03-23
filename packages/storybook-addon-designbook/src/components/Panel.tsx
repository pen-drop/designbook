import React, { memo, useState, useEffect } from 'react';
import { AddonPanel, TabsView } from 'storybook/internal/components';
import { addons } from 'storybook/manager-api';
import { relativeTime, ManagerBadge } from './manager-utils.tsx';
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
  requires_validation?: boolean;
  validation_result?: ValidationFileResult;
}

interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  stage?: string;
  status: 'pending' | 'in-progress' | 'done' | 'incomplete';
  started_at: string | null;
  completed_at: string | null;
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
  stages?: string[];
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
// Helpers
// ---------------------------------------------------------------------------

const MAX_LOG_ENTRIES = 10;

const shortenPath = (p: string): string => {
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-1).join('/');
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
      {s.icon === 'dot' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#92400E' }} />
      )}
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

function groupByStage(wf: WorkflowData): { stage: string; tasks: WorkflowTask[] }[] {
  const stageOrder = wf.stages ?? [...new Set(wf.tasks.map((t) => t.stage).filter(Boolean) as string[])];
  const byStage = new Map<string, WorkflowTask[]>();
  const unstaged: WorkflowTask[] = [];

  for (const task of wf.tasks) {
    if (task.stage) {
      const group = byStage.get(task.stage) ?? [];
      group.push(task);
      byStage.set(task.stage, group);
    } else {
      unstaged.push(task);
    }
  }

  const groups: { stage: string; tasks: WorkflowTask[] }[] = [];
  for (const stage of stageOrder) {
    const group = byStage.get(stage);
    if (group?.length) groups.push({ stage, tasks: group });
  }
  if (unstaged.length) groups.push({ stage: '(unstaged)', tasks: unstaged });
  return groups;
}

// ---------------------------------------------------------------------------
// Inline Styles (manager components must not use styled/theme)
// ---------------------------------------------------------------------------

const S = {
  container: { padding: '0.75rem', fontFamily: 'inherit', fontSize: 13, display: 'flex', flexDirection: 'column' as const, gap: 4 },
  empty: { padding: '2rem 1rem', textAlign: 'center' as const, color: '#7B8794' },
  badgeRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 6, padding: '8px 0' },
  sectionLabel: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#7B8794', marginTop: 12, marginBottom: 6 },
  summaryRow: { display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' as const },
  summaryTitle: { overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 },
  summaryTime: { fontSize: 10, color: '#94A3B8', flexShrink: 0 },
  taskRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 12, color: 'inherit', flexWrap: 'wrap' as const },
  taskTitle: { flex: 1, minWidth: 0, overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  taskTime: { fontSize: 10, color: '#7B8794', opacity: 0.6, flexShrink: 0 },
  taskFileBadges: { display: 'inline-flex', gap: 4, flexWrap: 'wrap' as const, alignItems: 'center' },
  loadedList: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  loadedRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 11, color: 'inherit' },
  loadedLabel: { fontSize: 10, color: '#7B8794', flexShrink: 0, minWidth: 44 },
  loadedPath: { flex: 1, fontFamily: 'monospace', fontSize: 10, overflow: 'hidden' as const, textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  overviewSection: { marginBottom: 8 },
  overviewLabel: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px', color: '#7B8794', marginBottom: 6, marginTop: 6 },
  overviewRow: { display: 'flex', alignItems: 'center', gap: 6, padding: '2px 0', fontSize: 12, color: 'inherit' },
  overviewValue: { color: '#7B8794', fontSize: 11 },
  badgeWrap: { display: 'flex', flexWrap: 'wrap' as const, gap: 4, alignItems: 'center' },
};

function WorkflowOverview({ wf, designbookDir }: { wf: WorkflowData; designbookDir: string }) {
  const allLoaded = Object.entries(wf.stage_loaded ?? {});
  const allSkills = allLoaded.filter(([, l]) => l.task_file).map(([stage, l]) => ({ stage, path: l.task_file }));
  const allRules = allLoaded.flatMap(([stage, l]) => (l.rules ?? []).map((r) => ({ stage, path: r })));
  const allConfigRules = allLoaded.flatMap(([, l]) => l.config_rules ?? []);
  const allConfigInstructions = allLoaded.flatMap(([, l]) => l.config_instructions ?? []);

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString('de-DE')} ${d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div>
      <div style={S.overviewSection}>
        <div style={S.overviewRow}>
          <WorkflowStatusDot status={wf.status} />
          <span style={{ fontWeight: 600 }}>{wf.status ?? 'running'}</span>
          {wf.parent && <span style={S.overviewValue}>↳ {wf.parent}</span>}
        </div>
        <div style={S.overviewRow}>
          <span style={S.overviewValue}>Start: {formatDate(wf.started_at)}</span>
        </div>
        <div style={S.overviewRow}>
          <span style={S.overviewValue}>End: {formatDate(wf.completed_at)}</span>
        </div>
        {designbookDir && (
          <div style={S.overviewRow}>
            <span style={{ ...S.overviewValue, fontFamily: 'monospace', fontSize: 10 }}>{shortenPath(logPath(designbookDir, wf))}</span>
            <ContextAction path={logPath(designbookDir, wf)} />
          </div>
        )}
      </div>

      {wf.params && Object.keys(wf.params).length > 0 && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Context</div>
          {Object.entries(wf.params).map(([k, v]) => (
            <div style={S.overviewRow} key={k}>
              <span style={{ fontWeight: 600, fontSize: 11 }}>{k}:</span>
              <span style={S.overviewValue}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {allSkills.length > 0 && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Skills</div>
          <div style={S.badgeWrap}>
            {allSkills.map(({ stage, path }) => (
              <span key={path} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <ManagerBadge variant="green">{shortenPath(path)}</ManagerBadge>
                <ContextAction path={path} />
              </span>
            ))}
          </div>
        </div>
      )}

      {allRules.length > 0 && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Rules</div>
          <div style={S.badgeWrap}>
            {allRules.map(({ path }) => (
              <span key={path} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                <ManagerBadge variant="gray">{shortenPath(path)}</ManagerBadge>
                <ContextAction path={path} />
              </span>
            ))}
          </div>
        </div>
      )}

      {allConfigRules.length > 0 && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Config Rules</div>
          <div style={S.badgeWrap}>
            {allConfigRules.map((cr, i) => (
              <ManagerBadge key={i} variant="gray">{cr}</ManagerBadge>
            ))}
          </div>
        </div>
      )}

      {allConfigInstructions.length > 0 && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Instructions</div>
          <div style={S.badgeWrap}>
            {allConfigInstructions.map((ci, i) => (
              <ManagerBadge key={i} variant="gray">{ci}</ManagerBadge>
            ))}
          </div>
        </div>
      )}

      {wf.summary && (
        <div style={S.overviewSection}>
          <div style={S.overviewLabel}>Summary</div>
          <span style={{ ...S.overviewValue, whiteSpace: 'pre-wrap', fontSize: 11 }}>{wf.summary}</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WorkflowsTab
// ---------------------------------------------------------------------------

function WorkflowsTab({ workflows, designbookDir }: { workflows: WorkflowData[]; designbookDir: string }) {
  if (workflows.length === 0) {
    return <div style={S.empty}>No workflow activity yet. Run a /debo-* command to see progress here.</div>;
  }

  return (
    <div style={S.container}>
      {workflows.map((wf) => {
        const done = wf.tasks.filter((t) => t.status === 'done').length;
        const total = wf.tasks.length;
        const isOpen = wf.status === 'running' || wf.status === 'planning';
        const groups = groupByStage(wf);

        const wfSummary = (
          <span style={S.summaryRow}>
            <WorkflowStatusDot status={wf.status} />
            <span style={S.summaryTitle}>{wf.title}</span>
            {designbookDir && <ContextAction path={logPath(designbookDir, wf)} />}
            <span style={S.summaryTime}>{relativeTime(wf.completed_at || wf.started_at)}</span>
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
            {groups.map(({ stage, tasks }) => {
              const stageDone = tasks.filter((t) => t.status === 'done').length;
              const stageTotal = tasks.length;
              const stageIsOpen = tasks.some((t) => t.status === 'in-progress' || t.status === 'pending');
              const loaded = wf.stage_loaded?.[stage];

              const extraLinks = loaded?.rules?.map((rule) => ({
                id: `rule-${rule}`,
                title: `📏 ${shortenPath(rule)}`,
                path: rule,
              })) ?? [];

              const stageSummary = (
                <span style={S.summaryRow}>
                  <span style={S.summaryTitle}>{stage}</span>
                  {loaded?.task_file && <ContextAction path={loaded.task_file} extraLinks={extraLinks} />}
                  <ManagerBadge variant={stageDone === stageTotal ? 'green' : 'gray'}>{stageDone}/{stageTotal}</ManagerBadge>
                </span>
              );

              const hasLoaded = loaded && (loaded.task_file || loaded.rules?.length || loaded.config_rules?.length || loaded.config_instructions?.length);

              const taskStatus2collapsible = (s: string): 'done' | 'running' | 'pending' => {
                if (s === 'done') return 'done';
                if (s === 'in-progress') return 'running';
                return 'pending';
              };

              const tasksContent = () => (
                <div>
                  {tasks.map((task) => {
                    const hasFiles = task.files && task.files.length > 0;
                    const taskSummary = (
                      <span style={S.taskRow}>
                        <StatusDot status={task.status} />
                        <span style={task.status === 'done' ? { ...S.taskTitle, opacity: 0.5 } : S.taskTitle}>{task.title}</span>
                        {task.status === 'in-progress' && task.started_at && (
                          <span style={S.taskTime}>{relativeTime(task.started_at)}</span>
                        )}
                      </span>
                    );

                    if (!hasFiles) {
                      return <div key={task.id} style={{ padding: '3px 0' }}>{taskSummary}</div>;
                    }

                    return (
                      <DeboCollapsible
                        key={task.id}
                        title={taskSummary}
                        variant="action-inline"
                        status={taskStatus2collapsible(task.status)}
                      >
                        <span style={S.taskFileBadges}>
                          {task.files!.map((f) => {
                            const absPath = designbookDir ? `${designbookDir}/${f.path}` : f.path;
                            return (
                              <span key={f.path} style={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                <ManagerBadge variant={fileBadgeVariant(f)}>{shortenPath(f.path)}</ManagerBadge>
                                <ContextAction path={absPath} validation={f.validation_result ?? undefined} />
                              </span>
                            );
                          })}
                        </span>
                      </DeboCollapsible>
                    );
                  })}
                </div>
              );

              const overviewContent = () => (
                <div style={S.loadedList}>
                  {loaded?.task_file && (
                    <div style={S.loadedRow}>
                      <span style={S.loadedLabel}>📄 skill</span>
                      <span style={S.loadedPath}>{shortenPath(loaded.task_file)}</span>
                      <ContextAction path={loaded.task_file} />
                    </div>
                  )}
                  {loaded?.rules?.map((rule) => (
                    <div style={S.loadedRow} key={rule}>
                      <span style={S.loadedLabel}>📏 rule</span>
                      <span style={S.loadedPath}>{shortenPath(rule)}</span>
                      <ContextAction path={rule} />
                    </div>
                  ))}
                  {loaded?.config_rules?.map((cr, i) => (
                    <div style={S.loadedRow} key={`cr-${i}`}>
                      <span style={S.loadedLabel}>⚙ config</span>
                      <span style={S.loadedPath}>{cr}</span>
                    </div>
                  ))}
                  {loaded?.config_instructions?.map((ci, i) => (
                    <div style={S.loadedRow} key={`ci-${i}`}>
                      <span style={S.loadedLabel}>💡 instr</span>
                      <span style={S.loadedPath}>{ci}</span>
                    </div>
                  ))}
                </div>
              );

              return (
                <DeboCollapsible
                  key={stage}
                  title={stageSummary}
                  variant="action-item"
                  status={stageStatus(tasks)}
                  defaultOpen={stageIsOpen}
                >
                  {hasLoaded && overviewContent()}
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
// StatusTab (unchanged)
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
