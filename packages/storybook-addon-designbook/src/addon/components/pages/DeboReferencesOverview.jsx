import React from 'react';
import { styled } from 'storybook/theming';
import { DeboAlert } from '../ui/DeboAlert.jsx';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { DeboEmptyState } from '../ui/DeboEmptyState.jsx';
import { DeboLink } from '../ui/DeboLink.jsx';
import { DeboLoading } from '../ui/DeboLoading.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboTable } from '../ui/DeboTable.jsx';
import { useReferences } from '../../hooks/useReferences.js';

const Heading = styled.h3(({ theme }) => ({
  fontSize: theme.typography.size.l1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  paddingBottom: 8,
  marginBottom: 16,
  borderBottom: `1px solid ${theme.appBorderColor}`,
}));

export const APPROVAL_COLORS = { approved: 'green', pending: 'yellow', rejected: 'red', stale: 'red', none: 'gray' };

export function DeboReferencesOverview() {
  const { data, error, loading } = useReferences();
  const references = data?.references ?? [];

  return (
    <DeboPageLayout gap="8">
      <Heading>References</Heading>
      {loading && <DeboLoading />}
      {error && <DeboAlert type="error">Reference inventory could not be loaded: {error}</DeboAlert>}
      {!loading && !error && references.length === 0 && (
        <DeboEmptyState
          message="No published references yet"
          command="/debo extract-reference"
          filePath="designbook/references/"
        />
      )}
      {references.length > 0 && (
        <DeboTable
          columns={['Source', 'Revision', 'Status', 'Approval', 'Captures', 'Bound stories']}
          rows={references}
          renderRow={(ref) => (
            <tr key={ref.binding}>
              <DeboTable.Td>
                {ref.status === 'ok' ? `${ref.source.kind}: ${ref.source.identity}` : ref.id}
              </DeboTable.Td>
              <DeboTable.Td>
                {ref.status === 'ok' && ref.captures[0] ? (
                  <DeboLink storyId={ref.captures[0].storyId}>{ref.label}</DeboLink>
                ) : (
                  ref.label
                )}
                <div>
                  <DeboTable.Mono>{ref.binding}</DeboTable.Mono>
                </div>
              </DeboTable.Td>
              <DeboTable.Td>
                {ref.status === 'ok' ? (
                  <DeboBadge color="green">published</DeboBadge>
                ) : (
                  <span role="alert">
                    <DeboBadge color="red">{ref.status}</DeboBadge> {ref.error ?? 'Capture workflow not finished'}
                  </span>
                )}
              </DeboTable.Td>
              <DeboTable.Td>
                <DeboBadge color={APPROVAL_COLORS[ref.approval]}>{ref.approval}</DeboBadge>
              </DeboTable.Td>
              <DeboTable.Td>{ref.captures.length}</DeboTable.Td>
              <DeboTable.Td>{ref.boundStories.length}</DeboTable.Td>
            </tr>
          )}
        />
      )}
    </DeboPageLayout>
  );
}
