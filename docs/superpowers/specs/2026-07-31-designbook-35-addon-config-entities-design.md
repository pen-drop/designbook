# DESIGNBOOK-35 — Config Entities als eigene Storybook-Gruppe + Tag (design)

## Goal

Gerenderte **Config Entities** (Views, Image Styles, künftig `block_plugin`) erscheinen im
Storybook nicht länger unter `Entities/…`, sondern unter einer eigenen Top-Level-Gruppe
`Config/<entity_type>/<name>` und tragen das Story-Tag `config`. Die Einordnung wird **aus der
data-model-Sektion** (`config:` vs. `content:`) abgeleitet — nicht aus einer im Renderer
hartkodierten Typenliste. Content-Entities bleiben unverändert unter `Entities/…` (gleiche
Story-IDs). Deliverable ist eine **Addon-Änderung (Part 2, TypeScript)**; kein Backend-Code, keine
data-model-Strukturänderung.

**Task-Art:** `addon-feature` (TypeScript im Renderer/Story-Gruppierung; sichtbare Sidebar). Arbeit
läuft über `designbook-addon-skills`.

## Ist-Zustand (verifiziert)

Der Gruppentitel `Entities/<type>/<TitleCaseBundle>` wird an **zwei** Stellen unabhängig erzeugt,
die konsistent bleiben müssen (sonst Storybook-Fehler „couldn't find story matching index entry",
`preset.ts:172`):

1. **Indexer** — `src/preset.ts` `indexEntity()`:
   - `title` (Z. 29) hart auf `Entities/${entity_type}/${titleCaseBundle(bundle)}`.
   - Story-Tags `['entity', 'autodocs']` (Z. 47); Docs-Entry-Tags `['autodocs']` (Z. 58).
   - Bekommt nur `fileName` — **kein** `designbookDir`, **kein** data-model geladen.
2. **Module-Builder** — `src/renderer/entity-module-builder.ts:119` → `buildEntityCsfModule()`
   (`src/renderer/csf-prep.ts:206`):
   - `title` aus `group` (Z. 240); Default-Export-Tags `['autodocs']` (Z. 243).
   - Hat `dataModel` bereits geladen (`entity-module-builder.ts:67`).

Die Content/Config-Unterscheidung existiert im Renderer bereits als reine data-model-Abfrage:
`namespaceFor(dataModel, entityType, bundle)` (`src/renderer/data-pool.ts:17`) liefert
`'content' | 'config' | null` — genutzt in `loadSampleData` (`scene-module-builder.ts:104`). Die
Story-**Gruppierung** ruft sie bisher nicht auf.

## Chosen approach — ein sektionsbasierter Gruppen-Helper, an beiden Emittern verdrahtet

Ein einziger reiner Helper leitet Gruppe **und** Config-Flag aus der data-model-Sektion ab und wird
von beiden Emittern (Indexer + Module-Builder) benutzt — damit Titel und Tags garantiert
übereinstimmen.

```ts
// src/renderer/entity-module-builder.ts (neben titleCaseBundle)
import { namespaceFor } from './data-pool';

/** Sidebar-Gruppe + Config-Flag aus der data-model-Sektion (config: vs content:). */
export function entityStoryGroup(
  dataModel: DataModel,
  entity_type: string,
  bundle: string,
): { title: string; isConfig: boolean } {
  const isConfig = namespaceFor(dataModel, entity_type, bundle) === 'config';
  const top = isConfig ? 'Config' : 'Entities';
  return { title: `${top}/${entity_type}/${titleCaseBundle(bundle)}`, isConfig };
}
```

- **`namespaceFor` ist die einzige Klassifikationsquelle** — kein `'view'`/`'image_style'`-Literal
  im Renderer (erfüllt AC-3). Ein neuer `config:`-Typ (z. B. `block_plugin` aus DESIGNBOOK-30)
  landet ohne Code-Änderung unter `Config/…` (AC-4).
- **`null` (unbekannt) → `Entities/…`** — bewahrt exakt das heutige Verhalten für nicht im
  data-model deklarierte Bundles.

### Verdrahtung an beiden Emittern

- **Module-Builder** (`entity-module-builder.ts`): `entityStoryGroup(dataModel, entity_type,
  bundle)` statt des hartkodierten Strings in Z. 119; das `isConfig`-Flag wird als `extraTags`
  (`isConfig ? ['config'] : []`) an `buildEntityCsfModule` durchgereicht.
- **`buildEntityCsfModule`** (`csf-prep.ts`): neues optionales Feld `extraTags?: string[]` in
  `EntityCsfOptions`; Default-Export-Tags werden zu `['autodocs', ...extraTags]`.
- **Indexer** (`preset.ts` `indexEntity`): lädt das data-model aus
  `designbookDir = dirname(dirname(fileName))` (das entity-mapping-Verzeichnis liegt laut Story-Glob
  `entity-mapping/*.jsonata` immer direkt unter `designbookDir`), ruft `entityStoryGroup` auf und
  hängt bei `isConfig` `'config'` an die Story-Tags **und** die Docs-Entry-Tags an.

Titel und Tags werden so an beiden Stellen aus derselben Funktion + demselben data-model abgeleitet
→ keine Divergenz.

### Offene Entscheidung — Blatt-Segment (`<name>`)

Content-Pfade nutzen `titleCaseBundle(bundle)` (`article` → `Article`). Das Ticket schreibt für
Config wörtlich `Config/<entity_type>/<name>`. Zwei Varianten:

- **(A, empfohlen) `titleCaseBundle`** → `Config/view/Recent Articles` — visuell symmetrisch zu
  `Entities/…`, eine gemeinsame Titel-Funktion für beide Zweige.
- **(B) roher Bundle-Name** → `Config/view/recent_articles` — literal wie im Ticket.

Empfehlung A (Symmetrie, ein Codepfad). Wird vor dem Transition zu `coding` bestätigt.

## Alternativen (verworfen)

- **Hartkodierte Typenliste im Renderer** (`['view','image_style'] → Config`) — vom PM
  ausgeschlossen, verletzt AC-3, skaliert nicht auf `block_plugin`.
- **Nur Tag oder nur Gruppe** — vom PM ausgeschlossen (eigene Top-Level-Gruppe **plus** Tag).
- **Klassifikation über Vorhandensein von Sample-Records** — falsch: die data-model-Sektion ist die
  Autorität; ein Config-Typ kann ebenso Records haben.
- **data-model an den Indexer durchreichen statt neu laden** — der Storybook-Indexer-Hook bekommt
  nur `fileName`; ein zweiter `loadDataModel`-Aufruf pro Mapping ist billig (der Indexer macht
  ohnehin `readdirSync`) und hält den Helper an beiden Stellen identisch.

## Risiken & Behandlung

- **Story-IDs der Config-Stories ändern sich** (`Entities/view/…` → `Config/view/…`). Behandlung
  (AC-6): belegte Abwesenheit gebrochener Verweise —
  - Baselines: `referenceImagePath` (`src/visual-compare-path.ts`) und `withVisualCompare.ts` keyen
    auf `referenceDir` (aus der Story-eigenen `meta.yml`) + `breakpoint--region--state.png`, **nicht**
    auf die Story-ID/den Titel. Kein Baseline-Dateiname enthält eine Story-ID.
  - Fixtures/debo-test-Cases: kein Case adressiert `Entities/view/…` oder `Entities/image_style/…`
    (nur Content-Pfade wie `Entities/paragraph/Signage`).
  - Skill-/Runbook-Prosa: keine Referenz auf `Entities/view/…`; die historischen Design-Docs unter
    `docs/superpowers/**` nennen nur `Entities/node/Article` (Content).
  - **Am coding-Zeitpunkt erneut per grep zu belegen** und im Summary zu dokumentieren.
- **Indexer/Loader-Titeldivergenz** → „couldn't find story matching index entry". Behandlung: **ein**
  Helper, beidseitig aus demselben data-model — Divergenz strukturell ausgeschlossen.
- **Content-Regression** (AC-5). Behandlung: `namespaceFor` liefert für `node`/`user` `content`
  → `Entities/…` unverändert; Bestandstest `Entities/node/Article` bleibt grün; vorher/nachher-grep
  über Content-Titel im coding.
- **Struktur-Tab (DESIGNBOOK-32, AC-9):** liest den `sceneTrees`-Parameter, nicht den Titel — von der
  Umgruppierung unberührt; wird in laufender Storybook-Instanz an einer Config-Story geprüft.
- **Manager-Komponenten (AC-10):** werden nicht berührt (reine Renderer/Indexer-Änderung) → keine
  Tailwind/DaisyUI-Frage.

## Betroffene Artefakte

- Ändern: `src/renderer/entity-module-builder.ts` (Helper `entityStoryGroup`, Z. 119 + `extraTags`).
- Ändern: `src/renderer/csf-prep.ts` (`EntityCsfOptions.extraTags`, Default-Export-Tags).
- Ändern: `src/preset.ts` (`indexEntity`: data-model laden, Helper nutzen, `config`-Tag).
- Tests: `src/renderer/__tests__/entity-module-builder.test.ts`,
  `src/renderer/__tests__/entity-csf-prep.test.ts`, `src/__tests__/entity-indexer.test.ts`
  (+ ggf. neuer Helper-Test) — Fixtures haben `view`/`image_style` bereits unter `config:`.
- Verifikation: `pnpm check` (typecheck → lint → test) + laufende Storybook-Instanz im
  Testworkspace.

## Nicht in diesem Ticket

- Neue Renderer für weitere Config-Entity-Typen.
- Änderungen an der data-model-Struktur.
- Umbenennung/Umgruppierung von Content-Entities.
