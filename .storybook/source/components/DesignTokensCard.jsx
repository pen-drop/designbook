import { DeboCard } from './DeboCard.jsx';
import { DeboCollapsible } from './DeboCollapsible.jsx';

/**
 * Tailwind color name → hex values for visual preview (light/base/dark shades).
 */
const colorMap = {
  red: { light: '#fca5a5', base: '#ef4444', dark: '#dc2626' },
  orange: { light: '#fdba74', base: '#f97316', dark: '#ea580c' },
  amber: { light: '#fcd34d', base: '#f59e0b', dark: '#d97706' },
  yellow: { light: '#fde047', base: '#eab308', dark: '#ca8a04' },
  lime: { light: '#bef264', base: '#84cc16', dark: '#65a30d' },
  green: { light: '#86efac', base: '#22c55e', dark: '#16a34a' },
  emerald: { light: '#6ee7b7', base: '#10b981', dark: '#059669' },
  teal: { light: '#5eead4', base: '#14b8a6', dark: '#0d9488' },
  cyan: { light: '#67e8f9', base: '#06b6d4', dark: '#0891b2' },
  sky: { light: '#7dd3fc', base: '#0ea5e9', dark: '#0284c7' },
  blue: { light: '#93c5fd', base: '#3b82f6', dark: '#2563eb' },
  indigo: { light: '#a5b4fc', base: '#6366f1', dark: '#4f46e5' },
  violet: { light: '#c4b5fd', base: '#8b5cf6', dark: '#7c3aed' },
  purple: { light: '#d8b4fe', base: '#a855f7', dark: '#9333ea' },
  fuchsia: { light: '#f0abfc', base: '#d946ef', dark: '#c026d3' },
  pink: { light: '#f9a8d4', base: '#ec4899', dark: '#db2777' },
  rose: { light: '#fda4af', base: '#f43f5e', dark: '#e11d48' },
  slate: { light: '#cbd5e1', base: '#64748b', dark: '#475569' },
  gray: { light: '#d1d5db', base: '#6b7280', dark: '#4b5563' },
  zinc: { light: '#d4d4d8', base: '#71717a', dark: '#52525b' },
  neutral: { light: '#d4d4d4', base: '#737373', dark: '#525252' },
  stone: { light: '#d6d3d1', base: '#78716c', dark: '#57534e' },
};

function ColorSwatch({ label, colorName }) {
  const colors = colorMap[colorName] || colorMap.stone;

  return (
    <div>
      <div className="debo:flex debo:gap-0.5 debo:mb-2">
        <div
          className="debo:flex-1 debo:h-14 debo:rounded-l-md"
          style={{ backgroundColor: colors.light }}
          title={`${colorName}-300`}
        />
        <div
          className="debo:flex-[2] debo:h-14"
          style={{ backgroundColor: colors.base }}
          title={`${colorName}-500`}
        />
        <div
          className="debo:flex-1 debo:h-14 debo:rounded-r-md"
          style={{ backgroundColor: colors.dark }}
          title={`${colorName}-600`}
        />
      </div>
      <p className="debo:text-sm debo:font-medium debo:text-base-content">{label}</p>
      <p className="debo:text-xs debo:text-base-content/50">{colorName}</p>
    </div>
  );
}

/**
 * DesignTokensCard — Displays design tokens (colors + typography).
 * Composed from DeboCard and DeboCollapsible base components.
 *
 * @param {Object} props
 * @param {Object} props.tokens - Design tokens data
 * @param {Object} [props.tokens.colors] - { primary, secondary, neutral }
 * @param {Object} [props.tokens.typography] - { heading, body, mono }
 */
export function DesignTokensCard({ tokens }) {
  if (!tokens) return null;

  const hasColors = tokens.colors && (tokens.colors.primary || tokens.colors.secondary || tokens.colors.neutral);
  const hasTypography = tokens.typography && (tokens.typography.heading || tokens.typography.body);

  return (
    <DeboCard title="Design Tokens">
      {hasColors && (
        <DeboCollapsible title="Colors" count={3} defaultOpen>
          <div className="debo:grid debo:grid-cols-3 debo:gap-6">
            {tokens.colors.primary && (
              <ColorSwatch label="Primary" colorName={tokens.colors.primary} />
            )}
            {tokens.colors.secondary && (
              <ColorSwatch label="Secondary" colorName={tokens.colors.secondary} />
            )}
            {tokens.colors.neutral && (
              <ColorSwatch label="Neutral" colorName={tokens.colors.neutral} />
            )}
          </div>
        </DeboCollapsible>
      )}

      {hasTypography && (
        <DeboCollapsible title="Typography" count={3} defaultOpen>
          <div className="debo:grid debo:grid-cols-3 debo:gap-6">
            {tokens.typography.heading && (
              <div>
                <p className="debo:text-xs debo:text-base-content/50 debo:mb-1">Heading</p>
                <p className="debo:font-semibold debo:text-base-content">
                  {tokens.typography.heading}
                </p>
              </div>
            )}
            {tokens.typography.body && (
              <div>
                <p className="debo:text-xs debo:text-base-content/50 debo:mb-1">Body</p>
                <p className="debo:text-base-content">
                  {tokens.typography.body}
                </p>
              </div>
            )}
            {tokens.typography.mono && (
              <div>
                <p className="debo:text-xs debo:text-base-content/50 debo:mb-1">Mono</p>
                <p className="debo:font-mono debo:text-base-content">
                  {tokens.typography.mono}
                </p>
              </div>
            )}
          </div>
        </DeboCollapsible>
      )}
    </DeboCard>
  );
}
