import { useState } from 'react';

/**
 * DeboCollapsible — Expandable/collapsible section with title, count badge, and chevron.
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
    <div className="debo:mt-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="debo:flex debo:items-center debo:justify-between debo:w-full debo:py-2 debo:text-left"
        aria-expanded={open}
      >
        <span className="debo:text-sm debo:font-medium debo:text-base-content/60 debo:uppercase debo:tracking-wide">
          {title}
          {count != null && (
            <span className="debo:ml-2 debo:text-base-content/40 debo:normal-case debo:tracking-normal">
              ({count})
            </span>
          )}
        </span>
        <svg
          className={`debo:w-4 debo:h-4 debo:text-base-content/40 debo:transition-transform ${
            open ? 'debo:rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="debo:pt-2 debo:p-6">{children}</div>}
    </div>
  );
}
