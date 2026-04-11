/**
 * DeboRainbowBorder — animated border wrapper with two variants:
 * - "running" (default): rotating rainbow conic-gradient
 * - "waiting": pulsing amber glow
 *
 * Uses a single injected <style> for the @keyframes, so multiple instances
 * share the same animation.
 */
import React, { useRef, useEffect } from 'react';
import { useTheme } from 'storybook/theming';

const KEYFRAMES_ID = 'debo-rainbow-spin';

function ensureKeyframes() {
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
    @keyframes debo-rainbow-spin {
      0%   { --debo-rainbow-angle: 0deg; }
      100% { --debo-rainbow-angle: 360deg; }
    }
    @property --debo-rainbow-angle {
      syntax: "<angle>";
      initial-value: 0deg;
      inherits: false;
    }
    @keyframes debo-waiting-pulse {
      0%, 100% { opacity: 0.5; }
      50%      { opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

const RAINBOW_GRADIENT =
  'conic-gradient(from var(--debo-rainbow-angle), #f87171, #fb923c, #facc15, #4ade80, #38bdf8, #a78bfa, #f472b6, #f87171)';

/* WAITING_GRADIENT is resolved per-render via theme — see DeboRainbowBorder */

interface DeboRainbowBorderProps {
  active: boolean;
  variant?: 'running' | 'waiting';
  borderRadius?: number;
  borderWidth?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function DeboRainbowBorder({
  active,
  variant = 'running',
  borderRadius = 8,
  borderWidth = 2,
  style,
  children,
}: DeboRainbowBorderProps) {
  const theme = useTheme();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ensureKeyframes();
  }, [active]);

  if (!active) {
    return <div style={style}>{children}</div>;
  }

  const isWaiting = variant === 'waiting';
  const waitingGradient = `linear-gradient(135deg, ${theme.color.warning}, #fbbf24, ${theme.color.warning})`;

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        borderRadius,
        padding: borderWidth,
        background: isWaiting ? waitingGradient : RAINBOW_GRADIENT,
        animation: isWaiting ? 'debo-waiting-pulse 2s ease-in-out infinite' : 'debo-rainbow-spin 3s linear infinite',
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: borderRadius - 1,
          background: theme.background.content,
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
