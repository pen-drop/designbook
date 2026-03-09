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
    <div className="debo:collapse debo:collapse-arrow debo:bg-white debo:border debo:border-slate-200/75 debo:rounded-[16px] debo:shadow-[0px_2px_12px_-6px_rgba(0,0,0,0.05)] debo:overflow-clip">
      <input type="checkbox" defaultChecked={defaultOpen} />
      <div className="debo:collapse-title debo:!font-sans debo:text-lg debo:font-semibold debo:leading-7 debo:tracking-[-0.44px] debo:text-slate-900 debo:bg-slate-50/50 debo:px-5 debo:py-5">
        {title}
        {count != null && (
          <span className="debo:!font-sans debo:bg-slate-200/80 debo:text-slate-700 debo:text-xs debo:font-semibold debo:leading-4 debo:rounded-full debo:px-2 debo:py-0.5 debo:ml-3 debo:inline-flex debo:items-center">
            {count}
          </span>
        )}
      </div>
      <div className="debo:collapse-content debo:border-t debo:border-[#F1F5F9]">
        <div className="debo:pt-5">{children}</div>
      </div>
    </div>
  );
}
