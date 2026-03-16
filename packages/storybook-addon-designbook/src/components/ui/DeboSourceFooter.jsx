import React from 'react';
import { styled } from 'storybook/theming';

const FooterWrapper = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  borderTop: `1px solid ${theme.appBorderColor}`,
  paddingTop: 12,
  marginTop: 8,
}));

const InfoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 11" fill="none" style={{ width: 11, height: 11, flexShrink: 0 }}>
    <circle cx="5.5" cy="5.5" r="4.9" stroke="#90A1B9" strokeWidth="1.08" />
    <line x1="5.5" y1="4.9" x2="5.5" y2="7.5" stroke="#90A1B9" strokeWidth="1.08" strokeLinecap="round" />
    <circle cx="5.5" cy="3.6" r="0.55" fill="#90A1B9" />
  </svg>
);

const HintRow = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
});

const HintText = styled.span(({ theme }) => ({
  fontSize: 13,
  lineHeight: 1.5,
  color: theme.color.mediumdark,
}));

const CodeTag = styled.code(({ theme }) => ({
  background: theme.background?.hoverable || '#F8FAFC',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 4,
  padding: '2px 6px',
  fontFamily: theme.typography.fonts.mono,
  fontSize: 12,
}));

const SourceText = styled.p(({ theme }) => ({
  fontSize: 14,
  lineHeight: 1.5,
  color: theme.color.mediumdark,
  margin: 0,
}));

const RefreshButton = styled.button(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  borderRadius: 10,
  padding: '6px 12px',
  color: theme.color.defaultText,
  fontSize: 16,
  fontWeight: 500,
  lineHeight: 1.5,
  flexShrink: 0,
  cursor: 'pointer',
  '&:hover': {
    background: theme.background?.hoverable || '#F8FAFC',
  },
}));

const RefreshIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" fill="none" style={{ width: 14, height: 14 }}>
    <path d="M1.75 7A5.25 5.25 0 0 1 10.5 2.625L12.25 1.75v3.5H8.75" stroke="#90A1B9" strokeWidth="1.17" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12.25 7A5.25 5.25 0 0 1 3.5 11.375L1.75 12.25v-3.5H5.25" stroke="#90A1B9" strokeWidth="1.17" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function DeboSourceFooter({ path, command, onReload }) {
  return (
    <FooterWrapper>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {command && (
          <HintRow>
            <InfoIcon />
            <HintText>Run <CodeTag>{command}</CodeTag> to update</HintText>
          </HintRow>
        )}
        <SourceText>Source: <CodeTag>{path}</CodeTag></SourceText>
      </div>
      {onReload && (
        <RefreshButton onClick={onReload}>
          <RefreshIcon />
          Refresh
        </RefreshButton>
      )}
    </FooterWrapper>
  );
}
