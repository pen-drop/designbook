import React, { useState, useEffect } from 'react';
import { styled } from 'storybook/theming';
import { SyntaxHighlighter } from 'storybook/internal/components';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';
import { loadDesignbookFile } from '../designbookApi.js';

const ENTITY_BADGE_COLORS = {
  node: 'red',
  block_content: 'green',
  media: 'purple',
};

const BackButton = styled.button(({ theme }) => ({
  background: 'none',
  border: 'none',
  color: theme.color.secondary,
  cursor: 'pointer',
  fontSize: theme.typography.size.s2,
  padding: '4px 0',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  '&:hover': { textDecoration: 'underline' },
}));

const Header = styled.div({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  marginTop: 8,
});

const Title = styled.h2(({ theme }) => ({
  fontSize: 22,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  margin: 0,
}));

const Description = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  color: theme.color.mediumdark,
  marginTop: 4,
  marginBottom: 16,
}));

const EntityPath = styled.code(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  fontFamily: theme.typography.fonts.mono,
}));

const Table = styled.table(({ theme }) => ({
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: theme.typography.size.s2,
  fontFamily: theme.typography.fonts.base,
}));

const Th = styled.th(({ theme }) => ({
  textAlign: 'left',
  padding: '8px 12px',
  borderBottom: `2px solid ${theme.appBorderColor}`,
  fontSize: theme.typography.size.s1,
  fontWeight: 600,
  color: theme.color.mediumdark,
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}));

const Td = styled.td(({ theme }) => ({
  padding: '8px 12px',
  borderBottom: `1px solid ${theme.appBorderColor}`,
  color: theme.color.defaultText,
  verticalAlign: 'top',
}));

const MonoText = styled.span(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1,
}));

const SubRow = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginTop: 4,
}));

const ViewModeCard = styled.div(({ theme }) => ({
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
}));

const ViewModeTitle = styled.h4(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  fontWeight: 600,
  color: theme.color.defaultText,
  margin: '0 0 8px 0',
}));

const MetaLine = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginBottom: 4,
}));

function FieldsTable({ fields }) {
  const entries = Object.entries(fields || {});
  if (entries.length === 0) return null;

  return (
    <Table>
      <thead>
        <tr>
          <Th>Name</Th>
          <Th>Type</Th>
          <Th>Title</Th>
          <Th>Req</Th>
          <Th>Multi</Th>
          <Th>Details</Th>
        </tr>
      </thead>
      <tbody>
        {entries.map(([name, def]) => (
          <tr key={name}>
            <Td><MonoText>{name}</MonoText></Td>
            <Td><MonoText>{def.type}</MonoText></Td>
            <Td>{def.title || ''}</Td>
            <Td>{def.required ? '✓' : ''}</Td>
            <Td>{def.multiple ? '✓' : ''}</Td>
            <Td>
              {def.settings && (
                <SubRow>
                  <strong>settings:</strong>{' '}
                  <MonoText>{JSON.stringify(def.settings)}</MonoText>
                </SubRow>
              )}
              {def.sample_template && (
                <SubRow>
                  <strong>sample_template:</strong>{' '}
                  <MonoText>{JSON.stringify(def.sample_template)}</MonoText>
                </SubRow>
              )}
              {def.description && (
                <SubRow>{def.description}</SubRow>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function ViewModeMapping({ entityType, bundle, viewMode }) {
  const [expression, setExpression] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadDesignbookFile(`entity-mapping/${entityType}.${bundle}.${viewMode}.jsonata`)
      .then((content) => {
        setExpression(content);
        setLoading(false);
      });
  }, [entityType, bundle, viewMode]);

  if (loading) return <MetaLine>Loading mapping...</MetaLine>;
  if (!expression) return <MetaLine style={{ fontStyle: 'italic' }}>No entity-mapping file found</MetaLine>;

  return (
    <div style={{ maxHeight: 300, overflow: 'auto' }}>
      <SyntaxHighlighter language="json" copyable={false}>
        {expression}
      </SyntaxHighlighter>
    </div>
  );
}

function ViewModesSection({ entityType, bundle, viewModes }) {
  const entries = Object.entries(viewModes || {});
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(([name, def]) => (
        <ViewModeCard key={name}>
          <ViewModeTitle>{name}</ViewModeTitle>
          <MetaLine>
            <strong>template:</strong> <MonoText>{def.template}</MonoText>
          </MetaLine>
          {def.settings && (
            <MetaLine>
              <strong>settings:</strong> <MonoText>{JSON.stringify(def.settings)}</MonoText>
            </MetaLine>
          )}
          <DeboCollapsible title="Entity Mapping" defaultOpen={false}>
            <ViewModeMapping entityType={entityType} bundle={bundle} viewMode={name} />
          </DeboCollapsible>
        </ViewModeCard>
      ))}
    </>
  );
}

export function DeboDataModelDetail({ entityType, bundle, def, onBack }) {
  return (
    <DeboGrid gap="lg">
      <div>
        <BackButton onClick={onBack}>← Back to Data Model</BackButton>
        <Header>
          <Title>{def.title || bundle}</Title>
          <DeboBadge color={ENTITY_BADGE_COLORS[entityType] || 'red'}>{entityType}</DeboBadge>
        </Header>
        <EntityPath>{entityType}.{bundle}</EntityPath>
        {def.description && <Description>{def.description}</Description>}
      </div>

      <DeboCollapsible title="Fields" count={def.fields ? Object.keys(def.fields).length : 0} defaultOpen={true}>
        <FieldsTable fields={def.fields} />
      </DeboCollapsible>

      {def.view_modes && Object.keys(def.view_modes).length > 0 && (
        <DeboCollapsible title="View Modes" count={Object.keys(def.view_modes).length} defaultOpen={true}>
          <ViewModesSection entityType={entityType} bundle={bundle} viewModes={def.view_modes} />
        </DeboCollapsible>
      )}
    </DeboGrid>
  );
}
