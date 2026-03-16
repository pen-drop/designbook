import { useState } from 'react';

/**
 * DeboCollapsible — Expandable/collapsible section using native details/summary.
 *
 * @param {Object} props
 * @param {string} props.title — Section heading
 * @param {number} [props.count] — Optional badge showing item count
 * @param {boolean} [props.defaultOpen=false] — Initial open state
 * @param {React.ReactNode} props.children — Collapsible content
 */
export function DeboCollapsible({ title, count, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.target.open)}
      style={{
        background: 'white',
        border: '1px solid rgba(203,213,225,0.75)',
        borderRadius: '16px',
        boxShadow: '0px 2px 12px -6px rgba(0,0,0,0.05)',
        overflow: 'clip',
      }}
    >
      <summary
        style={{
          fontFamily: 'sans-serif',
          fontSize: '18px',
          fontWeight: 600,
          lineHeight: '28px',
          letterSpacing: '-0.44px',
          color: '#0f172a',
          background: 'rgba(248,250,252,0.5)',
          padding: '20px',
          cursor: 'pointer',
          listStyle: 'none',
          display: 'flex',
          alignItems: 'center',
        }}
      >
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
      </summary>
      <div style={{ borderTop: '1px solid #F1F5F9' }}>
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </details>
  );
}
