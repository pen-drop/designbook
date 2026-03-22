import React from 'react';
import { styled } from 'storybook/theming';

const GAP_MAP = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
};

const GridContainer = styled.div(({ $columns, $gap }) => ({
  display: 'grid',
  gridTemplateColumns: $columns,
  gap: $gap,
}));

/**
 * DeboGrid — Shared grid layout component.
 *
 * @param {'1'|'auto'} variant
 *   - '1': single column stack
 *   - 'auto': responsive auto-fill columns
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} gap — t-shirt size (default 'md')
 * @param {number} minWidth — min column width for auto variant (default 280)
 */
export function DeboGrid({ variant = '1', gap = 'md', minWidth = 280, children }) {
  const columns =
    variant === 'auto'
      ? `repeat(auto-fill, minmax(${minWidth}px, 1fr))`
      : '1fr';

  const gapPx = GAP_MAP[gap] ?? GAP_MAP.md;

  return (
    <GridContainer $columns={columns} $gap={gapPx}>
      {children}
    </GridContainer>
  );
}
