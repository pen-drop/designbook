/**
 * CompositionTree — scene structure tree built on DeboTree.
 *
 * Supplies the (React) icon map and delegates the SceneTreeNode → DeboTreeItem
 * conversion to the pure `toTreeItems` helper, then renders via DeboTree.
 */
import React, { useMemo } from 'react';
import { useTheme } from 'storybook/theming';
import { DatabaseIcon, ShareIcon, ComponentIcon, MarkupIcon } from '@storybook/icons';
import type { SceneTreeNode } from '../renderer/types';
import { DeboTree } from './ui/DeboTree';
import type { DeboTreeItem } from './ui/DeboTree';
import { toTreeItems, type KindIcons } from './composition-tree';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompositionTreeProps {
  tree: SceneTreeNode[];
  onSelectNode: (node: SceneTreeNode) => void;
  /** Transiently hovered node path (from preview hover). */
  hoveredPath?: string | null;
  /** Persistently selected node path (from preview click). */
  selectedPath?: string | null;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function useKindIcons(): KindIcons {
  const theme = useTheme();
  return useMemo(
    () => ({
      entity: <DatabaseIcon style={{ color: theme.color.secondary }} />,
      'scene-ref': <ShareIcon style={{ color: theme.color.positive }} />,
      component: <ComponentIcon style={{ color: theme.textMutedColor }} />,
      string: <MarkupIcon style={{ color: theme.textMutedColor }} />,
    }),
    [theme],
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompositionTree({ tree, onSelectNode, hoveredPath, selectedPath }: CompositionTreeProps) {
  const kindIcons = useKindIcons();
  const items = toTreeItems(tree, '', kindIcons);

  const handleSelect = (item: DeboTreeItem) => {
    if (item.data) {
      onSelectNode(item.data as SceneTreeNode);
    }
  };

  return (
    <DeboTree
      items={items}
      onSelect={handleSelect}
      hoveredId={hoveredPath}
      selectedId={selectedPath}
      emptyText="No scene structure available."
    />
  );
}
