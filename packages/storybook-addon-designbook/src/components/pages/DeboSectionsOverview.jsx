import React from 'react';
import { styled } from 'storybook/theming';
import { DeboEmptyState } from '../ui/DeboEmptyState.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboNumberedList } from '../ui/DeboNumberedList.jsx';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { toSectionId } from '../utils.js';
// @ts-expect-error virtual module provided by vite-plugin-designbook-load
import sectionData from 'virtual:designbook-sections';

const SectionHeading = styled.h3(({ theme }) => ({
  fontSize: theme.typography.size.l1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  paddingBottom: 8,
  marginBottom: 16,
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

const DescriptionText = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginTop: 4,
}));

const statusBadgeColor = {
  done: 'green',
  'in-progress': 'yellow',
  planned: 'gray',
};

export function DeboSectionsOverview() {
  if (!sectionData || sectionData.length === 0) {
    return (
      <DeboPageLayout gap="8">
        <DeboEmptyState
          message="No sections found"
          command="/debo-sections"
          filePath="designbook/sections/"
        />
      </DeboPageLayout>
    );
  }

  const items = sectionData.map((section) => {
    const sectionId = section.id || toSectionId(section.title);
    const status = section.status || 'planned';

    const description = (
      <>
        {section.description && <DescriptionText>{section.description}</DescriptionText>}
        <div style={{ marginTop: 8 }}>
          <DeboBadge color={statusBadgeColor[status] || 'gray'}>{status}</DeboBadge>
        </div>
      </>
    );

    return {
      title: section.title,
      description,
      linkTo: `/docs/designbook-sections-${sectionId}--docs`,
    };
  });

  return (
    <DeboPageLayout>
      <div>
        <SectionHeading>All Sections</SectionHeading>
        <DeboNumberedList items={items} />
      </div>
      <DeboSourceFooter path="designbook/sections/" />
    </DeboPageLayout>
  );
}
