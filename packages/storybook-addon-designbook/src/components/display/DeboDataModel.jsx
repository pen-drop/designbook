
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboCard } from '../ui/DeboCard.jsx';

const ENTITY_BADGE_COLORS = {
    node: 'red',
    block_content: 'green',
    media: 'purple',
};

function EntityGroup({ type, bundles }) {
    const bundleEntries = Object.entries(bundles || {});

    if (bundleEntries.length === 0) return null;

    return (
        <DeboCollapsible title={type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} count={bundleEntries.length} defaultOpen={true}>
            <div className="debo:grid debo:grid-cols-1 debo:md:grid-cols-2 debo:lg:grid-cols-3 debo:gap-4">
                {bundleEntries.map(([key, def]) => (
                    <DeboCard
                        key={key}
                        title={def.title || key}
                        badge={type}
                        badgeColor={ENTITY_BADGE_COLORS[type] || 'red'}
                        description={def.description}
                        entityPath={`${type}.${key}`}
                        fieldCount={def.fields ? Object.keys(def.fields).length : 0}
                    />
                ))}
            </div>
        </DeboCollapsible>
    );
}

/**
 * DeboDataModel — Displays the data model definition with entity groups.
 *
 * @param {Object} props
 * @param {Object} props.data - Data model data with content property
 */
export function DeboDataModel({ data }) {
    if (!data || !data.content) return null;

    const content = data.content;
    const entityTypes = Object.entries(content);

    return (
        <div className="debo:flex debo:flex-col debo:gap-6">
            {entityTypes.map(([type, bundles]) => (
                <EntityGroup key={type} type={type} bundles={bundles} />
            ))}
        </div>
    );
}
