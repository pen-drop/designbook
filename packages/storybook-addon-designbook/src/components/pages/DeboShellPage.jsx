import { useState, useCallback } from 'react';
import { DeboSection } from '../DeboSection.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboEmptyState } from '../ui/DeboEmptyState.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboSceneGrid } from '../display/DeboSceneGrid.jsx';
import { parseMarkdown } from '../parsers.js';
import { parse as parseYaml } from 'yaml';

const scenesParser = (text) => {
    try {
        const data = parseYaml(text);
        return data?.scenes?.length ? data : null;
    } catch { return null; }
};

/**
 * DeboShellPage — Application Shell docs page.
 * Shows the shell design specification loaded from spec.shell.scenes.yml.
 *
 * @param {Object} props
 * @param {string} [props.shellFile] — Shell file path relative to designbook dir (default: shell/spec.shell.scenes.yml)
 */
export function DeboShellPage({ title = 'Shell', shellFile = 'shell/spec.shell.scenes.yml' }) {
    const [reloadKey, setReloadKey] = useState(0);
    const handleReload = useCallback(() => setReloadKey(k => k + 1), []);
    console.log(shellFile);
    return (
        <DeboPageLayout key={reloadKey} gap="8">
            <h1 className="debo:text-2xl debo:font-semibold">{title}</h1>
            <DeboSection
                title="Shell Design"
                dataPath={shellFile}
                parser={(content) => parseYaml(content)}
                command="/debo-design-shell"
                emptyMessage="No shell design defined yet"
                filePath={`designbook/${shellFile}`}
                renderContent={(data) => {
                    const description = data.description || '';
                    return (
                        <DeboCollapsible key="description" title="Description" defaultOpen="true">
                            <div
                                className="debo-markdown debo:prose debo:prose-sm debo:max-w-none debo:prose-headings:font-normal debo:prose-a:text-primary"
                                dangerouslySetInnerHTML={{ __html: parseMarkdown(description) }}
                            />
                        </DeboCollapsible>
                    );
                }}
            />

            <DeboSection
                title="Design"
                dataPath={shellFile}
                parser={scenesParser}
                command="/debo-design-shell"
                emptyMessage="No designs yet"
                filePath={`designbook/${shellFile}`}
                renderContent={(data) => <DeboSceneGrid data={data} />}
            />

        </DeboPageLayout>
    );
}
