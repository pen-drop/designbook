import React from 'react';
import { Collapsible } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

const CollapsibleWrapper = styled.div(({ theme }) => ({
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 16,
  boxShadow: '0px 2px 12px -6px rgba(0,0,0,0.05)',
  overflow: 'hidden',
}));

const SummaryContent = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.l1,
  fontWeight: theme.typography.weight.bold,
  lineHeight: '28px',
  letterSpacing: '-0.44px',
  color: theme.color.defaultText,
}));

const CountBadge = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  background: theme.background?.hoverable || 'rgba(148,163,184,0.2)',
  color: theme.color.mediumdark,
  fontSize: theme.typography.size.s1,
  fontWeight: 600,
  lineHeight: '16px',
  borderRadius: 9999,
  padding: '2px 8px',
  marginLeft: 12,
  display: 'inline-flex',
  alignItems: 'center',
}));

const ContentInner = styled.div(({ theme }) => ({
  borderTop: `1px solid ${theme.appBorderColor}`,
  padding: 20,
}));

export function DeboCollapsible({ title, count, defaultOpen = false, children }) {
  const summary = (
    <SummaryContent>
      {title}
      {count != null && <CountBadge>{count}</CountBadge>}
    </SummaryContent>
  );

  return (
    <CollapsibleWrapper>
      <Collapsible summary={summary} initialCollapsed={!defaultOpen}>
        <ContentInner>{children}</ContentInner>
      </Collapsible>
    </CollapsibleWrapper>
  );
}
