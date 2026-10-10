import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { toId, storyNameFromExport } from 'storybook/internal/csf';
import { indexScenesFile } from '../addon/preset';

interface IndexEntry {
  type: string;
  importPath: string;
  exportName: string;
  title: string;
  name?: string;
  tags?: string[];
}

function storyId(entry: IndexEntry): string {
  const name = entry.name ?? storyNameFromExport(entry.exportName);
  return toId(entry.title, name);
}

describe('section scene story ids', () => {
  it('match StoryId documented derivation for overview and scene exports', () => {
    const root = mkdtempSync(join(tmpdir(), 'debo-scene-id-'));
    const sectionsDir = resolve(root, 'sections', 'group-detail');
    mkdirSync(sectionsDir, { recursive: true });
    const fileName = join(sectionsDir, 'group-detail.section.scenes.yml');
    writeFileSync(
      fileName,
      [
        'id: "group-detail"',
        'title: "Gruppendetailseite"',
        'group: "Designbook/Sections/Gruppendetailseite"',
        'scenes:',
        '  - name: "Gruppen Manager"',
        '    items: []',
        '  - name: "Mitglied"',
        '    items: []',
        '',
      ].join('\n'),
    );

    const entries = indexScenesFile(fileName) as IndexEntry[];
    const ids = entries.map(storyId);

    expect(ids).toContain('designbook-sections-gruppendetailseite--overview');
    expect(ids).toContain('designbook-sections-gruppendetailseite-scenes--gruppen-manager');
    expect(ids).toContain('designbook-sections-gruppendetailseite-scenes--mitglied');

    const repoRoot = resolve(import.meta.dirname, '../../../../');
    const schemas = parseYaml(
      readFileSync(resolve(repoRoot, '.agents/skills/designbook/scenes/schemas.yml'), 'utf8'),
    ) as {
      StoryId: { description: string; examples: string[] };
      SceneFile: { properties: { group: { description: string } } };
    };
    const { description, examples } = schemas.StoryId;

    expect(description).toMatch(/sanitize\(<group>\/Scenes\)/i);
    expect(description).toMatch(/sanitize\(<group>\)--overview/i);
    expect(description).toMatch(/Vue component stories/i);
    expect(examples).toContain('designbook-sections-wayfinding-scenes--signage');
    expect(examples).toContain('designbook-sections-wayfinding--overview');
    expect(examples).toContain('components-book-card--default');
    expect(examples).not.toContain('designbook-design-system--overview');
    expect(examples).not.toContain('design-system--shell');
    expect(schemas.SceneFile.properties.group.description).toMatch(/bare story group/i);
    expect(schemas.SceneFile.properties.group.description).toMatch(/\/Scenes/);
  });

  it('indexes the documented wayfinding overview id from a section scenes file', () => {
    const root = mkdtempSync(join(tmpdir(), 'debo-scene-id-wayfinding-'));
    const sectionsDir = resolve(root, 'sections', 'wayfinding');
    mkdirSync(sectionsDir, { recursive: true });
    const fileName = join(sectionsDir, 'wayfinding.section.scenes.yml');
    writeFileSync(
      fileName,
      [
        'id: "wayfinding"',
        'title: "Wayfinding"',
        'group: "Designbook/Sections/Wayfinding"',
        'scenes:',
        '  - name: "signage"',
        '    items: []',
        '',
      ].join('\n'),
    );

    const ids = (indexScenesFile(fileName) as IndexEntry[]).map(storyId);
    expect(ids).toContain('designbook-sections-wayfinding--overview');
    expect(ids).toContain('designbook-sections-wayfinding-scenes--signage');
  });
});
