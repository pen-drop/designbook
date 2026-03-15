import React, { useState, useEffect, useCallback } from 'react';
import { IconButton, WithTooltip } from 'storybook/internal/components';
import { styled } from 'storybook/theming';
import { ManagerBadge, ManagerActivityItem, timeRange } from '../manager-utils.tsx';

const POLL_INTERVAL = 3000;

const DropdownWrapper = styled.div({
  width: 320,
  padding: 12,
});

const BadgeRow = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
  marginBottom: 10,
});

const SectionLabel = styled.div({
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#94A3B8',
  marginBottom: 6,
});

const SectionBlock = styled.div({
  marginBottom: 10,
});

const ActivityScroll = styled.div({
  maxHeight: 200,
  overflowY: 'auto',
});

const NoActivity = styled.div({
  fontSize: 12,
  color: '#94A3B8',
  padding: '4px 0',
});

const CountBadge = styled.span(({ complete }) => ({
  fontSize: 10,
  fontWeight: 700,
  background: complete ? '#D0FAE5' : '#F1F5F9',
  color: complete ? '#007A55' : '#94A3B8',
  padding: '1px 5px',
  borderRadius: 9999,
  marginLeft: 4,
}));

const ButtonLabel = styled.span({
  fontSize: 12,
  fontWeight: 600,
});

function sectionsBadgeVariant(sections) {
  if (!sections || sections.length === 0) return 'gray';
  const ready = sections.filter((s) => s.hasScenes).length;
  if (ready === sections.length) return 'green';
  if (ready > 0) return 'yellow';
  return 'gray';
}

function sectionsBadgeLabel(sections) {
  if (!sections || sections.length === 0) return 'sections';
  const ready = sections.filter((s) => s.hasScenes).length;
  return `sections (${ready}/${sections.length})`;
}

function DropdownContent({ status }) {
  return (
    <DropdownWrapper>
      <BadgeRow>
        <ManagerBadge variant={status.vision.exists ? 'green' : 'gray'}>vision</ManagerBadge>
        <ManagerBadge variant={status.designSystem.tokens ? 'green' : 'gray'}>tokens</ManagerBadge>
        <ManagerBadge variant={status.dataModel.exists ? 'green' : 'gray'}>data-model</ManagerBadge>
        <ManagerBadge variant={status.shell.exists ? 'green' : 'gray'}>shell</ManagerBadge>
        <ManagerBadge variant={sectionsBadgeVariant(status.sections)}>
          {sectionsBadgeLabel(status.sections)}
        </ManagerBadge>
      </BadgeRow>

      {status.sections && status.sections.length > 0 && (
        <SectionBlock>
          <SectionLabel>Sections</SectionLabel>
          <BadgeRow>
            {status.sections.map((section) => (
              <ManagerBadge key={section.id} variant={section.hasScenes ? 'green' : 'gray'}>
                {section.title}
              </ManagerBadge>
            ))}
          </BadgeRow>
        </SectionBlock>
      )}

      <div>
        <SectionLabel>Activity</SectionLabel>
        <ActivityScroll>
          {(status.workflows || []).length > 0 ? (
            (status.workflows || []).slice(0, 10).map((wf) => (
              <ManagerActivityItem
                key={wf.changeName}
                status={wf.source === 'archived' ? 'done' : 'in-progress'}
                title={wf.title}
                timestamp={timeRange(wf.started_at, wf.completed_at)}
              />
            ))
          ) : (
            <NoActivity>No activity yet</NoActivity>
          )}
        </ActivityScroll>
      </div>
    </DropdownWrapper>
  );
}

export function DeboOnboardingGuide() {
  const [status, setStatus] = useState(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/__designbook/status');
      if (res.ok) setStatus(await res.json());
    } catch { /* skip */ }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  const completedCount = status
    ? [status.vision.exists, status.designSystem.tokens, status.dataModel.exists, status.shell.exists].filter(Boolean).length
    : 0;

  return (
    <WithTooltip
      placement="bottom"
      closeOnOutsideClick
      tooltip={status ? <DropdownContent status={status} /> : null}
    >
      <IconButton title="Designbook status">
        <ButtonLabel>Designbook</ButtonLabel>
        {status && <CountBadge complete={completedCount === 4}>{completedCount}/4</CountBadge>}
      </IconButton>
    </WithTooltip>
  );
}
