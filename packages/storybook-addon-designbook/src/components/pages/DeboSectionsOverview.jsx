import { DeboEmptyState } from '../ui/DeboEmptyState.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboSourceFooter } from '../ui/DeboSourceFooter.jsx';
import { DeboNumberedList } from '../ui/DeboNumberedList.jsx';
import { toSectionId } from '../utils.js';
// @ts-expect-error virtual module provided by vite-plugin-designbook-load
import sectionData from 'virtual:designbook-sections';

/**
 * DeboSectionsOverview — Lists all sections discovered from *.section.scenes.yml files.
 */
export function DeboSectionsOverview() {
    if (!sectionData || sectionData.length === 0) {
        return (
            <DeboPageLayout gap="8">
                <DeboEmptyState
                    message="No sections found"
                    command="/debo-sections"
                    filePath="designbook/sections/"
                />
            </DeboPageLayout>
        );
    }

    const statusClass = {
        done: 'debo:badge-success',
        'in-progress': 'debo:badge-warning',
        planned: 'debo:badge-ghost debo:text-base-content/30',
    };

    const items = sectionData.map((section) => {
        const sectionId = section.id || toSectionId(section.title);
        const status = section.status || 'planned';

        const description = (
            <>
                {section.description && (
                    <p className="debo:text-sm debo:text-base-content/50 debo:mt-1">{section.description}</p>
                )}
                <div className="debo:mt-2">
                    <span className={`debo:badge debo:badge-xs ${statusClass[status] || statusClass.planned}`}>
                        {status}
                    </span>
                </div>
            </>
        );

        return {
            title: section.title,
            description,
            linkTo: `/docs/designbook-sections-${sectionId}--docs`,
        };
    });
//http://localhost:6009/?path=/docs/designbook-sections-episoden--docs
    return (
        <DeboPageLayout>
            <div>
                <h3 className="debo:text-lg debo:font-semibold debo:text-base-content debo:pb-2 debo:mb-4 debo:border-b debo:border-base-300">
                    All Sections
                </h3>
                <DeboNumberedList items={items} />
            </div>
            <DeboSourceFooter path="designbook/sections/" />
        </DeboPageLayout>
    );
}
