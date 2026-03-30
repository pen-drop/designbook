import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { Panel } from './components/Panel';
import { ADDON_ID, PANEL_ID, TAB_ID } from './constants';
import { startWorkflowNotifications } from './manager-notifications';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Start workflow notification polling — runs always, independent of panel state
  startWorkflowNotifications(api);

  // Register a panel (Scene Inspector — placeholder for future use)
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Designbook',
    match: () => true,
    render: ({ active }) => <Panel active={active} />,
  });

  // Visual tab — per-scene screenshots, references, compare, report
  // Registered as types.TAB to appear alongside Canvas/Docs
  // Only enabled for scene stories (stories with the 'scene' tag)
  addons.add(TAB_ID, {
    type: types.TAB,
    title: 'Visual',
    route: ({ storyId }) => `/visual/${storyId}`,
    match: ({ viewMode }) => viewMode === 'visual',
    disabled: (parameters) => !parameters?.scene,
    render: () => <div style={{ padding: 20 }}>Visual tab — coming soon</div>,
  });
});
