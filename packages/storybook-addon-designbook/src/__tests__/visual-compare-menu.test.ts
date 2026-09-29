import { describe, it, expect } from 'vitest';
import { capturesFor, menuModel, type VisualCompareStory } from '../addon/visual-compare-menu.js';

const story: VisualCompareStory = {
  reference: 'aaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbb',
  referenceDir: 'references/aaaaaaaaaaaaaaaa/bbbbbbbbbbbbbbbb',
  elements: [{ id: 'header', selector: '.site-header' }],
  referenceElements: [
    {
      id: 'header',
      views: [
        { id: 'mobile', width: 390, height: 844 },
        { id: 'desktop', width: 1280, height: 900 },
      ],
    },
  ],
  referenceCaptures: [
    { subject: 'header', view: 'desktop', state: 'rest', path: 'header--desktop--rest.png' },
    { subject: 'header', view: 'desktop', state: 'open', path: 'header--desktop--open.png' },
    { subject: 'header', view: 'mobile', state: 'open', path: 'header--mobile--open.png' },
  ],
};

describe('menuModel', () => {
  it('lists every captured view/state tuple separately and nothing uncaptured', () => {
    const model = menuModel(200, story);
    expect(model.kind).toBe('ok');
    if (model.kind !== 'ok') return;
    expect(model.views.map((v) => [v.id, v.width, v.states.map((s) => s.name)])).toEqual([
      ['mobile', 390, ['open']],
      ['desktop', 1280, ['rest', 'open']],
    ]);
    expect(model.views[1]!.states[1]!.subjects).toEqual(['header']);
  });

  it('keeps a component story without scene/entity parameters reachable by its binding alone', () => {
    expect(menuModel(200, story).kind).toBe('ok');
  });

  it('distinguishes missing meta, unbound, unpublished, read errors and request failures', () => {
    expect(menuModel(404, { error: 'Story not found' })).toEqual({ kind: 'hidden' });
    expect(menuModel(200, { ...story, reference: null })).toEqual({ kind: 'message', text: 'No reference bound' });
    expect(menuModel(409, { error: 'x', reference: story.reference })).toEqual({
      kind: 'error',
      text: `Bound reference ${story.reference} is not a published revision`,
    });
    expect(menuModel(500, { error: 'Reference fingerprint changed: meta.yml' })).toEqual({
      kind: 'error',
      text: 'Reference could not be loaded: Reference fingerprint changed: meta.yml',
    });
    expect(menuModel(502, null)).toEqual({ kind: 'error', text: 'Story metadata request failed (HTTP 502)' });
    expect(menuModel(0, null)).toEqual({ kind: 'error', text: 'Story metadata request failed (network error)' });
    expect(menuModel(200, { ...story, referenceCaptures: [] })).toEqual({
      kind: 'message',
      text: 'No captures in this reference',
    });
  });
});

describe('capturesFor', () => {
  it('selects the exact state instead of falling back to rest', () => {
    expect(capturesFor(story, 'desktop', 'open')).toEqual([
      { name: 'header', selector: '.site-header', path: 'header--desktop--open.png' },
    ]);
    expect(capturesFor(story, 'desktop', 'rest')[0]!.path).toBe('header--desktop--rest.png');
  });

  it('draws nothing without a state or for an uncaptured tuple', () => {
    expect(capturesFor(story, 'desktop', null)).toEqual([]);
    expect(capturesFor(story, 'mobile', 'rest')).toEqual([]);
  });
});
