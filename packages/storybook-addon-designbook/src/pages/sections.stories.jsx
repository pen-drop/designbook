import { DeboSectionsOverview } from 'storybook-addon-designbook/dist/components/pages/DeboSectionsOverview.jsx';
import { mountReact } from './mount-react.js';

export default {
  title: 'Designbook/Sections',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    designbook: { order: 2 },
  },
};

export const Sections = {
  render: () => mountReact(DeboSectionsOverview),
};
