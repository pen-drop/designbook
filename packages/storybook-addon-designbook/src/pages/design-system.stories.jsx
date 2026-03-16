import { DeboDesignSystemPage } from 'storybook-addon-designbook/dist/components/pages/DeboDesignSystemPage.jsx';
import { mountReact } from './mount-react.js';

export default {
  title: 'Designbook/Design System',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    designbook: { order: 1 },
  },
};

export const DesignSystem = {
  render: () => mountReact(DeboDesignSystemPage),
};
