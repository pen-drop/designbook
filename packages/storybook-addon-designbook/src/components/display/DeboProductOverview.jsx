import React from 'react';
import { styled } from 'storybook/theming';
import { DeboSection } from '../DeboSection.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { parseProductSections } from '../parsers.js';

const SectionList = styled.div({
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  paddingTop: 24,
});

const Prose = styled.div(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
  lineHeight: 1.6,
  color: theme.color.defaultText,
  '& h1, & h2, & h3, & h4': {
    fontWeight: 400,
    marginTop: '1em',
    marginBottom: '0.5em',
  },
  '& p': {
    marginTop: '0.5em',
    marginBottom: '0.5em',
  },
  '& ul, & ol': {
    paddingLeft: '1.5em',
  },
  '& a': {
    color: '#3B82F6',
    textDecoration: 'underline',
  },
  '& code': {
    fontFamily: theme.typography.fonts.mono,
    fontSize: '0.9em',
    background: theme.background?.hoverable || '#F1F5F9',
    padding: '2px 4px',
    borderRadius: 3,
  },
}));

export function DeboProductOverview() {
  return (
    <DeboSection
      title="Product Overview"
      dataPath="product/vision.md"
      parser={parseProductSections}
      command="/debo-vision"
      emptyMessage="No product vision defined yet"
      renderContent={(sections) => (
        <SectionList>
          {sections.map((section, i) => (
            <DeboCollapsible key={section.title} title={section.title} defaultOpen={i === 0}>
              <Prose dangerouslySetInnerHTML={{ __html: section.html }} />
            </DeboCollapsible>
          ))}
        </SectionList>
      )}
    />
  );
}
