import { DeboSection } from '../DeboSection.jsx';
import { DeboMockupWindow } from '../ui/DeboMockupWindow.jsx';
import { parseMarkdown } from '../parsers.js';

/**
 * DeboProductOverview — Displays a summary of the defined product vision.
 * Connects to `product/product-overview.md` via DeboSection and renders
 * the markdown content as HTML.
 */
export function DeboProductOverview() {
    return (
        <DeboSection
            title="Product Overview"
            dataPath="product/product-overview.md"
            parser={parseMarkdown}
            command="/debo-product-vision"
            emptyMessage="No product vision defined yet"
            renderContent={(html) => (
                <DeboMockupWindow>
                    <div
                        className="debo-markdown debo:prose debo:prose-sm debo:max-w-none debo:prose-headings:font-normal debo:prose-a:text-primary"
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </DeboMockupWindow>
            )}
        />
    );
}
