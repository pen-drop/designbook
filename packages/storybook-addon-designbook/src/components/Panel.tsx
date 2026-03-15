import React, { memo, useState, useEffect } from 'react';
import { AddonPanel, TabsView } from 'storybook/internal/components';
import { styled } from 'storybook/theming';
import { timeRange, ManagerBadge } from './manager-utils.tsx';

interface WorkflowData {
  changeName: string;
  title: string;
  workflow: string;
  started_at: string | null;
  completed_at: string | null;
  tasks: unknown[];
  source: 'active' | 'archived';
}

interface StatusData {
  vision: { exists: boolean };
  designSystem: { tokens: boolean };
  dataModel: { exists: boolean };
  shell: { exists: boolean };
  sections: Array<{ id: string; title: string; hasScenes: boolean }>;
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

function WorkflowsTab({ workflows }: { workflows: WorkflowData[] }) {
  if (workflows.length === 0) {
    return <EmptyState>No workflow activity yet. Run a /debo-* command to see progress here.</EmptyState>;
  }

  return (
    <Container>
      {workflows.map((wf) => {
        const isDone = wf.source === 'archived';
        return (
          <Row key={wf.changeName} isDone={isDone}>
            <Icon>{isDone ? '\u2705' : '\u26A1'}</Icon>
            <Title>{wf.title}</Title>
            <Time>{timeRange(wf.started_at, wf.completed_at)}</Time>
          </Row>
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
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(interval);
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
