/**
 * DeboSourceFooter — Footer showing the source path with an optional reload button.
 *
 * @param {Object} props
 * @param {string} props.path - Source path to display
 * @param {Function} [props.onReload] - Callback for reload button (hidden if omitted)
 */
export function DeboSourceFooter({ path, onReload }) {
    return (
        <div className="debo:flex debo:items-center debo:justify-between debo:px-1">
            <p className="debo:text-base-content/40 debo:text-xs">
                Source: <code className="debo:text-base-content/50">{path}</code>
            </p>
            {onReload && (
                <button onClick={onReload} className="debo:btn debo:btn-ghost debo:btn-xs">
                    ↻ Reload
                </button>
            )}
        </div>
    );
}
