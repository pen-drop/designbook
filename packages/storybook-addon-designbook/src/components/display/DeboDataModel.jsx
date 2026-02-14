
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboAlert } from '../ui/DeboAlert.jsx';

function BundleSummary({ name, bundle }) {
    const fieldCount = bundle.fields ? Object.keys(bundle.fields).length : 0;
    return (
        <div className="debo:mb-2 debo:last:mb-0">
            <div className="debo:flex debo:justify-between debo:text-sm">
                <span className="debo:font-medium debo:text-base-content">{name}</span>
                <span className="debo:badge debo:badge-ghost debo:badge-sm">{fieldCount} fields</span>
            </div>
            {bundle.description && (
                <p className="debo:text-xs debo:text-base-content/40 debo:mt-0.5">{bundle.description}</p>
            )}
        </div>
    );
}

function EntityGroup({ type, bundles }) {
    const bundleEntries = Object.entries(bundles || {});

    if (bundleEntries.length === 0) return null;

    const content = (
        <div className="debo:pl-2 debo:space-y-2">
            {bundleEntries.map(([key, def]) => (
                <BundleSummary key={key} name={def.title || key} bundle={def} />
            ))}
        </div>
    );

    return (
        <DeboCollapsible title={type} count={bundleEntries.length} defaultOpen={true}>
            {content}
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
            <div className="debo:space-y-2">
                {entityTypes.map(([type, bundles]) => (
                    <EntityGroup key={type} type={type} bundles={bundles} />
                ))}
            </div>
        </div>
    );
}
