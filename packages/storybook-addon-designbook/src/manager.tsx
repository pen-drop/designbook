import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { DeboOnboardingGuide } from './components/ui/DeboOnboardingGuide';
import { Panel } from './components/Panel';
import { Tool } from './components/Tool';
import { ADDON_ID, PANEL_ID, TOOL_ID } from './constants';
import { startWorkflowNotifications } from './manager-notifications';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Start workflow notification polling — runs always, independent of panel state
  startWorkflowNotifications(api);

  // Register a tool
  addons.add(TOOL_ID, {
    type: types.TOOL,
    title: 'Designbook',
    match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
    render: () => <Tool api={api} />,
  });

  // Onboarding guide — always visible in toolbar
  addons.add(`${ADDON_ID}/onboarding`, {
    type: types.TOOLEXTRA,
    title: 'Designbook Onboarding',
    match: () => true,
    render: () => <DeboOnboardingGuide />,
  });

  // Register a panel (Scene Inspector — placeholder for future use)
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Designbook',
    match: () => true,
    render: ({ active }) => <Panel active={active} />,
  });
});
