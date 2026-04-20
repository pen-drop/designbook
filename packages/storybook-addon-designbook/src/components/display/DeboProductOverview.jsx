import React from 'react';
import { load as parseYaml } from 'js-yaml';
import { DeboSection } from '../DeboSection.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboProse } from '../ui/DeboTypography.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';

function parseVision(content) {
  try { return parseYaml(content); } catch { return null; }
}

function renderProblems(problems) {
  if (!problems?.length) return null;
  return problems.map((p, i) => (
    <DeboCollapsible key={p.title || i} title={p.title} defaultOpen={i === 0}>
      <DeboProse html={`<p>${p.solution}</p>`} />
    </DeboCollapsible>
  ));
}

export function DeboProductOverview() {
  return (
    <DeboSection
      title="Vision"
      dataPath="vision.yml"
      parser={parseVision}
      command="/debo vision"
      emptyMessage="No vision defined yet"
      renderContent={(vision) => (
        <DeboGrid gap="lg">
          <DeboCollapsible title={vision.product_name} defaultOpen>
            <DeboProse html={`<p>${vision.description}</p>`} />
          </DeboCollapsible>
          {vision.problems?.length > 0 && (
            <DeboCollapsible title="Problems &amp; Solutions" defaultOpen>
              <DeboGrid gap="sm">{renderProblems(vision.problems)}</DeboGrid>
            </DeboCollapsible>
          )}
          {vision.features?.length > 0 && (
            <DeboCollapsible title="Key Features">
              <DeboProse html={`<ul>${vision.features.map((f) => `<li>${f}</li>`).join('')}</ul>`} />
            </DeboCollapsible>
          )}
          {vision.design_reference && (
            <DeboCollapsible title="Design Reference">
              <DeboProse html={`<p><a href="${vision.design_reference.url}" target="_blank" rel="noopener">${vision.design_reference.label}</a></p>`} />
            </DeboCollapsible>
          )}
          {vision.references?.length > 0 && (
            <DeboCollapsible title="References">
              <DeboProse html={`<ul>${vision.references.map((r) => `<li>${r.label}${r.url ? ` — <code>${r.url}</code>` : ''}</li>`).join('')}</ul>`} />
            </DeboCollapsible>
          )}
        </DeboGrid>
      )}
    />
  );
}
