import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkTwigIncludes } from '../twig-check.js';

describe('checkTwigIncludes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'twigcheck-'));
  mkdirSync(join(dir, 'card'));
  writeFileSync(
    join(dir, 'card', 'card.schema.yml'),
    'name: Card\nprops:\n  type: object\n  properties:\n    title: { type: string }\n    image_src: { type: string }\n  required: [title]\nslots:\n  content: { title: Content }\n',
  );
  const check = (src: string) => checkTwigIncludes(src, dir, 'ns');

  it('accepts declared props and slots, including nested expressions', () => {
    expect(
      check(
        "{% include '@ns/card/card.twig' with { title: post.title, image_src: x ? {a: 1}.a : '', content: c } only %}",
      ),
    ).toEqual([]);
  });

  it('reports undeclared keys and unbound required props', () => {
    expect(check("{% include '@ns/card/card.twig' with { image: {src: post.thumbnail.src} } only %}")).toEqual([
      'card: "image" is not a prop or slot of card.schema.yml',
      'card: required prop "title" is not bound',
    ]);
  });

  it('reports includes of unknown components and ignores other namespaces', () => {
    expect(check("{% include '@ns/missing/missing.twig' %}{% include 'parts/header.twig' %}")).toEqual([
      'missing: no components/missing/missing.schema.yml',
    ]);
  });
});
