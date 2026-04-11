/**
 * CompositionTree — scene structure tree built on DeboTree.
 *
 * Converts SceneTreeNode[] into DeboTreeItem[] and delegates rendering
 * to the generic DeboTree component.
 */
import React, { useMemo } from 'react';
import { useTheme } from 'storybook/theming';
import { DatabaseIcon, ShareIcon, ComponentIcon, MarkupIcon } from '@storybook/icons';
import type { SceneTreeNode } from '../renderer/types';
import { DeboTree } from './ui/DeboTree';
import type { DeboTreeItem } from './ui/DeboTree';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompositionTreeProps {
  tree: SceneTreeNode[];
  onSelectNode: (node: SceneTreeNode) => void;
  highlightedPath?: string | null;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function useKindIcons(): Record<string, React.ReactNode> {
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

// ─── Conversion ───────────────────────────────────────────────────────────────

function nodeLabel(node: SceneTreeNode): string {
  switch (node.kind) {
    case 'entity':
      return `${node.entity?.entity_type}/${node.entity?.bundle} (${node.entity?.view_mode})`;
    case 'scene-ref':
      return node.ref?.source ?? 'scene-ref';
    case 'component':
      return node.component ?? 'component';
    case 'string':
      return `"${node.value}"`;
  }
}

function toTreeItems(
  nodes: SceneTreeNode[],
  parentPath: string,
  kindIcons: Record<string, React.ReactNode>,
): DeboTreeItem[] {
  return nodes.map((node, i) => {
    const path = parentPath;

    const children = node.children ? toTreeItems(node.children, path, kindIcons) : undefined;

    const groups: Record<string, DeboTreeItem[]> | undefined = node.slots
      ? Object.fromEntries(
          Object.entries(node.slots)
            .map(([slotName, slotChildren]) => {
              const visible = slotChildren.filter((c) => c.kind !== 'string');
              const slotPath = path ? `${path}.${slotName}` : slotName;
              return [`slot: ${slotName}`, toTreeItems(visible, slotPath, kindIcons)] as const;
            })
            .filter(([, items]) => items.length > 0),
        )
      : undefined;

    return {
      id: path || `root-${i}`,
      label: nodeLabel(node),
      icon: kindIcons[node.kind] ?? <ComponentIcon />,
      children,
      groups: groups && Object.keys(groups).length > 0 ? groups : undefined,
      data: node,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompositionTree({ tree, onSelectNode, highlightedPath }: CompositionTreeProps) {
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
      highlightedId={highlightedPath}
      emptyText="No scene structure available."
    />
  );
}
