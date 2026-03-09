import { DeboSection } from '../DeboSection.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { parseProductSections } from '../parsers.js';

/**
 * DeboProductOverview — Displays a summary of the defined product vision.
 * Connects to `product/product-overview.md` via DeboSection and renders
 * each H2 section inside a DeboCollapsible.
 */
export function DeboProductOverview() {
    return (
        <DeboSection
            title="Product Overview"
            dataPath="product/product-overview.md"
            parser={parseProductSections}
            command="/debo-product-vision"
            emptyMessage="No product vision defined yet"
            renderContent={(sections) => (
                <div className="debo:flex debo:flex-col debo:gap-6 debo:pt-6">
                    {sections.map((section, i) => (
                        <DeboCollapsible key={section.title} title={section.title} defaultOpen={i === 0}>
                            <div
                                className="debo-markdown debo:prose debo:prose-sm debo:max-w-none debo:prose-headings:font-normal debo:prose-a:text-primary"
                                dangerouslySetInnerHTML={{ __html: section.html }}
                            />
                        </DeboCollapsible>
                    ))}
                </div>
            )}
        />
    );
}
