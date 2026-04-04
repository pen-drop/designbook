import React, { useState, useEffect, useCallback } from 'react';
import { useParameter, useChannel } from 'storybook/manager-api';
import type { SceneTreeNode } from '../renderer/types';
import { CompositionTree } from './CompositionTree';
import { MappingDetail } from './MappingDetail';
import { EVENTS } from '../constants';

interface StructurePanelProps {
  active?: boolean;
}

export function StructurePanel({ active }: StructurePanelProps) {
  const sceneTree = useParameter<SceneTreeNode[] | undefined>('sceneTree');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Listen for select-node events from the canvas overlay
  const handleSelectNode = useCallback((data: { index: number }) => {
    setSelectedIndex(data.index);
  }, []);

  useChannel({
    [EVENTS.SELECT_NODE]: handleSelectNode,
  });

  // Reset selection when story changes
  useEffect(() => {
    setSelectedIndex(null);
  }, [sceneTree]);

  if (!active) return null;

  if (!sceneTree?.length) {
    return (
      <div
        style={{
          padding: 16,
          fontFamily: 'Inter, sans-serif',
          fontSize: 13,
          color: '#9ca3af',
        }}
      >
        No scene structure available for this story.
      </div>
    );
  }

  const selectedNode = selectedIndex !== null ? sceneTree[selectedIndex] : null;

  if (selectedNode) {
    return <MappingDetail node={selectedNode} onBack={() => setSelectedIndex(null)} />;
  }

  return <CompositionTree tree={sceneTree} selectedIndex={selectedIndex} onSelectNode={setSelectedIndex} />;
}
