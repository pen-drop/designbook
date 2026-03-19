import React, { memo, useState, useEffect } from 'react';
import { AddonPanel, TabsView } from 'storybook/internal/components';
import { styled } from 'storybook/theming';
import { addons } from 'storybook/manager-api';
import { timeRange, ManagerBadge } from './manager-utils.tsx';

interface ValidationFileResult {
  file: string;
  type: string;
  valid: boolean;
  error?: string;
  skipped?: boolean;
  last_validated?: string;
  last_passed?: string;
  last_failed?: string;
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
  status: 'pending' | 'in-progress' | 'done';
  started_at: string | null;
  completed_at: string | null;
  files?: TaskFile[];
}

interface WorkflowData {
  changeName: string;
  title: string;
  workflow: string;
  status?: 'planning' | 'running' | 'completed';
  parent?: string;
  stages?: string[];
  started_at: string | null;
  completed_at: string | null;
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

const MAX_LOG_ENTRIES = 10;

const Container = styled.div(({ theme }) => ({
  padding: '0.75rem',
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
}));

const Row = styled.div<{ isDone: boolean }>(({ theme, isDone }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '6px 8px',
  borderRadius: '6px',
  '&:hover': { background: theme.background.hoverable || '#f5f5f5' },
  opacity: isDone ? 0.7 : 1,
}));

const Icon = styled.span({
  flexShrink: 0,
  width: '18px',
  textAlign: 'center' as const,
  lineHeight: '20px',
});

const Title = styled.span(({ theme }) => ({
  flex: 1,
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s2,
  lineHeight: '20px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
}));

const Time = styled.span(({ theme }) => ({
  fontSize: '10px',
  color: theme.color.mediumdark,
  opacity: 0.6,
  flexShrink: 0,
  lineHeight: '20px',
}));

const EmptyState = styled.div(({ theme }) => ({
  padding: '2rem 1rem',
  textAlign: 'center' as const,
  color: theme.color.mediumdark,
}));

const BadgeRow = styled.div({
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: 6,
  padding: '8px 0',
});

const SectionLabel = styled.div(({ theme }) => ({
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: theme.color.mediumdark,
  marginTop: 12,
  marginBottom: 6,
}));

const StageLabel = styled.div(({ theme }) => ({
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  color: theme.color.mediumdark,
  marginTop: 8,
  marginBottom: 2,
  paddingLeft: 28,
}));

const TaskRow = styled.div<{ status: string }>(({ theme, status }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '3px 8px 3px 28px',
  borderRadius: '4px',
  opacity: status === 'done' ? 0.5 : 1,
  '&:hover': { background: theme.background.hoverable || '#f5f5f5' },
}));

const TaskTitle = styled.span(({ theme }) => ({
  flex: 1,
  fontSize: theme.typography.size.s1,
  color: theme.color.defaultText,
  lineHeight: '18px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
}));

const FileRow = styled.div({
  padding: '1px 8px 1px 42px',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '1px',
});

const FilePath = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '10px',
  color: theme.color.mediumdark,
  lineHeight: '16px',
}));

const FileError = styled.div(({ theme }) => ({
  fontSize: '10px',
  color: theme.color.negative || '#d43b26',
  paddingLeft: '16px',
  lineHeight: '14px',
  opacity: 0.9,
}));

/** Show only the last 2 path segments: folder/filename */
const shortenPath = (p: string): string => {
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-2).join('/');
};

const taskIcon = (status: string) => {
  if (status === 'done') return '✅';
  if (status === 'in-progress') return '⚡';
  return '○';
};

const workflowStatusIcon = (status?: string) => {
  if (status === 'planning') return '📋';
  if (status === 'running') return '⚡';
  if (status === 'completed') return '✅';
  return '⚡'; // default to running for backward compatibility
};

const validationBadge = (f: TaskFile): string => {
  if (f.requires_validation && !f.validation_result) return '⏳';
  if (!f.validation_result) return '';
  const r = f.validation_result;
  if (r.skipped && f.requires_validation) return '⏭';
  if (r.valid) return '✅';
  return '❌';
};

function renderTask(task: WorkflowTask) {
  return (
    <React.Fragment key={task.id}>
      <TaskRow status={task.status}>
        <Icon style={{ width: '14px', fontSize: '10px' }}>{taskIcon(task.status)}</Icon>
        <TaskTitle>{task.title}</TaskTitle>
        {task.status === 'in-progress' && <Time>{timeRange(task.started_at, null)}</Time>}
      </TaskRow>
      {task.files?.map((f) => (
        <FileRow key={f.path}>
          <FilePath>
            <span>{validationBadge(f)}</span>
            <span title={f.path}>{shortenPath(f.path)}</span>
          </FilePath>
          {f.validation_result?.error && <FileError>{f.validation_result.error}</FileError>}
        </FileRow>
      ))}
    </React.Fragment>
  );
}

function renderTasksGrouped(wf: WorkflowData) {
  const hasStagedTasks = wf.tasks.some((t) => t.stage);
  if (!hasStagedTasks) {
    return wf.tasks.map(renderTask);
  }

  // Build ordered stage list: use wf.stages if available, otherwise derive from task order
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

  const elements: React.ReactNode[] = [];
  for (const stage of stageOrder) {
    const group = byStage.get(stage);
    if (!group || group.length === 0) continue;
    elements.push(<StageLabel key={`stage-${stage}`}>{stage}</StageLabel>);
    group.forEach((t) => elements.push(renderTask(t)));
  }
  unstaged.forEach((t) => elements.push(renderTask(t)));
  return elements;
}

const ParentRef = styled.div(({ theme }) => ({
  fontSize: '10px',
  color: theme.color.mediumdark,
  paddingLeft: 28,
  paddingBottom: 2,
  opacity: 0.7,
  fontFamily: 'monospace',
}));

function WorkflowsTab({ workflows }: { workflows: WorkflowData[] }) {
  if (workflows.length === 0) {
    return <EmptyState>No workflow activity yet. Run a /debo-* command to see progress here.</EmptyState>;
  }

  return (
    <Container>
      {workflows.map((wf) => {
        const isDone = wf.source === 'archived';
        const statusIcon = workflowStatusIcon(wf.status);
        const isPlanning = wf.status === 'planning';
        const hasNoTasks = wf.tasks.length === 0;
        return (
          <div key={wf.changeName} style={isPlanning && hasNoTasks ? { opacity: 0.6 } : undefined}>
            <Row isDone={isDone || isPlanning}>
              <Icon>{statusIcon}</Icon>
              <Title>{wf.title}</Title>
              <Time>{timeRange(wf.started_at, wf.completed_at)}</Time>
            </Row>
            {wf.parent && <ParentRef>↳ {wf.parent}</ParentRef>}
            {!hasNoTasks && renderTasksGrouped(wf)}
          </div>
        );
      })}
    </Container>
  );
}

function StatusTab({ status }: { status: StatusData | null }) {
  if (!status) {
    return <EmptyState>Loading status...</EmptyState>;
  }

  return (
    <Container>
      <BadgeRow>
        <ManagerBadge variant={status.vision.exists ? 'green' : 'gray'}>vision</ManagerBadge>
        <ManagerBadge variant={status.designSystem.guidelines ? 'green' : 'gray'}>guidelines</ManagerBadge>
        <ManagerBadge variant={status.designSystem.tokens ? 'green' : 'gray'}>tokens</ManagerBadge>
        <ManagerBadge variant={status.dataModel.exists ? 'green' : 'gray'}>data-model</ManagerBadge>
        <ManagerBadge variant={status.shell.exists ? 'green' : 'gray'}>shell</ManagerBadge>
      </BadgeRow>

      {status.sections && status.sections.length > 0 && (
        <>
          <SectionLabel>Sections</SectionLabel>
          <BadgeRow>
            {status.sections.map((section) => (
              <ManagerBadge key={section.id} variant={section.hasScenes ? 'green' : 'gray'}>
                {section.title}
              </ManagerBadge>
            ))}
          </BadgeRow>
        </>
      )}
    </Container>
  );
}

// eslint-disable-next-line react/prop-types
export const Panel: React.FC<PanelProps> = memo(function DesignbookPanel({ active }) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [status, setStatus] = useState<StatusData | null>(null);

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    const poll = async () => {
      try {
        const [wfRes, statusRes] = await Promise.all([fetch('/__designbook/workflows'), fetch('/__designbook/status')]);
        if (!mounted) return;
        if (wfRes.ok) {
          const data: WorkflowData[] = await wfRes.json();
          setWorkflows(data.slice(0, MAX_LOG_ENTRIES));
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
            children: () => <WorkflowsTab workflows={workflows} />,
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
