/**
 * DeboTree — generic tree UI component for Storybook manager panels.
 *
 * Renders a collapsible tree with icons, labels, groups, and path-based
 * highlighting. Framework-agnostic data model via DeboTreeItem.
 */
import React, { useState, useCallback, useMemo } from 'react';
import { ChevronSmallDownIcon, ChevronSmallRightIcon } from '@storybook/icons';
import { useTheme } from 'storybook/theming';

// ─── Data model ──────────────────────────────────────────────────────────────

export interface DeboTreeItem {
  /** Unique ID for this item (used for keying and matching). */
  id: string;
  /** Display label. */
  label: string;
  /** Icon to show before the label. */
  icon?: React.ReactNode;
  /** Nested children. */
  children?: DeboTreeItem[];
  /** Named groups of children (rendered with a group label). */
  groups?: Record<string, DeboTreeItem[]>;
  /** Arbitrary payload attached to this item. */
  data?: unknown;
}

export interface DeboTreeProps {
  items: DeboTreeItem[];
  onSelect?: (item: DeboTreeItem) => void;
  /** Path of the currently highlighted item (matched against item.id). */
  highlightedId?: string | null;
  /** Placeholder when items is empty. */
  emptyText?: string;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function useStyles(theme: any) {
  return useMemo(
    () => ({
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
        color: theme.color.defaultText,
        userSelect: 'none' as const,
      } as React.CSSProperties,
      chevron: {
        display: 'inline-flex',
        flexShrink: 0,
        color: theme.textMutedColor,
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
      groupLabel: {
        fontSize: 11,
        color: theme.textMutedColor,
        fontStyle: 'italic' as const,
      } as React.CSSProperties,
      empty: {
        padding: 16,
        color: theme.textMutedColor,
        fontSize: 13,
      } as React.CSSProperties,
    }),
    [theme],
  );
}

// ─── Tree node ───────────────────────────────────────────────────────────────

function TreeNode({
  item,
  onSelect,
  highlightedId,
}: {
  item: DeboTreeItem;
  onSelect?: (item: DeboTreeItem) => void;
  highlightedId?: string | null;
}) {
  const theme = useTheme();
  const S = useStyles(theme);
  const hasKids = !!(item.children?.length || (item.groups && Object.values(item.groups).some((g) => g.length > 0)));
  const [expanded, setExpanded] = useState(true);
  const isHighlighted = !!(highlightedId && item.id === highlightedId);

  const handleRowClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hasKids) {
        setExpanded((prev) => !prev);
      } else {
        onSelect?.(item);
      }
    },
    [hasKids, item, onSelect],
  );

  const handleNameClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect?.(item);
    },
    [item, onSelect],
  );

  const rowStyle = isHighlighted
    ? { ...S.row, background: 'var(--color-secondary-900, rgba(59,130,246,0.15))' }
    : S.row;

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        style={rowStyle}
        onClick={handleRowClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSelect?.(item);
          if (e.key === 'ArrowRight' && hasKids && !expanded) setExpanded(true);
          if (e.key === 'ArrowLeft' && hasKids && expanded) setExpanded(false);
        }}
      >
        {hasKids ? (
          <span style={S.chevron}>{expanded ? <ChevronSmallDownIcon /> : <ChevronSmallRightIcon />}</span>
        ) : (
          <span style={S.chevronSpacer} />
        )}
        {item.icon && <span style={S.icon}>{item.icon}</span>}
        {hasKids ? (
          <span style={S.name} onClick={handleNameClick}>
            {item.label}
          </span>
        ) : (
          <span style={S.name}>{item.label}</span>
        )}
      </div>

      {hasKids && expanded && (
        <div style={S.children}>
          {item.children?.map((child) => (
            <TreeNode key={child.id} item={child} onSelect={onSelect} highlightedId={highlightedId} />
          ))}

          {item.groups &&
            Object.entries(item.groups).map(([groupName, groupItems]) => {
              if (!groupItems.length) return null;
              return (
                <div key={groupName}>
                  <div style={{ ...S.row, cursor: 'default' }}>
                    <span style={S.chevronSpacer} />
                    <span style={S.groupLabel}>{groupName}</span>
                  </div>
                  {groupItems.map((child) => (
                    <TreeNode key={child.id} item={child} onSelect={onSelect} highlightedId={highlightedId} />
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ─── Root ────────────────────────────────────────────────────────────────────

export function DeboTree({ items, onSelect, highlightedId, emptyText }: DeboTreeProps) {
  const theme = useTheme();
  const S = useStyles(theme);

  if (!items.length) {
    return <div style={S.empty}>{emptyText ?? 'No items.'}</div>;
  }

  return (
    <div role="tree" style={S.root}>
      {items.map((item) => (
        <TreeNode key={item.id} item={item} onSelect={onSelect} highlightedId={highlightedId} />
      ))}
    </div>
  );
}
