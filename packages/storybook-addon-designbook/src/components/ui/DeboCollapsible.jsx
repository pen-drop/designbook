/**
 * DeboCollapsible — Expandable/collapsible section using DaisyUI collapse.
 *
 * @param {Object} props
 * @param {string} props.title — Section heading
 * @param {number} [props.count] — Optional badge showing item count
 * @param {boolean} [props.defaultOpen=false] — Initial open state
 * @param {React.ReactNode} props.children — Collapsible content
 */
export function DeboCollapsible({ title, count, defaultOpen = false, children }) {
  return (
    <div className="debo:collapse debo:collapse-arrow debo:bg-base-100 debo:mt-4">
      <input type="checkbox" defaultChecked={defaultOpen} />
      <div className="debo:collapse-title debo:text-sm debo:font-medium debo:uppercase debo:tracking-wide debo:text-base-content/60">
        {title}
        {count != null && (
          <span className="debo:badge debo:badge-sm debo:badge-ghost debo:ml-2 debo:normal-case debo:tracking-normal">
            {count}
          </span>
        )}
      </div>
      <div className="debo:collapse-content">{children}</div>
    </div>
  );
}
