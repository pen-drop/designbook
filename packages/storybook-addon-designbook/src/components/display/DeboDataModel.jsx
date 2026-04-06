import React from 'react';
import { styled } from 'storybook/theming';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboCard } from '../ui/DeboCard.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';
import { DeboDataModelDetail } from './DeboDataModelDetail.jsx';
import { ENTITY_BADGE_COLORS } from './entityColors.js';

const ClickableCard = styled.div({
  cursor: 'pointer',
  '&:hover': { opacity: 0.85 },
});

const SectionHeading = styled.h3({
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--sb-color-mediumdark, #999)',
  margin: 0,
  paddingTop: '8px',
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
  if (!data || (!data.content && !data.config)) return null;

  if (selectedEntity) {
    const [type, bundle] = selectedEntity.split('.');
    const bundleDef = data.content?.[type]?.[bundle] ?? data.config?.[type]?.[bundle];
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

  const contentTypes = Object.entries(data.content || {});
  const configTypes = Object.entries(data.config || {});

  return (
    <DeboGrid gap="lg">
      {contentTypes.map(([type, bundles]) => (
        <EntityGroup key={type} type={type} bundles={bundles} onSelect={(path) => onSelectEntity?.(path)} />
      ))}
      {configTypes.length > 0 && (
        <>
          <SectionHeading>Config Entities</SectionHeading>
          {configTypes.map(([type, bundles]) => (
            <EntityGroup key={`config-${type}`} type={type} bundles={bundles} onSelect={(path) => onSelectEntity?.(path)} />
          ))}
        </>
      )}
    </DeboGrid>
  );
}
