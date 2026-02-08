import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * ShellSpecCard — Displays the application shell specification.
 * Composed from DeboCard and DeboCollapsible base components.
 *
 * @param {Object} props
 * @param {Object} props.spec - Shell specification data
 * @param {string} [props.spec.overview] - Shell design overview
 * @param {string[]} [props.spec.navigationItems] - Navigation structure items
 * @param {string} [props.spec.userMenu] - User menu description
 * @param {string} [props.spec.layoutPattern] - Layout pattern description
 * @param {string} [props.spec.responsiveBehavior] - Responsive behavior description
 * @param {string} [props.spec.designNotes] - Additional design notes
 */
export function ShellSpecCard({ spec }) {
  if (!spec) return null;

  return (
    <DeboCard title="Application Shell">
      {spec.overview && (
        <p className="debo:text-base-content/70 debo:leading-relaxed debo:mt-2">
          {spec.overview}
        </p>
      )}

      {spec.navigationItems && spec.navigationItems.length > 0 && (
        <DeboCollapsible title="Navigation Structure" count={spec.navigationItems.length} defaultOpen>
          <ul className="debo:space-y-2">
            {spec.navigationItems.map((item, index) => (
              <li key={index} className="debo:flex debo:items-start debo:gap-3">
                <span className="debo:w-1.5 debo:h-1.5 debo:rounded-full debo:bg-base-content/40 debo:mt-2 debo:shrink-0" />
                <span className="debo:text-base-content/70">{item}</span>
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}

      {spec.userMenu && (
        <DeboCollapsible title="User Menu">
          <p className="debo:text-base-content/70 debo:leading-relaxed">{spec.userMenu}</p>
        </DeboCollapsible>
      )}

      {spec.layoutPattern && (
        <DeboCollapsible title="Layout Pattern">
          <p className="debo:text-base-content/70 debo:leading-relaxed">{spec.layoutPattern}</p>
        </DeboCollapsible>
      )}

      {spec.responsiveBehavior && (
        <DeboCollapsible title="Responsive Behavior">
          <p className="debo:text-base-content/70 debo:leading-relaxed debo:whitespace-pre-line">{spec.responsiveBehavior}</p>
        </DeboCollapsible>
      )}

      {spec.designNotes && (
        <DeboCollapsible title="Design Notes">
          <p className="debo:text-base-content/70 debo:leading-relaxed debo:whitespace-pre-line">{spec.designNotes}</p>
        </DeboCollapsible>
      )}
    </DeboCard>
  );
}
