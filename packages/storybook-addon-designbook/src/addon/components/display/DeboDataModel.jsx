import React, { useEffect, useReducer, useRef, useState } from 'react';
import { styled } from 'storybook/theming';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboCard } from '../ui/DeboCard.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';
import { DeboModeBadges } from '../ui/DeboModeBadges.jsx';
import { DeboDataModelDetail } from './DeboDataModelDetail.jsx';
import { DeboDataModelGraph } from './DeboDataModelGraph.jsx';
import { ENTITY_BADGE_COLORS } from './entityColors.js';
import { listDesignbookFiles } from '../designbookApi.js';

const ClickableCard = styled.div({
  cursor: 'pointer',
  '&:hover': { opacity: 0.85 },
});

const ViewSwitch = styled.div({ display: 'flex', gap: 4 });

const Toolbar = styled.div({ display: 'flex', flexDirection: 'column', gap: 12 });

const FilterGroup = styled.div({
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 6,
});

const FilterLabel = styled.span(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: theme.textMutedColor,
  marginRight: 2,
}));

const FilterChip = styled.button(({ theme }) => ({
  padding: '2px 10px',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 999,
  background: 'transparent',
  color: theme.textMutedColor,
  fontFamily: theme.typography.fonts.base,
  fontSize: 12,
  lineHeight: '18px',
  cursor: 'pointer',
  '&[aria-pressed="true"]': {
    borderColor: theme.color.secondary,
    background: theme.background.hoverable,
    color: theme.color.defaultText,
    fontWeight: 600,
  },
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
}));

const Muted = styled.p(({ theme }) => ({ color: theme.textMutedColor, fontSize: 13 }));

const ViewButton = styled.button(({ theme }) => ({
  padding: '4px 12px',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: theme.appBorderRadius,
  background: 'transparent',
  color: theme.color.defaultText,
  fontFamily: theme.typography.fonts.base,
  fontSize: 13,
  cursor: 'pointer',
  '&[aria-pressed="true"]': { background: theme.background.hoverable, fontWeight: 600 },
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
}));

function EntityGroup({ type, bundles, onSelect, dataModel, mappings }) {
  const bundleEntries = Object.entries(bundles || {});
  if (bundleEntries.length === 0) return null;

  const title = type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const ready = mappings != null;

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
              fieldCount={def.fields ? Object.keys(def.fields).length : undefined}
            >
              <DeboModeBadges
                label="View Modes"
                kind="view"
                dataModel={dataModel}
                entityType={type}
                bundle={key}
                declared={Object.keys(def.view_modes || {})}
                mappingFiles={ready ? mappings.entity : []}
                ready={ready}
              />
              <DeboModeBadges
                label="Form Modes"
                kind="form"
                dataModel={dataModel}
                entityType={type}
                bundle={key}
                declared={Object.keys(def.form_modes || {})}
                mappingFiles={ready ? mappings.form : []}
                ready={ready}
              />
            </DeboCard>
          </ClickableCard>
        ))}
      </DeboGrid>
    </DeboCollapsible>
  );
}

/** Distinct content entity type keys in declaration order. Config types are omitted. */
function entityTypes(data) {
  return Object.keys(data?.content || {});
}

/**
 * Transient overview state `{ modelKey, selectedTypes, layout, focusedId, resets }`, reset when
 * the model contents change. Lives in a ref so pointer moves never re-render the owning page.
 */
function syncSession(session, data) {
  const modelKey = JSON.stringify(data);
  if (session.current?.modelKey !== modelKey) {
    session.current = { modelKey, selectedTypes: entityTypes(data), layout: null, focusedId: null, resets: 0 };
  }
  return session.current;
}

/** Restore the computed graph layout and clear the graph focus; the type filter stays. */
export function resetDataModelLayout(session) {
  if (!session.current) return;
  Object.assign(session.current, { layout: null, focusedId: null, resets: session.current.resets + 1 });
}

export function DeboDataModel({ data, selectedEntity, onSelectEntity, view: viewProp, onViewChange, session: sessionProp }) {
  const [mappings, setMappings] = useState(null); // null = pending
  // Parents that remount this component (DeboFoundationPage) pass a session ref that outlives it.
  const localSession = useRef(null);
  const sessionRef = sessionProp ?? localSession;
  const [, rerender] = useReducer((n) => n + 1, 0);
  // Parents that remount this component on selection (DeboFoundationPage) own the view choice.
  const [localView, setLocalView] = useState('cards');
  const view = viewProp ?? localView;
  const setView = onViewChange ?? setLocalView;
  useEffect(() => {
    let alive = true;
    Promise.all([
      listDesignbookFiles('entity-mapping'),
      listDesignbookFiles('form-mapping'),
    ]).then(([entity, form]) => {
      if (alive) setMappings({ entity, form });
    });
    return () => {
      alive = false;
    };
  }, []);

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

  const session = syncSession(sessionRef, data);
  const selected = new Set(session.selectedTypes);
  const toggleType = (type) => {
    session.selectedTypes = entityTypes(data).filter((t) => (t === type ? !selected.has(t) : selected.has(t)));
    session.layout = null;
    // Node ids are `${type}.${bundle}`: a focus hidden by this toggle is dropped, not restored later.
    if (selected.has(type) && session.focusedId?.startsWith(`${type}.`)) session.focusedId = null;
    rerender();
  };
  const hasBundles = ([type, bundles]) => selected.has(type) && Object.keys(bundles || {}).length > 0;
  const contentTypes = Object.entries(data.content || {}).filter(hasBundles);

  const typeFilter = (
    <FilterGroup role="group" aria-label="Entity types">
      <FilterLabel aria-hidden="true">Filter</FilterLabel>
      {entityTypes(data).map((type) => (
        <FilterChip key={type} type="button" aria-pressed={selected.has(type)} onClick={() => toggleType(type)}>
          {type}
        </FilterChip>
      ))}
    </FilterGroup>
  );
  const noneSelected = selected.size === 0 && entityTypes(data).length > 0;
  const empty = noneSelected ? 'No entity types selected' : 'No bundles defined';

  const viewSwitch = (
    <ViewSwitch role="group" aria-label="Data model view">
      {['cards', 'graph'].map((id) => (
        <ViewButton key={id} type="button" aria-pressed={view === id} onClick={() => setView(id)}>
          {id === 'cards' ? 'Cards' : 'Graph'}
        </ViewButton>
      ))}
    </ViewSwitch>
  );

  if (view === 'graph') {
    return (
      <DeboGrid gap="lg">
        <Toolbar>
          {typeFilter}
          {viewSwitch}
        </Toolbar>
        {noneSelected ? (
          <Muted>{empty}</Muted>
        ) : (
          <DeboDataModelGraph
            // A new model or type selection starts a fresh graph with a freshly computed layout.
            key={`${session.modelKey}|${session.selectedTypes}|${session.resets}`}
            data={data}
            selectedTypes={session.selectedTypes}
            session={session}
            onSelect={(path) => onSelectEntity?.(path)}
          />
        )}
      </DeboGrid>
    );
  }

  return (
    <DeboGrid gap="lg">
      <Toolbar>
        {typeFilter}
        {viewSwitch}
      </Toolbar>
      {contentTypes.length === 0 && <Muted>{empty}</Muted>}
      {contentTypes.map(([type, bundles]) => (
        <EntityGroup
          key={type}
          type={type}
          bundles={bundles}
          onSelect={(path) => onSelectEntity?.(path)}
          dataModel={data}
          mappings={mappings}
        />
      ))}
    </DeboGrid>
  );
}
