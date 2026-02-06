import { useState, useEffect, useCallback } from 'react';
import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * Check if a file exists via the designbook middleware.
 */
async function fileExists(path) {
  try {
    const res = await fetch(`/__designbook/load?path=${encodeURIComponent(path)}`);
    if (!res.ok) return false;
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.exists === false) return false;
    } catch { /* plain text = exists */ }
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a section title to a kebab-case ID.
 */
function toSectionId(title) {
  return title
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse roadmap markdown to extract sections.
 */
function parseRoadmap(md) {
  const lines = md.split('\n');
  const sections = [];
  let currentSection = null;
  for (const line of lines) {
    const h3 = line.match(/^###\s+\d+\.\s+(.+)/);
    if (h3) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: h3[1].trim() };
      continue;
    }
  }
  if (currentSection) sections.push(currentSection);
  return sections;
}

/**
 * Checklist item with status icon.
 */
function ChecklistItem({ label, completed, detail }) {
  return (
    <div className="debo:flex debo:items-start debo:gap-3 debo:py-2">
      <span className={`debo:w-5 debo:h-5 debo:rounded-full debo:flex debo:items-center debo:justify-center debo:shrink-0 debo:mt-0.5 ${
        completed
          ? 'debo:bg-success/20 debo:text-success'
          : 'debo:bg-base-200 debo:text-base-content/30'
      }`}>
        {completed ? (
          <svg className="debo:w-3 debo:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <span className="debo:w-1.5 debo:h-1.5 debo:rounded-full debo:bg-current" />
        )}
      </span>
      <div>
        <span className={`debo:text-sm debo:font-medium ${completed ? 'debo:text-base-content' : 'debo:text-base-content/40'}`}>
          {label}
        </span>
        {detail && (
          <p className="debo:text-xs debo:text-base-content/40 debo:mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Export item card for the "What's Included" grid.
 */
function ExportItem({ icon, title, items }) {
  return (
    <div className="debo:rounded-lg debo:border debo:border-base-300 debo:p-4">
      <div className="debo:flex debo:items-center debo:gap-2 debo:mb-3">
        <span className="debo:text-base-content/40">{icon}</span>
        <span className="debo:font-semibold debo:text-sm debo:text-base-content">{title}</span>
      </div>
      <ul className="debo:space-y-1">
        {items.map((item, i) => (
          <li key={i} className="debo:text-xs debo:text-base-content/50 debo:flex debo:items-center debo:gap-1.5">
            <span className="debo:w-1 debo:h-1 debo:rounded-full debo:bg-base-content/20 debo:shrink-0" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * ExportPage — Shows export readiness status, what's included, and usage instructions.
 */
export function ExportPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({});
  const [sectionsWithDesigns, setSectionsWithDesigns] = useState(0);
  const [totalSections, setTotalSections] = useState(0);
  const [hasExport, setHasExport] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);

    // Check all top-level artifacts
    const [overview, roadmap, dataModel, tokens, shell] = await Promise.all([
      fileExists('product/product-overview.md'),
      fileExists('product/product-roadmap.md'),
      fileExists('data-model/data-model.md'),
      fileExists('design-system/design-tokens.md'),
      fileExists('design-shell/shell-spec.md'),
    ]);

    // Load roadmap to check section progress
    let sections = [];
    let designCount = 0;
    if (roadmap) {
      try {
        const res = await fetch('/__designbook/load?path=product/product-roadmap.md');
        if (res.ok) {
          let text = await res.text();
          try {
            const json = JSON.parse(text);
            if (json.content != null) text = json.content;
          } catch { /* plain text */ }
          sections = parseRoadmap(text);

          // Check which sections have screen designs
          const results = await Promise.all(
            sections.map(async (s) => {
              const id = toSectionId(s.title);
              return fileExists(`sections/${id}/screen-designs.md`);
            })
          );
          designCount = results.filter(Boolean).length;
        }
      } catch { /* ignore */ }
    }

    // Check for export zip
    const exportExists = await fileExists('export/product-plan.zip');

    setStatus({ overview, roadmap, dataModel, tokens, shell });
    setTotalSections(sections.length);
    setSectionsWithDesigns(designCount);
    setHasExport(exportExists);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="debo:font-sans debo:flex debo:justify-center debo:py-12">
        <span className="debo:loading debo:loading-spinner debo:loading-md" />
      </div>
    );
  }

  const allRequired = status.overview && status.roadmap;
  const completedCount = [status.overview, status.roadmap, status.dataModel, status.tokens, status.shell, sectionsWithDesigns > 0].filter(Boolean).length;
  const isReady = allRequired && sectionsWithDesigns > 0;

  return (
    <div className="debo:font-sans debo:max-w-2xl debo:mx-auto debo:py-6 debo:space-y-6">

      {/* Status header */}
      {isReady ? (
        <DeboCard>
          <div className="debo:flex debo:items-center debo:gap-4">
            <span className="debo:w-12 debo:h-12 debo:rounded-full debo:bg-success/20 debo:text-success debo:flex debo:items-center debo:justify-center debo:shrink-0">
              <svg className="debo:w-6 debo:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8 8-4-4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <h3 className="debo:font-semibold debo:text-lg debo:text-base-content">Ready for export!</h3>
              <p className="debo:text-sm debo:text-base-content/60 debo:mt-0.5">
                Your product plan is complete. Run <code className="debo:bg-base-200 debo:px-1.5 debo:py-0.5 debo:rounded debo:text-xs">/export-product</code> to generate the export package.
              </p>
            </div>
          </div>
        </DeboCard>
      ) : (
        <DeboCard>
          <div className="debo:flex debo:items-center debo:gap-4">
            <span className="debo:w-12 debo:h-12 debo:rounded-full debo:bg-warning/20 debo:text-warning debo:flex debo:items-center debo:justify-center debo:shrink-0">
              <svg className="debo:w-6 debo:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </span>
            <div>
              <h3 className="debo:font-semibold debo:text-lg debo:text-base-content">Not ready yet</h3>
              <p className="debo:text-sm debo:text-base-content/60 debo:mt-0.5">
                Complete the items below before exporting. {completedCount} of 6 items done.
              </p>
            </div>
          </div>
        </DeboCard>
      )}

      {/* Completion checklist */}
      <DeboCard title="Completion Checklist">
        <div className="debo:mt-2 debo:divide-y debo:divide-base-200">
          <ChecklistItem
            label="Product Overview"
            completed={status.overview}
            detail={status.overview ? null : 'Run /product-vision'}
          />
          <ChecklistItem
            label="Product Roadmap"
            completed={status.roadmap}
            detail={status.roadmap ? null : 'Run /product-roadmap'}
          />
          <ChecklistItem
            label="Data Model"
            completed={status.dataModel}
            detail={status.dataModel ? null : 'Run /data-model'}
          />
          <ChecklistItem
            label="Design System"
            completed={status.tokens}
            detail={status.tokens ? null : 'Run /design-tokens'}
          />
          <ChecklistItem
            label="Application Shell"
            completed={status.shell}
            detail={status.shell ? null : 'Run /design-shell'}
          />
          <ChecklistItem
            label={`Sections with screen designs (${sectionsWithDesigns}/${totalSections})`}
            completed={sectionsWithDesigns > 0}
            detail={sectionsWithDesigns === 0 ? 'Run /shape-section, /sample-data, /design-screen' : null}
          />
        </div>
      </DeboCard>

      {/* What's Included */}
      <DeboCard title="What's Included">
        <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 debo:gap-3 debo:mt-3">
          <ExportItem
            icon={
              <svg className="debo:w-4 debo:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            }
            title="Ready-to-Use Prompts"
            items={['One-shot implementation prompt', 'Section-by-section template', 'Pre-written for AI coding agents']}
          />
          <ExportItem
            icon={
              <svg className="debo:w-4 debo:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            }
            title="Instructions"
            items={['Product overview document', 'Milestone-by-milestone guide', 'Foundation + section instructions']}
          />
          <ExportItem
            icon={
              <svg className="debo:w-4 debo:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072" />
              </svg>
            }
            title="Design System"
            items={['Color palette tokens', 'Typography definitions', 'Tailwind configuration']}
          />
          <ExportItem
            icon={
              <svg className="debo:w-4 debo:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
              </svg>
            }
            title="Data Model"
            items={['Entity definitions', 'Sample data per section', 'Relationship documentation']}
          />
          <ExportItem
            icon={
              <svg className="debo:w-4 debo:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L12 12.75 6.429 9.75m11.142 0l4.179 2.25L12 17.25 2.25 12l4.179-2.25m11.142 0l4.179 2.25L12 22.5l-9.75-5.25 4.179-2.25" />
              </svg>
            }
            title="Components"
            items={['Shell layout components', 'Section screen designs', 'Screenshots as references']}
          />
          <ExportItem
            icon={
              <svg className="debo:w-4 debo:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            }
            title="Test Instructions"
            items={['User flow test specs', 'Empty state tests', 'Per-section test plans']}
          />
        </div>
      </DeboCard>

      {/* How to Use */}
      <DeboCard title="How to Use the Export">
        <DeboCollapsible title="Option A: Incremental (recommended)" defaultOpen>
          <ol className="debo:list-decimal debo:pl-5 debo:space-y-2 debo:text-sm debo:text-base-content/70">
            <li>Run <code className="debo:bg-base-200 debo:px-1 debo:rounded debo:text-xs">/export-product</code> to generate the export package</li>
            <li>Copy the <code className="debo:text-xs">product-plan/</code> folder into your implementation project</li>
            <li>Start with <code className="debo:text-xs">instructions/incremental/01-foundation.md</code></li>
            <li>Work through each milestone in order</li>
            <li>Use section prompts from <code className="debo:text-xs">prompts/section-prompt.md</code> for AI assistance</li>
          </ol>
        </DeboCollapsible>
        <DeboCollapsible title="Option B: One-Shot">
          <ol className="debo:list-decimal debo:pl-5 debo:space-y-2 debo:text-sm debo:text-base-content/70">
            <li>Run <code className="debo:bg-base-200 debo:px-1 debo:rounded debo:text-xs">/export-product</code> to generate the export package</li>
            <li>Copy the <code className="debo:text-xs">product-plan/</code> folder into your implementation project</li>
            <li>Use <code className="debo:text-xs">prompts/one-shot-prompt.md</code> as a single AI prompt</li>
            <li>The prompt includes all instructions and references</li>
          </ol>
        </DeboCollapsible>
      </DeboCard>

      {/* Footer */}
      <div className="debo:flex debo:items-center debo:justify-between debo:px-1">
        <p className="debo:text-base-content/40 debo:text-xs">
          Source: <code className="debo:text-base-content/50">designbook/</code>
        </p>
        <button onClick={load} className="debo:btn debo:btn-ghost debo:btn-xs">
          ↻ Reload
        </button>
      </div>
    </div>
  );
}
