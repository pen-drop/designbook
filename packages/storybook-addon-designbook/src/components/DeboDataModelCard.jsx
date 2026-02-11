import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

function BundleSummary({ name, bundle }) {
  const fieldCount = bundle.fields ? Object.keys(bundle.fields).length : 0;
  return (
    <div className="debo:mb-2 debo:last:mb-0">
      <div className="debo:flex debo:justify-between debo:text-sm">
        <span className="debo:font-medium debo:text-base-content">{name}</span>
        <span className="debo:text-xs debo:text-base-content/50">{fieldCount} fields</span>
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

export function DeboDataModelCard({ data }) {
  // Handle empty or loading states if passed down, mostly handled by DeboSection but card needs to handle data structure
  if (!data || !data.content) return null;

  const content = data.content;
  const entityTypes = Object.entries(content);

  return (
    <DeboCard title="Data Model">
      <div className="debo:mb-4 debo:p-3 debo:bg-base-200 debo:rounded-md debo:text-sm debo:text-base-content/70">
        <p><strong>Read Only:</strong> This data model is managed by the AI assistant. Run the <code>/debo-data-model</code> workflow to make changes.</p>
      </div>
      <div className="debo:space-y-2">
        {entityTypes.map(([type, bundles]) => (
          <EntityGroup key={type} type={type} bundles={bundles} />
        ))}
      </div>
    </DeboCard>
  );
}
