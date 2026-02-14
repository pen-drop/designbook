import { useState, useCallback } from 'react';
import { DeboSection } from '../DeboSection.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboMockupWindow } from '../ui/DeboMockupWindow.jsx';
import { DeboSampleData } from '../display/DeboSampleData.jsx';
import { parseMarkdown, parseScreenshots } from '../parsers.js';

/**
 * JSON parser for sample data files.
 */
const jsonParser = (text) => {
    try { return JSON.parse(text); } catch { return null; }
};

/**
 * Wraps parseScreenshots to return null on empty (so DeboSection shows empty state).
 */
const screenshotsParser = (md) => {
    const items = parseScreenshots(md);
    return items.length > 0 ? items : null;
};



/**
 * DeboSectionDetailPage — Individual section page with 4-step progression.
 * Steps: Spec → Sample Data → Screen Designs → Screenshots
 *
 * Each step is a bare DeboSection that handles its own loading/empty/content state.
 * A key-based reload forces all sections to re-mount and refetch.
 *
 * @param {Object} props
 * @param {string} props.sectionId — Kebab-case section ID
 * @param {string} props.title — Display title for the section
 */
export function DeboSectionDetailPage({ sectionId, title }) {
    const [reloadKey, setReloadKey] = useState(0);
    const handleReload = useCallback(() => setReloadKey(k => k + 1), []);

    return (
        <DeboPageLayout key={reloadKey} gap="8">
            {/* Step 1: Section Specification */}
            <DeboSection
                title="Shape Section"
                dataPath={`sections/${sectionId}/spec.md`}
                parser={parseMarkdown}
                command={`/debo-shape-section ${sectionId}`}
                emptyMessage={`No specification for ${title} yet`}
                filePath={`designbook/sections/${sectionId}/spec.md`}
                renderContent={(html) => (
                    <DeboMockupWindow>
                        <div
                            className="debo-markdown debo:prose debo:prose-sm debo:max-w-none debo:prose-headings:font-normal debo:prose-a:text-primary"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </DeboMockupWindow>
                )}
            />

            {/* Step 2: Sample Data */}
            <DeboSection
                title="Sample Data"
                dataPath={`sections/${sectionId}/data.json`}
                parser={jsonParser}
                command={`/debo-sample-data ${sectionId}`}
                emptyMessage="No sample data defined yet"
                filePath={`designbook/sections/${sectionId}/data.json`}
                renderContent={(data) => <DeboSampleData data={data} />}
            />

            {/* Step 3: Screen Designs */}
            <DeboSection
                title="Screen Designs"
                dataPath={`sections/${sectionId}/screen-designs.md`}
                parser={parseMarkdown}
                command={`/debo-design-screen ${sectionId}`}
                emptyMessage="No screen designs yet"
                filePath={`designbook/sections/${sectionId}/screen-designs.md`}
                renderContent={(html) => (
                    <DeboMockupWindow>
                        <div
                            className="debo-markdown debo:prose debo:prose-sm debo:max-w-none debo:prose-headings:font-normal debo:prose-a:text-primary"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </DeboMockupWindow>
                )}
            />

            {/* Step 4: Screenshots */}
            <DeboSection
                title="Screenshots"
                dataPath={`sections/${sectionId}/screenshots.md`}
                parser={screenshotsParser}
                command={`/debo-screenshot-design ${sectionId}`}
                emptyMessage="No screenshots captured yet"
                filePath={`designbook/sections/${sectionId}/`}
                renderContent={(shots) => (
                    <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 debo:gap-4 debo:mt-2">
                        {shots.map((shot, index) => (
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
                )}
            />

            <DeboSourceFooter path={`designbook/sections/${sectionId}/`} onReload={handleReload} />
        </DeboPageLayout>
    );
}
