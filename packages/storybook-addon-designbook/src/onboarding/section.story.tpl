import React from 'react';
import { DeboSectionDetailPage } from 'storybook-addon-designbook/dist/components/DeboSectionDetailPage.jsx';

function SectionPage() {
  return React.createElement(DeboSectionDetailPage, {
    sectionId: '__SECTION_ID__',
    title: '__SECTION_TITLE__',
  });
}

export default {
  title: 'Sections/__SECTION_TITLE__',
  tags: ['autodocs', 'docs-only'],
  parameters: {
    docsOnly: true,
    layout: 'fullscreen',
    docs: {
      page: SectionPage,
    },
  },
};

export const __EXPORT_NAME__ = {};
