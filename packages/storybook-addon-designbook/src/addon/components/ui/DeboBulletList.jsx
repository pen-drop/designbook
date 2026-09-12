import React from 'react';
import { styled } from 'storybook/theming';

const List = styled.ul({
  listStyle: 'none',
  padding: 0,
  margin: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

const ListItem = styled.li({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 12,
});

const Dot = styled.span(({ theme }) => ({
  width: 6,
  height: 6,
  borderRadius: '50%',
  background: theme.color.mediumdark,
  flexShrink: 0,
  marginTop: 7,
  opacity: 0.5,
}));

const ItemText = styled.span(({ theme }) => ({
  color: theme.color.defaultText,
  opacity: 0.7,
}));

export function DeboBulletList({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <List>
      {items.map((item, index) => (
        <ListItem key={index}>
          <Dot />
          <ItemText>{item}</ItemText>
        </ListItem>
      ))}
    </List>
  );
}
