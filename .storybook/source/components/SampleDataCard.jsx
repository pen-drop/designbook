import { useState } from 'react';
import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * SampleDataCard — Displays sample data from a section's data.json.
 * Shows model descriptions, relationships, and a collapsible raw JSON view.
 *
 * @param {Object} props
 * @param {Object} props.data - The parsed data.json content
 */
export function SampleDataCard({ data }) {
  if (!data) return null;

  const meta = data._meta || {};
  const models = meta.models || {};
  const relationships = meta.relationships || [];

  // Count records (top-level arrays, excluding _meta)
  const recordEntries = Object.entries(data).filter(
    ([key, value]) => key !== '_meta' && Array.isArray(value)
  );
  const totalRecords = recordEntries.reduce((sum, [, arr]) => sum + arr.length, 0);

  // Data without _meta for JSON view
  const dataWithoutMeta = Object.fromEntries(
    Object.entries(data).filter(([key]) => key !== '_meta')
  );

  return (
    <DeboCard title="Sample Data">
      <p className="debo:text-base-content/60 debo:text-sm debo:mt-1">
        {recordEntries.length} model{recordEntries.length !== 1 ? 's' : ''} &middot; {totalRecords} record{totalRecords !== 1 ? 's' : ''}
      </p>

      {Object.keys(models).length > 0 && (
        <DeboCollapsible title="Data Models" count={Object.keys(models).length} defaultOpen>
          <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 debo:gap-3">
            {Object.entries(models).map(([name, description]) => (
              <div
                key={name}
                className="debo:rounded-lg debo:border debo:border-base-300 debo:p-3"
              >
                <span className="debo:font-medium debo:text-sm debo:text-base-content">
                  {name}
                </span>
                <p className="debo:text-xs debo:text-base-content/50 debo:mt-1">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </DeboCollapsible>
      )}

      {relationships.length > 0 && (
        <DeboCollapsible title="Relationships" count={relationships.length}>
          <ul className="debo:space-y-2">
            {relationships.map((rel, index) => (
              <li key={index} className="debo:flex debo:items-start debo:gap-3">
                <span className="debo:w-1.5 debo:h-1.5 debo:rounded-full debo:bg-base-content/40 debo:mt-2 debo:shrink-0" />
                <span className="debo:text-base-content/70 debo:text-sm">{rel}</span>
              </li>
            ))}
          </ul>
        </DeboCollapsible>
      )}

      {Object.keys(dataWithoutMeta).length > 0 && (
        <DeboCollapsible title="Raw Data">
          <pre className="debo:bg-base-200 debo:rounded-lg debo:p-4 debo:text-xs debo:text-base-content/70 debo:overflow-x-auto debo:max-h-96 debo:overflow-y-auto">
            {JSON.stringify(dataWithoutMeta, null, 2)}
          </pre>
        </DeboCollapsible>
      )}
    </DeboCard>
  );
}
