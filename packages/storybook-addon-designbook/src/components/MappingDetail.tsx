import React from 'react';
import { useTheme } from 'storybook/theming';
import type { SceneTreeNode } from '../renderer/types';

interface MappingDetailProps {
  node: SceneTreeNode;
  onBack?: () => void;
}

function useStyles() {
  const theme = useTheme();
  return {
    container: {
      padding: 16,
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
    } as React.CSSProperties,
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
    } as React.CSSProperties,
    backButton: {
      background: 'none',
      border: `1px solid ${theme.appBorderColor}`,
      borderRadius: 4,
      padding: '4px 8px',
      cursor: 'pointer',
      fontSize: 12,
      color: theme.color.defaultText,
      fontFamily: 'Inter, sans-serif',
    } as React.CSSProperties,
    kindBadge: (color: string) => ({
      fontSize: 10,
      fontWeight: 600,
      color: 'white',
      background: color,
      padding: '2px 8px',
      borderRadius: 10,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    }),
    title: {
      fontWeight: 600,
      fontSize: 14,
    } as React.CSSProperties,
    subtitle: {
      fontSize: 11,
      color: theme.textMutedColor,
      marginBottom: 12,
    } as React.CSSProperties,
    columns: {
      display: 'flex',
      gap: 24,
      alignItems: 'flex-start',
    } as React.CSSProperties,
    column: {
      flex: 1,
      border: `1px solid ${theme.appBorderColor}`,
      borderRadius: 8,
      overflow: 'hidden',
    } as React.CSSProperties,
    columnHeader: {
      padding: '8px 12px',
      background: theme.background.hoverable,
      fontSize: 11,
      fontWeight: 600,
      color: theme.textMutedColor,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      borderBottom: `1px solid ${theme.appBorderColor}`,
    } as React.CSSProperties,
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '6px 12px',
      borderBottom: `1px solid ${theme.background.hoverable}`,
      fontSize: 12,
    } as React.CSSProperties,
    key: {
      color: theme.textMutedColor,
      fontFamily: 'monospace',
    } as React.CSSProperties,
    value: {
      color: theme.color.defaultText,
      fontFamily: 'monospace',
      maxWidth: 200,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    } as React.CSSProperties,
    arrow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 16,
      color: theme.appBorderColor,
      padding: '0 4px',
    } as React.CSSProperties,
  };
}

function useKindColors() {
  const theme = useTheme();
  return {
    entity: theme.color.secondary,
    'scene-ref': theme.color.positive,
    component: theme.textMutedColor,
    string: theme.textMutedColor,
  } as Record<string, string>;
}

function EntityDetail({ node }: { node: SceneTreeNode }) {
  const styles = useStyles();
  const entity = node.entity;
  if (!entity) return null;

  const props = node.props ?? {};
  const slots = node.slots ?? {};
  const propEntries = Object.entries(props);
  const slotEntries = Object.entries(slots);

  return (
    <div>
      <div style={styles.subtitle}>
        mapping: {entity.mapping.split('/').slice(-3).join('/')}
        {entity.record !== undefined && ` — record #${entity.record}`}
      </div>

      <div style={styles.columns}>
        {/* Left: data source */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>Data Source</div>
          {propEntries.map(([key]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>{key}</span>
            </div>
          ))}
          {slotEntries.map(([key]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>{key}</span>
            </div>
          ))}
          {propEntries.length === 0 && slotEntries.length === 0 && (
            <div style={{ ...styles.row, color: styles.subtitle.color }}>no fields</div>
          )}
        </div>

        {/* Arrow */}
        <div style={styles.arrow}>→</div>

        {/* Right: resolved component */}
        <div style={styles.column}>
          <div style={styles.columnHeader}>{node.component}</div>
          {propEntries.map(([key, val]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>props.{key}</span>
              <span style={styles.value}>{formatValue(val)}</span>
            </div>
          ))}
          {slotEntries.map(([key, children]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>slot: {key}</span>
              <span style={styles.value}>
                {children.length} node{children.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SceneRefDetail({ node }: { node: SceneTreeNode }) {
  const styles = useStyles();
  const kindColors = useKindColors();
  const ref = node.ref;
  if (!ref) return null;

  return (
    <div>
      <div style={styles.subtitle}>ref: {ref.source}</div>
      {ref.with && (
        <div style={styles.column}>
          <div style={styles.columnHeader}>Variables (with)</div>
          {Object.entries(ref.with).map(([key, val]) => (
            <div key={key} style={styles.row}>
              <span style={styles.key}>${key}</span>
              <span style={styles.value}>{formatValue(val)}</span>
            </div>
          ))}
        </div>
      )}
      {node.children && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: styles.key.color, marginBottom: 4 }}>
            Resolves to {node.children.length} node{node.children.length !== 1 ? 's' : ''}:
          </div>
          {node.children.map((child, i) => (
            <div key={i} style={{ padding: '2px 0', fontSize: 12 }}>
              <span style={{ color: kindColors[child.kind], fontWeight: 600, fontSize: 10, marginRight: 8 }}>
                {child.kind}
              </span>
              {child.component}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComponentDetail({ node }: { node: SceneTreeNode }) {
  const styles = useStyles();
  const props = node.props ?? {};
  const slots = node.slots ?? {};
  const propEntries = Object.entries(props);
  const slotEntries = Object.entries(slots);

  if (propEntries.length === 0 && slotEntries.length === 0) {
    return <div style={{ color: styles.subtitle.color }}>No props or slots.</div>;
  }

  return (
    <div style={styles.column}>
      <div style={styles.columnHeader}>{node.component}</div>
      {propEntries.map(([key, val]) => (
        <div key={key} style={styles.row}>
          <span style={styles.key}>props.{key}</span>
          <span style={styles.value}>{formatValue(val)}</span>
        </div>
      ))}
      {slotEntries.map(([key, children]) => (
        <div key={key} style={styles.row}>
          <span style={styles.key}>slot: {key}</span>
          <span style={styles.value}>
            {children.length} node{children.length !== 1 ? 's' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(val: unknown): string {
  if (typeof val === 'string') return `"${val}"`;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (val === null || val === undefined) return 'null';
  return JSON.stringify(val);
}

export function MappingDetail({ node, onBack }: MappingDetailProps) {
  const styles = useStyles();
  const kindColors = useKindColors();
  const color = kindColors[node.kind] ?? (styles.subtitle.color as string);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {onBack && (
          <button style={styles.backButton} onClick={onBack}>
            ← Back
          </button>
        )}
        <span style={styles.kindBadge(color)}>{node.kind}</span>
        <span style={styles.title}>
          {node.kind === 'entity'
            ? `${node.entity?.entity_type}/${node.entity?.bundle}`
            : node.kind === 'scene-ref'
              ? node.ref?.source
              : node.component}
        </span>
      </div>

      {node.kind === 'entity' && <EntityDetail node={node} />}
      {node.kind === 'scene-ref' && <SceneRefDetail node={node} />}
      {node.kind === 'component' && <ComponentDetail node={node} />}
      {node.kind === 'string' && <div style={{ color: styles.key.color }}>String value: &quot;{node.value}&quot;</div>}
    </div>
  );
}
