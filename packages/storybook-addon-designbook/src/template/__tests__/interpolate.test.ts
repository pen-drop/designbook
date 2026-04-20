import { describe, it, expect } from 'vitest';
import { interpolate } from '../interpolate.js';

const envMap = { DESIGNBOOK_HOME: '/abs/home', DESIGNBOOK_DATA: '/abs/data' };

describe('interpolate', () => {
  it('expands flat {{ name }}', async () => {
    expect(await interpolate('hi {{ name }}', { name: 'ada' })).toBe('hi ada');
  });

  it('expands dotted {{ variant.id }}', async () => {
    const tpl = 'components/{{ component }}/{{ component }}.{{ variant.id }}.story.yml';
    const scope = { component: 'navigation', variant: { id: 'main' } };
    expect(await interpolate(tpl, scope)).toBe('components/navigation/navigation.main.story.yml');
  });

  it('expands ${VAR} env via $env', async () => {
    const tpl = '${DESIGNBOOK_HOME}/components/{{ component }}/file.yml';
    expect(await interpolate(tpl, { component: 'navigation' }, { envMap })).toBe(
      '/abs/home/components/navigation/file.yml',
    );
  });

  it('expands $VAR env form', async () => {
    const tpl = '$DESIGNBOOK_DATA/data.yml';
    expect(await interpolate(tpl, {}, { envMap })).toBe('/abs/data/data.yml');
  });

  it('throws on unknown ${VAR}', async () => {
    await expect(interpolate('${UNKNOWN_VAR}/test', {}, { envMap })).rejects.toThrow(/UNKNOWN_VAR/);
  });

  it('supports JSONata filters', async () => {
    const scope = {
      variants: [
        { id: 'main', published: true },
        { id: 'draft', published: false },
      ],
    };
    expect(await interpolate('{{ variants[published = true].id }}', scope)).toBe('main');
  });

  it('supports JSONata functions (lowercase, join)', async () => {
    expect(await interpolate('{{ $lowercase(name) }}', { name: 'Navigation' })).toBe('navigation');
    expect(await interpolate('{{ items.title ~> $join(",") }}', { items: [{ title: 'a' }, { title: 'b' }] })).toBe(
      'a,b',
    );
  });

  it('throws on unknown path by default', async () => {
    await expect(interpolate('{{ missing }}', {})).rejects.toThrow(/missing/);
  });

  it('leaves unknown path as-is when lenient', async () => {
    expect(await interpolate('{{ missing }}', {}, { lenient: true })).toBe('{{ missing }}');
  });

  it('caches compiled expressions across calls', async () => {
    for (let i = 0; i < 100; i++) {
      expect(await interpolate('{{ n }}', { n: i })).toBe(String(i));
    }
  });

  it('preserves scene array short-circuit', async () => {
    const arr = [{ scene: 'shell' }, { scene: 'hero' }];
    expect(await interpolate('{{ scenes }}', { scenes: arr })).toBe('shell');
  });

  it('preserves storyId array short-circuit', async () => {
    const arr = [{ storyId: 'foo--bar' }, { storyId: 'baz--qux' }];
    expect(await interpolate('{{ stories }}', { stories: arr })).toBe('foo--bar');
  });

  it('stringifies numbers and booleans', async () => {
    expect(await interpolate('{{ n }}/{{ b }}', { n: 42, b: true })).toBe('42/true');
  });

  it('stringifies null/undefined to empty string', async () => {
    expect(await interpolate('[{{ x }}]', { x: null })).toBe('[]');
  });

  it('handles multiple placeholders in one template', async () => {
    expect(await interpolate('{{ a }}-{{ b }}-{{ a }}', { a: '1', b: '2' })).toBe('1-2-1');
  });

  it('returns template unchanged when no placeholders', async () => {
    expect(await interpolate('no placeholders here', {})).toBe('no placeholders here');
  });
});
