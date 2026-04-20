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
});
