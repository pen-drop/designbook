import React, { useState, useEffect, useCallback } from 'react';
import { useParameter, useChannel } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import type { SceneTreeNode } from '../renderer/types';
import { CompositionTree } from './CompositionTree';
import { MappingDetail } from './MappingDetail';
import { EVENTS } from '../constants';

interface StructurePanelProps {
  active?: boolean;
}

export function StructurePanel({ active }: StructurePanelProps) {
  const sceneTree = useParameter<SceneTreeNode[] | undefined>('sceneTree');
  const [selectedNode, setSelectedNode] = useState<SceneTreeNode | null>(null);

  // Listen for select-node events from the canvas overlay (index-based)
  const handleSelectNode = useCallback(
    (data: { index: number }) => {
      if (sceneTree?.[data.index]) setSelectedNode(sceneTree[data.index]!);
    },
    [sceneTree],
  );

  useChannel({
    [EVENTS.SELECT_NODE]: handleSelectNode,
  });

  // Reset selection when story changes
  useEffect(() => {
    setSelectedNode(null);
  }, [sceneTree]);

  return (
    <AddonPanel active={active ?? false}>
      {!sceneTree?.length ? (
        <div style={{ padding: 16, fontSize: 13, color: 'var(--textMutedColor, #9ca3af)' }}>
          No scene structure available for this story.
        </div>
      ) : selectedNode ? (
        <MappingDetail node={selectedNode} onBack={() => setSelectedNode(null)} />
      ) : (
        <CompositionTree tree={sceneTree} onSelectNode={setSelectedNode} />
      )}
    </AddonPanel>
  );
}
