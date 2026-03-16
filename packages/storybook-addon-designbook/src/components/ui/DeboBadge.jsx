import React from 'react';
import { styled } from 'storybook/theming';

const colorMap = {
  green: { background: '#D0FAE5', color: '#007A55' },
  yellow: { background: '#FEF3C7', color: '#92400E' },
  red: { background: '#FFE4E6', color: '#C70036' },
  purple: { background: '#f3e8ff', color: '#8200db' },
  gray: { background: '#F1F5F9', color: '#94A3B8' },
};

const StyledBadge = styled.span(({ theme }) => ({
  display: 'inline-block',
  fontFamily: theme.typography.fonts.base,
  fontSize: 10,
  fontWeight: theme.typography.weight.bold,
  lineHeight: '15px',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  padding: '2px 8px',
  borderRadius: 9999,
  flexShrink: 0,
  whiteSpace: 'nowrap',
}));

export function DeboBadge({ children, color = 'green' }) {
  const c = colorMap[color] || colorMap.green;
  return (
    <StyledBadge style={{ background: c.background, color: c.color }}>
      {children}
    </StyledBadge>
  );
}
