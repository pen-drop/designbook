import { describe, it, expect } from 'vitest';
import { deriveModeBadges } from '../mode-badges';

describe('deriveModeBadges', () => {
  const files = [
    'node.article.full.jsonata', // mapped (declared)
    'node.article.legacy.jsonata', // orphan (not declared)
    'other.thing.full.jsonata', // different bundle → ignored
    'node.article.notes.txt', // non-jsonata → ignored
  ];

  it('marks declared modes mapped when a file exists, else open', () => {
    const badges = deriveModeBadges(['full', 'teaser'], files, 'node', 'article');
    expect(badges).toEqual([
      { mode: 'full', state: 'mapped' },
      { mode: 'teaser', state: 'open' },
      { mode: 'legacy', state: 'orphan' },
    ]);
  });

  it('lists declared first (declaration order), orphans sorted after', () => {
    const badges = deriveModeBadges(
      ['teaser', 'full'],
      ['node.article.zzz.jsonata', 'node.article.aaa.jsonata'],
      'node',
      'article',
    );
    expect(badges.map((b) => b.mode)).toEqual(['teaser', 'full', 'aaa', 'zzz']);
    expect(badges.map((b) => b.state)).toEqual(['open', 'open', 'orphan', 'orphan']);
  });

  it('returns [] for no declarations and no matching files', () => {
    expect(deriveModeBadges([], ['x.y.z.jsonata'], 'node', 'article')).toEqual([]);
  });
});
