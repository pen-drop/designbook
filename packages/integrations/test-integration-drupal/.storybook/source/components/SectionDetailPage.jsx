import { useState, useEffect, useCallback } from 'react';
import { StepIndicator } from './StepIndicator.jsx';
import { SectionSpecCard } from './SectionSpecCard.jsx';
import { SampleDataCard } from './SampleDataCard.jsx';
import { DeboEmptyState } from './DeboEmptyState.jsx';
import { DeboCard } from './DeboCard.jsx';

/**
 * Parse a section spec markdown into structured data.
 */
function parseSpec(md) {
  const result = { title: '', overview: '', userFlows: [], uiRequirements: [], useShell: null };

  const titleMatch = md.match(/^#\s+(.+)/m);
  if (titleMatch) result.title = titleMatch[1].replace(/\s*Specification\s*$/i, '').trim();

  function extractSection(name) {
    const regex = new RegExp('## ' + name + '\\s*\\n+([\\s\\S]*?)(?=\\n## |\\n#[^#]|$)');
    const match = md.match(regex);
    return match ? match[1].trim() : '';
  }

  result.overview = extractSection('Overview');

  const flowsText = extractSection('User Flows');
  if (flowsText) {
    result.userFlows = flowsText
      .split('\n')
      .filter(line => line.trim().startsWith('- '))
      .map(line => line.trim().slice(2).trim());
  }

  const reqText = extractSection('UI Requirements');
  if (reqText) {
    result.uiRequirements = reqText
      .split('\n')
      .filter(line => line.trim().startsWith('- '))
      .map(line => line.trim().slice(2).trim());
  }

  const configText = extractSection('Configuration');
  if (configText) {
    const shellMatch = configText.match(/shell:\s*(true|false)/i);
    if (shellMatch) result.useShell = shellMatch[1].toLowerCase() === 'true';
  }

  return (result.title || result.overview) ? result : null;
}

/**
 * Load a file from the designbook middleware. Returns null if not found.
 */
async function loadFile(path) {
  try {
    const res = await fetch(`/__designbook/load?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    let text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.exists === false) return null;
      if (json.content != null) return json.content;
      // It's actual JSON data (like data.json)
      return json;
    } catch {
      return text;
    }
  } catch {
    return null;
  }
}

/**
 * Load a JSON file from the designbook middleware.
 */
async function loadJson(path) {
  try {
    const res = await fetch(`/__designbook/load?path=${encodeURIComponent(path)}`);
    if (!res.ok) return null;
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.exists === false) return null;
      // If the middleware wraps content, parse the content field
      if (json.content != null) {
        try { return JSON.parse(json.content); } catch { return null; }
      }
      return json;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/**
 * Parse screen-designs.md into a list of screen design entries.
 */
function parseScreenDesigns(md) {
  if (!md) return [];
  const lines = md.split('\n');
  const designs = [];
  for (const line of lines) {
    const match = line.match(/^###\s+(.+)/);
    if (match) {
      designs.push({ name: match[1].trim(), description: '' });
      continue;
    }
    if (designs.length > 0 && line.trim() && !line.match(/^#+\s/)) {
      const last = designs[designs.length - 1];
      last.description = last.description
        ? last.description + ' ' + line.trim()
        : line.trim();
    }
  }
  return designs;
}

/**
 * Parse screenshots.md into a list of screenshot entries.
 */
function parseScreenshots(md) {
  if (!md) return [];
  const lines = md.split('\n');
  const shots = [];
  for (const line of lines) {
    const match = line.match(/^-\s+!\[([^\]]*)\]\(([^)]+)\)/);
    if (match) {
      shots.push({ alt: match[1], path: match[2] });
      continue;
    }
    const simpleMatch = line.match(/^-\s+(.+\.png)/);
    if (simpleMatch) {
      shots.push({ alt: simpleMatch[1], path: simpleMatch[1] });
    }
  }
  return shots;
}

/**
 * Determine step statuses based on available data.
 * First incomplete step is 'current', previous are 'completed', rest are 'upcoming'.
 */
function getStepStatuses(spec, data, screenDesigns, screenshots) {
  const steps = [!!spec, !!data, screenDesigns.length > 0, screenshots.length > 0];
  const statuses = [];
  let foundCurrent = false;

  for (let i = 0; i < steps.length; i++) {
    if (steps[i]) {
      statuses.push('completed');
    } else if (!foundCurrent) {
      statuses.push('current');
      foundCurrent = true;
    } else {
      statuses.push('upcoming');
    }
  }
  return statuses;
}

/**
 * SectionDetailPage — Individual section page with 4-step progression.
 * Steps: Spec → Sample Data → Screen Designs → Screenshots
 *
 * @param {Object} props
 * @param {string} props.sectionId — Kebab-case section ID (e.g., "homepage", "about-team")
 * @param {string} props.title — Display title for the section
 */
export function SectionDetailPage({ sectionId, title }) {
  const [loading, setLoading] = useState(true);
  const [spec, setSpec] = useState(null);
  const [data, setData] = useState(null);
  const [screenDesigns, setScreenDesigns] = useState([]);
  const [screenshots, setScreenshots] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);

    const [specRaw, dataRaw, designsRaw, shotsRaw] = await Promise.all([
      loadFile(`sections/${sectionId}/spec.md`),
      loadJson(`sections/${sectionId}/data.json`),
      loadFile(`sections/${sectionId}/screen-designs.md`),
      loadFile(`sections/${sectionId}/screenshots.md`),
    ]);

    if (specRaw && typeof specRaw === 'string') {
      setSpec(parseSpec(specRaw));
    } else {
      setSpec(null);
    }

    setData(dataRaw);
    setScreenDesigns(designsRaw ? parseScreenDesigns(designsRaw) : []);
    setScreenshots(shotsRaw ? parseScreenshots(shotsRaw) : []);

    setLoading(false);
  }, [sectionId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="debo:font-sans debo:flex debo:justify-center debo:py-12">
        <span className="debo:loading debo:loading-spinner debo:loading-md" />
      </div>
    );
  }

  const statuses = getStepStatuses(spec, data, screenDesigns, screenshots);

  return (
    <div className="debo:font-sans debo:max-w-2xl debo:mx-auto debo:py-6 debo:space-y-8">
      {/* Step 1: Section Specification */}
      <StepIndicator step={1} title="Section Specification" status={statuses[0]}>
        {spec ? (
          <SectionSpecCard spec={{ ...spec, title: spec.title || title }} />
        ) : (
          <DeboEmptyState
            message={`No specification for ${title} yet`}
            command="/shape-section"
            filePath={`designbook/sections/${sectionId}/spec.md`}
          />
        )}
      </StepIndicator>

      {/* Step 2: Sample Data */}
      <StepIndicator step={2} title="Sample Data" status={statuses[1]}>
        {data ? (
          <SampleDataCard data={data} />
        ) : (
          <DeboEmptyState
            message="No sample data defined yet"
            command="/sample-data"
            filePath={`designbook/sections/${sectionId}/data.json`}
          />
        )}
      </StepIndicator>

      {/* Step 3: Screen Designs */}
      <StepIndicator step={3} title="Screen Designs" status={statuses[2]}>
        {screenDesigns.length > 0 ? (
          <DeboCard title="Screen Designs">
            <div className="debo:divide-y debo:divide-base-200">
              {screenDesigns.map((design, index) => (
                <div key={index} className="debo:flex debo:items-center debo:gap-3 debo:py-3">
                  <svg className="debo:w-4 debo:h-4 debo:text-base-content/40 debo:shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <div className="debo:flex-1">
                    <span className="debo:font-medium debo:text-sm debo:text-base-content">{design.name}</span>
                    {design.description && (
                      <p className="debo:text-xs debo:text-base-content/50 debo:mt-0.5">{design.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </DeboCard>
        ) : (
          <DeboEmptyState
            message="No screen designs yet"
            command="/design-screen"
            filePath={`designbook/sections/${sectionId}/screen-designs.md`}
          />
        )}
      </StepIndicator>

      {/* Step 4: Screenshots */}
      <StepIndicator step={4} title="Screenshots" status={statuses[3]} isLast>
        {screenshots.length > 0 ? (
          <DeboCard title="Screenshots">
            <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 debo:gap-4 debo:mt-2">
              {screenshots.map((shot, index) => (
                <div key={index} className="debo:rounded-lg debo:border debo:border-base-300 debo:overflow-hidden">
                  <img
                    src={`/__designbook/load?path=sections/${sectionId}/${shot.path}`}
                    alt={shot.alt}
                    className="debo:w-full debo:h-auto"
                  />
                  <p className="debo:text-xs debo:text-base-content/50 debo:p-2 debo:text-center">{shot.alt}</p>
                </div>
              ))}
            </div>
          </DeboCard>
        ) : (
          <DeboEmptyState
            message="No screenshots captured yet"
            command="/screenshot-design"
            filePath={`designbook/sections/${sectionId}/`}
          />
        )}
      </StepIndicator>

      {/* Footer */}
      <div className="debo:flex debo:items-center debo:justify-between debo:px-1 debo:pt-4">
        <p className="debo:text-base-content/40 debo:text-xs">
          Source: <code className="debo:text-base-content/50">designbook/sections/{sectionId}/</code>
        </p>
        <button onClick={load} className="debo:btn debo:btn-ghost debo:btn-xs">
          ↻ Reload
        </button>
      </div>
    </div>
  );
}
