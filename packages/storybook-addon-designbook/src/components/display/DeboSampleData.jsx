import React from 'react';
import { styled } from 'storybook/theming';
import { SyntaxHighlighter } from 'storybook/internal/components';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboBulletList } from '../ui/DeboBulletList.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';

const MetaBadges = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginTop: 4,
}));

const BadgePill = styled.span(({ theme }) => ({
  display: 'inline-block',
  fontSize: theme.typography.size.s1,
  background: theme.background?.hoverable || '#F1F5F9',
  borderRadius: 6,
  padding: '2px 8px',
  marginRight: 8,
}));


const ModelCard = styled.div(({ theme }) => ({
  background: theme.background?.content || '#ffffff',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 8,
  padding: 12,
}));

const ModelName = styled.span(({ theme }) => ({
  fontWeight: 500,
  fontSize: theme.typography.size.s2,
  color: theme.color.defaultText,
}));

const ModelDesc = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginTop: 4,
}));

export function DeboSampleData({ data }) {
  if (!data) return null;

  const meta = data._meta || {};
  const models = meta.models || {};
  const relationships = meta.relationships || [];

  const recordEntries = [];
  for (const [key, value] of Object.entries(data)) {
    if (key === '_meta') continue;
    if (Array.isArray(value)) {
      recordEntries.push([key, value]);
    } else if (value && typeof value === 'object') {
      for (const [subKey, subValue] of Object.entries(value)) {
        if (Array.isArray(subValue)) {
          recordEntries.push([`${key}/${subKey}`, subValue]);
        }
      }
    }
  }
  const totalRecords = recordEntries.reduce((sum, [, arr]) => sum + arr.length, 0);

  const dataWithoutMeta = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== '_meta')
  );

  return (
    <div>
      <MetaBadges>
        <BadgePill>{recordEntries.length} model{recordEntries.length !== 1 ? 's' : ''}</BadgePill>
        <BadgePill>{totalRecords} record{totalRecords !== 1 ? 's' : ''}</BadgePill>
      </MetaBadges>

      {Object.keys(models).length > 0 && (
        <DeboCollapsible title="Data Models" count={Object.keys(models).length} defaultOpen>
          <DeboGrid variant="auto" gap="sm" minWidth={240}>
            {Object.entries(models).map(([name, description]) => (
              <ModelCard key={name}>
                <ModelName>{name}</ModelName>
                <ModelDesc>{description}</ModelDesc>
              </ModelCard>
            ))}
          </DeboGrid>
        </DeboCollapsible>
      )}

      {relationships.length > 0 && (
        <DeboCollapsible title="Relationships" count={relationships.length} defaultOpen={true}>
          <DeboBulletList items={relationships} />
        </DeboCollapsible>
      )}

      {Object.keys(dataWithoutMeta).length > 0 && (
        <DeboCollapsible title="Raw Data">
          <div style={{ maxHeight: 384, overflow: 'auto' }}>
            <SyntaxHighlighter language="json" copyable={false}>
              {JSON.stringify(dataWithoutMeta, null, 2)}
            </SyntaxHighlighter>
          </div>
        </DeboCollapsible>
      )}
    </div>
  );
}
