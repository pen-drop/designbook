import React from 'react';
import { styled } from 'storybook/theming';
import { DeboSceneCard } from '../ui/DeboSceneCard.jsx';

function toStoryId(group, sceneName) {
  const titlePart = group.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
  const namePart = sceneName.replace(/\s+/g, '-').toLowerCase();
  return `${titlePart}--${namePart}`;
}

const Grid = styled.div({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 12,
});

export function DeboSceneGrid({ data }) {
  const scenes = data?.scenes ?? [];
  const group = data?.name || '';

  return (
    <Grid>
      {scenes.map((scene, i) => {
        const storyId = group && scene.name ? toStoryId(group, scene.name) : null;
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
    </Grid>
  );
}
