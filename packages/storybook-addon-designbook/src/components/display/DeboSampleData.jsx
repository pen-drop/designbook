
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboBulletList } from '../ui/DeboBulletList.jsx';

/**
 * DeboSampleData — Displays sample data from a section's data.yml.
 * Shows model descriptions, relationships, and a collapsible raw JSON view.
 *
 * @param {Object} props
 * @param {Object} props.data - The parsed data.yml content
 */
export function DeboSampleData({ data }) {
    if (!data) return null;

    const meta = data._meta || {};
    const models = meta.models || {};
    const relationships = meta.relationships || [];

    // Collect records — support both flat arrays and nested entity structure (node.article: [...])
    const recordEntries = [];
    for (const [key, value] of Object.entries(data)) {
        if (key === '_meta') continue;
        if (Array.isArray(value)) {
            recordEntries.push([key, value]);
        } else if (value && typeof value === 'object') {
            // Nested: { node: { article: [...] } } → "node/article"
            for (const [subKey, subValue] of Object.entries(value)) {
                if (Array.isArray(subValue)) {
                    recordEntries.push([`${key}/${subKey}`, subValue]);
                }
            }
        }
    }
    const totalRecords = recordEntries.reduce((sum, [, arr]) => sum + arr.length, 0);

    // Flatten all data for raw view (excluding _meta)
    const dataWithoutMeta = Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== '_meta')
    );

    return (
        <div>
            <p className="debo:text-base-content/60 debo:text-sm debo:mt-1">
                <span className="debo:badge debo:badge-ghost debo:badge-sm debo:mr-2">{recordEntries.length} model{recordEntries.length !== 1 ? 's' : ''}</span>
                <span className="debo:badge debo:badge-ghost debo:badge-sm">{totalRecords} record{totalRecords !== 1 ? 's' : ''}</span>
            </p>

            {Object.keys(models).length > 0 && (
                <DeboCollapsible title="Data Models" count={Object.keys(models).length} defaultOpen>
                    <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 debo:gap-3">
                        {Object.entries(models).map(([name, description]) => (
                            <div
                                key={name}
                                className="debo:card debo:card-compact debo:card-bordered debo:bg-base-100"
                            >
                                <div className="debo:card-body">
                                    <span className="debo:font-medium debo:text-sm debo:text-base-content">
                                        {name}
                                    </span>
                                    <p className="debo:text-xs debo:text-base-content/50">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </DeboCollapsible>
            )}

            {relationships.length > 0 && (
                <DeboCollapsible title="Relationships" count={relationships.length}>
                    <DeboBulletList items={relationships} />
                </DeboCollapsible>
            )}

            {Object.keys(dataWithoutMeta).length > 0 && (
                <DeboCollapsible title="Raw Data">
                    <div className="debo:mockup-code debo:text-xs debo:max-h-96 debo:overflow-y-auto">
                        <pre><code>{JSON.stringify(dataWithoutMeta, null, 2)}</code></pre>
                    </div>
                </DeboCollapsible>
            )}
        </div>
    );
}
