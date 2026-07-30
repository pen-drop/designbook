import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'storybook/theming';
import { useParameter, useChannel, useArgs } from 'storybook/manager-api';
import { AddonPanel } from 'storybook/internal/components';
import type { SceneTreeNode } from '../../renderer/types';
import { StructureSplitView } from './StructureSplitView';
import { EntityMappingDetail, hasEntityMapping } from './EntityMappingDetail';
import { MappingDetail } from '../MappingDetail';
import { EVENTS } from '../../constants';

interface StructurePanelProps {
  active?: boolean;
}

/** Payload emitted by the inspect overlay for hover/select events. */
interface NodePayload {
  component: string | null;
  path: string | null;
}

/**
 * Detail for the selected node — always the same split view regardless of scene
 * kind. Entity nodes with field mappings show the mapping table; every other
 * node (component, scene-ref, string) shows its props/slots/ref via MappingDetail.
 */
function renderNodeDetail(node: SceneTreeNode): React.ReactNode {
  return hasEntityMapping(node) ? <EntityMappingDetail node={node} /> : <MappingDetail node={node} />;
}

export function StructurePanel({ active }: StructurePanelProps) {
  const theme = useTheme();
  // Scene stories carry a single `sceneTree`; entity stories carry per-record
  // `sceneTrees` and expose a `record` arg selecting which one is on screen.
  const sceneTree = useParameter<SceneTreeNode[] | undefined>('sceneTree');
  const sceneTrees = useParameter<SceneTreeNode[][] | undefined>('sceneTrees');
  const [args] = useArgs();
  // `args` may be undefined before the story's args are prepared — default to 0.
  const record = typeof args?.record === 'number' ? args.record : 0;

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

  if (!tree?.length) {
    return (
      <AddonPanel active={active ?? false}>
        <div style={{ padding: 16, fontSize: 13, color: theme.textMutedColor }}>
          No scene structure available for this story.
        </div>
      </AddonPanel>
    );
  }

  return (
    <AddonPanel active={active ?? false}>
      <StructureSplitView
        tree={tree}
        hoveredPath={hoveredPath}
        selectedPath={selectedPath}
        detailHeader="Detail"
        emptyHint="Select a node to view its details."
        renderDetail={renderNodeDetail}
      />
    </AddonPanel>
  );
}
