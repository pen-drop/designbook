/**
 * DeboBulletList — A list with DaisyUI badge dots and text items.
 *
 * @param {Object} props
 * @param {Array<string|React.ReactNode>} props.items - List items to render
 * @param {'ghost'|'primary'} [props.variant='ghost'] - Badge dot color variant
 */
export function DeboBulletList({ items, variant = 'ghost' }) {
    if (!items || items.length === 0) return null;

    return (
        <ul className="debo:space-y-2">
            {items.map((item, index) => (
                <li key={index} className="debo:flex debo:items-start debo:gap-3">
                    <span className={`debo:badge debo:badge-xs debo:badge-${variant} debo:mt-2 debo:shrink-0`} />
                    <span className="debo:text-base-content/70">{item}</span>
                </li>
            ))}
        </ul>
    );
}
