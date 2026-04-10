import React, { useState, useEffect, useCallback } from 'react';
import { useParameter, useChannel } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import type { SceneTreeNode } from '../../renderer/types';
import { EntityPanel } from './EntityPanel';
import { ComponentPanel } from './ComponentPanel';
import { SceneRefPanel } from './SceneRefPanel';
import { EVENTS } from '../../constants';

interface StructurePanelProps {
  active?: boolean;
}

/** Determine the dominant scene type from the root nodes. */
function detectSceneType(tree: SceneTreeNode[]): SceneTreeNode['kind'] {
  if (!tree.length) return 'component';
  // Use the kind of the first root node
  return tree[0]!.kind;
}

export function StructurePanel({ active }: StructurePanelProps) {
  const sceneTree = useParameter<SceneTreeNode[] | undefined>('sceneTree');
  const [highlightedPath, setHighlightedPath] = useState<string | null>(null);

  const handleSelectNode = useCallback((data: { component: string; path?: string }) => {
    setHighlightedPath(data.path ?? data.component);
  }, []);

  useChannel({
    [EVENTS.SELECT_NODE]: handleSelectNode,
  });

  useEffect(() => {
    setHighlightedPath(null);
  }, [sceneTree]);

  const empty = (
    <div style={{ padding: 16, fontSize: 13, color: 'var(--textMutedColor, #9ca3af)' }}>
      No scene structure available for this story.
    </div>
  );

  if (!sceneTree?.length) {
    return <AddonPanel active={active ?? false}>{empty}</AddonPanel>;
  }

  const sceneType = detectSceneType(sceneTree);

  return (
    <AddonPanel active={active ?? false}>
      {sceneType === 'entity' ? (
        <EntityPanel tree={sceneTree} highlightedPath={highlightedPath} />
      ) : sceneType === 'scene-ref' ? (
        <SceneRefPanel tree={sceneTree} highlightedPath={highlightedPath} />
      ) : (
        <ComponentPanel tree={sceneTree} highlightedPath={highlightedPath} />
      )}
    </AddonPanel>
  );
}
