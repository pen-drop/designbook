/**
 * CompositionTree — scene structure tree built on DeboTree.
 *
 * Converts SceneTreeNode[] into DeboTreeItem[] and delegates rendering
 * to the generic DeboTree component.
 */
import React from 'react';
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

const KIND_ICONS: Record<string, React.ReactNode> = {
  entity: <DatabaseIcon style={{ color: '#3b82f6' }} />,
  'scene-ref': <ShareIcon style={{ color: '#22c55e' }} />,
  component: <ComponentIcon style={{ color: 'var(--textMutedColor, #9ca3af)' }} />,
  string: <MarkupIcon style={{ color: 'var(--textMutedColor, #9ca3af)' }} />,
};

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

function toTreeItems(nodes: SceneTreeNode[], parentPath: string): DeboTreeItem[] {
  return nodes.map((node, i) => {
    const path = parentPath;

    const children = node.children ? toTreeItems(node.children, path) : undefined;

    const groups: Record<string, DeboTreeItem[]> | undefined = node.slots
      ? Object.fromEntries(
          Object.entries(node.slots)
            .map(([slotName, slotChildren]) => {
              const visible = slotChildren.filter((c) => c.kind !== 'string');
              const slotPath = path ? `${path}.${slotName}` : slotName;
              return [`slot: ${slotName}`, toTreeItems(visible, slotPath)] as const;
            })
            .filter(([, items]) => items.length > 0),
        )
      : undefined;

    return {
      id: path || `root-${i}`,
      label: nodeLabel(node),
      icon: KIND_ICONS[node.kind] ?? <ComponentIcon />,
      children,
      groups: groups && Object.keys(groups).length > 0 ? groups : undefined,
      data: node,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CompositionTree({ tree, onSelectNode, highlightedPath }: CompositionTreeProps) {
  const items = toTreeItems(tree, '');

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
