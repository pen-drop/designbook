/**
 * Format a date string as relative time (e.g., "2 hours ago", "3 days ago").
 */
function relativeTime(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    if (isNaN(then)) return null;

    const seconds = Math.floor((now - then) / 1000);
    if (seconds < 60) return 'just now';

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(months / 12);
    return `${years}y ago`;
}

/**
 * DeboSceneCard — Figma-style card for scene listings.
 *
 * Renders a themed first-letter circle (via `data-theme` + DaisyUI primary colors),
 * the scene title, and an optional relative modified date.
 *
 * @param {Object} props
 * @param {string} props.title - Scene display name
 * @param {string} [props.theme] - DaisyUI theme name (e.g., "cupcake", "dark")
 * @param {string} [props.modified] - ISO date string for last modification
 * @param {string} [props.className] - Additional classes
 */
/**
 * Navigate to a Storybook page via the top-level window.
 * Storybook renders docs in an iframe, so we need window.top to navigate the shell.
 */
function navigateStorybook(storyPath) {
    try {
        const url = new URL(window.top.location.href);
        url.searchParams.set('path', storyPath);
        window.top.location.href = url.toString();
    } catch {
        window.location.href = `?path=${storyPath}`;
    }
}

export function DeboSceneCard({ title, theme, modified, storyPath, className = '' }) {
    const letter = title ? title.charAt(0).toUpperCase() : '?';
    const date = modified ? relativeTime(modified) : null;
    const clickable = !!storyPath;

    return (
        <div
            className={`debo:bg-white debo:border debo:border-slate-200/80 debo:rounded-[14px] debo:shadow-[0px_2px_8px_-4px_rgba(0,0,0,0.05)] debo:p-4 debo:flex debo:items-center debo:gap-3 ${clickable ? 'debo:cursor-pointer hover:debo:border-slate-300 debo:transition-colors' : ''} ${className}`.trim()}
            onClick={clickable ? () => navigateStorybook(storyPath) : undefined}
            role={clickable ? 'link' : undefined}
        >
            <div data-theme={theme || undefined} className="debo:w-10 debo:h-10 debo:rounded-lg debo:flex debo:items-center debo:justify-center debo:bg-primary debo:text-primary-content debo:text-[16px] debo:font-semibold debo:shrink-0">
                {letter}
            </div>
            <div className="debo:min-w-0">
                <div className="debo:text-[15px] debo:font-medium debo:leading-tight debo:text-[#1D293D] debo:truncate">{title}</div>
                {date && (
                    <div className="debo:text-[12px] debo:text-[#62748E] debo:mt-0.5">{date}</div>
                )}
            </div>
        </div>
    );
}
