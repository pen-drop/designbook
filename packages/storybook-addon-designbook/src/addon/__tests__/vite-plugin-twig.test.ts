import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderTwigForTest } from '../vite-plugin-twig.js';

describe('twig rendering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'twigc-'));
  mkdirSync(join(dir, 'card'));
  mkdirSync(join(dir, 'badge'));
  writeFileSync(join(dir, 'badge', 'badge.twig'), '<span class="badge">{{ label|e }}</span>');
  writeFileSync(
    join(dir, 'card', 'card.twig'),
    "<article>{{ title|e }}{% include '@ns/badge/badge.twig' with { label: 'New' } only %}<div>{{ content }}</div></article>",
  );

  it('renders props escaped, slot html raw, and namespaced includes', () => {
    const html = renderTwigForTest(dir, 'ns', join(dir, 'card', 'card.twig'), {
      title: '<b>x</b>',
      content: '<strong>slot</strong>',
    });
    expect(html).toBe(
      '<article>&lt;b&gt;x&lt;/b&gt;<span class="badge">New</span><div><strong>slot</strong></div></article>',
    );
  });
});
