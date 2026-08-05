import React from 'react';
import { styled } from 'storybook/theming';
import { DeboLink } from './DeboLink.jsx';
import { deriveModeBadges } from '../../renderer/mode-badges.ts';
import { entityStoryGroup, formStoryName } from '../../renderer/story-address.ts';

const Section = styled.div({ marginTop: 12 });

const Label = styled.div(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: theme.textMutedColor,
  marginBottom: 6,
}));

const Row = styled.div({ display: 'flex', flexWrap: 'wrap', gap: 6 });

// Three states, distinguishable WITHOUT hover (AC 2): mapped = solid/accent,
// open = dashed + muted, orphan = warning-tinted.
const Badge = styled.span(({ theme, state, ready }) => {
  const base = {
    fontSize: 11,
    lineHeight: '16px',
    padding: '2px 8px',
    borderRadius: 8,
    border: `1px solid ${theme.appBorderColor}`,
    userSelect: 'none',
  };
  if (!ready) {
    return { ...base, color: theme.textMutedColor, opacity: 0.4, borderStyle: 'solid' };
  }
  if (state === 'mapped') {
    return {
      ...base,
      color: theme.color.lightest,
      background: theme.color.secondary,
      borderColor: theme.color.secondary,
      cursor: 'pointer',
    };
  }
  if (state === 'orphan') {
    return {
      ...base,
      color: theme.color.warningText || theme.color.dark,
      background: theme.background.warning || theme.background.hoverable,
      borderColor: theme.color.warning || theme.appBorderColor,
      cursor: 'pointer',
    };
  }
  // open
  return {
    ...base,
    color: theme.textMutedColor,
    borderStyle: 'dashed',
    opacity: 0.7,
    cursor: 'default',
  };
});

export function DeboModeBadges({ label, kind, dataModel, entityType, bundle, declared, mappingFiles, ready }) {
  const badges = deriveModeBadges(declared || [], mappingFiles || [], entityType, bundle);
  if (badges.length === 0) return null; // AC 9: no empty section

  const { title } = entityStoryGroup(dataModel, entityType, bundle);

  const stop = (e) => {
    e.stopPropagation(); // AC 8: never trigger the card-click into the detail view
  };

  return (
    <Section>
      <Label>{label}</Label>
      <Row>
        {badges.map((b) => {
          const clickable = ready && (b.state === 'mapped' || b.state === 'orphan');
          const storyName = kind === 'form' ? formStoryName(b.mode) : b.mode;
          const badge = (
            <Badge state={b.state} ready={ready} title={b.state}>
              {b.mode}
            </Badge>
          );
          if (!clickable) {
            // open badge (or not ready): render inert, but still swallow clicks
            return (
              <span key={b.mode} onClick={stop}>
                {badge}
              </span>
            );
          }
          return (
            <DeboLink
              key={b.mode}
              title={title}
              name={storyName}
              onClickCapture={stop}
              style={{ display: 'inline-flex' }}
            >
              {badge}
            </DeboLink>
          );
        })}
      </Row>
    </Section>
  );
}
