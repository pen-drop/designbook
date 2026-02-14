import { useState, useEffect, useCallback } from 'react';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboSection } from '../DeboSection.jsx';
import { DeboLoading } from '../ui/DeboLoading.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboAlert } from '../ui/DeboAlert.jsx';
import { loadDesignbookFile, designbookFileExists } from '../designbookApi.js';
import { parseRoadmapData, parseMarkdown } from '../parsers.js';
import { toSectionId } from '../utils.js';

/**
 * Checklist item using DaisyUI checkbox.
 */
function ChecklistItem({ label, completed, detail }) {
    return (
        <div className="debo:flex debo:items-start debo:gap-3 debo:py-2">
            <input
                type="checkbox"
                checked={completed}
                readOnly
                className="debo:checkbox debo:checkbox-sm debo:checkbox-success debo:mt-0.5"
            />
            <div>
                <span className={`debo:text-sm debo:font-medium ${completed ? 'debo:text-base-content' : 'debo:text-base-content/40'}`}>
                    {label}
                </span>
                {detail && (
                    <p className="debo:text-xs debo:text-base-content/40 debo:mt-0.5">
                        Run <kbd className="debo:kbd debo:kbd-xs">{detail}</kbd>
                    </p>
                )}
            </div>
        </div>
    );
}

/**
 * Export item card using DaisyUI card-compact.
 */
function ExportItem({ icon, title, items }) {
    return (
        <div className="debo:card debo:card-compact debo:card-bordered debo:bg-base-100">
            <div className="debo:card-body">
                <div className="debo:flex debo:items-center debo:gap-2">
                    <span className="debo:text-base-content/40">{icon}</span>
                    <span className="debo:font-semibold debo:text-sm debo:text-base-content">{title}</span>
                </div>
                <ul className="debo:space-y-1 debo:mt-1">
                    {items.map((item, i) => (
                        <li key={i} className="debo:text-xs debo:text-base-content/50 debo:flex debo:items-center debo:gap-1.5">
                            <span className="debo:badge debo:badge-xs debo:badge-ghost debo:shrink-0" />
                            {item}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

/**
 * DeboExportPage — Shows export readiness status, what's included, and usage instructions.
 */
export function DeboExportPage() {
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState({});
    const [sectionsWithDesigns, setSectionsWithDesigns] = useState(0);
    const [totalSections, setTotalSections] = useState(0);
    const [hasExport, setHasExport] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);

        // Check all top-level artifacts
        const [overview, roadmap, dataModel, tokens, shell] = await Promise.all([
            designbookFileExists('product/product-overview.md'),
            designbookFileExists('product/product-roadmap.md'),
            designbookFileExists('data-model/data-model.md'),
            designbookFileExists('design-system/design-tokens.md'),
            designbookFileExists('design-shell/shell-spec.md'),
        ]);

        // Load roadmap to check section progress
        let sections = [];
        let designCount = 0;
        if (roadmap) {
            try {
                const text = await loadDesignbookFile('product/product-roadmap.md');
                if (text) {
                    sections = parseRoadmapData(text);

                    // Check which sections have screen designs
                    const results = await Promise.all(
                        sections.map(async (s) => {
                            const id = toSectionId(s.title);
                            return designbookFileExists(`sections/${id}/screen-designs.md`);
                        })
                    );
                    designCount = results.filter(Boolean).length;
                }
            } catch { /* ignore */ }
        }

        // Check for export zip
        const exportExists = await designbookFileExists('export/product-plan.zip');

        setStatus({ overview, roadmap, dataModel, tokens, shell });
        setTotalSections(sections.length);
        setSectionsWithDesigns(designCount);
        setHasExport(exportExists);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) return <DeboLoading />;

    const allRequired = status.overview && status.roadmap;
    const completedCount = [status.overview, status.roadmap, status.dataModel, status.tokens, status.shell, sectionsWithDesigns > 0].filter(Boolean).length;
    const isReady = allRequired && sectionsWithDesigns > 0;

    return (
        <DeboPageLayout gap="6">

            {/* Status header */}
            {isReady ? (
                <DeboAlert type="success">
                    <svg xmlns="http://www.w3.org/2000/svg" className="debo:h-6 debo:w-6 debo:shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                        <h3 className="debo:font-bold">Ready for export!</h3>
                        <div className="debo:text-xs">
                            Run <kbd className="debo:kbd debo:kbd-xs">/export-product</kbd> to generate the export package.
                        </div>
                    </div>
                </DeboAlert>
            ) : (
                <DeboAlert type="warning">
                    <svg xmlns="http://www.w3.org/2000/svg" className="debo:h-6 debo:w-6 debo:shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                        <h3 className="debo:font-bold">Not ready yet</h3>
                        <div className="debo:text-xs">
                            Complete the items below before exporting. {completedCount} of 6 items done.
                        </div>
                    </div>
                </DeboAlert>
            )}

            {/* Completion checklist */}
            <div>
                <h3 className="debo:text-lg debo:font-semibold debo:text-base-content debo:pb-2 debo:mb-4 debo:border-b debo:border-base-300">
                    Completion Checklist
                </h3>
                <div className="debo:mt-2 debo:divide-y debo:divide-base-200">
                    <ChecklistItem
                        label="Product Overview"
                        completed={status.overview}
                        detail={status.overview ? null : '/product-vision'}
                    />
                    <ChecklistItem
                        label="Product Roadmap"
                        completed={status.roadmap}
                        detail={status.roadmap ? null : '/product-roadmap'}
                    />
                    <ChecklistItem
                        label="Data Model"
                        completed={status.dataModel}
                        detail={status.dataModel ? null : '/data-model'}
                    />
                    <ChecklistItem
                        label="Design System"
                        completed={status.tokens}
                        detail={status.tokens ? null : '/design-tokens'}
                    />
                    <ChecklistItem
                        label="Application Shell"
                        completed={status.shell}
                        detail={status.shell ? null : '/design-shell'}
                    />
                    <ChecklistItem
                        label={`Sections with screen designs (${sectionsWithDesigns}/${totalSections})`}
                        completed={sectionsWithDesigns > 0}
                        detail={sectionsWithDesigns === 0 ? '/shape-section, /sample-data, /design-screen' : null}
                    />
                </div>
            </div>

            {/* What's Included */}
            <div>
                <h3 className="debo:text-lg debo:font-semibold debo:text-base-content debo:pb-2 debo:mb-4 debo:border-b debo:border-base-300">
                    What's Included
                </h3>
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
            </div>

            {/* How to Use */}
            <div>
                <h3 className="debo:text-lg debo:font-semibold debo:text-base-content debo:pb-2 debo:mb-4 debo:border-b debo:border-base-300">
                    How to Use the Export
                </h3>
                <DeboCollapsible title="Option A: Incremental (recommended)" defaultOpen>
                    <ol className="debo:list-decimal debo:pl-5 debo:space-y-2 debo:text-sm debo:text-base-content/70">
                        <li>Run <kbd className="debo:kbd debo:kbd-xs">/export-product</kbd> to generate the export package</li>
                        <li>Copy the <code className="debo:text-xs">product-plan/</code> folder into your implementation project</li>
                        <li>Start with <code className="debo:text-xs">instructions/incremental/01-foundation.md</code></li>
                        <li>Work through each milestone in order</li>
                        <li>Use section prompts from <code className="debo:text-xs">prompts/section-prompt.md</code> for AI assistance</li>
                    </ol>
                </DeboCollapsible>
                <DeboCollapsible title="Option B: One-Shot">
                    <ol className="debo:list-decimal debo:pl-5 debo:space-y-2 debo:text-sm debo:text-base-content/70">
                        <li>Run <kbd className="debo:kbd debo:kbd-xs">/export-product</kbd> to generate the export package</li>
                        <li>Copy the <code className="debo:text-xs">product-plan/</code> folder into your implementation project</li>
                        <li>Use <code className="debo:text-xs">prompts/one-shot-prompt.md</code> as a single AI prompt</li>
                        <li>The prompt includes all instructions and references</li>
                    </ol>
                </DeboCollapsible>
            </div>

            <DeboSection
                title="Product Roadmap"
                dataPath="product/roadmap.md"
                parser={parseMarkdown}
                command="/debo-product-roadmap"
                emptyMessage="No product roadmap defined yet"
                renderContent={(html) => (
                    <div
                        className="debo-markdown debo:prose debo:prose-sm debo:max-w-none debo:prose-headings:font-normal debo:prose-a:text-primary"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                )}
            />
            <DeboSourceFooter path="designbook/" onReload={load} />
        </DeboPageLayout>
    );
}
