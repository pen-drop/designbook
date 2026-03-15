import React from 'react';
import { DeboFoundationPage } from 'storybook-addon-designbook/dist/components/pages/DeboFoundationPage.jsx';

const DocsPage = () => React.createElement(DeboFoundationPage);

export default {
  title: 'Designbook/Foundation',
  tags: ['!dev'],
  parameters: {
    layout: 'fullscreen',
    docs: { page: DocsPage },
    designbook: { order: 0 },
  },
};

export const Foundation = {
  render: () => '',
};
