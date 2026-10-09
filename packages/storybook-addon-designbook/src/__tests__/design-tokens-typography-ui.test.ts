// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ThemeProvider, themes, ensure } from 'storybook/theming';

import { DeboDesignTokens, resolveTokenReferences } from '../addon/components/display/DeboDesignTokens.jsx';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// ThemeProvider's typings require `children` as a prop; pass it as an argument instead.
const Themed = ThemeProvider as React.FC<{ theme: unknown; children?: React.ReactNode }>;

const tokens = () => ({
  primitive: {
    fontFamily: { heading: { $type: 'fontFamily', $value: 'Rubik' } },
    fontSize: { xl: { $type: 'dimension', $value: '38px' } },
    fontWeight: { bold: { $type: 'fontWeight', $value: 700 } },
    lineHeight: { tight: { $type: 'number', $value: 1.2 } },
    color: { blue: { $type: 'color', $value: '#123456' } },
  },
  semantic: {
    color: { primary: { $type: 'color', $value: '{primitive.color.blue}' } },
    typography: {
      'heading-1': {
        $type: 'typography',
        $value: {
          fontFamily: '{primitive.fontFamily.heading}',
          fontSize: '{primitive.fontSize.xl}',
          fontWeight: '{primitive.fontWeight.bold}',
          lineHeight: '{primitive.lineHeight.tight}',
          color: '{semantic.color.primary}',
        },
      },
    },
  },
});

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
});

function render(value: Record<string, unknown>) {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root!.render(
      React.createElement(
        Themed,
        { theme: ensure(themes.light) },
        React.createElement(DeboDesignTokens, { tokens: value }),
      ),
    ),
  );
  return host;
}

describe('semantic typography tokens', () => {
  it('resolves references inside a composite $value', () => {
    const resolved = resolveTokenReferences(tokens());
    expect(resolved.semantic.typography['heading-1'].$value).toEqual({
      fontFamily: 'Rubik',
      fontSize: '38px',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#123456',
    });
  });

  it('renders a specimen with resolved values instead of [object Object]', () => {
    const el = render(resolveTokenReferences(tokens()));
    expect(el.textContent).not.toContain('[object Object]');
    for (const v of ['heading-1', 'Rubik', '38px', '700', '1.2', '#123456']) {
      expect(el.textContent).toContain(v);
    }
    const sample = el.querySelector<HTMLElement>('[data-typography-sample="heading-1"]');
    expect(sample).not.toBeNull();
    expect(sample!.style.fontSize).toBe('38px');
    expect(sample!.style.fontWeight).toBe('700');
    expect(sample!.style.fontFamily).toBe('Rubik');
  });
});
