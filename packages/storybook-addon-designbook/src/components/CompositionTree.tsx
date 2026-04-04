import React from 'react';
import type { SceneTreeNode } from '../renderer/types';

interface CompositionTreeProps {
  tree: SceneTreeNode[];
  selectedIndex: number | null;
  onSelectNode: (index: number) => void;
}

const KIND_COLORS: Record<string, string> = {
  entity: '#3b82f6',
  'scene-ref': '#22c55e',
  component: '#9ca3af',
  string: '#6b7280',
};

const KIND_BG: Record<string, string> = {
  entity: 'rgba(59, 130, 246, 0.08)',
  'scene-ref': 'rgba(34, 197, 94, 0.08)',
  component: 'rgba(156, 163, 175, 0.05)',
  string: 'transparent',
};

function nodeLabel(node: SceneTreeNode): string {
  switch (node.kind) {
    case 'entity':
      return `${node.entity?.entity_type}/${node.entity?.bundle} (${node.entity?.view_mode})`;
    case 'scene-ref':
      return node.ref?.source ?? 'scene-ref';
    case 'component':
      return node.component ?? 'component';
    case 'string':
      return `"${node.value}"`;
  }
}

function nodeKindLabel(kind: string): string {
  switch (kind) {
    case 'entity':
      return 'entity';
    case 'scene-ref':
      return 'scene';
    case 'component':
      return 'component';
    case 'string':
      return 'text';
    default:
      return kind;
  }
}

function TreeNode({
  node,
  index,
  depth,
  isSelected,
  onSelect,
}: {
  node: SceneTreeNode;
  index: number;
  depth: number;
  isSelected: boolean;
  onSelect: (index: number) => void;
}) {
  const color = KIND_COLORS[node.kind] ?? '#9ca3af';
  const bg = KIND_BG[node.kind] ?? 'transparent';
  const isDeemphasized = node.kind === 'component' || node.kind === 'string';

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div
        onClick={() => onSelect(index)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          background: isSelected ? `${color}22` : bg,
          borderLeft: isSelected ? `3px solid ${color}` : '3px solid transparent',
          opacity: isDeemphasized ? 0.6 : 1,
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            minWidth: 60,
          }}
        >
          {nodeKindLabel(node.kind)}
        </span>
        <span style={{ color: 'var(--textColor, #333)', fontWeight: isSelected ? 600 : 400 }}>{nodeLabel(node)}</span>
      </div>

      {/* Render scene-ref children */}
      {node.kind === 'scene-ref' &&
        node.children?.map((child, i) => (
          <TreeNode
            key={`${index}-child-${i}`}
            node={child}
            index={index} // keep parent index for selection
            depth={depth + 1}
            isSelected={false}
            onSelect={onSelect}
          />
        ))}

      {/* Render slot children for entities that have slots */}
      {node.slots &&
        Object.entries(node.slots).map(([slotName, children]) => (
          <div key={slotName} style={{ paddingLeft: (depth + 1) * 16 }}>
            <div
              style={{
                fontSize: 10,
                color: '#9ca3af',
                fontFamily: 'Inter, sans-serif',
                padding: '2px 8px',
              }}
            >
              slot: {slotName}
            </div>
            {children
              .filter((c) => c.kind !== 'string')
              .map((child, i) => (
                <TreeNode
                  key={`${slotName}-${i}`}
                  node={child}
                  index={index}
                  depth={depth + 2}
                  isSelected={false}
                  onSelect={onSelect}
                />
              ))}
          </div>
        ))}
    </div>
  );
}

export function CompositionTree({ tree, selectedIndex, onSelectNode }: CompositionTreeProps) {
  if (!tree.length) {
    return (
      <div style={{ padding: 16, color: '#9ca3af', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>
        No scene structure available.
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 0' }}>
      {tree.map((node, index) => (
        <TreeNode
          key={index}
          node={node}
          index={index}
          depth={0}
          isSelected={selectedIndex === index}
          onSelect={onSelectNode}
        />
      ))}
    </div>
  );
}
