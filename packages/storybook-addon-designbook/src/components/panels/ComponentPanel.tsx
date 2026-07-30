/**
 * ComponentPanel — detail view for component scene nodes.
 *
 * Shows the composition tree with props and slot details for direct component scenes.
 */
import React, { useState, useCallback } from 'react';
import type { SceneTreeNode } from '../../renderer/types';
import { CompositionTree } from '../CompositionTree';
import { MappingDetail } from '../MappingDetail';

interface ComponentPanelProps {
  tree: SceneTreeNode[];
  hoveredPath?: string | null;
  selectedPath?: string | null;
}

const S = {
  container: {
    height: '100%',
    overflow: 'auto',
  } as React.CSSProperties,
};

export function ComponentPanel({ tree, hoveredPath, selectedPath }: ComponentPanelProps) {
  const [selectedNode, setSelectedNode] = useState<SceneTreeNode | null>(null);

  const handleSelect = useCallback((node: SceneTreeNode) => {
    setSelectedNode(node);
  }, []);

  if (selectedNode) {
    return (
      <div style={S.container}>
        <MappingDetail node={selectedNode} onBack={() => setSelectedNode(null)} />
      </div>
    );
  }

  return (
    <div style={S.container}>
      <CompositionTree tree={tree} onSelectNode={handleSelect} hoveredPath={hoveredPath} selectedPath={selectedPath} />
    </div>
  );
}
