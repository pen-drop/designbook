/**
 * EntityMappingDetail — the JSONata field-mapping table for an entity node
 * (entity field → component → target prop/slot). Rendered in the Structure
 * tab's detail pane when the selected node is an entity with field mappings.
 * Inline styles only (manager-styling rule).
 */
import React, { useMemo } from 'react';
import { useTheme } from 'storybook/theming';
import type { SceneTreeNode, FieldMapping } from '../../renderer/types';

function useStyles() {
  const theme = useTheme();
  return useMemo(
    () => ({
      hint: {
        padding: 16,
        fontSize: 12,
        color: theme.textMutedColor,
      } as React.CSSProperties,
      entityLabel: {
        padding: '8px 12px',
        fontSize: 12,
        color: theme.color.defaultText,
        borderBottom: `1px solid ${theme.appBorderColor}`,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      } as React.CSSProperties,
      badge: {
        fontSize: 10,
        fontWeight: 600,
        color: theme.color.inverseText,
        background: theme.color.secondary,
        padding: '2px 8px',
        borderRadius: 10,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
      } as React.CSSProperties,
      mappingFile: {
        fontSize: 11,
        color: theme.textMutedColor,
        fontFamily: 'monospace',
        padding: '4px 12px 8px',
      } as React.CSSProperties,
      table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: 12,
      } as React.CSSProperties,
      th: {
        padding: '6px 12px',
        textAlign: 'left' as const,
        fontSize: 10,
        fontWeight: 600,
        color: theme.textMutedColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        borderBottom: `1px solid ${theme.appBorderColor}`,
        background: theme.background.hoverable,
      } as React.CSSProperties,
      td: {
        padding: '5px 12px',
        borderBottom: `1px solid ${theme.appBorderColor}`,
        fontFamily: 'monospace',
        fontSize: 11,
        color: theme.color.defaultText,
      } as React.CSSProperties,
      arrow: {
        color: theme.textMutedColor,
        textAlign: 'center' as const,
        padding: '5px 4px',
        fontSize: 12,
      } as React.CSSProperties,
      conditional: {
        fontSize: 9,
        color: '#f59e0b',
        marginLeft: 4,
      } as React.CSSProperties,
      typeBadge: (type: 'prop' | 'slot') => ({
        fontSize: 9,
        fontWeight: 600,
        color: type === 'prop' ? theme.color.secondary : '#22c55e',
        marginRight: 4,
      }),
      viewMode: {
        color: theme.textMutedColor,
        fontSize: 11,
      } as React.CSSProperties,
    }),
    [theme],
  );
}

function MappingTable({ mappings }: { mappings: FieldMapping[] }) {
  const S = useStyles();
  return (
    <table style={S.table}>
      <thead>
        <tr>
          <th style={S.th}>Entity Field</th>
          <th style={{ ...S.th, width: 24 }}></th>
          <th style={S.th}>Component</th>
          <th style={S.th}>Target</th>
        </tr>
      </thead>
      <tbody>
        {mappings.map((m, i) => (
          <tr key={i}>
            <td style={S.td}>
              {m.field}
              {m.conditional && <span style={S.conditional}>?</span>}
            </td>
            <td style={S.arrow}>→</td>
            <td style={S.td}>{m.component.split(':').pop()}</td>
            <td style={S.td}>
              <span style={S.typeBadge(m.type)}>{m.type}</span>
              {m.target}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Whether this node carries an entity mapping worth showing as a table. */
export function hasEntityMapping(node: SceneTreeNode): boolean {
  return node.kind === 'entity' && !!node.entity?.fieldMappings?.length;
}

export function EntityMappingDetail({ node }: { node: SceneTreeNode }) {
  const S = useStyles();
  const entity = node.entity;
  if (!entity) return null;

  const mappingShort = entity.mapping.split('/').slice(-3).join('/');

  return (
    <div>
      <div style={S.entityLabel}>
        <span style={S.badge}>entity</span>
        <span>
          {entity.entity_type}/{entity.bundle}
        </span>
        <span style={S.viewMode}>({entity.view_mode})</span>
      </div>
      <div style={S.mappingFile}>{mappingShort}</div>
      {entity.fieldMappings?.length ? (
        <MappingTable mappings={entity.fieldMappings} />
      ) : (
        <div style={S.hint}>No field mappings extracted.</div>
      )}
    </div>
  );
}
