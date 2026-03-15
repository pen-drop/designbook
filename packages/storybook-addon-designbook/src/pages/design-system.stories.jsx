import React from 'react';
import { DeboDesignSystemPage } from 'storybook-addon-designbook/dist/components/pages/DeboDesignSystemPage.jsx';

const DocsPage = () => React.createElement(DeboDesignSystemPage);

export default {
  title: 'Designbook/Design System',
  tags: ['!dev'],
  parameters: {
    layout: 'fullscreen',
    docs: { page: DocsPage },
    designbook: { order: 1 },
  },
};

export const DesignSystem = {
  render: () => '',
};
