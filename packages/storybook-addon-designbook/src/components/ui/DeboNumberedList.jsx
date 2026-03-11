bitte/**
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
 * Optionally linkable: each item can specify its own `linkTo`, or a single `linkTo`
 * prop can be passed to make all items navigate to the same page.
 *
 * @param {Object} props
 * @param {Array<{title: string, description: string|React.ReactNode, linkTo?: string}>} props.items
 * @param {string} [props.linkTo] — Shared Storybook path (overridden by per-item linkTo)
 */
export function DeboNumberedList({ items, linkTo }) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="debo:menu debo:menu-lg debo:bg-base-100 debo:rounded-box debo:p-0">
      {items.map((item, index) => {
        const itemLink = item.linkTo || linkTo;

        const content = (
          <>
            <span className="debo:badge debo:badge-ghost debo:badge-sm debo:font-medium debo:shrink-0">
              {index + 1}
            </span>
            <div className="debo:min-w-0 debo:flex-1">
              <span className="debo:font-medium debo:text-base-content">
                {item.title}
              </span>
              {item.description && typeof item.description === 'string' ? (
                <p className="debo:text-base-content/50 debo:text-sm debo:mt-0.5 debo:line-clamp-1">
                  {item.description}
                </p>
              ) : (
                item.description
              )}
            </div>
          </>
        );

        if (itemLink) {
          return (
            <li key={index}>
              <button
                type="button"
                onClick={() => navigateStorybook(itemLink)}
                className="debo:flex debo:items-center debo:gap-4"
              >
                {content}
                <svg
                  className="debo:w-4 debo:h-4 debo:text-base-content/30 debo:shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </li>
          );
        }

        return (
          <li key={index}>
            <div className="debo:flex debo:items-center debo:gap-4">
              {content}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
