/**
 * StructureSplitView — shared two-pane layout for the Structure tab.
 *
 * Composition tree on the left, node detail on the right — the single layout
 * used for every scene kind (component, scene-ref, entity) so the Structure tab
 * behaves identically everywhere. Clicking a tree row selects the node shown in
 * the detail pane; the tree stays visible. Inline styles only (manager-styling
 * rule).
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from 'storybook/theming';
import type { SceneTreeNode } from '../../renderer/types';
import { CompositionTree } from '../CompositionTree';

interface StructureSplitViewProps {
  tree: SceneTreeNode[];
  hoveredPath?: string | null;
  selectedPath?: string | null;
  /** Header label for the right-hand detail pane. */
  detailHeader: string;
  /** Shown in the detail pane while no tree node is selected. */
  emptyHint: string;
  /** Render the detail pane for the selected node. */
  renderDetail: (node: SceneTreeNode) => React.ReactNode;
}

function useStyles() {
  const theme = useTheme();
  return useMemo(
    () => ({
      container: {
        display: 'flex',
        height: '100%',
      } as React.CSSProperties,
      treePane: {
        width: '40%',
        minWidth: 200,
        borderRight: `1px solid ${theme.appBorderColor}`,
        overflow: 'auto',
      } as React.CSSProperties,
      detailPane: {
        flex: 1,
        overflow: 'auto',
      } as React.CSSProperties,
      header: {
        padding: '8px 12px',
        fontSize: 11,
        fontWeight: 600,
        color: theme.textMutedColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${theme.appBorderColor}`,
      } as React.CSSProperties,
      hint: {
        padding: 16,
        fontSize: 12,
        color: theme.textMutedColor,
      } as React.CSSProperties,
    }),
    [theme],
  );
}

export function StructureSplitView({
  tree,
  hoveredPath,
  selectedPath,
  detailHeader,
  emptyHint,
  renderDetail,
}: StructureSplitViewProps) {
  const S = useStyles();
  const [selectedNode, setSelectedNode] = useState<SceneTreeNode | null>(null);

  const handleSelect = useCallback((node: SceneTreeNode) => {
    setSelectedNode(node);
  }, []);

  // A detail is always shown: the clicked node, else the first root node. The
  // hint only appears when the tree is empty. Keeps every panel consistent.
  const activeNode = selectedNode ?? tree[0] ?? null;

  return (
    <div style={S.container}>
      <div style={S.treePane}>
        <div style={S.header}>Composition</div>
        <CompositionTree
          tree={tree}
          onSelectNode={handleSelect}
          hoveredPath={hoveredPath}
          selectedPath={selectedPath}
        />
      </div>
      <div style={S.detailPane}>
        <div style={S.header}>{detailHeader}</div>
        {activeNode ? renderDetail(activeNode) : <div style={S.hint}>{emptyHint}</div>}
      </div>
    </div>
  );
}
