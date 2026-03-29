import React, { useState } from 'react';

const STATUS_COLORS = {
  done: 'rgb(102, 191, 60)',
  running: '#FEF3C7',
  pending: '#F1F5F9',
};

const CONTAINER_STYLES = {
  card: {
    background: 'white',
    border: '1px solid rgba(203,213,225,0.75)',
    borderRadius: '16px',
    boxShadow: '0px 2px 12px -6px rgba(0,0,0,0.05)',
    overflow: 'clip',
  },
  'action-summary': () => ({
    border: '1px solid rgba(203,213,225,0.5)',
    borderRadius: '8px',
    overflow: 'clip',
  }),
  'action-item': () => ({
    background: 'transparent',
    borderRadius: 0,
  }),
  'action-inline': (statusColor) => ({
    background: 'transparent',
    borderRadius: 0,
    borderBottom: `2px solid ${statusColor}`,
  }),
};

const SUMMARY_STYLES = {
  card: {
    fontFamily: 'sans-serif',
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: '30px',
    letterSpacing: '-0.44px',
    color: 'inherit',
    background: 'rgba(248,250,252,0.5)',
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
    color: 'inherit',
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
    color: 'inherit',
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
    color: 'inherit',
    padding: '4px 0',
    cursor: 'pointer',
    listStyle: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
};

const CONTENT_STYLES = {
  card: {
    outer: { borderTop: '1px solid #F1F5F9' },
    inner: { padding: '20px' },
  },
  'action-summary': {
    outer: { borderTop: '1px solid rgba(203,213,225,0.5)' },
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
};

function getProgressBar(progress, statusColor) {
  if (!progress || progress.total === 0) return null;
  const pct = Math.round((progress.done / progress.total) * 100);
  return (
    <div
      style={{
        height: 3,
        background: `linear-gradient(to right, ${statusColor} ${pct}%, #F1F5F9 ${pct}%)`,
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
 * @param {React.ReactNode} props.children — Collapsible content
 */
export function DeboCollapsible({ title, count, defaultOpen = false, variant = 'card', status = 'pending', progress, children }) {
  const [open, setOpen] = useState(defaultOpen);

  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;

  let containerStyle;
  if (variant === 'card') {
    containerStyle = CONTAINER_STYLES.card;
  } else if (variant === 'action-summary') {
    containerStyle = CONTAINER_STYLES['action-summary']();
  } else if (variant === 'action-inline') {
    containerStyle = CONTAINER_STYLES['action-inline'](statusColor);
  } else {
    containerStyle = CONTAINER_STYLES['action-item']();
  }

  const summaryStyle = SUMMARY_STYLES[variant] || SUMMARY_STYLES.card;
  const contentStyle = CONTENT_STYLES[variant] || CONTENT_STYLES.card;
  const progressBar = variant === 'action-summary' ? getProgressBar(progress, statusColor) : null;

  return (
    <details
      open={open}
      style={containerStyle}
    >
      <summary
        style={progressBar ? { ...summaryStyle, display: 'block', padding: 0 } : summaryStyle}
        onClick={(e) => { e.preventDefault(); setOpen(!open); }}
      >
        <div style={progressBar ? { ...summaryStyle, padding: summaryStyle.padding } : { display: 'contents' }}>
          {title}
          {count != null && (
            <span
              style={{
                fontFamily: 'sans-serif',
                background: 'rgba(226,232,240,0.8)',
                color: '#334155',
                fontSize: '12px',
                fontWeight: 600,
                lineHeight: '16px',
                borderRadius: '9999px',
                padding: '2px 8px',
                marginLeft: '12px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              {count}
            </span>
          )}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
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
      <div style={contentStyle.outer}>
        <div style={contentStyle.inner}>{children}</div>
      </div>
    </details>
  );
}
