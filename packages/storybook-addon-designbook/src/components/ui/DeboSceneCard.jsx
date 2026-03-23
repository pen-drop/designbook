import React from 'react';
import { styled } from 'storybook/theming';
import { DeboLink } from './DeboLink.jsx';

function relativeTime(dateStr) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (isNaN(then)) return null;
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

const CardWrapper = styled.div(({ theme }) => ({
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 14,
  boxShadow: '0px 2px 8px -4px rgba(0,0,0,0.05)',
  padding: 16,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  transition: 'border-color 0.15s',
}));

const ClickableCard = styled(CardWrapper)({
  cursor: 'pointer',
  '&:hover': {
    borderColor: '#CBD5E1',
  },
});

const LetterCircle = styled.div({
  width: 40,
  height: 40,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#3B82F6',
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: 600,
  flexShrink: 0,
});

const CardContent = styled.div({
  minWidth: 0,
});

const CardTitle = styled.div(({ theme }) => ({
  fontSize: 15,
  fontWeight: 500,
  lineHeight: 1.2,
  color: theme.color.defaultText,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const CardDate = styled.div(({ theme }) => ({
  fontSize: 12,
  color: theme.color.mediumdark,
  marginTop: 2,
}));

export function DeboSceneCard({ title, modified, storyId, storyTitle, storyName }) {
  const letter = title ? title.charAt(0).toUpperCase() : '?';
  const date = modified ? relativeTime(modified) : null;
  const hasLink = storyId || storyTitle;
  const Wrapper = hasLink ? ClickableCard : CardWrapper;

  const content = (
    <Wrapper role={hasLink ? 'link' : undefined}>
      <LetterCircle>{letter}</LetterCircle>
      <CardContent>
        <CardTitle>{title}</CardTitle>
        {date && <CardDate>{date}</CardDate>}
      </CardContent>
    </Wrapper>
  );

  if (!hasLink) return content;

  return (
    <DeboLink storyId={storyId} title={storyTitle} name={storyName} style={{ display: 'block' }}>
      {content}
    </DeboLink>
  );
}
