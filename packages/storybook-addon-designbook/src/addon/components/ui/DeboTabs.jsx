import React from 'react';
import { TabsView } from 'storybook/internal/components';
import { useUrlState } from '../../hooks/useUrlState.js';

/**
 * DeboTabs — TabsView with URL-synced selection.
 *
 * Persists the selected tab in `debo-tab` query param. Validates the URL value
 * against the actual tab IDs — falls back to the first tab if unknown.
 */
export function DeboTabs({ tabs, onSelectionChange, ...rest }) {
  const tabIds = tabs.map((t) => t.id);
  const [rawTab, setRawTab] = useUrlState('debo-tab', tabIds[0]);
  const tab = tabIds.includes(rawTab) ? rawTab : tabIds[0];

  return (
    <TabsView
      {...rest}
      selected={tab}
      onSelectionChange={(id) => {
        setRawTab(id);
        onSelectionChange?.(id);
      }}
      tabs={tabs}
    />
  );
}
