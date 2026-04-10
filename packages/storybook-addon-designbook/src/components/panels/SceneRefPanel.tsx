/**
 * SceneRefPanel — detail view for scene-ref nodes.
 *
 * Shows the composition tree with resolved scene references, variables, and inlined children.
 */
import React, { useState, useCallback } from 'react';
import type { SceneTreeNode } from '../../renderer/types';
import { CompositionTree } from '../CompositionTree';
import { MappingDetail } from '../MappingDetail';

interface SceneRefPanelProps {
  tree: SceneTreeNode[];
  highlightedPath?: string | null;
}

const S = {
  container: {
    height: '100%',
    overflow: 'auto',
  } as React.CSSProperties,
};

export function SceneRefPanel({ tree, highlightedPath }: SceneRefPanelProps) {
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
