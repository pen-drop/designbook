import React from 'react';
import { DeboSceneCard } from '../ui/DeboSceneCard.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';

function toStoryId(group, sceneName) {
  const titlePart = group.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
  const namePart = sceneName.replace(/\s+/g, '-').toLowerCase();
  return `${titlePart}--${namePart}`;

  // /story/designbook-design-system-scenes--shell
}

export function DeboSceneGrid({ data }) {
  const scenes = data?.scenes ?? [];
  const group = data?.group || data?.name || '';

  return (
    <DeboGrid variant="auto" gap="sm" minWidth={220}>
      {scenes.map((scene, i) => {
        const storyId = group && scene.name ? toStoryId(group + '/Scenes', scene.name) : null;
        return (
          <DeboSceneCard
            key={scene.name || i}
            title={scene.name}
            theme={scene.theme}
            modified={scene.modified}
            storyPath={storyId ? `/story/${storyId}` : undefined}
          />
        );
      })}
    </DeboGrid>
  );
}
