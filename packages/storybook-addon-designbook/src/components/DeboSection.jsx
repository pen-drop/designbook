import { useDesignbookData } from '../hooks/useDesignbookData.js';
import { DeboEmptyState } from './ui/DeboEmptyState.jsx';
import { DeboLoading } from './ui/DeboLoading.jsx';
import { DeboPageLayout } from './ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from './ui/DeboSourceFooter.jsx';
import { DeboAlert } from './ui/DeboAlert.jsx';

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
 * @param {string} [props.title] — Section heading displayed above the content
 * @param {string} [props.filePath] — Full file path for display in empty state
 * @param {boolean} [props.bare=false] — If true, renders content/loading/error/empty
 *   without DeboPageLayout, DeboSourceFooter, or command hint. Use when composing
 *   inside an outer layout (e.g., DeboStepIndicator or DeboPageLayout).
 */
export function DeboSection({ dataPath, parser, command, emptyMessage, renderContent, title, filePath, bare = false }) {
  const { data, loading, error, reload } = useDesignbookData(dataPath, parser);

  const displayPath = filePath || `designbook/${dataPath}`;

  const heading = title ? (
    <h2 className="debo:text-lg debo:font-semibold debo:text-base-content debo:pt-1 debo:pb-4 debo:mb-4 debo:border-b debo:border-base-300">
      {title}
    </h2>
  ) : null;

  if (loading) return <>{heading}<DeboLoading /></>;

  if (error) {
    return (
      <>
        {heading}
        <DeboAlert type="error" className="debo:font-sans debo:my-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="debo:h-5 debo:w-5 debo:shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Failed to load data: {error}</span>
        </DeboAlert>
      </>
    );
  }

  if (!data) {
    const empty = (
      <>
        {heading}
        <DeboEmptyState
          message={emptyMessage}
          command={command}
          filePath={displayPath}
        />
      </>
    );
    return bare ? empty : <DeboPageLayout gap="8">{empty}</DeboPageLayout>;
  }

  if (bare) {
    return <>{heading}{renderContent(data)}</>;
  }

  return (
    <DeboPageLayout>
      {heading}
      {renderContent(data)}
      <DeboSourceFooter path={displayPath} command={command} onReload={reload} />
    </DeboPageLayout>
  );
}
