/**
 * DeboNumberedList — Ordered list of items with numbered indicators, titles, and descriptions.
 *
 * @param {Object} props
 * @param {Array<{title: string, description: string}>} props.items
 */
export function DeboNumberedList({ items }) {
  if (!items || items.length === 0) return null;

  return (
    <ol className="debo:space-y-4">
      {items.map((item, index) => (
        <li key={index} className="debo:flex debo:items-start debo:gap-4">
          <span className="debo:flex debo:items-center debo:justify-center debo:w-7 debo:h-7 debo:rounded-full debo:bg-primary debo:text-primary-content debo:text-sm debo:font-bold debo:shrink-0">
            {index + 1}
          </span>
          <div className="debo:pt-0.5">
            <span className="debo:font-medium debo:text-base-content">
              {item.title}
            </span>
            {item.description && (
              <p className="debo:text-base-content/60 debo:text-sm debo:mt-0.5">
                {item.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
