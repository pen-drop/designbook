import React from 'react';
import { styled } from 'storybook/theming';
import { DeboBadge } from './DeboBadge.jsx';

const CardWrapper = styled.div(({ theme }) => ({
  background: theme.background?.content || theme.background?.app,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 14,
  boxShadow: '0px 2px 8px -4px rgba(0,0,0,0.05)',
  padding: 20,
}));

const CardHeader = styled.div({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 12,
});

const CardTitle = styled.h3(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: 18,
  fontWeight: theme.typography.weight.bold,
  lineHeight: '28px',
  letterSpacing: '-0.44px',
  color: theme.color.defaultText,
  margin: 0,
}));

const CardDescription = styled.p(({ theme }) => ({
  marginTop: 12,
  fontFamily: theme.typography.fonts.base,
  fontSize: 15,
  fontWeight: 400,
  lineHeight: 1.625,
  color: theme.color.mediumdark,
}));

const CardDivider = styled.div(({ theme }) => ({
  borderTop: `1px solid ${theme.appBorderColor}`,
  marginTop: 20,
  marginBottom: 12,
  opacity: 0.5,
}));

const CardMeta = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
});

const MetaTag = styled.span(({ theme }) => ({
  background: theme.background?.hoverable || theme.background?.app,
  border: `1px solid ${theme.appBorderColor}`,
  color: theme.color.mediumdark,
  fontSize: 11,
  lineHeight: '16.5px',
  padding: '2px 8px',
  borderRadius: 8,
}));

const MetaTagMono = styled(MetaTag)(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
}));

export function DeboCard({ title, badge, badgeColor = 'red', description, entityPath, fieldCount, children }) {
  const hasFooter = entityPath || fieldCount != null;
  return (
    <CardWrapper>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {badge && <DeboBadge color={badgeColor}>{badge}</DeboBadge>}
      </CardHeader>
      {description && <CardDescription>{description}</CardDescription>}
      {hasFooter && (
        <>
          <CardDivider />
          <CardMeta>
            {entityPath && <MetaTagMono>{entityPath}</MetaTagMono>}
            {fieldCount != null && <MetaTag>{fieldCount} Fields</MetaTag>}
          </CardMeta>
        </>
      )}
      {children}
    </CardWrapper>
  );
}
