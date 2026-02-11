import { useState, useEffect, useCallback } from 'react';
import { DeboCard } from './DeboCard.jsx';
import { DeboEmptyState } from './DeboEmptyState.jsx';

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
 * Navigate to a section's Storybook page via the top-level window.
 */
function navigateToSection(title) {
  const slug = toSectionId(title);
  const storyId = `sections-${slug}--docs`;
  try {
    const url = new URL(window.top.location.href);
    url.searchParams.set('path', `/docs/${storyId}`);
    window.top.location.href = url.toString();
  } catch {
    window.location.href = `?path=/docs/${storyId}`;
  }
}

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
 * Status indicator dot with label.
 */
function StatusDot({ label, completed }) {
  return (
    <span className="debo:flex debo:items-center debo:gap-1.5">
      <span className={`debo:w-3 debo:h-3 debo:rounded-full debo:border-2 debo:shrink-0 ${completed
        ? 'debo:bg-success debo:border-success'
        : 'debo:bg-transparent debo:border-base-content/20'
        }`} />
      <span className={`debo:text-xs ${completed ? 'debo:text-base-content/60' : 'debo:text-base-content/30'
        }`}>
        {label}
      </span>
    </span>
  );
}

/**
 * DeboSectionsOverview — Loads roadmap sections and checks all 4 artifacts per section.
 * Displays each section with step progress indicators (Spec, Data, Screen Designs, Screenshots).
 */
export function DeboSectionsOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roadmapSections, setRoadmapSections] = useState([]);
  const [sectionStatus, setSectionStatus] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Load roadmap from aggregated sections.json
      const res = await fetch('/__designbook/load?path=sections.json');
      if (!res.ok) {
        throw new Error('Failed to load sections.json');
      }
      const text = await res.text();
      let sections = [];
      try {
        const json = JSON.parse(text);
        if (json.content) {
          // The content is a stringified JSON array
          sections = JSON.parse(json.content);
        } else if (json.exists === false) {
          setRoadmapSections([]);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.error('Failed to parse sections.json', e);
      }

      setRoadmapSections(sections);

      // Check all 4 artifacts for each section
      const statuses = {};
      await Promise.all(
        sections.map(async (section) => {
          const id = section.id || toSectionId(section.title);
          const [hasSpec, hasData, hasDesigns, hasScreenshots] = await Promise.all([
            fileExists(`sections/${id}/spec.md`),
            fileExists(`sections/${id}/data.json`),
            fileExists(`sections/${id}/screen-designs.md`),
            fileExists(`sections/${id}/screenshots.md`),
          ]);
          statuses[id] = { spec: hasSpec, data: hasData, designs: hasDesigns, screenshots: hasScreenshots };
        })
      );
      setSectionStatus(statuses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="debo:font-sans debo:flex debo:justify-center debo:py-12">
        <span className="debo:loading debo:loading-spinner debo:loading-md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="debo:font-sans debo:alert debo:alert-error debo:my-4">
        <span>Failed to load sections: {error}</span>
      </div>
    );
  }

  if (roadmapSections.length === 0) {
    return (
      <div className="debo:font-sans debo:max-w-2xl debo:mx-auto debo:py-8">
        <DeboEmptyState
          message="No roadmap sections found"
          command="/debo-product-sections"
          filePath="designbook/product/product-roadmap.md"
        />
      </div>
    );
  }

  return (
    <div className="debo:font-sans debo:max-w-2xl debo:mx-auto debo:py-6 debo:space-y-4">
      <DeboCard title="All Sections">
        <div className="debo:divide-y debo:divide-base-200 debo:-mx-6 debo:mt-4">
          {roadmapSections.map((section, index) => {
            const sectionId = toSectionId(section.title);
            const status = sectionStatus[sectionId] || {};
            return (
              <button
                key={sectionId}
                type="button"
                onClick={() => navigateToSection(section.title)}
                className="debo:w-full debo:flex debo:items-start debo:gap-4 debo:px-6 debo:py-5 debo:text-left debo:bg-transparent debo:border-0 debo:cursor-pointer hover:debo:bg-base-200/50 debo:transition-colors"
              >
                <span className="debo:w-8 debo:h-8 debo:rounded-full debo:bg-base-200 debo:text-base-content/50 debo:flex debo:items-center debo:justify-center debo:text-sm debo:font-medium debo:shrink-0 debo:mt-0.5">
                  {index + 1}
                </span>
                <div className="debo:flex-1 debo:min-w-0">
                  <span className="debo:font-semibold debo:text-base-content">
                    {section.title}
                  </span>
                  {section.description && (
                    <p className="debo:text-sm debo:text-base-content/50 debo:mt-1">
                      {section.description}
                    </p>
                  )}
                  <div className="debo:flex debo:items-center debo:gap-4 debo:mt-2">
                    <StatusDot label="Spec" completed={status.spec} />
                    <StatusDot label="Data" completed={status.data} />
                    <StatusDot label="Screen Designs" completed={status.designs} />
                    <StatusDot label="Screenshots" completed={status.screenshots} />
                  </div>
                </div>
                <svg
                  className="debo:w-5 debo:h-5 debo:text-base-content/20 debo:shrink-0 debo:mt-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            );
          })}
        </div>
      </DeboCard>

      {/* Footer with reload */}
      <div className="debo:flex debo:items-center debo:justify-between debo:px-1">
        <p className="debo:text-base-content/40 debo:text-xs">
          Source: <code className="debo:text-base-content/50">designbook/sections/</code>
        </p>
        <button onClick={load} className="debo:btn debo:btn-ghost debo:btn-xs">
          ↻ Reload
        </button>
      </div>
    </div>
  );
}
