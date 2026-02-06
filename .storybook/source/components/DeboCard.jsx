/**
 * DeboCard — Card wrapper with consistent Designbook styling.
 *
 * @param {Object} props
 * @param {string} [props.title] — Optional card heading
 * @param {React.ReactNode} props.children — Card body content
 */
export function DeboCard({ title, children }) {
  return (
    <div className="debo:card debo:bg-base-100 debo:border debo:border-base-300 debo:shadow-sm">
      <div className="debo:card-body debo:p-6">
        {title && (
          <h3 className="debo:card-title debo:text-lg debo:font-semibold debo:text-base-content">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
