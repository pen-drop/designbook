import React from 'react';
import { styled } from 'storybook/theming';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboCard } from '../ui/DeboCard.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';
import { DeboDataModelDetail } from './DeboDataModelDetail.jsx';

const ENTITY_BADGE_COLORS = {
  node: 'red',
  block_content: 'green',
  media: 'purple',
};

const ClickableCard = styled.div({
  cursor: 'pointer',
  '&:hover': { opacity: 0.85 },
});

function EntityGroup({ type, bundles, onSelect }) {
  const bundleEntries = Object.entries(bundles || {});
  if (bundleEntries.length === 0) return null;

  const title = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return (
    <DeboCollapsible title={title} count={bundleEntries.length} defaultOpen={true}>
      <DeboGrid variant="auto" gap="md" minWidth={280}>
        {bundleEntries.map(([key, def]) => (
          <ClickableCard key={key} onClick={() => onSelect(`${type}.${key}`)}>
            <DeboCard
              title={def.title || key}
              badge={type}
              badgeColor={ENTITY_BADGE_COLORS[type] || 'red'}
              description={def.description}
              entityPath={`${type}.${key}`}
              fieldCount={def.fields ? Object.keys(def.fields).length : 0}
            />
          </ClickableCard>
        ))}
      </DeboGrid>
    </DeboCollapsible>
  );
}

export function DeboDataModel({ data, selectedEntity, onSelectEntity }) {
  if (!data || !data.content) return null;

  if (selectedEntity) {
    const [type, bundle] = selectedEntity.split('.');
    const bundleDef = data.content?.[type]?.[bundle];
    if (!bundleDef) {
      onSelectEntity?.(null);
      return null;
    }
    return (
      <DeboDataModelDetail
        entityType={type}
        bundle={bundle}
        def={bundleDef}
        onBack={() => onSelectEntity?.(null)}
      />
    );
  }

  const entityTypes = Object.entries(data.content);

  return (
    <DeboGrid gap="lg">
      {entityTypes.map(([type, bundles]) => (
        <EntityGroup key={type} type={type} bundles={bundles} onSelect={(path) => onSelectEntity?.(path)} />
      ))}
    </DeboGrid>
  );
}
