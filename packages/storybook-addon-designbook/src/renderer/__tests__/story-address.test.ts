import { describe, it, expect } from 'vitest';
import { titleCaseBundle, namespaceFor, entityStoryGroup, formStoryName } from '../story-address';
import type { DataModel } from '../types';
import { indexEntity } from '../../preset';
import { resolve } from 'node:path';

const FIXTURES = resolve(__dirname, 'fixtures');

const model = {
  content: { node: { article: { title: 'Article' } } },
  config: { view: { recent_articles: { title: 'Recent' } } },
} as unknown as DataModel;

describe('story-address', () => {
  it('title-cases bundles', () => {
    expect(titleCaseBundle('article')).toBe('Article');
    expect(titleCaseBundle('landing_page')).toBe('Landing Page');
  });

  it('resolves namespaces', () => {
    expect(namespaceFor(model, 'node', 'article')).toBe('content');
    expect(namespaceFor(model, 'view', 'recent_articles')).toBe('config');
    expect(namespaceFor(model, 'node', 'missing')).toBeNull();
  });

  it('groups content under Entities/<type>/<TitleCase>', () => {
    expect(entityStoryGroup(model, 'node', 'article')).toEqual({
      title: 'Entities/node/Article',
      isConfig: false,
    });
  });

  it('groups config under Config/<type>/<rawBundle>', () => {
    expect(entityStoryGroup(model, 'view', 'recent_articles')).toEqual({
      title: 'Config/view/recent_articles',
      isConfig: true,
    });
  });

  it('builds the form story name', () => {
    expect(formStoryName('default')).toBe('default (form)');
  });
});

describe('story-address ↔ indexer parity', () => {
  it('entityStoryGroup title matches indexEntity title (config bundle)', () => {
    const file = resolve(FIXTURES, 'entity-mapping', 'view.recent_articles.default.jsonata');
    const story = (indexEntity(file) as { type: string; title: string; name?: string }[]).find(
      (e) => e.type === 'story',
    )!;
    expect(story.title).toBe('Config/view/recent_articles');
    expect(story.name).toBe('default');
  });

  it('entityStoryGroup title matches indexEntity title (content bundle)', () => {
    const file = resolve(FIXTURES, 'entity-mapping', 'node.article.teaser.jsonata');
    const story = (indexEntity(file) as { type: string; title: string; name?: string }[]).find(
      (e) => e.type === 'story',
    )!;
    expect(story.title).toBe('Entities/node/Article');
    expect(story.name).toBe('teaser');
  });
});
