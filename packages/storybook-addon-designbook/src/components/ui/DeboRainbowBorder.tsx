/**
 * DeboRainbowBorder — animated rainbow border wrapper.
 *
 * Wraps children in a container with a rotating conic-gradient border.
 * Uses a single injected <style> for the @keyframes, so multiple instances
 * share the same animation.
 */
import React, { useRef, useEffect } from 'react';

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
  `;
  document.head.appendChild(style);
}

const GRADIENT =
  'conic-gradient(from var(--debo-rainbow-angle), #f87171, #fb923c, #facc15, #4ade80, #38bdf8, #a78bfa, #f472b6, #f87171)';

interface DeboRainbowBorderProps {
  active: boolean;
  borderRadius?: number;
  borderWidth?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

export function DeboRainbowBorder({
  active,
  borderRadius = 8,
  borderWidth = 2,
  style,
  children,
}: DeboRainbowBorderProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ensureKeyframes();
  }, [active]);

  if (!active) {
    return <div style={style}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        borderRadius,
        padding: borderWidth,
        background: GRADIENT,
        animation: 'debo-rainbow-spin 3s linear infinite',
        ...style,
      }}
    >
      <div
        style={{
          borderRadius: borderRadius - 1,
          background: 'var(--appContentBg, #1a1a2e)',
          position: 'relative',
        }}
      >
        {children}
      </div>
    </div>
  );
}
