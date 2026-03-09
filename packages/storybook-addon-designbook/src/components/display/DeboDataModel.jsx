
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboAlert } from '../ui/DeboAlert.jsx';
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
        <DeboCollapsible title={type.charAt(0).toUpperCase() + type.slice(1)} count={bundleEntries.length} defaultOpen={true}>
            <div className="debo:grid debo:grid-cols-1 debo:md:grid-cols-2 debo:gap-4">
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
        <div>
            <DeboAlert className="debo:mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="debo:h-5 debo:w-5 debo:shrink-0 debo:stroke-info">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="debo:text-sm"><strong>Read Only:</strong> Run <kbd className="debo:kbd debo:kbd-sm">/debo-data-model</kbd> to make changes.</span>
            </DeboAlert>
            <div className="debo:flex debo:flex-col debo:gap-6">
                {entityTypes.map(([type, bundles]) => (
                    <EntityGroup key={type} type={type} bundles={bundles} />
                ))}
            </div>
        </div>
    );
}
