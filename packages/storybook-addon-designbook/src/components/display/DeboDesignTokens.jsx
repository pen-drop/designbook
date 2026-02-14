
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';

// Simple check for W3C Token
const isToken = (obj) => obj && typeof obj === 'object' && '$value' in obj;

// Token Renderers
function ColorToken({ name, value, description }) {
    return (
        <div className="debo:flex debo:items-center debo:gap-3 debo:mb-2">
            <div
                className="debo:w-10 debo:h-10 debo:rounded-md debo:border debo:border-base-300 debo:shrink-0"
                style={{ backgroundColor: value }}
                title={value}
            />
            <div>
                <p className="debo:font-medium debo:text-sm debo:text-base-content">{name}</p>
                <p className="debo:text-xs debo:font-mono debo:text-base-content/50">{value}</p>
                {description && <p className="debo:text-xs debo:text-base-content/40">{description}</p>}
            </div>
        </div>
    );
}

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

    if ($type === 'color' || name.toLowerCase().includes('color')) {
        return <ColorToken name={name} value={$value} description={$description} />;
    }
    if ($type === 'fontFamily' || name.toLowerCase().includes('font')) {
        return <TypographyToken name={name} value={$value} description={$description} />;
    }

    return <GenericToken name={name} value={$value} />;
}

// Recursive Group Renderer
function TokenGroup({ name, group, depth = 0 }) {
    const entries = Object.entries(group).filter(([k]) => !k.startsWith('$'));

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
