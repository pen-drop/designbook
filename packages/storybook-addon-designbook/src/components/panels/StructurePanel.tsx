import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'storybook/theming';
import { useParameter, useChannel, useArgs } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import type { SceneTreeNode } from '../../renderer/types';
import { EntityPanel } from './EntityPanel';
import { ComponentPanel } from './ComponentPanel';
import { SceneRefPanel } from './SceneRefPanel';
import { EVENTS } from '../../constants';

interface StructurePanelProps {
  active?: boolean;
}

/** Payload emitted by the inspect overlay for hover/select events. */
interface NodePayload {
  component: string | null;
  path: string | null;
}

/** Determine the dominant scene type from the root nodes. */
function detectSceneType(tree: SceneTreeNode[]): SceneTreeNode['kind'] {
  if (!tree.length) return 'component';
  // Use the kind of the first root node
  return tree[0]!.kind;
}

export function StructurePanel({ active }: StructurePanelProps) {
  const theme = useTheme();
  // Scene stories carry a single `sceneTree`; entity stories carry per-record
  // `sceneTrees` and expose a `record` arg selecting which one is on screen.
  const sceneTree = useParameter<SceneTreeNode[] | undefined>('sceneTree');
  const sceneTrees = useParameter<SceneTreeNode[][] | undefined>('sceneTrees');
  const [args] = useArgs();
  const record = typeof args.record === 'number' ? args.record : 0;

  const tree: SceneTreeNode[] | undefined = sceneTrees?.length ? (sceneTrees[record] ?? sceneTrees[0]) : sceneTree;

  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleHoverNode = useCallback((data: NodePayload) => {
    setHoveredPath(data.path ?? null);
  }, []);

  const handleSelectNode = useCallback((data: NodePayload) => {
    setSelectedPath(data.path ?? null);
  }, []);

  useChannel({
    [EVENTS.HOVER_NODE]: handleHoverNode,
    [EVENTS.SELECT_NODE]: handleSelectNode,
  });

  // Reset highlight state whenever the shown tree changes (story or record).
  useEffect(() => {
    setHoveredPath(null);
    setSelectedPath(null);
  }, [sceneTree, sceneTrees, record]);

  const empty = (
    <div style={{ padding: 16, fontSize: 13, color: theme.textMutedColor }}>
      No scene structure available for this story.
    </div>
  );

  if (!tree?.length) {
    return <AddonPanel active={active ?? false}>{empty}</AddonPanel>;
  }

  const sceneType = detectSceneType(tree);

  return (
    <AddonPanel active={active ?? false}>
      {sceneType === 'entity' ? (
        <EntityPanel tree={tree} hoveredPath={hoveredPath} selectedPath={selectedPath} />
      ) : sceneType === 'scene-ref' ? (
        <SceneRefPanel tree={tree} hoveredPath={hoveredPath} selectedPath={selectedPath} />
      ) : (
        <ComponentPanel tree={tree} hoveredPath={hoveredPath} selectedPath={selectedPath} />
      )}
    </AddonPanel>
  );
}
