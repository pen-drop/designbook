import { describe, it, expect } from 'vitest';
import type { ResolverContext } from '../types.js';
import { scenePathResolver } from '../scene-path.js';

function makeContext(dataDir = '/tmp/db-test'): ResolverContext {
  return { config: { data: dataDir, technology: 'html' }, params: {} };
}

describe('scenePathResolver', () => {
  it('has name "scene_path"', () => {
    expect(scenePathResolver.name).toBe('scene_path');
  });

  it('resolves shell to the design-system shell path', async () => {
    const result = await scenePathResolver.resolve('shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('design-system/design-system.scenes.yml');
  });

  it('resolves a section id to the section scenes path', async () => {
    const result = await scenePathResolver.resolve('hero', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/hero/hero.section.scenes.yml');
  });

  it('returns unresolved for empty input', async () => {
    const result = await scenePathResolver.resolve('', {}, makeContext());
    expect(result.resolved).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('normalises section ids to kebab-case', async () => {
    const result = await scenePathResolver.resolve('Hero Section', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/hero-section/hero-section.section.scenes.yml');
  });

  it('resolves a Designbook/Sections story id to the section scenes path', async () => {
    const result = await scenePathResolver.resolve('Designbook/Sections/Homepage--default', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/homepage/homepage.section.scenes.yml');
  });

  it('kebab-cases multi-word titles from story ids', async () => {
    const result = await scenePathResolver.resolve('Designbook/Sections/Pet Details--default', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/pet-details/pet-details.section.scenes.yml');
  });

  it('resolves a Designbook/Design System story id to the shell scenes path', async () => {
    const result = await scenePathResolver.resolve('Designbook/Design System/Shell--default', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('design-system/design-system.scenes.yml');
  });

  it('strips the --variant suffix from story ids', async () => {
    const result = await scenePathResolver.resolve('Designbook/Sections/Homepage--mobile', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/homepage/homepage.section.scenes.yml');
  });

  // The story_id resolver returns Storybook's sanitised id (no slashes) — this is
  // the actual shape `scene_path` receives via `from: story_id` in design-screen.
  it('reverses a sanitised section scene story id to the section scenes path', async () => {
    const result = await scenePathResolver.resolve('designbook-sections-galerie-scenes--hero', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/galerie/galerie.section.scenes.yml');
  });

  it('reverses a multi-word sanitised section scene story id', async () => {
    const result = await scenePathResolver.resolve(
      'designbook-sections-pet-details-scenes--default',
      {},
      makeContext(),
    );
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/pet-details/pet-details.section.scenes.yml');
  });

  it('reverses a sanitised section scene story id without a variant', async () => {
    const result = await scenePathResolver.resolve('designbook-sections-galerie-scenes', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('sections/galerie/galerie.section.scenes.yml');
  });

  it('reverses the sanitised design-system scene story id to the shell path', async () => {
    const result = await scenePathResolver.resolve('designbook-design-system-scenes--shell', {}, makeContext());
    expect(result.resolved).toBe(true);
    expect(result.value).toBe('design-system/design-system.scenes.yml');
  });
});
