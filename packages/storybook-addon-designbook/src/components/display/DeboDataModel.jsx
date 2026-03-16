import React from 'react';
import { styled } from 'storybook/theming';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboCard } from '../ui/DeboCard.jsx';
import { DeboSectionList } from '../ui/DeboPageLayout.jsx';

const ENTITY_BADGE_COLORS = {
  node: 'red',
  block_content: 'green',
  media: 'purple',
};

const CardGrid = styled.div({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
  gap: 16,
});


function EntityGroup({ type, bundles }) {
  const bundleEntries = Object.entries(bundles || {});
  if (bundleEntries.length === 0) return null;

  const title = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <DeboCollapsible title={title} count={bundleEntries.length} defaultOpen={true}>
      <CardGrid>
        {bundleEntries.map(([key, def]) => (
          <DeboCard
            key={key}
            title={def.title || key}
            badge={type}
            badgeColor={ENTITY_BADGE_COLORS[type] || 'red'}
            description={def.description}
            entityPath={`${type}.${key}`}
            fieldCount={def.fields ? Object.keys(def.fields).length : 0}
          />
        ))}
      </CardGrid>
    </DeboCollapsible>
  );
}

export function DeboDataModel({ data }) {
  if (!data || !data.content) return null;
  const entityTypes = Object.entries(data.content);

  return (
    <DeboSectionList>
      {entityTypes.map(([type, bundles]) => (
        <EntityGroup key={type} type={type} bundles={bundles} />
      ))}
    </DeboSectionList>
  );
}
