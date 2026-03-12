import React, { memo, useState, useEffect } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

interface WorkflowTask {
  id: string;
  title: string;
  type: string;
  status: 'pending' | 'in-progress' | 'done';
  started_at: string | null;
  completed_at: string | null;
}

interface WorkflowData {
  changeName: string;
  title: string;
  workflow: string;
  started_at: string | null;
  completed_at: string | null;
  tasks: WorkflowTask[];
  source: 'active' | 'archived';
}

interface PanelProps {
  active?: boolean;
}

const POLL_INTERVAL = 3000;
const MAX_LOG_ENTRIES = 10;

const Container = styled.div(({ theme }) => ({
  padding: '0.75rem',
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
}));

const LogEntry = styled.div<{ isActive: boolean }>(({ theme, isActive }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: '8px',
  padding: '8px 10px',
  borderRadius: '4px',
  borderLeft: `3px solid ${isActive ? theme.color.secondary || '#1ea7fd' : theme.color.positive || '#10b981'}`,
  background: isActive ? theme.background.hoverable || '#f5f5f5' : 'transparent',
  marginBottom: '4px',
  '& + &': {
    marginTop: '2px',
  },
}));

const LogIcon = styled.span({
  flexShrink: 0,
  width: '18px',
  textAlign: 'center' as const,
  lineHeight: '20px',
});

const LogContent = styled.div({
  flex: 1,
  minWidth: 0,
});

const LogTitle = styled.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s2,
  lineHeight: '20px',
}));

const LogDetail = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginTop: '2px',
}));

const LogTime = styled.span(({ theme }) => ({
  fontSize: '10px',
  color: theme.color.mediumdark,
  opacity: 0.6,
  flexShrink: 0,
  lineHeight: '20px',
}));

const TaskList = styled.div({
  marginTop: '4px',
  display: 'flex',
  flexWrap: 'wrap' as const,
  gap: '4px',
});

const TaskPill = styled.span<{ status: string }>(({ theme, status }) => ({
  fontSize: '10px',
  padding: '1px 6px',
  borderRadius: '9999px',
  background:
    status === 'done'
      ? (theme.color.positive || '#10b981') + '20'
      : status === 'in-progress'
        ? (theme.color.secondary || '#1ea7fd') + '20'
        : theme.background.hoverable || '#f0f0f0',
  color:
    status === 'done'
      ? theme.color.positive || '#10b981'
      : status === 'in-progress'
        ? theme.color.secondary || '#1ea7fd'
        : theme.color.mediumdark,
  fontWeight: status === 'in-progress' ? 600 : 400,
}));

const EmptyState = styled.div(({ theme }) => ({
  padding: '2rem 1rem',
  textAlign: 'center' as const,
  color: theme.color.mediumdark,
}));

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function timeRange(started: string | null, ended: string | null): string {
  if (!started) return '';
  const startDate = new Date(started);
  const startDay = startDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const startTime = startDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  if (ended) {
    const endDate = new Date(ended);
    const endDay = endDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const endTime = endDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const endPart = startDay === endDay ? endTime : `${endDay} ${endTime}`;
    return `${startDay} ${startTime} – ${endPart} (${relativeTime(ended)})`;
  }
  return `${startDay} ${startTime} (${relativeTime(started)})`;
}

function progressText(tasks: WorkflowTask[]): string {
  const done = tasks.filter((t) => t.status === 'done').length;
  return `${done}/${tasks.length}`;
}

// eslint-disable-next-line react/prop-types
export const Panel: React.FC<PanelProps> = memo(function DesignbookPanel({ active }) {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);

  useEffect(() => {
    if (!active) return;

    let mounted = true;

    const poll = async () => {
      try {
        const res = await fetch('/__designbook/workflows');
        if (!res.ok || !mounted) return;
        const data: WorkflowData[] = await res.json();
        if (mounted) setWorkflows(data.slice(0, MAX_LOG_ENTRIES));
      } catch {
        // Network error, skip
      }
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [active]);

  return (
    <AddonPanel active={active ?? false}>
      <Container>
        {workflows.length === 0 ? (
          <EmptyState>No workflow activity yet. Run a /debo-* command to see progress here.</EmptyState>
        ) : (
          workflows.map((wf) => {
            const isActive = wf.source === 'active';
            const isDone = wf.source === 'archived';

            return (
              <LogEntry key={wf.changeName} isActive={isActive}>
                <LogIcon>{isDone ? '\u2705' : '\u26A1'}</LogIcon>
                <LogContent>
                  <LogTitle>
                    {wf.title}
                    {isActive && ` (${progressText(wf.tasks)})`}
                  </LogTitle>
                  <LogDetail>{wf.workflow}</LogDetail>
                  {isActive && (
                    <TaskList>
                      {wf.tasks.map((task) => (
                        <TaskPill key={task.id} status={task.status}>
                          {task.status === 'done' ? '\u2713' : task.status === 'in-progress' ? '\u25CB' : '\u00B7'}{' '}
                          {task.title}
                        </TaskPill>
                      ))}
                    </TaskList>
                  )}
                </LogContent>
                <LogTime>{timeRange(wf.started_at, wf.completed_at)}</LogTime>
              </LogEntry>
            );
          })
        )}
      </Container>
    </AddonPanel>
  );
});
