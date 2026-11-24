import React, { useState, useMemo, useCallback } from 'react';
import { useTheme } from 'storybook/theming';

/** Module-level store so open/close state survives component remounts. */
const _openStates = new Map();

function createStyles(theme) {
  return {
    container: {
      card: {
        border: `1px solid ${theme.appBorderColor}`,
        borderRadius: '8px',
        boxShadow: '0px 2px 12px -6px rgba(0,0,0,0.05)',
      },
      'action-summary': {
        border: `1px solid ${theme.appBorderColor}`,
        borderRadius: '8px',
      },
      'action-item': {
        background: 'transparent',
        borderRadius: 0,
      },
    },
    summary: {
      card: {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fontWeight: 600,
        lineHeight: '30px',
        letterSpacing: '-0.44px',
        color: theme.color.defaultText,
        background: theme.background.hoverable,
        padding: '20px',
        cursor: 'pointer',
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
      },
      'action-summary': {
        fontFamily: 'inherit',
        fontSize: '15px',
        fontWeight: 700,
        lineHeight: '22px',
        color: theme.color.defaultText,
        padding: '10px 12px',
        cursor: 'pointer',
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      },
      'action-item': {
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 700,
        lineHeight: '20px',
        color: theme.color.defaultText,
        padding: '6px 6px 6px 10px',
        cursor: 'pointer',
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      },
      'action-inline': {
        fontFamily: 'inherit',
        fontSize: '14px',
        fontWeight: 600,
        lineHeight: '20px',
        color: theme.color.defaultText,
        padding: '4px 0',
        cursor: 'pointer',
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      },
    },
    content: {
      card: {
        outer: {},
        inner: { padding: '20px' },
      },
      'action-summary': {
        outer: { borderTop: `1px solid ${theme.appBorderColor}` },
        inner: { padding: '10px 12px', display: 'grid', gap: '6px' },
      },
      'action-item': {
        outer: {},
        inner: { padding: '6px 6px 6px 10px', display: 'grid', gap: '4px' },
      },
      'action-inline': {
        outer: {},
        inner: { padding: '4px 0 4px 18px', display: 'grid', gap: '2px' },
      },
    },
    badge: {
      fontFamily: 'sans-serif',
      background: theme.background.hoverable,
      color: theme.textMutedColor,
      fontSize: '12px',
      fontWeight: 600,
      lineHeight: '16px',
      borderRadius: '9999px',
      padding: '2px 8px',
      marginLeft: '12px',
      display: 'inline-flex',
      alignItems: 'center',
    },
  };
}

function getProgressBar(progress, statusColor) {
  if (!progress || progress.total === 0) return null;
  const pct = Math.round((progress.done / progress.total) * 100);
  return (
    <div
      style={{
        height: 3,
        background: `linear-gradient(to right, ${statusColor} ${pct}%, transparent ${pct}%)`,
      }}
    />
  );
}

/**
 * DeboCollapsible — Expandable/collapsible section using native details/summary.
 *
 * @param {Object} props
 * @param {string|React.ReactNode} props.title — Section heading
 * @param {number} [props.count] — Optional badge showing item count
 * @param {boolean} [props.defaultOpen=false] — Initial open state
 * @param {'card'|'action-summary'|'action-item'|'action-inline'} [props.variant='card'] — Visual variant
 * @param {'done'|'running'|'pending'} [props.status='pending'] — Status color (action variants only)
 * @param {{ done: number, total: number }} [props.progress] — Progress bar (action-summary only)
 * @param {string} [props.id] — Unique ID for state persistence across remounts
 * @param {React.ReactNode} props.children — Collapsible content
 */
export function DeboCollapsible({
  title,
  count,
  defaultOpen = false,
  variant = 'card',
  status = 'pending',
  progress,
  id,
  children,
}) {
  const [open, setOpenRaw] = useState(() => {
    if (id && _openStates.has(id)) return _openStates.get(id);
    return defaultOpen;
  });
  const setOpen = useCallback(
    (v) => {
      const next = typeof v === 'function' ? v(open) : v;
      if (id) _openStates.set(id, next);
      setOpenRaw(next);
    },
    [id, open],
  );
  const theme = useTheme();
  const S = useMemo(() => createStyles(theme), [theme]);

  const STATUS_COLORS = {
    done: theme.color.positive,
    running: theme.background.warning,
    pending: theme.background.hoverable,
  };

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

  let containerStyle;
  if (variant === 'card') {
    containerStyle = S.container.card;
  } else if (variant === 'action-summary') {
    containerStyle = S.container['action-summary'];
  } else if (variant === 'action-inline') {
    containerStyle = {
      background: 'transparent',
      borderRadius: 0,
      borderBottom: `2px solid ${statusColor}`,
    };
  } else {
    containerStyle = S.container['action-item'];
  }

  const baseSummaryStyle = S.summary[variant] || S.summary.card;
  const contentStyle = S.content[variant] || S.content.card;
  const progressBar = variant === 'action-summary' ? getProgressBar(progress, statusColor) : null;

  const RADII = { card: '8px', 'action-summary': '8px' };
  const r = RADII[variant];
  const summaryRadius = r
    ? open
      ? `${r} ${r} 0 0`
      : r
    : undefined;
  const contentRadius = r ? `0 0 ${r} ${r}` : undefined;

  const summaryStyle = summaryRadius
    ? { ...baseSummaryStyle, borderRadius: summaryRadius }
    : baseSummaryStyle;

  return (
    <details open={open} style={containerStyle}>
      <summary
        style={progressBar ? { ...summaryStyle, display: 'block', padding: 0 } : summaryStyle}
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
      >
        <div
          style={progressBar ? { ...summaryStyle, padding: summaryStyle.padding } : { display: 'contents' }}
        >
          {title}
          {count != null && <span style={S.badge}>{count}</span>}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginLeft: 'auto',
              flexShrink: 0,
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {progressBar}
      </summary>
      <div style={{ ...contentStyle.outer, borderRadius: contentRadius }}>
        <div style={contentStyle.inner}>{children}</div>
      </div>
    </details>
  );
}
