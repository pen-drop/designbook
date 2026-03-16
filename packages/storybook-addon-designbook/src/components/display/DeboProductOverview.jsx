import React from 'react';
import { DeboSection } from '../DeboSection.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboProse } from '../ui/DeboTypography.jsx';
import { DeboSectionList } from '../ui/DeboPageLayout.jsx';
import { parseProductSections } from '../parsers.js';

export function DeboProductOverview() {
  return (
    <DeboSection
      title="Vision"
      dataPath="product/vision.md"
      parser={parseProductSections}
      command="/debo-vision"
      emptyMessage="No vision defined yet"
      renderContent={(sections) => (
        <DeboSectionList>
          {sections.map((section, i) => (
            <DeboCollapsible key={section.title} title={section.title} defaultOpen={i === 0}>
              <DeboProse html={section.html} />
            </DeboCollapsible>
          ))}
        </DeboSectionList>
      )}
    />
  );
}
