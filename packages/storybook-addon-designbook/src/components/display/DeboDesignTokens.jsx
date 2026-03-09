
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';

// ─── Helpers ────────────────────────────────────────────────────────────────

const isToken = (obj) => obj && typeof obj === 'object' && '$value' in obj;

function isLightColor(hex) {
    if (!hex || !hex.startsWith('#')) return false;
    const c = hex.replace('#', '');
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 200;
}

// ─── Color Section ──────────────────────────────────────────────────────────

const COLOR_CATEGORIES = ['primary', 'secondary', 'accent', 'neutral', 'base', 'info', 'success', 'warning', 'error'];

function groupColorTokens(tokenEntries) {
    const groups = new Map();
    for (const cat of COLOR_CATEGORIES) groups.set(cat, []);

    for (const [key, token] of tokenEntries) {
        const cat = COLOR_CATEGORIES.find(c => key === c || key.startsWith(c + '-'));
        if (cat) groups.get(cat).push({ key, token });
    }

    return Array.from(groups.entries())
        .filter(([, tokens]) => tokens.length > 0)
        .map(([category, tokens]) => ({ category, tokens }));
}

function DeboColorSwatch({ name, value }) {
    const light = isLightColor(value);
    return (
        <div className="debo:flex debo:flex-col debo:gap-2 debo:w-20">
            <div
                className={`debo:w-20 debo:h-16 debo:rounded-[8px] debo:shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)] ${light ? 'debo:border debo:border-slate-200' : ''}`}
                style={{ backgroundColor: value }}
                title={value}
            />
            <div className="debo:flex debo:flex-col debo:gap-0.5">
                <span className="debo:!font-sans debo:font-semibold debo:text-[12px] debo:leading-[15px] debo:text-[#1D293D]">{name}</span>
                <span className="debo:!font-mono debo:text-[11px] debo:leading-[16.5px] debo:text-[#62748E]">{value}</span>
            </div>
        </div>
    );
}

function DeboColorCategoryRow({ category, tokens, isLast }) {
    return (
        <div className={`debo:flex debo:items-start debo:gap-x-32 debo:pt-4 ${!isLast ? 'debo:border-b debo:border-[#F1F5F9]' : ''}`}>
            <span className="debo:w-24 debo:shrink-0 debo:!font-sans debo:font-medium debo:text-[14px] debo:leading-5 debo:tracking-[-0.15px] debo:text-[#314158]">
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
            <div className="debo:px-6 debo:pt-1 debo:pb-6">
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

// ─── Typography Section ─────────────────────────────────────────────────────

const TYPE_SCALE = [
    { style: 'H1',      fontSize: 30, lineHeight: 38, weight: 700 },
    { style: 'H2',      fontSize: 24, lineHeight: 32, weight: 700 },
    { style: 'H3',      fontSize: 20, lineHeight: 28, weight: 700 },
    { style: 'Title',   fontSize: 18, lineHeight: 26, weight: 700 },
    { style: 'Body',    fontSize: 16, lineHeight: 24, weight: 400 },
    { style: 'Small',   fontSize: 14, lineHeight: 20, weight: 400 },
    { style: 'Caption', fontSize: 12, lineHeight: 16, weight: 400 },
];

const FONT_TOKEN_META = {
    heading: { label: 'Headlines', aaWeight: 700 },
    body:    { label: 'Body',      aaWeight: 500 },
    mono:    { label: 'Mono',      aaWeight: 400 },
};

function isMono(tokenKey, value) {
    return tokenKey === 'mono' || (value && value.toLowerCase().includes('mono'));
}

function DeboFontCard({ tokenKey, value }) {
    const meta = FONT_TOKEN_META[tokenKey] || { label: tokenKey, aaWeight: 500 };
    const mono = isMono(tokenKey, value);
    const preview = mono ? '0 1 2 3 4 5 6 7 8 9 { }' : 'A B C D E F G H I J K L';

    const badgeClass = mono
        ? 'debo:bg-[#FAF5FF] debo:text-[#9810FA]'
        : 'debo:bg-[#EFF6FF] debo:text-[#155DFC]';

    return (
        <div className="debo:flex-1 debo:min-w-0 debo:bg-white debo:border debo:border-slate-200/80 debo:rounded-2xl debo:shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)] debo:overflow-hidden">
            {/* Aa preview */}
            <div className="debo:px-6 debo:pt-6 debo:pb-0">
                <span
                    className="debo:leading-none debo:text-[#1D293D]"
                    style={{ fontFamily: value, fontSize: 56, fontWeight: meta.aaWeight, display: 'block' }}
                >
                    Aa
                </span>
            </div>

            {/* Font name + use label + badge */}
            <div className="debo:px-6 debo:mt-6 debo:flex debo:items-end debo:justify-between debo:pb-4">
                <div className="debo:flex debo:flex-col">
                    <p className="debo:!font-sans debo:text-[18px] debo:font-semibold debo:leading-7 debo:tracking-[-0.44px] debo:text-[#0F172B]">
                        {value}
                    </p>
                    <p className="debo:!font-sans debo:text-[15px] debo:font-medium debo:leading-[1.5] debo:text-[#62748E]">
                        {meta.label}
                    </p>
                </div>
                <span className={`debo:!font-sans debo:text-[11px] debo:font-bold debo:tracking-[0.6px] debo:uppercase debo:px-2 debo:py-1 debo:rounded-[8px] debo:shrink-0 ${badgeClass}`}>
                    {mono ? 'Mono' : 'Sans'}
                </span>
            </div>

            {/* Character preview strip */}
            <div className="debo:border-t debo:border-[#F1F5F9] debo:px-6 debo:pt-4 debo:pb-6">
                <span
                    className="debo:text-[16px] debo:font-medium debo:leading-[1.625] debo:text-[#90A1B9]"
                    style={{ fontFamily: value }}
                >
                    {preview}
                </span>
            </div>
        </div>
    );
}

function DeboTypeScale({ headingFont }) {
    return (
        <div className="debo:bg-white debo:border debo:border-slate-200/80 debo:rounded-2xl debo:shadow-[0px_1px_2px_-1px_rgba(0,0,0,0.1),0px_1px_3px_0px_rgba(0,0,0,0.1)] debo:overflow-hidden">
            {/* Table header */}
            <div className="debo:grid debo:grid-cols-[104px_1fr_130px] debo:bg-slate-50/80 debo:border-b debo:border-slate-200/80 debo:px-6 debo:py-3">
                <span className="debo:!font-sans debo:text-[13px] debo:font-semibold debo:uppercase debo:tracking-[0.57px] debo:text-[#62748E]">Style</span>
                <span className="debo:!font-sans debo:text-[13px] debo:font-semibold debo:uppercase debo:tracking-[0.57px] debo:text-[#62748E]">Preview</span>
                <span className="debo:!font-sans debo:text-[13px] debo:font-semibold debo:uppercase debo:tracking-[0.57px] debo:text-[#62748E] debo:text-right">Size / LH</span>
            </div>

            {/* Rows */}
            {TYPE_SCALE.map(({ style, fontSize, lineHeight, weight }, i) => (
                <div
                    key={style}
                    className={`debo:grid debo:grid-cols-[104px_1fr_130px] debo:items-center debo:px-6 debo:py-4 ${i < TYPE_SCALE.length - 1 ? 'debo:border-b debo:border-[#F1F5F9]' : ''}`}
                >
                    {/* Style name */}
                    <span className="debo:!font-sans debo:text-[15px] debo:font-bold debo:text-[#90A1B9]">{style}</span>

                    {/* Preview */}
                    <span
                        className="debo:text-[#1D293D] debo:truncate debo:pr-4"
                        style={{ fontFamily: headingFont, fontSize, fontWeight: weight, lineHeight: `${lineHeight}px` }}
                    >
                        The quick brown fox jumps over the lazy dog
                    </span>

                    {/* Size badge */}
                    <div className="debo:flex debo:justify-end">
                        <span className="debo:inline-flex debo:items-center debo:gap-1 debo:bg-[#F1F5F9] debo:rounded-[8px] debo:px-2.5 debo:py-1 debo:!font-mono debo:text-[13px] debo:whitespace-nowrap">
                            <span className="debo:text-[#45556C]">{fontSize}px</span>
                            <span className="debo:text-[#90A1B9]">/</span>
                            <span className="debo:text-[#62748E]">{lineHeight}px</span>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DeboTypographySection({ group }) {
    const tokenEntries = Object.entries(group).filter(([k]) => !k.startsWith('$'));
    const fontTokens = tokenEntries.filter(([, v]) => isToken(v) && v.$type === 'fontFamily');

    const headingFont = (fontTokens.find(([k]) => k === 'heading') || fontTokens[0])?.[1]?.$value || 'sans-serif';

    return (
        <DeboCollapsible title="Typography" count={fontTokens.length} defaultOpen={true}>
            <div className="debo:px-8 debo:pt-3 debo:pb-0 debo:flex debo:flex-col debo:gap-12">

                {/* Font Families sub-section */}
                <div className="debo:flex debo:flex-col debo:gap-5">
                    <h4 className="debo:!font-sans debo:text-[14px] debo:font-semibold debo:uppercase debo:tracking-[0.55px] debo:leading-5 debo:text-[#0F172B]">
                        Font Families
                    </h4>
                    <div className="debo:flex debo:gap-6">
                        {fontTokens.map(([key, token]) => (
                            <DeboFontCard key={key} tokenKey={key} value={token.$value} />
                        ))}
                    </div>
                </div>

                {/* Type Scale sub-section */}
                <div className="debo:flex debo:flex-col debo:gap-5">
                    <h4 className="debo:!font-sans debo:text-[14px] debo:font-semibold debo:uppercase debo:tracking-[0.55px] debo:leading-5 debo:text-[#0F172B]">
                        Type Scale
                    </h4>
                    <DeboTypeScale headingFont={headingFont} />
                </div>
            </div>
        </DeboCollapsible>
    );
}

// ─── Generic token fallback ─────────────────────────────────────────────────

function GenericToken({ name, value }) {
    return (
        <div className="debo:flex debo:justify-between debo:text-sm debo:py-1">
            <span className="debo:text-base-content/70">{name}:</span>
            <span className="debo:font-mono debo:text-base-content">{String(value)}</span>
        </div>
    );
}

function GenericGroup({ name, group }) {
    const entries = Object.entries(group).filter(([k]) => !k.startsWith('$'));
    const tokens = entries.filter(([, v]) => isToken(v));
    const subgroups = entries.filter(([, v]) => !isToken(v) && typeof v === 'object');

    return (
        <DeboCollapsible title={name} count={tokens.length} defaultOpen={false}>
            <div className="debo:px-6 debo:py-4 debo:space-y-2">
                {tokens.map(([k, v]) => <GenericToken key={k} name={k} value={v.$value} />)}
                {subgroups.map(([k, v]) => <GenericGroup key={k} name={k} group={v} />)}
            </div>
        </DeboCollapsible>
    );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * DeboDesignTokens — Displays W3C design tokens with Color, Typography, and other sections.
 *
 * @param {Object} props
 * @param {Object} props.tokens - W3C Design Tokens object (parsed from design-tokens.yml)
 */
export function DeboDesignTokens({ tokens }) {
    if (!tokens || Object.keys(tokens).length === 0) return null;

    const colorGroup = tokens.color;
    const typographyGroup = tokens.typography;

    const otherGroups = Object.entries(tokens).filter(
        ([k]) => !k.startsWith('$') && k !== 'color' && k !== 'typography'
    );

    const colorCount = colorGroup
        ? Object.entries(colorGroup).filter(([k, v]) => !k.startsWith('$') && isToken(v)).length
        : 0;

    const hasTypography = typographyGroup &&
        Object.entries(typographyGroup).some(([k, v]) => !k.startsWith('$') && isToken(v));

    return (
        <div className="debo:flex debo:flex-col debo:gap-6">
            {/* "DESIGN TOKENS" section label */}
            <p className="debo:!font-sans debo:text-[12px] debo:font-semibold debo:uppercase debo:tracking-[0.6px] debo:leading-[16px] debo:text-[#90A1B9]">
                Design Tokens
            </p>

            {/* Color */}
            {colorGroup && colorCount > 0 && (
                <DeboColorSection group={colorGroup} />
            )}

            {/* Typography */}
            {hasTypography && (
                <DeboTypographySection group={typographyGroup} />
            )}

            {/* Other token groups */}
            {otherGroups.map(([key, group]) => (
                typeof group === 'object' && !isToken(group)
                    ? <GenericGroup key={key} name={key} group={group} />
                    : null
            ))}
        </div>
    );
}
