import { DeboReferencesOverview } from '../components/pages/DeboReferencesOverview.jsx';
import { mountReact } from './mount-react.js';

export default {
  title: 'Designbook/References',
  tags: ['!autodocs'],
  parameters: {
    layout: 'fullscreen',
    designbook: { order: 3 },
  },
};

export const Overview = {
  render: () => mountReact(DeboReferencesOverview),
};
