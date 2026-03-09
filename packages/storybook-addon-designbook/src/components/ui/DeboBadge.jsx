/**
 * DeboBadge — Pill-shaped colored label tag.
 *
 * @param {Object} props
 * @param {string} props.children - Badge text
 * @param {'green'|'red'|'purple'} [props.color='green'] - Color variant
 * @param {string} [props.className] - Additional classes
 */
export function DeboBadge({ children, color = 'green', className = '' }) {
    const colors = {
        green: 'debo:bg-[#dcfce7] debo:text-[#008236]',
        red: 'debo:bg-[#ffe2e2] debo:text-[#c10007]',
        purple: 'debo:bg-[#f3e8ff] debo:text-[#8200db]',
    };
    return (
        <span className={`debo:uppercase debo:!font-sans debo:!text-[10px] debo:font-bold debo:leading-[15px] debo:!tracking-[0.5px] debo:px-2.5 debo:py-1 debo:rounded-full debo:shrink-0 debo:whitespace-nowrap ${colors[color] || colors.green} ${className}`.trim()}>
            {children}
        </span>
    );
}
