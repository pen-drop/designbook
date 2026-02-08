import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * DeboDataModelCard — Displays a data model with entities and relationships.
 * Composed from DeboCard and DeboCollapsible base components.
 *
 * @param {Object} props
 * @param {Object} props.dataModel - Data model data
 * @param {Array<{name: string, description: string}>} props.dataModel.entities - Entity list
 * @param {string[]} props.dataModel.relationships - Relationship descriptions
 */
export function DeboDataModelCard({ dataModel }) {
  if (!dataModel) return null;

  return (
    <DeboCard title="Data Model">
      {dataModel.entities && dataModel.entities.length > 0 && (
        <DeboCollapsible title="Entities" count={dataModel.entities.length} defaultOpen>
          <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 debo:gap-3">
            {dataModel.entities.map((entity, index) => (
              <div
                key={index}
                className="debo:bg-base-200/50 debo:rounded-lg debo:p-4"
              >
                <h4 className="debo:font-semibold debo:text-base-content debo:mb-1">
                  {entity.name}
                </h4>
                <p className="debo:text-base-content/60 debo:text-sm debo:leading-relaxed">
                  {entity.description}
                </p>
              </div>
            ))}
          </div>
        </DeboCollapsible>
      )}

      {dataModel.relationships && dataModel.relationships.length > 0 && (
        <DeboCollapsible title="Relationships" count={dataModel.relationships.length} defaultOpen>
          <ul className="debo:space-y-2">
            {dataModel.relationships.map((rel, index) => (
              <li key={index} className="debo:flex debo:items-start debo:gap-3">
                <span className="debo:w-1.5 debo:h-1.5 debo:rounded-full debo:bg-base-content/40 debo:mt-2 debo:shrink-0" />
                <span className="debo:text-base-content/70">{rel}</span>
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}
    </DeboCard>
  );
}
