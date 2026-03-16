import { DeboFoundationPage } from 'storybook-addon-designbook/dist/components/pages/DeboFoundationPage.jsx';
import { mountReact } from './mount-react.js';

export default {
  title: 'Designbook/Foundation',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    designbook: { order: 0 },
  },
};

export const Foundation = {
  render: () => mountReact(DeboFoundationPage),
};
