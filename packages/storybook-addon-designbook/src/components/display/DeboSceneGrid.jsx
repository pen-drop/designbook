import { DeboSceneCard } from '../ui/DeboSceneCard.jsx';

/**
 * Build a Storybook story ID from group title and scene name.
 * Mirrors the indexer logic: "Designbook/Shell" + "default" → "designbook-shell--default"
 */
function toStoryId(group, sceneName) {
    const titlePart = group.replace(/\//g, '-').replace(/\s+/g, '-').toLowerCase();
    const namePart = sceneName.replace(/\s+/g, '-').toLowerCase();
    return `${titlePart}--${namePart}`;
}

/**
 * DeboSceneGrid — Renders parsed scenes.yml data as a responsive card grid.
 *
 * @param {Object} props
 * @param {Object} props.data - Parsed scenes.yml object with a `scenes` array and `name` group
 */
export function DeboSceneGrid({ data }) {
    const scenes = data?.scenes ?? [];
    const group = data?.name || '';

    return (
        <div className="debo:grid debo:grid-cols-1 sm:debo:grid-cols-2 lg:debo:grid-cols-3 debo:gap-3">
            {scenes.map((scene, i) => {
                const storyId = group && scene.name ? toStoryId(group, scene.name) : null;
                return (
                    <DeboSceneCard
                        key={scene.name || i}
                        title={scene.name}
                        theme={scene.theme}
                        modified={scene.modified}
                        storyPath={storyId ? `/story/${storyId}` : undefined}
                    />
                );
            })}
        </div>
    );
}
