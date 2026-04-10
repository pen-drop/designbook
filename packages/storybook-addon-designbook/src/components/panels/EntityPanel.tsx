/**
 * EntityPanel — detail view for entity scene nodes (content + config entities).
 *
 * Primary focus: show the JSONata mapping from entity fields to component props/slots.
 * Split view: composition tree on the left, mapping table on the right.
 */
import React, { useState, useCallback } from 'react';
import type { SceneTreeNode, FieldMapping } from '../../renderer/types';
import { CompositionTree } from '../CompositionTree';

interface EntityPanelProps {
  tree: SceneTreeNode[];
  highlightedPath?: string | null;
}

const S = {
  container: {
    display: 'flex',
    height: '100%',
  } as React.CSSProperties,
  treePane: {
    width: '40%',
    minWidth: 200,
    borderRight: '1px solid var(--borderColor, #e5e7eb)',
    overflow: 'auto',
  } as React.CSSProperties,
  detailPane: {
    flex: 1,
    overflow: 'auto',
  } as React.CSSProperties,
  hint: {
    padding: 16,
    fontSize: 12,
    color: 'var(--textMutedColor, #9ca3af)',
  } as React.CSSProperties,
  header: {
    padding: '8px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--textMutedColor, #9ca3af)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--borderColor, #e5e7eb)',
  } as React.CSSProperties,
  entityLabel: {
    padding: '8px 12px',
    fontSize: 12,
    color: 'var(--textColor, #fff)',
    borderBottom: '1px solid var(--borderColor, #e5e7eb)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  } as React.CSSProperties,
  badge: {
    fontSize: 10,
    fontWeight: 600,
    color: 'white',
    background: '#3b82f6',
    padding: '2px 8px',
    borderRadius: 10,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,
  mappingFile: {
    fontSize: 11,
    color: 'var(--textMutedColor, #9ca3af)',
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
    color: 'var(--textMutedColor, #9ca3af)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    borderBottom: '1px solid var(--borderColor, #e5e7eb)',
    background: 'var(--barBg, rgba(255,255,255,0.03))',
  } as React.CSSProperties,
  td: {
    padding: '5px 12px',
    borderBottom: '1px solid var(--borderColor, rgba(255,255,255,0.05))',
    fontFamily: 'monospace',
    fontSize: 11,
    color: 'var(--textColor, #fff)',
  } as React.CSSProperties,
  arrow: {
    color: 'var(--textMutedColor, #9ca3af)',
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
    color: type === 'prop' ? '#3b82f6' : '#22c55e',
    marginRight: 4,
  }),
};

/** Collect all entity nodes from the tree. */
function collectEntityNodes(tree: SceneTreeNode[]): SceneTreeNode[] {
  const entities: SceneTreeNode[] = [];
  function walk(nodes: SceneTreeNode[]) {
    for (const node of nodes) {
      if (node.kind === 'entity' && node.entity?.fieldMappings?.length) {
        entities.push(node);
      }
      if (node.children) walk(node.children);
      if (node.slots) {
        for (const slotNodes of Object.values(node.slots)) {
          walk(slotNodes);
        }
      }
    }
  }
  walk(tree);
  return entities;
}

function MappingTable({ mappings }: { mappings: FieldMapping[] }) {
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

function EntityMappingDetail({ node }: { node: SceneTreeNode }) {
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
        <span style={{ color: 'var(--textMutedColor, #9ca3af)', fontSize: 11 }}>({entity.view_mode})</span>
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

export function EntityPanel({ tree, highlightedPath }: EntityPanelProps) {
  const [selectedNode, setSelectedNode] = useState<SceneTreeNode | null>(null);

  const handleSelect = useCallback((node: SceneTreeNode) => {
    setSelectedNode(node);
  }, []);

  // Find the entity node to show by default (or the selected one)
  const entityNodes = collectEntityNodes(tree);
  const activeEntity = selectedNode?.kind === 'entity' ? selectedNode : (entityNodes[0] ?? null);

  return (
    <div style={S.container}>
      <div style={S.treePane}>
        <div style={S.header}>Composition</div>
        <CompositionTree tree={tree} onSelectNode={handleSelect} highlightedPath={highlightedPath} />
      </div>
      <div style={S.detailPane}>
        <div style={S.header}>Mapping</div>
        {activeEntity ? (
          <EntityMappingDetail node={activeEntity} />
        ) : (
          <div style={S.hint}>Select an entity node to view its field mapping.</div>
        )}
      </div>
    </div>
  );
}
