import React from 'react';
import { styled } from 'storybook/theming';

const typeColors = {
  info: { background: '#EFF6FF', border: '#BFDBFE', color: '#1E40AF' },
  success: { background: '#F0FDF4', border: '#BBF7D0', color: '#166534' },
  warning: { background: '#FFFBEB', border: '#FDE68A', color: '#92400E' },
  error: { background: '#FEF2F2', border: '#FECACA', color: '#991B1B' },
};

const AlertBox = styled.div(({ theme }) => ({
  padding: '12px 16px',
  borderRadius: 8,
  fontSize: theme.typography.size.s2,
  fontFamily: theme.typography.fonts.base,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.background.content,
  color: theme.color.defaultText,
}));

export function DeboAlert({ type, children }) {
  const c = type ? typeColors[type] : null;
  const style = c ? { background: c.background, borderColor: c.border, color: c.color } : {};
  return (
    <AlertBox role="alert" style={style}>
      {children}
    </AlertBox>
  );
}
