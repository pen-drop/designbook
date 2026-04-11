import React from 'react';
import { styled } from 'storybook/theming';
import { DeboLink } from './DeboLink.jsx';

const List = styled.ul(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  background: theme.background.content,
  borderRadius: 12,
}));

const ItemRow = styled.li(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '10px 12px',
  borderRadius: 8,
  '&:hover': {
    background: theme.background.hoverable,
  },
}));

const NumberBadge = styled.span(({ theme }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: 6,
  fontSize: theme.typography.size.s1,
  fontWeight: 500,
  background: theme.background.hoverable,
  color: theme.textMutedColor,
  flexShrink: 0,
}));

const ItemContent = styled.div({
  minWidth: 0,
  flex: 1,
});

const ItemTitle = styled.span(({ theme }) => ({
  fontWeight: 500,
  color: theme.color.defaultText,
}));

const ItemDescription = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.textMutedColor,
  marginTop: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const ArrowIcon = styled.svg(({ theme }) => ({
  width: 16,
  height: 16,
  color: theme.textMutedColor,
  opacity: 0.3,
  flexShrink: 0,
}));

const ClickableRow = styled(ItemRow)({
  cursor: 'pointer',
});

export function DeboNumberedList({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <List>
      {items.map((item, index) => {
        const hasLink = item.storyId || item.storyTitle;
        const Wrapper = hasLink ? ClickableRow : ItemRow;

        const row = (
          <Wrapper key={index}>
            <NumberBadge>{index + 1}</NumberBadge>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              {item.description && typeof item.description === 'string' ? (
                <ItemDescription>{item.description}</ItemDescription>
              ) : (
                item.description
              )}
            </ItemContent>
            {hasLink && (
              <ArrowIcon fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </ArrowIcon>
            )}
          </Wrapper>
        );

        if (!hasLink) return row;

        return (
          <DeboLink key={index} storyId={item.storyId} title={item.storyTitle} name={item.storyName} style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
            {row}
          </DeboLink>
        );
      })}
    </List>
  );
}
