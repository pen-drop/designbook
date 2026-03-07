import { useState, useEffect, useCallback } from 'react';
import { DeboEmptyState } from '../ui/DeboEmptyState.jsx';
import { DeboLoading } from '../ui/DeboLoading.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboAlert } from '../ui/DeboAlert.jsx';
import { DeboNumberedList } from '../ui/DeboNumberedList.jsx';
import { loadDesignbookJson, designbookFileExists } from '../designbookApi.js';
import { toSectionId } from '../utils.js';

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
            const sections = await loadDesignbookJson('sections.json') || [];
            setRoadmapSections(sections);

            // Check all 4 artifacts for each section
            const statuses = {};
            await Promise.all(
                sections.map(async (section) => {
                    const id = section.id || toSectionId(section.title);
                    const [hasSpec, hasData, hasScreenshots] = await Promise.all([
                        designbookFileExists(`sections/${id}/spec.md`),
                        designbookFileExists(`sections/${id}/data.yml`),
                        designbookFileExists(`sections/${id}/screenshots.md`),
                    ]);
                    statuses[id] = { spec: hasSpec, data: hasData, screenshots: hasScreenshots };
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

    if (loading) return <DeboLoading />;

    if (error) {
        return (
            <DeboAlert type="error" className="debo:my-4">
                <span>Failed to load sections: {error}</span>
            </DeboAlert>
        );
    }

    if (roadmapSections.length === 0) {
        return (
            <DeboPageLayout gap="8">
                <DeboEmptyState
                    message="No roadmap sections found"
                    command="/debo-product-sections"
                    filePath="designbook/product/product-roadmap.md"
                />
            </DeboPageLayout>
        );
    }

    // Map sections into DeboNumberedList items with status badges as description
    const items = roadmapSections.map((section) => {
        const sectionId = section.id || toSectionId(section.title);
        const status = sectionStatus[sectionId] || {};
        const badges = [
            { label: 'Spec', done: status.spec },
            { label: 'Data', done: status.data },
            { label: 'Screenshots', done: status.screenshots },
        ];

        const description = (
            <>
                {section.description && (
                    <p className="debo:text-sm debo:text-base-content/50 debo:mt-1">{section.description}</p>
                )}
                <div className="debo:flex debo:items-center debo:gap-2 debo:mt-2 debo:flex-wrap">
                    {badges.map(({ label, done }) => (
                        <span
                            key={label}
                            className={`debo:badge debo:badge-xs debo:gap-1 ${done ? 'debo:badge-success' : 'debo:badge-ghost debo:text-base-content/30'}`}
                        >
                            {label}
                        </span>
                    ))}
                </div>
            </>
        );

        return {
            title: section.title,
            description,
            linkTo: `/docs/sections-${sectionId}--docs`,
        };
    });

    return (
        <DeboPageLayout>
            <div>
                <h3 className="debo:text-lg debo:font-semibold debo:text-base-content debo:pb-2 debo:mb-4 debo:border-b debo:border-base-300">
                    All Sections
                </h3>
                <DeboNumberedList items={items} />
            </div>
            <DeboSourceFooter path="designbook/sections/" onReload={load} />
        </DeboPageLayout>
    );
}
