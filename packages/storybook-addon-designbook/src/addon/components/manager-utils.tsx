import React from 'react';
import { styled, useTheme } from 'storybook/theming';

export function relativeTime(iso: string | null): string {
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

export function timeRange(started: string | null, ended: string | null): string {
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

export const ManagerBadge = styled.span<{ variant?: 'green' | 'yellow' | 'gray' | 'white' }>(
  ({ variant = 'green', theme }) => {
    const colors = {
      green: { background: theme.color.positive, color: theme.color.inverseText },
      yellow: { background: theme.background.warning, color: theme.color.defaultText },
      gray: { background: theme.background.hoverable, color: theme.color.defaultText },
      white: { background: theme.background.content, color: theme.color.defaultText },
    };
    const c = colors[variant] || colors.green;
    return {
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      lineHeight: '15px',
      letterSpacing: '0.5px',
      textTransform: 'uppercase' as const,
      padding: '2px 8px',
      borderRadius: 9999,
      whiteSpace: 'nowrap' as const,
      background: c.background,
      color: c.color,
    };
  },
);

const ActivityDot = styled.div<{ done: boolean }>(({ done, theme }) => ({
  width: 14,
  height: 14,
  borderRadius: '50%',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...(done
    ? { background: theme.color.positive }
    : { border: `2px solid ${theme.textMutedColor}`, background: 'transparent' }),
}));

const ActivityRow = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '4px 0',
});

const ActivityTitle = styled.span<{ done: boolean }>(({ done, theme }) => ({
  fontSize: 12,
  color: done ? theme.color.positive : theme.textMutedColor,
  flex: 1,
}));

const ActivityTimestamp = styled.span(({ theme }) => ({
  fontSize: 10,
  color: theme.textMutedColor,
  flexShrink: 0,
}));

export function ManagerActivityItem({
  title,
  status,
  timestamp,
}: {
  title: string;
  status: 'done' | 'in-progress';
  timestamp?: string;
}) {
  const isDone = status === 'done';
  const theme = useTheme();
  return (
    <ActivityRow>
      <ActivityDot done={isDone}>
        {isDone && (
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={theme.color.positive} strokeWidth="3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </ActivityDot>
      <ActivityTitle done={isDone}>{title}</ActivityTitle>
      {timestamp && <ActivityTimestamp>{timestamp}</ActivityTimestamp>}
    </ActivityRow>
  );
}
