import React from 'react';
import { createRoot } from 'react-dom/client';
import { DeboSectionDetailPage } from 'storybook-addon-designbook/dist/components/DeboSectionDetailPage.jsx';

function SectionPage() {
  return React.createElement(DeboSectionDetailPage, {
    sectionId: '__SECTION_ID__',
    title: '__SECTION_TITLE__',
  });
}

export default {
  title: 'Sections/__SECTION_TITLE__',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export const __EXPORT_NAME__ = {
  render: () => {
    const container = document.createElement('div');
    createRoot(container).render(React.createElement(SectionPage));
    return container;
  },
};
