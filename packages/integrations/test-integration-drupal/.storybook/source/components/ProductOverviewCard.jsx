import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * ProductOverviewCard — Displays a summary of the defined product vision
 * including name, description, problems/solutions, and key features.
 * Composed from DeboCard and DeboCollapsible base components.
 *
 * @param {Object} props
 * @param {Object} props.overview - Product overview data
 * @param {string} props.overview.name - Product name
 * @param {string} props.overview.description - Product description
 * @param {Array<{title: string, solution: string}>} props.overview.problems - Problems and solutions
 * @param {string[]} props.overview.features - Key features list
 */
export function ProductOverviewCard({ overview }) {
  if (!overview) return null;

  return (
    <DeboCard title={`Product overview: ${overview.name}`}>
      {overview.description && (
        <p className="debo:text-base-content/70 debo:leading-relaxed debo:mt-2">
          {overview.description}
        </p>
      )}

      {overview.problems && overview.problems.length > 0 && (
        <DeboCollapsible title="Problems & Solutions" count={overview.problems.length}>
          <ul className="debo:space-y-3">
            {overview.problems.map((problem, index) => (
              <li key={index} className="debo:flex debo:items-start debo:gap-3">
                <svg
                  className="debo:w-4 debo:h-4 debo:text-base-content debo:mt-1 debo:shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div>
                  <span className="debo:font-medium debo:text-base-content">
                    {problem.title}
                  </span>
                  <span className="debo:text-base-content/50 debo:mx-2">—</span>
                  <span className="debo:text-base-content/70">
                    {problem.solution}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}

      {overview.features && overview.features.length > 0 && (
        <DeboCollapsible title="Key Features" count={overview.features.length}>
          <ul className="debo:list-disc debo:pl-5 debo:space-y-1">
            {overview.features.map((feature, index) => (
              <li key={index} className="debo:text-base-content/80">
                {feature}
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}
    </DeboCard>
  );
}
