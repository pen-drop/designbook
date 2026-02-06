/**
 * DeboEmptyState — Empty state display with AI command reference.
 *
 * @param {Object} props
 * @param {string} props.message — Main empty state heading
 * @param {string} props.command — AI command to reference (e.g., "/product-vision")
 * @param {string} [props.filePath] — Where the data will be saved
 */
export function DeboEmptyState({ message, command, filePath }) {
  return (
    <div className="debo:card debo:bg-base-200 debo:border debo:border-base-300">
      <div className="debo:card-body debo:items-center debo:text-center">
        <h3 className="debo:card-title debo:text-base-content/70">{message}</h3>
        <p className="debo:text-base-content/50 debo:mt-2">
          Run the AI command in your editor:
        </p>
        <div className="debo:mt-4 debo:px-4 debo:py-2 debo:bg-base-300 debo:rounded-lg debo:font-mono debo:text-sm debo:text-base-content">
          {command}
        </div>
        {filePath && (
          <p className="debo:text-base-content/40 debo:text-xs debo:mt-3">
            The result will be saved to{' '}
            <code className="debo:text-base-content/50">{filePath}</code> and
            displayed here.
          </p>
        )}
      </div>
    </div>
  );
}
