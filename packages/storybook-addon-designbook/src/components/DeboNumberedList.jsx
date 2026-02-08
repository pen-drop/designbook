/**
 * Navigate to a Storybook page via the top-level window.
 * Storybook renders docs in an iframe, so we need window.top to navigate the shell.
 */
function navigateStorybook(storyPath) {
  try {
    const url = new URL(window.top.location.href);
    url.searchParams.set('path', storyPath);
    window.top.location.href = url.toString();
  } catch {
    window.location.href = `?path=${storyPath}`;
  }
}

/**
 * DeboNumberedList — Ordered list of items with numbered indicators, titles, and descriptions.
 * Optionally linkable: when `linkTo` is provided, each item becomes a clickable button
 * that navigates to the specified Storybook docs path (e.g., "/docs/sections-overview--docs").
 *
 * @param {Object} props
 * @param {Array<{title: string, description: string}>} props.items
 * @param {string} [props.linkTo] — Storybook path (e.g., "/docs/sections-overview--docs")
 */
export function DeboNumberedList({ items, linkTo }) {
  if (!items || items.length === 0) return null;

  return (
    <ol className="debo:divide-y debo:divide-base-200">
      {items.map((item, index) => {
        const content = (
          <>
            <span className="debo:flex debo:items-center debo:justify-center debo:w-7 debo:h-7 debo:rounded-full debo:bg-base-200 debo:text-base-content/60 debo:text-xs debo:font-medium debo:shrink-0">
              {index + 1}
            </span>
            <div className="debo:min-w-0 debo:flex-1">
              <span className="debo:font-medium debo:text-base-content">
                {item.title}
              </span>
              {item.description && (
                <p className="debo:text-base-content/50 debo:text-sm debo:mt-0.5 debo:line-clamp-1">
                  {item.description}
                </p>
              )}
            </div>
            {linkTo && (
              <svg
                className="debo:w-4 debo:h-4 debo:text-base-content/30 debo:shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </>
        );

        if (linkTo) {
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => navigateStorybook(linkTo)}
                className="debo:w-full debo:flex debo:items-center debo:gap-4 debo:py-4 debo:px-2 debo:text-left debo:bg-transparent debo:border-0 debo:cursor-pointer hover:debo:bg-base-200/50 debo:transition-colors debo:rounded"
              >
                {content}
              </button>
            </li>
          );
        }

        return (
          <li key={index} className="debo:flex debo:items-center debo:gap-4 debo:py-4 debo:px-2">
            {content}
          </li>
        );
      })}
    </ol>
  );
}
