import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * DeboSectionSpecCard — Displays a section specification.
 * Composed from DeboCard and DeboCollapsible base components.
 *
 * @param {Object} props
 * @param {Object} props.spec - Section specification data
 * @param {string} props.spec.title - Section title
 * @param {string} [props.spec.overview] - Section overview description
 * @param {string[]} [props.spec.userFlows] - User flow descriptions
 * @param {string[]} [props.spec.uiRequirements] - UI requirement descriptions
 * @param {boolean} [props.spec.useShell] - Whether section uses the app shell
 */
export function DeboSectionSpecCard({ spec }) {
  if (!spec) return null;

  return (
    <DeboCard title={spec.title}>
      {spec.overview && (
        <p className="debo:text-base-content/70 debo:leading-relaxed debo:mt-2">
          {spec.overview}
        </p>
      )}

      {spec.userFlows && spec.userFlows.length > 0 && (
        <DeboCollapsible title="User Flows" count={spec.userFlows.length} defaultOpen>
          <ul className="debo:space-y-2">
            {spec.userFlows.map((flow, index) => (
              <li key={index} className="debo:flex debo:items-start debo:gap-3">
                <span className="debo:w-1.5 debo:h-1.5 debo:rounded-full debo:bg-primary/60 debo:mt-2 debo:shrink-0" />
                <span className="debo:text-base-content/70">{flow}</span>
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}

      {spec.uiRequirements && spec.uiRequirements.length > 0 && (
        <DeboCollapsible title="UI Requirements" count={spec.uiRequirements.length}>
          <ul className="debo:space-y-2">
            {spec.uiRequirements.map((req, index) => (
              <li key={index} className="debo:flex debo:items-start debo:gap-3">
                <span className="debo:w-1.5 debo:h-1.5 debo:rounded-full debo:bg-base-content/40 debo:mt-2 debo:shrink-0" />
                <span className="debo:text-base-content/70">{req}</span>
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}

      {spec.useShell != null && (
        <div className="debo:mt-4 debo:flex debo:items-center debo:gap-2">
          <span className="debo:text-xs debo:font-medium debo:text-base-content/50 debo:uppercase debo:tracking-wide">
            Shell:
          </span>
          <span className={`debo:badge debo:badge-sm ${spec.useShell ? 'debo:badge-primary' : 'debo:badge-ghost'}`}>
            {spec.useShell ? 'Inside shell' : 'Standalone'}
          </span>
        </div>
      )}
    </DeboCard>
  );
}
