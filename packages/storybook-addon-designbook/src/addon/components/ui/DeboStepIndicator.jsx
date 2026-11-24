import React from 'react';
import { styled, useTheme } from 'storybook/theming';

const StepWrapper = styled.div({
  marginBottom: 24,
});

const StepHeader = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginBottom: 12,
});

/* statusCircleStyles are resolved per-render via theme — see DeboStepIndicator */

const StepCircle = styled.div({
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 600,
  flexShrink: 0,
});

const StepTitle = styled.h3(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  margin: 0,
}));

const CompleteBadge = styled.span(({ theme }) => ({
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 600,
  lineHeight: '15px',
  padding: '2px 8px',
  borderRadius: 9999,
  background: `${theme.color.positive}26`,
  color: theme.color.positive,
}));

const StepContent = styled.div({
  paddingLeft: 40,
});

export function DeboStepIndicator({ step, title, status, children }) {
  const theme = useTheme();
  const statusCircleStyles = {
    completed: { background: `${theme.color.positive}26`, color: theme.color.positive },
    current: { background: theme.color.secondary, color: theme.background.content, boxShadow: '0 1px 3px rgba(0,0,0,0.15)' },
    upcoming: { background: theme.appBorderColor, color: theme.textMutedColor },
  };
  const circleStyle = statusCircleStyles[status] || statusCircleStyles.upcoming;
  return (
    <StepWrapper>
      <StepHeader>
        <StepCircle style={circleStyle}>
          {status === 'completed' ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : status === 'current' ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          ) : (
            step
          )}
        </StepCircle>
        <StepTitle>{title}</StepTitle>
        {status === 'completed' && <CompleteBadge>Complete</CompleteBadge>}
      </StepHeader>
      <StepContent>{children}</StepContent>
    </StepWrapper>
  );
}

export function DeboStepIndicatorGroup({ steps }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {steps.map((stepData, index) => (
        <DeboStepIndicator
          key={stepData.step}
          step={stepData.step}
          title={stepData.title}
          status={stepData.status}
          isLast={index === steps.length - 1}
        >
          {stepData.content}
        </DeboStepIndicator>
      ))}
    </div>
  );
}
