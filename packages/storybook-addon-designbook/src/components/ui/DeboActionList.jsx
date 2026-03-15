import React from 'react';
import { styled } from 'storybook/theming';
import { DeboBadge } from './DeboBadge.jsx';

const statusColors = {
  done: '#16A34A',
  'in-progress': '#3B82F6',
  pending: '#94A3B8',
};

const typeColors = {
  component: 'purple',
  scene: 'green',
  data: 'green',
  tokens: 'purple',
  'view-mode': 'green',
  css: 'purple',
  validation: 'green',
};

const ListWrapper = styled.div({
  display: 'flex',
  flexDirection: 'column',
});

const ItemRow = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '6px 4px',
  borderRadius: 4,
  transition: 'background 0.15s',
  '&:hover': {
    background: theme.background.hoverable || '#F8FAFC',
  },
}));

const DoneIcon = styled.div({
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: 'rgba(22,163,74,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

const SpinnerIcon = styled.div({
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: '2px solid #3B82F6',
  borderTopColor: 'transparent',
  flexShrink: 0,
  animation: 'spin 1s linear infinite',
  '@keyframes spin': {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },
});

const PendingIcon = styled.div(({ theme }) => ({
  width: 20,
  height: 20,
  borderRadius: '50%',
  border: `2px solid ${theme.appBorderColor}`,
  flexShrink: 0,
}));

function StatusIcon({ status }) {
  if (status === 'done') {
    return (
      <DoneIcon>
        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#16A34A" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </DoneIcon>
    );
  }
  if (status === 'in-progress') return <SpinnerIcon />;
  return <PendingIcon />;
}

const ItemTitle = styled.span(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const Timestamp = styled.span(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  opacity: 0.5,
  flexShrink: 0,
}));

function Item({ status, title, type, timestamp, children }) {
  const titleColor = statusColors[status] || statusColors.pending;
  return (
    <ItemRow>
      <StatusIcon status={status} />
      <ItemTitle style={{ color: status === 'pending' ? '#94A3B8' : undefined }}>
        {title}
      </ItemTitle>
      {type && <DeboBadge color={typeColors[type] || 'green'}>{type}</DeboBadge>}
      {timestamp && <Timestamp>{timestamp}</Timestamp>}
      {children}
    </ItemRow>
  );
}

export function DeboActionList({ children }) {
  return <ListWrapper>{children}</ListWrapper>;
}

DeboActionList.Item = Item;
