/**
 * DeboAlert — DaisyUI alert wrapper with type-based styling.
 *
 * @param {Object} props
 * @param {'info'|'success'|'warning'|'error'} [props.type] - Alert variant (omit for neutral)
 * @param {string} [props.className] - Additional classes
 * @param {React.ReactNode} props.children
 */
export function DeboAlert({ type, className = '', children }) {
    const typeClass = type ? `debo:alert-${type}` : '';
    return (
        <div role="alert" className={`debo:alert ${typeClass} ${className}`.trim()}>
            {children}
        </div>
    );
}
