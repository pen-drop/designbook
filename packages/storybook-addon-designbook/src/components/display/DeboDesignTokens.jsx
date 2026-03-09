
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';

const isToken = (obj) => obj && typeof obj === 'object' && '$value' in obj;

const COLOR_CATEGORIES = ['primary', 'secondary', 'accent', 'neutral', 'base', 'info', 'success', 'warning', 'error'];

function isLightColor(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

function groupColorTokens(tokenEntries) {
    const groups = new Map();
    for (const cat of COLOR_CATEGORIES) groups.set(cat, []);

    for (const [key, token] of tokenEntries) {
        const cat = COLOR_CATEGORIES.find(c => key === c || key.startsWith(c + '-'));
        if (cat) {
            groups.get(cat).push({ key, token });
        }
    }

    return Array.from(groups.entries())
        .filter(([, tokens]) => tokens.length > 0)
        .map(([category, tokens]) => ({ category, tokens }));
}

function DeboColorSwatch({ name, value }) {
    const light = typeof value === 'string' && value.startsWith('#') && isLightColor(value);
    return (
        <div className="debo:flex debo:flex-col debo:gap-2 debo:w-20">
            <div
                className={`debo:w-20 debo:h-16 debo:rounded-lg debo:shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_0px_rgba(0,0,0,0.1)] ${light ? 'debo:border debo:border-slate-200' : ''}`}
                style={{ backgroundColor: value }}
                title={value}
            />
            <div className="debo:flex debo:flex-col debo:gap-0.5">
                <span className="debo:!font-sans debo:font-semibold debo:text-xs debo:leading-[15px] debo:text-[#1d293d]">{name}</span>
                <span className="debo:!font-mono debo:text-[11px] debo:leading-[16.5px] debo:text-[#62748e]">{value}</span>
            </div>
        </div>
    );
}

function DeboColorCategoryRow({ category, tokens, isLast }) {
    return (
        <div className={`debo:flex debo:items-start debo:gap-x-32 debo:pt-4 debo:pb-4 ${!isLast ? 'debo:border-b debo:border-slate-100' : ''}`}>
            <span className="debo:w-24 debo:shrink-0 debo:!font-sans debo:font-medium debo:text-sm debo:leading-5 debo:tracking-[-0.15px] debo:text-[#314158]">
                {category.charAt(0).toUpperCase() + category.slice(1)}
            </span>
            <div className="debo:flex debo:gap-6 debo:flex-wrap">
                {tokens.map(({ key, token }) => (
                    <DeboColorSwatch key={key} name={key} value={token.$value} />
                ))}
            </div>
        </div>
    );
}

function DeboColorSection({ group }) {
    const tokenEntries = Object.entries(group).filter(([k]) => !k.startsWith('$'));
    const colorTokens = tokenEntries.filter(([, v]) => isToken(v));
    const categories = groupColorTokens(colorTokens);
    const totalCount = colorTokens.length;

    return (
        <DeboCollapsible title="Color" count={totalCount} defaultOpen={true}>
            <div className="debo:p-6">
                {categories.map(({ category, tokens }, i) => (
                    <DeboColorCategoryRow
                        key={category}
                        category={category}
                        tokens={tokens}
                        isLast={i === categories.length - 1}
                    />
                ))}
            </div>
        </DeboCollapsible>
    );
}

// --- Non-color token renderers ---

function TypographyToken({ name, value, description }) {
    return (
        <div className="debo:mb-3">
            <p className="debo:text-xs debo:text-base-content/50 debo:mb-1">{name}</p>
            <p className="debo:text-base-content" style={{ fontFamily: value, fontSize: '1.1rem' }}>
                {value} (The quick brown fox)
            </p>
            {description && <p className="debo:text-xs debo:text-base-content/40">{description}</p>}
        </div>
    );
}

function GenericToken({ name, value }) {
    return (
        <div className="debo:flex debo:justify-between debo:text-sm debo:py-1">
            <span className="debo:text-base-content/70">{name}:</span>
            <span className="debo:font-mono debo:text-base-content">{String(value)}</span>
        </div>
    );
}

function TokenRenderer({ name, token }) {
    const { $value, $type, $description } = token;

    if ($type === 'fontFamily' || name.toLowerCase().includes('font')) {
        return <TypographyToken name={name} value={$value} description={$description} />;
    }

    return <GenericToken name={name} value={$value} />;
}

function TokenGroup({ name, group, depth = 0 }) {
    const entries = Object.entries(group).filter(([k]) => !k.startsWith('$'));

    const isColorGroup = name.toLowerCase() === 'color' ||
        entries.every(([, v]) => isToken(v) && v.$type === 'color');

    if (isColorGroup && entries.some(([, v]) => isToken(v))) {
        return <DeboColorSection group={group} />;
    }

    const tokens = [];
    const subgroups = [];

    for (const [key, value] of entries) {
        if (isToken(value)) {
            tokens.push({ key, value });
        } else if (typeof value === 'object') {
            subgroups.push({ key, value });
        }
    }

    const content = (
        <div className={`debo:space-y-2 ${depth > 0 ? 'debo:pl-2' : ''}`}>
            {tokens.map(t => (
                <TokenRenderer key={t.key} name={t.key} token={t.value} />
            ))}
            {subgroups.map(g => (
                <TokenGroup key={g.key} name={g.key} group={g.value} depth={depth + 1} />
            ))}
        </div>
    );

    if (depth === 0) return content;

    return (
        <DeboCollapsible title={name} count={tokens.length + subgroups.length} defaultOpen={depth < 2}>
            {content}
        </DeboCollapsible>
    );
}

/**
 * DeboDesignTokens — Displays W3C design tokens with previews.
 *
 * @param {Object} props
 * @param {Object} props.tokens - W3C Design Tokens object
 */
export function DeboDesignTokens({ tokens }) {
    if (!tokens || Object.keys(tokens).length === 0) return null;

    return (
        <div>
            <TokenGroup name="Root" group={tokens} depth={0} />
        </div>
    );
}
