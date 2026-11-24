import React from 'react';
import { DeboSceneCard } from '../ui/DeboSceneCard.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';

export function DeboSceneGrid({ data }) {
  const scenes = data?.scenes ?? [];
  const group = data?.group || data?.name || '';

  return (
    <DeboGrid variant="auto" gap="sm" minWidth={220}>
      {scenes.map((scene, i) => {
        const sceneTitle = group && scene.name ? `${group}/Scenes` : null;
        return (
          <DeboSceneCard
            key={scene.name || i}
            title={scene.name}
            theme={scene.theme}
            modified={scene.modified}
            storyTitle={sceneTitle}
            storyName={scene.name}
          />
        );
      })}
    </DeboGrid>
  );
}
