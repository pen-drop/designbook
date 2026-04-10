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
  highlightedPath?: string | null;
}

const S = {
  container: {
    height: '100%',
    overflow: 'auto',
  } as React.CSSProperties,
};

export function ComponentPanel({ tree, highlightedPath }: ComponentPanelProps) {
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
      <CompositionTree tree={tree} onSelectNode={handleSelect} highlightedPath={highlightedPath} />
    </div>
  );
}
