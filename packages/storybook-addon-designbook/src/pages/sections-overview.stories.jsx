import React from 'react';
import { DeboSectionsOverview } from 'storybook-addon-designbook/dist/components/pages/DeboSectionsOverview.jsx';

const DocsPage = () => React.createElement(DeboSectionsOverview);

export default {
  title: 'Designbook/Sections/Overview',
  tags: ['!dev'],
  parameters: {
    layout: 'fullscreen',
    docs: { page: DocsPage },
    designbook: { order: 2 },
  },
};

export const SectionsOverview = {
  render: () => '',
};
