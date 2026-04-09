/**
 * CompositionTree — scene structure tree for the Storybook manager panel.
 *
 * Custom tree matching Storybook sidebar styling. Ark UI TreeView doesn't work
 * in the manager environment (zag-js state machine fails to initialize).
 */
import React, { useState, useCallback } from 'react';
import {
  DatabaseIcon,
  ShareIcon,
  ComponentIcon,
  MarkupIcon,
  ChevronSmallDownIcon,
  ChevronSmallRightIcon,
} from '@storybook/icons';
import type { SceneTreeNode } from '../renderer/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface CompositionTreeProps {
  tree: SceneTreeNode[];
  onSelectNode: (node: SceneTreeNode) => void;
}

// ─── Styles (Storybook sidebar look) ──────────────────────────────────────────

const S = {
  root: {
    fontSize: 13,
    padding: 4,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px',
    borderRadius: 4,
    cursor: 'pointer',
    color: 'var(--textColor, #fff)',
    userSelect: 'none' as const,
  } as React.CSSProperties,
  chevron: {
    display: 'inline-flex',
    flexShrink: 0,
    color: 'var(--textMutedColor, #9ca3af)',
    width: 14,
    height: 14,
  } as React.CSSProperties,
  chevronSpacer: {
    width: 14,
    height: 14,
    flexShrink: 0,
  } as React.CSSProperties,
  icon: {
    flexShrink: 0,
    display: 'inline-flex',
  } as React.CSSProperties,
  name: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
  } as React.CSSProperties,
  children: {
    marginLeft: 7,
    paddingLeft: 4,
  } as React.CSSProperties,
  slotLabel: {
    fontSize: 11,
    color: 'var(--textMutedColor, #9ca3af)',
    fontStyle: 'italic' as const,
  } as React.CSSProperties,
  empty: {
    padding: 16,
    color: 'var(--textMutedColor, #9ca3af)',
    fontSize: 13,
  } as React.CSSProperties,
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const KIND_ICONS: Record<string, React.ReactNode> = {
  entity: <DatabaseIcon style={{ color: '#3b82f6' }} />,
  'scene-ref': <ShareIcon style={{ color: '#22c55e' }} />,
  component: <ComponentIcon style={{ color: 'var(--textMutedColor, #9ca3af)' }} />,
  string: <MarkupIcon style={{ color: 'var(--textMutedColor, #9ca3af)' }} />,
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

function hasChildren(node: SceneTreeNode): boolean {
  if (node.children?.length) return true;
  if (node.slots && Object.values(node.slots).some((s) => s.filter((c) => c.kind !== 'string').length > 0))
    return true;
  return false;
}

// ─── Tree node ────────────────────────────────────────────────────────────────

function TreeNode({
  node,
  onSelect,
}: {
  node: SceneTreeNode;
  onSelect: (node: SceneTreeNode) => void;
}) {
  const expandable = hasChildren(node);
  const [expanded, setExpanded] = useState(true);

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (expandable) {
        setExpanded((prev) => !prev);
      } else {
        onSelect(node);
      }
    },
    [expandable, node, onSelect],
  );

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node);
    },
    [node, onSelect],
  );

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        style={S.row}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect(node);
          if (e.key === 'ArrowRight' && expandable && !expanded) setExpanded(true);
          if (e.key === 'ArrowLeft' && expandable && expanded) setExpanded(false);
        }}
      >
        {expandable ? (
          <span style={S.chevron}>
            {expanded ? <ChevronSmallDownIcon /> : <ChevronSmallRightIcon />}
          </span>
        ) : (
          <span style={S.chevronSpacer} />
        )}
        <span style={S.icon}>{KIND_ICONS[node.kind] ?? <ComponentIcon />}</span>
        {expandable ? (
          <span style={S.name} onClick={handleNameClick}>{nodeLabel(node)}</span>
        ) : (
          <span style={S.name}>{nodeLabel(node)}</span>
        )}
      </div>

      {expandable && expanded && (
        <div style={S.children}>
          {/* Direct children (entity multi-node, scene-ref) */}
          {node.children?.map((child, i) => (
            <TreeNode key={`child-${i}`} node={child} onSelect={onSelect} />
          ))}

          {/* Slot children */}
          {node.slots &&
            Object.entries(node.slots).map(([slotName, children]) => {
              const visible = children.filter((c) => c.kind !== 'string');
              if (!visible.length) return null;
              return (
                <div key={slotName}>
                  <div style={{ ...S.row, cursor: 'default' }}>
                    <span style={S.chevronSpacer} />
                    <span style={S.slotLabel}>slot: {slotName}</span>
                  </div>
                  {visible.map((child, i) => (
                    <TreeNode key={`${slotName}-${i}`} node={child} onSelect={onSelect} />
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export function CompositionTree({ tree, onSelectNode }: CompositionTreeProps) {
  if (!tree.length) {
    return <div style={S.empty}>No scene structure available.</div>;
  }

  return (
    <div role="tree" style={S.root}>
      {tree.map((node, i) => (
        <TreeNode key={i} node={node} onSelect={onSelectNode} />
      ))}
    </div>
  );
}
