import React from 'react';
import { styled, useTheme } from 'storybook/theming';

const lightColors = {
  green: { background: '#D0FAE5', color: '#007A55' },
  yellow: { background: '#FEF3C7', color: '#92400E' },
  red: { background: '#FFE4E6', color: '#C70036' },
  purple: { background: '#f3e8ff', color: '#8200db' },
  gray: { background: '#F1F5F9', color: '#94A3B8' },
};

const darkColors = {
  green: { background: '#064E3B', color: '#6EE7B7' },
  yellow: { background: '#78350F', color: '#FCD34D' },
  red: { background: '#7F1D1D', color: '#FCA5A5' },
  purple: { background: '#4C1D95', color: '#C4B5FD' },
  gray: { background: '#334155', color: '#94A3B8' },
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
  const theme = useTheme();
  const isDark = theme.base === 'dark';
  const palette = isDark ? darkColors : lightColors;
  const c = palette[color] || palette.green;
  return (
    <StyledBadge style={{ background: c.background, color: c.color }}>
      {children}
    </StyledBadge>
  );
}
