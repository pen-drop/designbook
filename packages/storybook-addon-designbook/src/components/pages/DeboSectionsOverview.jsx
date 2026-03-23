import React from 'react';
import { styled } from 'storybook/theming';
import { DeboEmptyState } from '../ui/DeboEmptyState.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboNumberedList } from '../ui/DeboNumberedList.jsx';
import { DeboLoading } from '../ui/DeboLoading.jsx';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { useSections } from '../../hooks/useSections.js';

const SectionHeading = styled.h3(({ theme }) => ({
  fontSize: theme.typography.size.l1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  paddingBottom: 8,
  marginBottom: 16,
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

export function DeboSectionsOverview() {
  const { sections, loading } = useSections();

  if (loading) {
    return (
      <DeboPageLayout gap="8">
        <SectionHeading>Sections</SectionHeading>
        <DeboLoading />
      </DeboPageLayout>
    );
  }

  if (!sections || sections.length === 0) {
    return (
      <DeboPageLayout gap="8">
        <SectionHeading>Sections</SectionHeading>
        <DeboEmptyState
          message="No sections found"
          command="/debo-sections"
          filePath="designbook/sections/"
        />
      </DeboPageLayout>
    );
  }

  const items = sections.map((section) => ({
    title: section.title,
    description: (
      <div style={{ marginTop: 4 }}>
        <DeboBadge color={section.hasScenes ? 'green' : 'gray'}>
          {section.hasScenes ? 'has scenes' : 'no scenes'}
        </DeboBadge>
      </div>
    ),
    storyTitle: `Designbook/Sections/${section.title}`,
    storyName: 'Overview',
  }));

  return (
    <DeboPageLayout>
      <div>
        <SectionHeading>Sections</SectionHeading>
        <DeboNumberedList items={items} />
      </div>
      <DeboSourceFooter path="designbook/sections/" />
    </DeboPageLayout>
  );
}
