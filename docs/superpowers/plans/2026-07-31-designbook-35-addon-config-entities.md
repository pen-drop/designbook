# Config Entities als eigene Storybook-Gruppe + Tag — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: `designbook-addon-skills` for all changes under
> `packages/storybook-addon-designbook/`. Implement task-by-task via
> superpowers:subagent-driven-development or superpowers:executing-plans. RED before GREEN — write
> the failing test first, then the implementation. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Config Entities erscheinen unter `Config/<entity_type>/<name>` mit Story-Tag `config`;
Content-Entities bleiben unverändert unter `Entities/…`. Einordnung sektionsbasiert aus dem
data-model (`namespaceFor`), keine Typenliste im Renderer.

**Architecture:** Ein reiner Helper `entityStoryGroup(dataModel, type, bundle) → { title, isConfig }`
in `entity-module-builder.ts`, verdrahtet an **beiden** Titel-Emittern (Indexer `preset.ts`
`indexEntity` + Module-Builder `entity-module-builder.ts` → `buildEntityCsfModule`), sodass Titel und
Tags aus einer Quelle stammen und nie divergieren.

**Tech Stack:** TypeScript, Storybook-Addon (Part 2), Vitest; `pnpm check` als Gate.

## Global Constraints

- Nur `packages/storybook-addon-designbook/` — kein Backend-Code, keine data-model-Strukturänderung,
  keine Content-Umgruppierung.
- Klassifikation ausschließlich über `namespaceFor` — **kein** `'view'`/`'image_style'`-Literal als
  Einordnungskriterium im Renderer (AC-3, per grep prüfbar).
- Indexer und Module-Builder müssen **denselben** Titel + dieselben Tags erzeugen (sonst „couldn't
  find story matching index entry").
- Content-Entities: Titel, Gruppen, Reihenfolge, Story-IDs, Tags **identisch** zu vorher (AC-5).
- Test-Fixtures haben `view`/`image_style` unter `config:` und `node`/`user` unter `content:`
  (`src/renderer/__tests__/fixtures/data-model.yml`) — direkt für RED/GREEN nutzbar.
- Kein `mkdir`/Existenz-Check auf bekannte Pfade; keine Migration/Kompat-Shims.

---

### Task 1: RED — Failing Tests für Config-Gruppierung + Tag

**Files:**
- Test: `src/renderer/__tests__/entity-module-builder.test.ts`
- Test: `src/__tests__/entity-indexer.test.ts`
- Test: `src/renderer/__tests__/entity-csf-prep.test.ts` (extraTags-Durchreichung)

**Interfaces:**
- Consumes: `buildEntityModule(mapping, designbookDir)`, `indexEntity(fileName)`, Fixture-data-model.
- Produces: rote Tests, die die neue Einordnung erzwingen.

- [ ] **Step 1:** Test — `buildEntityModule` auf `view.recent_articles.default.jsonata` (config)
  ⇒ Code enthält `title: 'Config/view/Recent Articles'` **und** `config` in den Default-Export-Tags;
  **nicht** `Entities/view`.
- [ ] **Step 2:** Test — `buildEntityModule` auf `node.article.teaser.jsonata` (content) ⇒ weiterhin
  `title: 'Entities/node/Article'`, **kein** `config`-Tag (Regression-Guard AC-5).
- [ ] **Step 3:** Test — `indexEntity` auf ein `view.*` Mapping ⇒ `title` startet mit `Config/view/`,
  `tags` enthält `config`; auf ein `node.article` Mapping ⇒ `title` `Entities/node/Article`, Tags
  unverändert (`['entity','autodocs']`).
- [ ] **Step 4:** Test — `buildEntityCsfModule({ extraTags: ['config'] })` ⇒ Default-Export-Tags
  `['autodocs','config']`; ohne `extraTags` ⇒ `['autodocs']`.
- [ ] **Step 5 (AC-4):** Helper-Test `entityStoryGroup` mit synthetischem data-model, das einen
  **zweiten, andersnamigen** `config:`-Typ deklariert ⇒ `title` unter `Config/…`, `isConfig true`;
  belegt Typ-Agnostik ohne Code-Änderung.
- [ ] **Step 6:** `pnpm --filter storybook-addon-designbook test` läuft und die neuen Tests sind
  **rot** (RED bestätigt).

---

### Task 2: GREEN — Helper + Module-Builder + csf-prep

**Files:**
- Modify: `src/renderer/entity-module-builder.ts`
- Modify: `src/renderer/csf-prep.ts`

**Interfaces:**
- Consumes: `namespaceFor` (`data-pool.ts`), `titleCaseBundle`, `DataModel`.
- Produces: `entityStoryGroup(...)`, `Config/…`-Titel + `config`-Tag im Module-Builder.

- [ ] **Step 1:** In `entity-module-builder.ts` `entityStoryGroup(dataModel, entity_type, bundle)`
  ergänzen (siehe Design-Spec) und exportieren; `namespaceFor` importieren.
- [ ] **Step 2:** Z. 119 durch `entityStoryGroup(...)` ersetzen; `group: title` setzen und
  `extraTags: isConfig ? ['config'] : []` an `buildEntityCsfModule` durchreichen.
- [ ] **Step 3:** In `csf-prep.ts` `EntityCsfOptions` um `extraTags?: string[]` erweitern;
  Default-Export-Tags von `['autodocs']` auf `['autodocs', ...(extraTags ?? [])]` ändern.
- [ ] **Step 4:** Module-Builder/csf-prep-Tests (Task 1 Step 1/2/4) grün.

---

### Task 3: GREEN — Indexer (`preset.ts`)

**Files:**
- Modify: `src/preset.ts`

**Interfaces:**
- Consumes: `entityStoryGroup`, `loadDataModel(designbookDir)`.
- Produces: `Config/…`-Titel + `config`-Tag in den Indexer-Story-Einträgen.

- [ ] **Step 1:** In `indexEntity` `designbookDir = dirname(dirname(fileName))` bestimmen und
  `loadDataModel(designbookDir)` laden (Import aus `scene-module-builder`).
- [ ] **Step 2:** `title` (Z. 29) durch `entityStoryGroup(dataModel, entity_type, bundle).title`
  ersetzen; bei `isConfig` `'config'` an die Story-Tags (Z. 47) **und** die Docs-Entry-Tags (Z. 58)
  anhängen.
- [ ] **Step 3:** Indexer-Tests (Task 1 Step 3) grün; Content-Indexer-Test unverändert grün.

---

### Task 4: Referenz-Audit (AC-6) + `pnpm check`

**Files:** keine Code-Änderung erwartet; ggf. Skill-/Runbook-Prosa nachziehen.

- [ ] **Step 1:** `grep -rn "Entities/view\|Entities/image_style" .` (ohne `node_modules`/`dist`)
  über Fixtures, debo-test-Cases, `.agents`/`.claude`-Skillprosa, `docs/**` — Treffer entweder
  mitziehen oder belegte Abwesenheit dokumentieren.
- [ ] **Step 2:** Bestätigen, dass `visual-compare-path.ts`/`withVisualCompare.ts` nicht an
  Story-IDs/Titeln hängen (referenceDir + `breakpoint--region--state.png`).
- [ ] **Step 3:** `pnpm check` (typecheck → lint → test) vom Repo-Root grün (AC-7).

---

### Task 5: Verifikation in laufender Storybook-Instanz (AC-8, AC-9)

**Files:** Testworkspace (`./scripts/setup-workspace.sh <name>`), aus dem Worktree gestartet.

- [ ] **Step 1:** Testworkspace bauen/starten (`designbook:sb`), Fixture mit `view`-Config-Entity.
- [ ] **Step 2:** Sidebar zeigt `Config/view/…` (nicht mehr unter `Entities/…`); Config-View-Story
  rendert; Tag-Filter `config` greift (AC-1/2/8).
- [ ] **Step 3:** Struktur-Tab einer Config-Story funktioniert (DESIGNBOOK-32, AC-9).
- [ ] **Step 4 (AC-11):** Vor-Implementierung-Snapshot der roten Tests + ausführbarer Klickpfad
  (siehe `test`-Kommentar) dokumentiert.

---

## Acceptance-Criteria-Mapping

| AC | abgedeckt durch |
|---|---|
| 1 Config-Story unter `Config/…`, nicht `Entities/…` | Task 2/3 + Task 5 Step 2 |
| 2 Tag `config`, filterbar | Task 2 Step 3, Task 3 Step 2, Task 5 Step 2 |
| 3 keine Typenliste im Renderer (grep) | Task 2 Step 1 (`namespaceFor`) |
| 4 zweiter Config-Typ ohne Code-Änderung | Task 1 Step 5 |
| 5 Content-Entities unverändert | Task 1 Step 2, Task 3 Step 3 |
| 6 gebrochene Referenzen behandelt | Task 4 Step 1/2 |
| 7 `pnpm check` grün | Task 4 Step 3 |
| 8 laufende Storybook-Instanz | Task 5 Step 2 |
| 9 Struktur-Tab an Config-Story | Task 5 Step 3 |
| 10 kein Tailwind/DaisyUI (falls Manager) | n/a — Manager nicht berührt |
| 11 RED vor GREEN + Klickpfad | Task 1 (RED) → Task 2/3 (GREEN), Task 5 Step 4 |
