# Mapped View/Form Modes in der Data-Model-Übersicht — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Jede Bundle-Karte der Data-Model-Übersicht zeigt Badge-Listen der deklarierten View-/Form-Modes mit Mapped/Open/Orphan-Status; gemappte Badges springen direkt in die Story; die Detailansicht bekommt einen Form-Modes-Abschnitt.

**Architecture:** Ein neues reines Modul `renderer/story-address.ts` liefert Story-Titel/Name als **einzige** Quelle (Indexer + Badge teilen es). Ein Listing-Endpunkt `GET /__designbook/list` liefert je Verzeichnis die vorhandenen `.jsonata`-Dateien in **einem** Request. Reine Ableitungslogik (`renderer/mode-badges.ts`) bestimmt pro Mode den Zustand mapped/open/orphan; die preview-seitigen JSX-Komponenten rendern daraus die Badges und navigieren via `DeboLink`.

**Tech Stack:** TypeScript + React (JSX) Storybook-Addon (`packages/storybook-addon-designbook`), vitest (environment `node`), Vite-Middleware, `js-yaml`.

## Global Constraints

- Package-Wurzel für alle Pfade: `packages/storybook-addon-designbook/`.
- vitest-Environment ist **`node`** — **keine** React-Render-Tests. Testbare Logik in reine TS-Funktionen extrahieren; JSX-Verhalten (Klick, `stopPropagation`, Pending-Zustand) über das Laufzeit-Szenario verifizieren.
- Manager-Styling-Regel gilt nur für `src/manager/`; die Übersicht ist **preview-seitig** — kein Tailwind/DaisyUI, `styled` aus `storybook/theming` wie im Bestand.
- **Kein neues Story-Adressierungsschema:** Titel/Name kommen ausschließlich aus `story-address.ts` (`entityStoryGroup`, roher `view_mode`, `formStoryName`). Divergenz Sidebar↔Badge ist ein Fehler.
- **Keine Verhaltensänderung** an `indexEntity`/`indexForm`, Renderer, Story-Erzeugung; **keine** Änderung an `validators/schemas/data-model.schema.yml`.
- Gate je Task: `pnpm --filter storybook-addon-designbook exec vitest run <datei>` für Logik-Tasks; `pnpm check` (typecheck → lint → test) am Ende jedes Tasks, der Addon/TS berührt.
- Commit-Trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

Neu:
- `src/renderer/story-address.ts` — reine Story-Adress-Helfer (kein `node:*`).
- `src/renderer/mode-badges.ts` — reine Zustands-Ableitung mapped/open/orphan.
- `src/renderer/__tests__/story-address.test.ts`, `src/renderer/__tests__/mode-badges.test.ts`.
- `src/renderer/__tests__/list-mappings.test.ts` (Verzeichnis-Listing-Helfer).
- `src/components/ui/DeboModeBadges.jsx` — Badge-Listen-Komponente (View oder Form).
- Fixture `fixtures/drupal-web/data-model-modes/**` + Case `fixtures/drupal-web/cases/data-model-modes.yaml`.

Geändert:
- `src/renderer/data-pool.ts` (`namespaceFor` → Re-Export aus story-address).
- `src/renderer/entity-module-builder.ts` (Helfer-Imports; `entityStoryGroup`/`titleCaseBundle` re-exportieren für Bestandstests).
- `src/preset.ts` (Helfer-Imports; Form-Story-Name via `formStoryName`).
- `src/vite-plugin.ts` (Listing-Endpunkt + Helfer `listMappingFiles`).
- `src/components/designbookApi.js` (`listDesignbookFiles`).
- `src/components/display/DeboDataModel.jsx` (Badge-Listen an der Karte, ein Listing-Fetch je Verzeichnis, Pending-Zustand).
- `src/components/ui/DeboCard.jsx` (Slot für die Badge-Listen).
- `src/components/display/DeboDataModelDetail.jsx` (Form-Modes-Abschnitt; `ViewModeMapping` über `dir`-Prop generalisiert).

---

## Task 1: `story-address.ts` — Single-Source für Titel/Name

**Files:**
- Create: `src/renderer/story-address.ts`
- Create: `src/renderer/__tests__/story-address.test.ts`
- Modify: `src/renderer/data-pool.ts` (`namespaceFor` von hier importieren + re-exportieren)
- Modify: `src/renderer/entity-module-builder.ts` (`entityStoryGroup`, `titleCaseBundle` importieren + re-exportieren)
- Modify: `src/preset.ts` (Form-Story-Name via `formStoryName`)

**Interfaces:**
- Produces:
  - `titleCaseBundle(bundle: string): string`
  - `namespaceFor(dataModel: DataModel, entityType: string, bundle: string): 'content' | 'config' | null`
  - `entityStoryGroup(dataModel: DataModel, entity_type: string, bundle: string): { title: string; isConfig: boolean }`
  - `formStoryName(form_mode: string): string` (`` `${form_mode} (form)` ``)
- Consumes: `DataModel` aus `./types`.

- [ ] **Step 1: Failing test schreiben** — `src/renderer/__tests__/story-address.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { titleCaseBundle, namespaceFor, entityStoryGroup, formStoryName } from '../story-address';
import type { DataModel } from '../types';

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
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/story-address.test.ts`
Expected: FAIL — `Cannot find module '../story-address'`.

- [ ] **Step 3: `story-address.ts` schreiben** (Logik 1:1 aus `entity-module-builder.ts:25-49` und `data-pool.ts:17-21` übernommen, kein `node:*`)

```ts
import type { DataModel } from './types';

export function titleCaseBundle(bundle: string): string {
  return bundle
    .split(/[_-]/)
    .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export function namespaceFor(
  dataModel: DataModel,
  entityType: string,
  bundle: string,
): 'content' | 'config' | null {
  if (dataModel.content?.[entityType]?.[bundle]) return 'content';
  if (dataModel.config?.[entityType]?.[bundle]) return 'config';
  return null;
}

export function entityStoryGroup(
  dataModel: DataModel,
  entity_type: string,
  bundle: string,
): { title: string; isConfig: boolean } {
  const isConfig = namespaceFor(dataModel, entity_type, bundle) === 'config';
  const top = isConfig ? 'Config' : 'Entities';
  const leaf = isConfig ? bundle : titleCaseBundle(bundle);
  return { title: `${top}/${entity_type}/${leaf}`, isConfig };
}

/** Story NAME of a form-mode story — matches preset.ts indexForm. */
export function formStoryName(form_mode: string): string {
  return `${form_mode} (form)`;
}
```

- [ ] **Step 4: `data-pool.ts` umziehen** — die `namespaceFor`-Definition (Zeilen 17-21) entfernen und stattdessen importieren + re-exportieren, damit bestehende Importe (`entity-module-builder.ts:16 import { namespaceFor } from './data-pool'`) unverändert funktionieren:

Am Kopf von `src/renderer/data-pool.ts` ergänzen:
```ts
import { namespaceFor } from './story-address';
export { namespaceFor };
```
Und den bisherigen `export function namespaceFor(...) {...}`-Block löschen.

- [ ] **Step 5: `entity-module-builder.ts` umziehen** — lokale `titleCaseBundle`- und `entityStoryGroup`-Definitionen (Zeilen 25-49) durch Import + Re-Export ersetzen (Bestandstest `entity-module-builder.test.ts` importiert beide von hier):

```ts
import { entityStoryGroup, titleCaseBundle } from './story-address';
export { entityStoryGroup, titleCaseBundle };
```
Die alte `import { namespaceFor } from './data-pool';`-Zeile bleibt (data-pool re-exportiert weiterhin). Den `entityStoryGroup`-Aufruf in `buildEntityModule` (Zeile 184) unverändert lassen.

- [ ] **Step 6: `preset.ts` Form-Story-Name vereinheitlichen** — Import ergänzen und die Inline-Bildung ersetzen:

In `src/preset.ts` den Import erweitern:
```ts
import { entityStoryGroup } from './renderer/entity-module-builder';
import { formStoryName } from './renderer/story-address';
```
In `indexForm` (Zeile 117) `name: \`${form_mode} (form)\`` ersetzen durch `name: formStoryName(form_mode),`.

- [ ] **Step 7: Parity-Test schreiben** (struktureller Nachweis Sidebar↔Badge, inkl. Config) — an `story-address.test.ts` anhängen:

```ts
import { indexEntity, indexForm } from '../../preset';
import { resolve } from 'node:path';

const FIXTURES = resolve(__dirname, 'fixtures');

describe('story-address ↔ indexer parity', () => {
  it('entityStoryGroup title matches indexEntity title (config bundle)', () => {
    const file = resolve(FIXTURES, 'entity-mapping', 'view.recent_articles.default.jsonata');
    const story = (indexEntity(file) as { type: string; title: string; name?: string }[])
      .find((e) => e.type === 'story')!;
    expect(story.title).toBe('Config/view/recent_articles');
    expect(story.name).toBe('default');
  });

  it('entityStoryGroup title matches indexEntity title (content bundle)', () => {
    const file = resolve(FIXTURES, 'entity-mapping', 'node.article.teaser.jsonata');
    const story = (indexEntity(file) as { type: string; title: string; name?: string }[])
      .find((e) => e.type === 'story')!;
    expect(story.title).toBe('Entities/node/Article');
    expect(story.name).toBe('teaser');
  });
});
```
(Dieser Test beweist AC 7: dieselben Helfer erzeugen die Story-Adresse, die der Indexer der Sidebar gibt.)

- [ ] **Step 8: Tests grün laufen lassen**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/story-address.test.ts src/renderer/__tests__/entity-module-builder.test.ts src/__tests__/entity-indexer.test.ts`
Expected: PASS (inkl. der unveränderten Bestandstests → Beleg für AC 12).

- [ ] **Step 9: Volltest + Commit**

```bash
pnpm check
git add packages/storybook-addon-designbook/src/renderer/story-address.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/story-address.test.ts \
        packages/storybook-addon-designbook/src/renderer/data-pool.ts \
        packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts \
        packages/storybook-addon-designbook/src/preset.ts
git commit -m "DESIGNBOOK-39: extract browser-safe story-address helpers (single source)"
```

---

## Task 2: `mode-badges.ts` — reine Zustands-Ableitung

**Files:**
- Create: `src/renderer/mode-badges.ts`
- Create: `src/renderer/__tests__/mode-badges.test.ts`

**Interfaces:**
- Produces:
  - `type ModeBadgeState = 'mapped' | 'open' | 'orphan'`
  - `interface ModeBadge { mode: string; state: ModeBadgeState }`
  - `deriveModeBadges(declared: string[], mappingFiles: string[], entity_type: string, bundle: string): ModeBadge[]`
- Consumes: nichts (rein).

- [ ] **Step 1: Failing test schreiben** — `src/renderer/__tests__/mode-badges.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { deriveModeBadges } from '../mode-badges';

describe('deriveModeBadges', () => {
  const files = [
    'node.article.full.jsonata',      // mapped (declared)
    'node.article.legacy.jsonata',    // orphan (not declared)
    'other.thing.full.jsonata',       // different bundle → ignored
    'node.article.notes.txt',         // non-jsonata → ignored
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
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/mode-badges.test.ts`
Expected: FAIL — `Cannot find module '../mode-badges'`.

- [ ] **Step 3: `mode-badges.ts` schreiben**

```ts
export type ModeBadgeState = 'mapped' | 'open' | 'orphan';
export interface ModeBadge {
  mode: string;
  state: ModeBadgeState;
}

/**
 * Derive per-mode badge states for one bundle from its declared modes and the
 * set of existing mapping files (entity-mapping/ or form-mapping/). Declared
 * modes come first in declaration order (mapped when a file exists, else open);
 * mapping files without a matching declaration are appended as orphan badges,
 * sorted by mode name.
 */
export function deriveModeBadges(
  declared: string[],
  mappingFiles: string[],
  entity_type: string,
  bundle: string,
): ModeBadge[] {
  const prefix = `${entity_type}.${bundle}.`;
  const suffix = '.jsonata';
  const mapped = new Set(
    mappingFiles
      .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
      .map((f) => f.slice(prefix.length, -suffix.length)),
  );
  const declaredSet = new Set(declared);

  const badges: ModeBadge[] = declared.map((mode) => ({
    mode,
    state: mapped.has(mode) ? 'mapped' : 'open',
  }));

  const orphans = [...mapped].filter((m) => !declaredSet.has(m)).sort();
  for (const mode of orphans) badges.push({ mode, state: 'orphan' });

  return badges;
}
```

- [ ] **Step 4: Test grün laufen lassen**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/mode-badges.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/renderer/mode-badges.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/mode-badges.test.ts
git commit -m "DESIGNBOOK-39: pure mode-badge state derivation (mapped/open/orphan)"
```

---

## Task 3: Listing-Endpunkt + Browser-Helfer

**Files:**
- Modify: `src/vite-plugin.ts` (Helfer `listMappingFiles` + Middleware `/__designbook/list`)
- Create: `src/renderer/__tests__/list-mappings.test.ts`
- Modify: `src/components/designbookApi.js` (`listDesignbookFiles`)

**Interfaces:**
- Produces (server, exportiert für Test):
  - `listMappingFiles(designbookDir: string, dir: string): string[]` — die `.jsonata`-Basenamen unter `<designbookDir>/<dir>`; `[]` wenn das Verzeichnis fehlt; wirft bei Pfad-Ausbruch aus `designbookDir`.
  - Endpunkt `GET /__designbook/list?dir=<dir>` → `{ dir, files }`.
- Produces (browser): `listDesignbookFiles(dir: string): Promise<string[]>`.

- [ ] **Step 1: Failing test schreiben** — `src/renderer/__tests__/list-mappings.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { listMappingFiles } from '../../vite-plugin';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'debo-list-'));
  const em = resolve(root, 'entity-mapping');
  mkdirSync(em, { recursive: true });
  writeFileSync(join(em, 'node.article.full.jsonata'), '$');
  writeFileSync(join(em, 'node.article.teaser.jsonata'), '$');
  writeFileSync(join(em, 'README.md'), 'x');
});

describe('listMappingFiles', () => {
  it('returns only .jsonata basenames in the directory', () => {
    expect(listMappingFiles(root, 'entity-mapping').sort()).toEqual([
      'node.article.full.jsonata',
      'node.article.teaser.jsonata',
    ]);
  });

  it('returns [] for a missing directory', () => {
    expect(listMappingFiles(root, 'form-mapping')).toEqual([]);
  });

  it('throws when dir escapes the designbook root', () => {
    expect(() => listMappingFiles(root, '../../etc')).toThrow();
  });
});
```

- [ ] **Step 2: Test rot laufen lassen**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/list-mappings.test.ts`
Expected: FAIL — `listMappingFiles` nicht exportiert.

- [ ] **Step 3: `listMappingFiles` in `vite-plugin.ts` ergänzen** (nahe den bestehenden fs-Imports; `resolve`, `sep`, `readdirSync`, `existsSync` sind dort bereits importiert):

```ts
export function listMappingFiles(designbookDir: string, dir: string): string[] {
  const full = resolve(designbookDir, dir);
  if (full !== designbookDir && !full.startsWith(designbookDir + sep)) {
    throw new Error('Path outside designbook directory');
  }
  if (!existsSync(full)) return [];
  return readdirSync(full).filter((f) => f.endsWith('.jsonata'));
}
```

- [ ] **Step 4: Endpunkt-Middleware ergänzen** — unmittelbar nach dem `/__designbook/status`-Block (nach Zeile 409), analog zu dessen Muster:

```ts
// HTTP endpoint: list mapping files in a designbook subdirectory (single request
// so the data-model overview resolves every badge's mapped/open state at once).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
server.middlewares.use('/__designbook/list', (req: IncomingMessage, res: any) => {
  try {
    const url = new URL(req.url || '', 'http://localhost');
    const dir = url.searchParams.get('dir') || '';
    const files = listMappingFiles(designbookDir, dir);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ dir, files }));
  } catch (err: unknown) {
    res.statusCode = 403;
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
  }
});
```

- [ ] **Step 5: Test grün laufen lassen**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/renderer/__tests__/list-mappings.test.ts`
Expected: PASS.

- [ ] **Step 6: Browser-Helfer `listDesignbookFiles` in `designbookApi.js` ergänzen**

```js
const LIST_ENDPOINT = '/__designbook/list';

/**
 * List the .jsonata mapping files in a designbook subdirectory
 * ("entity-mapping" or "form-mapping"). Returns [] on any error.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listDesignbookFiles(dir) {
  try {
    const res = await fetch(`${LIST_ENDPOINT}?dir=${encodeURIComponent(dir)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.files) ? json.files : [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 7: Volltest + Commit**

```bash
pnpm check
git add packages/storybook-addon-designbook/src/vite-plugin.ts \
        packages/storybook-addon-designbook/src/renderer/__tests__/list-mappings.test.ts \
        packages/storybook-addon-designbook/src/components/designbookApi.js
git commit -m "DESIGNBOOK-39: /__designbook/list endpoint + listDesignbookFiles helper"
```

---

## Task 4: `DeboModeBadges` Komponente

**Files:**
- Create: `src/components/ui/DeboModeBadges.jsx`

**Interfaces:**
- Consumes: `deriveModeBadges` (Task 2), `entityStoryGroup`/`formStoryName` (Task 1), `DeboLink` (`../ui/DeboLink.jsx`).
- Produces (React): `<DeboModeBadges label kind dataModel entityType bundle declared mappingFiles ready />`
  - `kind: 'view' | 'form'`; `declared: string[]`; `mappingFiles: string[]`; `ready: boolean` (false = Pending-Zustand); `dataModel` = das geladene `data`-Objekt (`{content, config}`).

> Kein Unit-Test (vitest-Environment `node`, keine React-Render-Tests). Verhalten (Klick, `stopPropagation`, Pending) wird über das Laufzeit-Szenario in Task 7 verifiziert. Gate hier: `pnpm check` (typecheck + lint).

- [ ] **Step 1: Komponente schreiben** — `src/components/ui/DeboModeBadges.jsx`

```jsx
import React from 'react';
import { styled } from 'storybook/theming';
import { DeboLink } from './DeboLink.jsx';
import { deriveModeBadges } from '../../renderer/mode-badges.ts';
import { entityStoryGroup, formStoryName } from '../../renderer/story-address.ts';

const Section = styled.div({ marginTop: 12 });

const Label = styled.div(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: theme.textMutedColor,
  marginBottom: 6,
}));

const Row = styled.div({ display: 'flex', flexWrap: 'wrap', gap: 6 });

// Three states, distinguishable WITHOUT hover (AC 2): mapped = solid/accent,
// open = dashed + muted, orphan = warning-tinted.
const Badge = styled.span(({ theme, state, ready }) => {
  const base = {
    fontSize: 11,
    lineHeight: '16px',
    padding: '2px 8px',
    borderRadius: 8,
    border: `1px solid ${theme.appBorderColor}`,
    userSelect: 'none',
  };
  if (!ready) {
    return { ...base, color: theme.textMutedColor, opacity: 0.4, borderStyle: 'solid' };
  }
  if (state === 'mapped') {
    return {
      ...base,
      color: theme.color.lightest,
      background: theme.color.secondary,
      borderColor: theme.color.secondary,
      cursor: 'pointer',
    };
  }
  if (state === 'orphan') {
    return {
      ...base,
      color: theme.color.warningText || theme.color.dark,
      background: theme.background.warning || theme.background.hoverable,
      borderColor: theme.color.warning || theme.appBorderColor,
      cursor: 'pointer',
    };
  }
  // open
  return {
    ...base,
    color: theme.textMutedColor,
    borderStyle: 'dashed',
    opacity: 0.7,
    cursor: 'default',
  };
});

export function DeboModeBadges({ label, kind, dataModel, entityType, bundle, declared, mappingFiles, ready }) {
  const badges = deriveModeBadges(declared || [], mappingFiles || [], entityType, bundle);
  if (badges.length === 0) return null; // AC 9: no empty section

  const { title } = entityStoryGroup(dataModel, entityType, bundle);

  const stop = (e) => {
    e.stopPropagation(); // AC 8: never trigger the card-click into the detail view
  };

  return (
    <Section>
      <Label>{label}</Label>
      <Row>
        {badges.map((b) => {
          const clickable = ready && (b.state === 'mapped' || b.state === 'orphan');
          const storyName = kind === 'form' ? formStoryName(b.mode) : b.mode;
          const badge = (
            <Badge state={b.state} ready={ready} title={b.state}>
              {b.mode}
            </Badge>
          );
          if (!clickable) {
            // open badge (or not ready): render inert, but still swallow clicks
            return (
              <span key={b.mode} onClick={stop}>
                {badge}
              </span>
            );
          }
          return (
            <DeboLink
              key={b.mode}
              title={title}
              name={storyName}
              onClickCapture={stop}
              style={{ display: 'inline-flex' }}
            >
              {badge}
            </DeboLink>
          );
        })}
      </Row>
    </Section>
  );
}
```

> Hinweis für den Umsetzer: `DeboLink` ruft in seinem `onClick` bereits `e.preventDefault()` und emittiert `selectStory`. Der `onClickCapture={stop}` am `DeboLink` fängt den Klick VOR dem Bubbling zur `ClickableCard` ab und stoppt die Propagation, ohne die Navigation zu verhindern. Falls `DeboLink` `onClickCapture` nicht durchreicht (`...rest`-Spread prüfen — es reicht `...rest` an das `<a>` weiter, also OK), verifiziere im Szenario, dass die Detailansicht nicht mitöffnet.

- [ ] **Step 2: Typecheck/Lint**

Run: `pnpm check`
Expected: PASS (keine Teständerung; typecheck + lint grün).

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/components/ui/DeboModeBadges.jsx
git commit -m "DESIGNBOOK-39: DeboModeBadges component (mapped/open/orphan, story link)"
```

---

## Task 5: Badge-Listen an der Bundle-Karte verdrahten

**Files:**
- Modify: `src/components/display/DeboDataModel.jsx`
- Modify: `src/components/ui/DeboCard.jsx`

**Interfaces:**
- Consumes: `DeboModeBadges` (Task 4), `listDesignbookFiles` (Task 3).
- Der `DeboDataModel`-Root lädt **einmal** die beiden Verzeichnis-Listen und reicht sie plus `ready` an jede Karte.

> Gate: `pnpm check`; Verhalten im Szenario (Task 7).

- [ ] **Step 1: In `DeboDataModel.jsx` die Mapping-Listen einmal laden** — oberhalb des Renderns (in der `DeboDataModel`-Funktion, vor der Detail-Weiche) einen State + Effect ergänzen:

```jsx
import React, { useEffect, useState } from 'react';
import { listDesignbookFiles } from '../designbookApi.js';
// ... bestehende Imports ...

// innerhalb export function DeboDataModel(...):
const [mappings, setMappings] = useState(null); // null = pending
useEffect(() => {
  let alive = true;
  Promise.all([
    listDesignbookFiles('entity-mapping'),
    listDesignbookFiles('form-mapping'),
  ]).then(([entity, form]) => {
    if (alive) setMappings({ entity, form });
  });
  return () => {
    alive = false;
  };
}, []);
```

- [ ] **Step 2: `EntityGroup`/`ClickableCard` erweitern**, sodass `dataModel`, die beiden Datei-Listen und `ready` an `DeboCard` durchgereicht werden. `EntityGroup` bekommt zusätzliche Props `dataModel`, `mappings` und rendert je Bundle:

```jsx
function EntityGroup({ type, bundles, onSelect, dataModel, mappings }) {
  const bundleEntries = Object.entries(bundles || {});
  if (bundleEntries.length === 0) return null;
  const title = type.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const ready = mappings != null;

  return (
    <DeboCollapsible title={title} count={bundleEntries.length} defaultOpen={true}>
      <DeboGrid variant="auto" gap="md" minWidth={280}>
        {bundleEntries.map(([key, def]) => (
          <ClickableCard key={key} onClick={() => onSelect(`${type}.${key}`)}>
            <DeboCard
              title={def.title || key}
              badge={type}
              badgeColor={ENTITY_BADGE_COLORS[type] || 'red'}
              description={def.description}
              entityPath={`${type}.${key}`}
              fieldCount={def.fields ? Object.keys(def.fields).length : undefined}
            >
              <DeboModeBadges
                label="View Modes"
                kind="view"
                dataModel={dataModel}
                entityType={type}
                bundle={key}
                declared={Object.keys(def.view_modes || {})}
                mappingFiles={ready ? mappings.entity : []}
                ready={ready}
              />
              <DeboModeBadges
                label="Form Modes"
                kind="form"
                dataModel={dataModel}
                entityType={type}
                bundle={key}
                declared={Object.keys(def.form_modes || {})}
                mappingFiles={ready ? mappings.form : []}
                ready={ready}
              />
            </DeboCard>
          </ClickableCard>
        ))}
      </DeboGrid>
    </DeboCollapsible>
  );
}
```
Import `DeboModeBadges` am Kopf ergänzen. Beide `EntityGroup`-Aufrufe (content + config) um `dataModel={data}` und `mappings={mappings}` erweitern.

- [ ] **Step 2b: Pending-Sichtbarkeit** — `DeboModeBadges` rendert `null`, wenn `deriveModeBadges` leer ist. Im Pending-Zustand (`ready===false`, `mappingFiles=[]`) sind alle deklarierten Modes als Badges vorhanden (Zustand über `ready` neutralisiert), Orphans erscheinen erst nach dem Laden — das ist korrekt, weil ein Orphan ohne Dateiliste nicht bekannt ist und daher nicht „umschlägt", sondern erstmalig **hinzukommt** (kein Zustandswechsel eines bestehenden Badges). Deklarierte Badges wechseln nur neutral→mapped/open, nie open→mapped (AC 13).

- [ ] **Step 3: `DeboCard.jsx`** rendert `children` bereits (Zeile 85) — sicherstellen, dass die Badges innerhalb des Card-Bodies unterhalb des Footers erscheinen. Falls die optische Position unpassend ist, `children` im `DeboCard`-Body an die gewünschte Stelle (nach `CardMeta`) verschieben. Keine API-Änderung nötig.

- [ ] **Step 4: Typecheck/Lint + Commit**

```bash
pnpm check
git add packages/storybook-addon-designbook/src/components/display/DeboDataModel.jsx \
        packages/storybook-addon-designbook/src/components/ui/DeboCard.jsx
git commit -m "DESIGNBOOK-39: render view/form mode badges on bundle cards"
```

---

## Task 6: Form-Modes-Abschnitt in der Detailansicht

**Files:**
- Modify: `src/components/display/DeboDataModelDetail.jsx`

**Interfaces:**
- `ViewModeMapping` wird über eine `dir`-Prop generalisiert (`entity-mapping` | `form-mapping`).
- Neuer `FormModesSection` analog zu `ViewModesSection`.

> Gate: `pnpm check`; Verhalten im Szenario (Task 7). AC 11: View-Modes-Abschnitt bleibt unverändert (per Diff belegbar).

- [ ] **Step 1: `ViewModeMapping` generalisieren** — Signatur um `dir` erweitern und den Pfad daraus bilden:

```jsx
function MappingExpression({ dir, entityType, bundle, mode }) {
  const [expression, setExpression] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    loadDesignbookFile(`${dir}/${entityType}.${bundle}.${mode}.jsonata`).then((content) => {
      setExpression(content);
      setLoading(false);
    });
  }, [dir, entityType, bundle, mode]);

  if (loading) return <MetaLine>Loading mapping...</MetaLine>;
  if (!expression) return <MetaLine style={{ fontStyle: 'italic' }}>No {dir} file found</MetaLine>;

  return (
    <div style={{ maxHeight: 300, overflow: 'auto' }}>
      <SyntaxHighlighter language="json" copyable={false}>
        {expression}
      </SyntaxHighlighter>
    </div>
  );
}
```
Den bisherigen `ViewModeMapping`-Aufruf in `ViewModesSection` ersetzen durch
`<MappingExpression dir="entity-mapping" entityType={entityType} bundle={bundle} mode={name} />`
(Collapsible-Titel „Entity Mapping" unverändert lassen → AC 11).

- [ ] **Step 2: `FormModesSection` ergänzen** (analog `ViewModesSection`, Zeilen 141-165):

```jsx
function FormModesSection({ entityType, bundle, formModes }) {
  const entries = Object.entries(formModes || {});
  if (entries.length === 0) return null;

  return (
    <>
      {entries.map(([name, def]) => (
        <ViewModeCard key={name}>
          <ViewModeTitle>{name}</ViewModeTitle>
          <MetaLine>
            <strong>template:</strong> <DeboTable.Mono>{def.template}</DeboTable.Mono>
          </MetaLine>
          {def.settings && (
            <MetaLine>
              <strong>settings:</strong> <DeboTable.Mono>{JSON.stringify(def.settings)}</DeboTable.Mono>
            </MetaLine>
          )}
          <DeboCollapsible title="Form Mapping" defaultOpen={false}>
            <MappingExpression dir="form-mapping" entityType={entityType} bundle={bundle} mode={name} />
          </DeboCollapsible>
        </ViewModeCard>
      ))}
    </>
  );
}
```

- [ ] **Step 3: Abschnitt in `DeboDataModelDetail` rendern** — nach dem „View Modes"-Collapsible (nach Zeile 188) ergänzen:

```jsx
{def.form_modes && Object.keys(def.form_modes).length > 0 && (
  <DeboCollapsible title="Form Modes" count={Object.keys(def.form_modes).length} defaultOpen={true}>
    <FormModesSection entityType={entityType} bundle={bundle} formModes={def.form_modes} />
  </DeboCollapsible>
)}
```

- [ ] **Step 4: Typecheck/Lint + Commit**

```bash
pnpm check
git add packages/storybook-addon-designbook/src/components/display/DeboDataModelDetail.jsx
git commit -m "DESIGNBOOK-39: Form Modes section in bundle detail view"
```

---

## Task 7: Fixture, Case & Laufzeit-Verifikation

**Files:**
- Create: `fixtures/drupal-web/data-model-modes/designbook/data-model.yml`
- Create: `fixtures/drupal-web/data-model-modes/designbook/entity-mapping/*.jsonata` (Teilsatz + 1 Orphan)
- Create: `fixtures/drupal-web/data-model-modes/designbook/form-mapping/*.jsonata` (Teilsatz)
- Create: `fixtures/drupal-web/data-model-modes/designbook/data/*.yml` (Records für gemappte Modes)
- Create: minimale SDC-Komponenten unter `fixtures/drupal-web/data-model-modes/components/**` (je gemapptem Mode ein kleines Twig-SDC), am Muster von `fixtures/drupal-web/design-entity/components/**`
- Create: `fixtures/drupal-web/cases/data-model-modes.yaml`

**Ziel-Zustand (gemischt):** in `designbook/data-model.yml`
- ein Content-Bundle (z. B. `node.article`) mit `view_modes: {full, teaser}` (nur `full` gemappt → `full` mapped, `teaser` open) und `form_modes: {default, edit}` (nur `default` gemappt → `default` mapped, `edit` open);
- ein Orphan: `entity-mapping/node.article.legacy.jsonata` **ohne** `legacy` in `view_modes` → Orphan-Badge;
- ein **modeless** Bundle (z. B. `node.basic_page`) ohne `view_modes`/`form_modes` → AC 9 (kein Abschnitt);
- ein **Config-Bundle** (z. B. `view.recent_articles` unter `config:`) mit einem gemappten View Mode → AC 7-Parität (`Config/view/recent_articles`).

- [ ] **Step 1: Fixture-Dateien anlegen.** `data-model.yml` mit obiger Struktur; die gemappten `.jsonata` + zugehörige `data/<type>.<bundle>.yml`-Records + minimale SDC-Komponenten so, dass `pnpm build-storybook` im Workspace die gemappten Stories fehlerfrei baut (Muster: `design-entity`-Fixture). `teaser`/`edit` bekommen **keine** Datei (bleiben open). `node.article.legacy.jsonata` zeigt auf dieselbe Komponente wie `full` (nur zur Existenz → Orphan-Story baut).

- [ ] **Step 2: Case anlegen** — `fixtures/drupal-web/cases/data-model-modes.yaml`:

```yaml
fixtures:
  - vision
  - tokens
  - data-model-modes

prompt: >
  This case provisions a Storybook workspace whose designbook/ already carries a
  MIXED mapping state (a mapped and an unmapped view mode, a mapped and an
  unmapped form mode, an orphan mapping, a modeless bundle, and a config bundle).
  No workflow needs to run — answer "no" at the execute prompt. Then verify the
  Data Model overview in the running Storybook per the ticket scenario:
  Foundation → tab "Data Model" → the mode badges → click a mapped badge → story.
```
(Keine `assert:`-Workflow-Prüfungen — die Verifikation ist das Browser-Szenario, nicht der Workflow-Output.)

- [ ] **Step 3: Tester provisionieren + Storybook starten**

Run (aus dem Worktree-Root):
```bash
npx debo-test run drupal-web data-model-modes
```
Beim „Execute this prompt?"-Prompt **no** wählen → „workspace ready for manual use". Storybook-URL notieren (`_debo storybook status`). Falls Storybook stale ist: `_debo storybook start --force`.

- [ ] **Step 4: Szenario im Browser durchspielen** (claude-in-chrome oder Playwright) und AC 1–10, 13 belegen:
  1. Foundation öffnen → Tab „Data Model".
  2. Content-Karte `node.article`: Abschnitt „View Modes" mit Badges `full` (mapped, hervorgehoben) und `teaser` (open, ausgegraut) + Orphan `legacy`; Abschnitt „Form Modes" mit `default` (mapped) und `edit` (open). **Ohne Hover** unterscheidbar (Screenshot).
  3. Klick auf `full` → Story `Entities/node/Article` / `full` öffnet (nicht die Detailansicht).
  4. Klick auf `default` (Form) → Story `default (form)` öffnet.
  5. Klick auf `teaser` (open) → **keine** Navigation.
  6. Klick auf die Kartenfläche (nicht auf ein Badge) → Detailansicht öffnet (AC 8).
  7. Detailansicht: Abschnitt „Form Modes" vorhanden (template/settings + eingeklapptes „Form Mapping").
  8. Modeless Bundle `node.basic_page`: **kein** View/Form-Modes-Abschnitt (AC 9).
  9. Config-Gruppe `view.recent_articles`: Badge klickt in `Config/view/recent_articles`.
  Reload/langsames Netz beobachten: Badges erscheinen neutral und lösen gemeinsam auf, kein open→mapped-Umschlagen (AC 13).

- [ ] **Step 5: Regressions-Diffs + Volltest**

```bash
# AC 11/12/14: keine Verhaltensänderung an Indexer/Renderer/Schema
git diff --stat HEAD~6 -- packages/storybook-addon-designbook/src/preset.ts \
  packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts \
  packages/storybook-addon-designbook/src/validators/schemas/data-model.schema.yml
pnpm check   # AC 15
```
Erwartet: `data-model.schema.yml` unverändert; `indexEntity`/`indexForm`-Verhalten unverändert (durch grüne Bestandstests belegt); `pnpm check` grün.

- [ ] **Step 6: Commit**

```bash
git add fixtures/drupal-web/data-model-modes fixtures/drupal-web/cases/data-model-modes.yaml
git commit -m "DESIGNBOOK-39: mixed-state fixture + case for data-model overview badges"
```

---

## Self-Review (gegen die Spec)

- **AC 1** (Badge je deklariertem View Mode) → Task 2 (`deriveModeBadges`) + Task 5 (`declared=Object.keys(def.view_modes)`).
- **AC 2** (mapped/open ohne Hover unterscheidbar) → Task 4 (drei distinkte Styles ohne `:hover`) + Task 7 Step 4.2.
- **AC 3** (Form-Mode-Badges, Mapped gegen `form-mapping/`) → Task 3 (`dir=form-mapping`) + Task 5 (`kind="form"`).
- **AC 4** (Klick gemapptes View-Badge → Story) → Task 4 (`DeboLink title/name`) + Task 7 Step 4.3.
- **AC 5** (Klick gemapptes Form-Badge → `<fm> (form)`) → Task 1 (`formStoryName`) + Task 4 + Task 7 Step 4.4.
- **AC 6** (offenes Badge navigiert nicht) → Task 4 (`clickable` nur mapped/orphan) + Task 7 Step 4.5.
- **AC 7** (Titel/Name aus Indexer-Helfern, strukturell nachgewiesen, inkl. Config) → Task 1 Parity-Test.
- **AC 8** (Karten-Klick unverändert, Badge-Klick löst ihn nicht mit aus) → Task 4 (`stopPropagation`) + Task 7 Step 4.6.
- **AC 9** (kein leerer Abschnitt) → Task 4 (`badges.length===0 → null`) + Task 7 Step 4.8.
- **AC 10** (Detailansicht Form-Modes-Abschnitt) → Task 6 + Task 7 Step 4.7.
- **AC 11** (keine Regression Detailansicht) → Task 6 (View-Teil unangetastet) + Task 7 Step 5 (Diff).
- **AC 12** (keine Regression Stories) → Task 1 (verhaltensgleiche Extraktion, grüne Bestandstests) + Task 7 Step 5.
- **AC 13** (Ladeverhalten, kein Umschlagen) → Task 3 (ein Fetch) + Task 5 Step 2b + Task 7 Step 4.
- **AC 14** (`data-model.schema.yml` unverändert) → nirgends angefasst; Task 7 Step 5 Diff.
- **AC 15** (`pnpm check` grün) → jeder Task-Abschluss.
- **AC 16** (laufende Storybook-Instanz, debo-test, gemischter Stand) → Task 7.
- **AC 17** (kein Tailwind/DaisyUI im Manager) → nicht betroffen (preview-seitig; `styled` wie Bestand).
- **AC 18** (RED vor GREEN; Szenario als Klickpfad) → Tasks 1–3 TDD (Test-first); Szenario in Task 7 Step 4.

Placeholder-Scan: keine TBD/TODO. Typ-Konsistenz: `deriveModeBadges`, `entityStoryGroup`, `formStoryName`, `listDesignbookFiles`, `listMappingFiles`, `MappingExpression` durchgehend gleich benannt.
