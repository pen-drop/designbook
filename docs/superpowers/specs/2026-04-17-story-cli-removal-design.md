# Design: Story CLI Removal — Resolver-first Migration

## Summary

Das `_debo story` CLI-Kommando wird vollständig entfernt. Alle Stellen, an denen es heute aufgerufen wird, werden über zwei existierende Mechanismen ersetzt:

- **Lesepfade** über Resolver im Task-Frontmatter (erweitert um neue Resolver)
- **Schreibpfade** über Workflow-Engine-Results (wo nötig) bzw. Resolver-Ensure-Side-Effects (für `meta.yml`-Initialisierung)

Zusätzlich wird das Persistenzmodell von `meta.yml` reduziert: **nur noch die `reference`-Konfiguration** lebt auf Disk. Check-Status und Issues laufen ausschließlich durch den Workflow-Scope (nicht persistiert).

Dieses Design baut auf [`2026-04-17-story-meta-resolver-design.md`](./2026-04-17-story-meta-resolver-design.md) auf und erweitert dessen Scope erheblich.

## Motivation

Die `_debo story`-CLI-Kommandos sind Altlast. Mit dem Resolver-System und dem Workflow-Result-Mechanismus existieren bereits zwei klarere Abstraktionen für Lese- und Schreibzugriffe. Die CLI bricht diese Trennung auf: Tasks rufen im Body `$(_debo story …)` auf, hantieren mit JSON-Strings, prüfen Exit-Codes — statt deklarativ Params zu empfangen und Results zurückzugeben.

Konkrete Schmerzpunkte:

1. Tasks haben versteckte Abhängigkeiten zum CLI, die nicht im Frontmatter stehen. Schema-Validierung greift nicht.
2. `_debo story check` + `_debo story issues` führen Teil-Updates an `meta.yml` aus, die mit dem Workflow-Engine-Staging (`.debo`-Suffix, Stage-Flush) nicht sauber zusammenspielen. Kollisionsgefahr bei `each:`-Iteration.
3. Persistierte Check-Status sind unnötig: der User testet immer von vorne, Historie läuft über archivierte Workflows.
4. `configure-meta`-Entfernung (aus dem verwandten Design) hat eine semantische Lücke hinterlassen: wer legt `meta.yml` beim ersten Setup an? Die Antwort kommt aus diesem Design.

## Proposed Design

### 1. Datenmodell: `meta.yml` reduziert

**`meta.yml` speichert nur noch Konfiguration:**

- `reference.source` (url, origin, hasMarkup, screenId)
- `reference.breakpoints.<bp>.regions.<region>.selector`
- `reference.breakpoints.<bp>.regions.<region>.threshold`
- `reference.breakpoints.<bp>.threshold` (default für Regionen)

**Entfernt aus dem Schema:**

- ~~`reference.checks.<key>.status / result / diff / issues`~~
- ~~`reference.summary.total / pass / fail / unchecked / …`~~

**Runtime-only (nie auf Disk):**

- `checks[]` — abgeleitete Matrix aus `breakpoints × regions`. Wird von `setup-compare` als Data-Result ausgegeben, fließt via Workflow-Scope in `each: checks` der folgenden Stages.
- `issues[]` — Data-Result von `compare-screenshots`, Input für `verify`, finaler Workflow-Output.

### 2. Lesepfad: Resolver

**Bestehend:** `story-id`, `story-url`, `reference-folder`, `breakpoints` (letzterer wird per `2026-04-17-story-meta-resolver-design.md` meta-aware).

**Neu:**

- `scene-path` — resolvet relativen Pfad zur scenes-Datei, unterscheidet zwischen Shell- und Section-Kontext. Löst den Bug in `create-section.md` (heute hardcodet Shell-Pfad).

**Nicht als dedizierter Resolver benötigt** (Werte kommen über bestehende Params / Scope):

- Kein `story-meta`-Resolver. `meta.yml`-Content wird bei Bedarf über File-Path-Params geladen (bestehender Mechanismus mit `path:` + `content:`) oder die reference URL wird direkt als Param im Workflow geführt.

### 3. Schreibpfad

**`meta.yml`-Anlage — Resolver-Ensure-Side-Effect:**

Beim ersten Setup-Run für eine Story legt die Resolver-Kette `meta.yml` implizit an (aus den Input-Params: breakpoints, regions, reference). Konkret erweitert sich ein Resolver (Implementation-Detail der Plan-Phase — Kandidaten: `story-id`, oder ein neuer minimaler Ensure-Resolver) um den Side-Effect: Datei fehlt → schreiben mit Initial-Config.

**Conflict-Handling: File is source of truth.** Existiert `meta.yml`, ignoriert der Resolver-Ensure neue Input-Params. Regen nur durch explizites Löschen der Datei (per `rm`, kein Flag). Konsistent mit der "testing from scratch"-Policy des Projekts.

**Keine weiteren Schreibzugriffe auf `meta.yml`.** Keine `updateCheck`, keine `updateIssue`, keine Summary-Recomputation.

**Data-Results statt File-Writes:**

- `setup-compare` Result: `checks[]` (Array in Workflow-Scope)
- `compare-screenshots` Result: `issues[]` (Array in Workflow-Scope)
- `verify` Result: `verified-issues[]` (Array, finale Pass/Fail-Entscheidungen)

### 4. Task-Migration

| Task | CLI-Call heute | Ersatz |
|------|---------------|--------|
| `setup-compare.md` | `_debo story --create --json '...' checks` | Resolver-Ensure (→ meta.yml) + Data-Result `checks` |
| `capture-storybook.md` | `_debo story --scene X` | Resolver `story-url` (existiert) |
| `capture-reference.md` | `_debo story --scene X` | Param `reference_url` (aus Workflow-Scope oder meta.yml via File-Param) |
| `compare-screenshots.md` | `_debo story --scene X` | Params aus Resolvern; Result: `issues[]` |
| `verify.md` | `_debo story issues … --update …` + `_debo story check …` | Input `issues` aus Scope; Result: `verified-issues[]`; kein meta.yml-Write |
| `create-section.md` | (kein CLI-Call, aber Pfad-Bug) | Resolver `scene-path` löst Shell-vs-Section |

### 5. CLI + Entity Cleanup

**Entfernt:**

- `packages/storybook-addon-designbook/src/cli/story.ts` — komplette Datei
- Registrierung des `story`-Commands im Commander-Setup (`src/cli/index.ts` o. ä.)
- In `src/story-entity.ts`: alle Mutation-Methoden (`updateCheck`, `updateIssue`, `updateCheckResult`, …)
- In `design/schemas.yml` (`StoryMeta`-Schema): die Felder `reference.checks`, `reference.summary`

**Umgebaut / intern:**

- `StoryMeta`-Entity bleibt als Config-Reader. `createByScene` / `create` werden intern von der Resolver-Ensure-Logik aufgerufen (kein öffentlicher CLI-Entry mehr).
- `StoryMeta.list()` (aktuell für `--section`) — entfernen falls ungenutzt, oder interne Nutzung wenn ein späterer Resolver es braucht.

**Doku-Updates:**

- `design/resources/story-meta-schema.md` — Referenzen zu `_debo story check` raus, Schema-Snippet ohne `checks` + `summary`
- `resources/cli-workflow.md` — falls `_debo story` dort erwähnt, raus
- `sb/workflows/sb.md` — unverändert (ist storybook-daemon, nicht story-entity)

### 6. Testing

**Neu:**

- `src/resolvers/__tests__/scene-path.test.ts` — shell vs. section resolution, relative paths
- Evtl. Tests für die Ensure-Side-Effect-Logik (fehlende Datei → angelegt; existierende Datei → unverändert)
- End-to-End: frischer Run von `design-verify`-Workflow, Assertion dass keine `_debo story`-Calls im `designbook/dbo.log` stehen und `meta.yml` nach Workflow-Ende kein `checks`/`summary`-Feld hat

**Entfernt:**

- `StoryMeta.updateCheck` / `StoryMeta.updateIssue` Unit-Tests
- CLI-Tests für `_debo story *`

**Anpassung:**

- `story-entity` Tests: nur noch Config-Read-Fälle + ggf. Ensure-Create

## Out of Scope

- **Migration bestehender `meta.yml`-Dateien.** Pro CLAUDE.md-Regel "Breaking Changes": kein Loose-Parse, keine Upgrade-Scripts. User löscht + regeneriert.
- **Historische Issue-Persistenz.** Issues sind nach Workflow-Archivierung nur noch über die archivierten Workflows einsehbar. Kein dediziertes Issue-Log.
- **Resume-Feature für verify.** `--checks-open` entfällt. Jeder verify-Run prüft alle Checks frisch.
- **Änderungen an anderen CLI-Kommandos.** `_debo storybook` (Daemon), `_debo workflow`, `_debo config` bleiben unverändert.
- **Integration-Skills-spezifische Änderungen.** Falls `designbook-drupal` / `designbook-css-tailwind` etc. eigene `_debo story`-Calls haben — gehört in Folge-Changes pro Skill.

## Affected Files — Zusammenfassung

**Löschen:**

- `packages/storybook-addon-designbook/src/cli/story.ts`

**Ändern:**

- `packages/storybook-addon-designbook/src/cli/index.ts` (oder äquivalenter Entry) — Registrierung raus
- `packages/storybook-addon-designbook/src/story-entity.ts` — Mutation-Methoden raus
- `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts` — angepasst
- `packages/storybook-addon-designbook/src/resolvers/` — neue Resolver (`scene-path`, ggf. Ensure-Logik), ggf. existierende Resolver für Ensure-Side-Effect erweitert
- `.agents/skills/designbook/design/schemas.yml` — `StoryMeta`-Schema reduziert
- `.agents/skills/designbook/design/tasks/setup-compare.md`
- `.agents/skills/designbook/design/tasks/capture-storybook.md`
- `.agents/skills/designbook/design/tasks/capture-reference.md`
- `.agents/skills/designbook/design/tasks/compare-screenshots.md`
- `.agents/skills/designbook/design/tasks/verify.md`
- `.agents/skills/designbook/sections/tasks/create-section.md`
- `.agents/skills/designbook/design/resources/story-meta-schema.md`

**Hinzufügen:**

- Resolver `scene-path` unter `packages/storybook-addon-designbook/src/resolvers/scene-path.ts` + Test

## Offene Punkte für die Implementation-Phase

- **Welcher Resolver trägt den Ensure-Side-Effect für `meta.yml`?** Kandidaten: der existierende `story-id`-Resolver wird erweitert, oder ein neuer minimaler `story-init`-Resolver wird angelegt, der von Tasks explizit deklariert wird. In der Plan-Phase entscheiden.
- **`scene-path`-Resolver-Input-Schema.** Wie wird "shell vs. section" an den Resolver kommuniziert — über den Identifier-Pattern (`shell` als reservierter Name) oder über einen separaten Param (`context: shell | section`)?
- **Workflow-Scope-Flow für `reference_url`.** Wird als Setup-Compare-Output Data-Result weitergegeben oder via File-Path-Param aus `meta.yml` in jedem Capture/Compare-Task nachgeladen? (Data-Result ist eine Copy, File-Param bleibt live bei Updates — hier ist letzteres robuster.)
- **Genaues Interface für `verify.each:`** — bleibt `each: checks` oder wird zu `each: issues`? Hat Einfluss auf Task-Granularität.
