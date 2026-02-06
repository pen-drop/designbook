import { useDesignbookData } from '../hooks/useDesignbookData.js';
import { DeboEmptyState } from './DeboEmptyState.jsx';

/**
 * DeboSection — Page section that combines data loading, empty state,
 * content rendering, reload button, and AI command reference.
 *
 * @param {Object} props
 * @param {string} props.dataPath — Relative path within designbook/ to load
 * @param {(markdown: string) => any} props.parser — Markdown-to-data parser
 * @param {string} props.command — AI command name (e.g., "/product-roadmap")
 * @param {string} props.emptyMessage — Displayed when no data exists
 * @param {(data: any) => React.ReactNode} props.renderContent — How to render the loaded data
 * @param {string} [props.filePath] — Full file path for display in empty state
 */
export function DeboSection({ dataPath, parser, command, emptyMessage, renderContent, filePath }) {
  const { data, loading, error, reload } = useDesignbookData(dataPath, parser);

  const displayPath = filePath || `designbook/${dataPath}`;

  if (loading) {
    return (
      <div className="debo:font-sans debo:flex debo:justify-center debo:py-12">
        <span className="debo:loading debo:loading-spinner debo:loading-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="debo:font-sans debo:alert debo:alert-error debo:my-4">
        <span>Failed to load data: {error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="debo:font-sans debo:max-w-2xl debo:mx-auto debo:py-8">
        <DeboEmptyState
          message={emptyMessage}
          command={command}
          filePath={displayPath}
        />
      </div>
    );
  }

  return (
    <div className="debo:font-sans debo:max-w-2xl debo:mx-auto debo:py-6 debo:space-y-4">
      {renderContent(data)}
      <div className="debo:flex debo:items-center debo:justify-between debo:px-1">
        <p className="debo:text-base-content/40 debo:text-xs">
          Source: <code className="debo:text-base-content/50">{displayPath}</code>
        </p>
        <div className="debo:flex debo:gap-2 debo:items-center">
          <button
            onClick={reload}
            className="debo:btn debo:btn-ghost debo:btn-xs"
          >
            ↻ Reload
          </button>
          <span className="debo:text-base-content/30 debo:text-xs debo:leading-loose">
            Update with <code className="debo:text-base-content/40">{command}</code>
          </span>
        </div>
      </div>
    </div>
  );
}
