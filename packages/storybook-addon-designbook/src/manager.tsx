import React from 'react';
import { addons, types } from 'storybook/manager-api';

import { Panel } from './components/Panel';
import { VisualCompareTool } from './components/VisualCompareTool';
import { InspectTool } from './components/InspectTool';
import { StructurePanel } from './components/StructurePanel';
import { ADDON_ID, PANEL_ID, TAB_ID, INSPECT_TOOL_ID, STRUCTURE_PANEL_ID, VISUAL_TOOL_ID } from './constants';
import { startWorkflowNotifications } from './manager-notifications';

// Register the addon
addons.register(ADDON_ID, (api) => {
  // Start workflow notification polling — runs always, independent of panel state
  startWorkflowNotifications(api);

  // Register a panel (Designbook workflow panel)
  addons.add(PANEL_ID, {
    type: types.PANEL,
    title: 'Designbook',
    match: () => true,
    render: ({ active }) => <Panel active={active} />,
  });

  // Visual Compare toolbar tool — overlay reference screenshots on scenes
  addons.add(VISUAL_TOOL_ID, {
    type: types.TOOL,
    title: 'Visual Compare',
    render: () => <VisualCompareTool />,
  });

  // Inspect toolbar button — toggles scene structure overlay
  addons.add(INSPECT_TOOL_ID, {
    type: types.TOOL,
    title: 'Inspect Structure',
    render: () => <InspectTool />,
  });

  // Structure panel — composition tree + mapping detail
  addons.add(STRUCTURE_PANEL_ID, {
    type: types.PANEL,
    title: 'Structure',
    disabled: (parameters) => !parameters?.scene,
    render: ({ active }) => <StructurePanel active={active} />,
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
