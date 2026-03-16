import React from 'react';
import { styled } from 'storybook/theming';

function navigateStorybook(storyPath) {
  try {
    const url = new URL(window.top.location.href);
    url.searchParams.set('path', storyPath);
    window.top.location.href = url.toString();
  } catch {
    window.location.href = `?path=${storyPath}`;
  }
}

const List = styled.ul(({ theme }) => ({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  background: theme.background?.content || '#ffffff',
  borderRadius: 12,
}));

const ItemRow = styled.li(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '10px 12px',
  borderRadius: 8,
  '&:hover': {
    background: theme.background?.hoverable || '#F8FAFC',
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
  background: theme.background?.hoverable || '#F1F5F9',
  color: theme.color.mediumdark,
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
  color: theme.color.mediumdark,
  marginTop: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}));

const ArrowIcon = styled.svg(({ theme }) => ({
  width: 16,
  height: 16,
  color: theme.color.mediumdark,
  opacity: 0.3,
  flexShrink: 0,
}));

const ClickableRow = styled(ItemRow)({
  cursor: 'pointer',
});

export function DeboNumberedList({ items, linkTo }) {
  if (!items || items.length === 0) return null;

  return (
    <List>
      {items.map((item, index) => {
        const itemLink = item.linkTo || linkTo;
        const Wrapper = itemLink ? ClickableRow : ItemRow;

        return (
          <Wrapper
            key={index}
            as={itemLink ? 'li' : undefined}
            onClick={itemLink ? () => navigateStorybook(itemLink) : undefined}
          >
            <NumberBadge>{index + 1}</NumberBadge>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              {item.description && typeof item.description === 'string' ? (
                <ItemDescription>{item.description}</ItemDescription>
              ) : (
                item.description
              )}
            </ItemContent>
            {itemLink && (
              <ArrowIcon fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </ArrowIcon>
            )}
          </Wrapper>
        );
      })}
    </List>
  );
}
