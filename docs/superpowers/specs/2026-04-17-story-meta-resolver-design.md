# Design: StoryMeta Resolver-Integration

## Summary

Die verwaiste, interaktive `configure-meta` Task wird entfernt. Die bestehende Entity-Klasse `DeboStory` (in `packages/storybook-addon-designbook/src/story-entity.ts`) wird nach `StoryMeta` umbenannt und übernimmt die alleinige Verantwortung für `meta.yml`. Bestehende Resolver (aktuell `breakpoints`) werden meta-aware: sie lesen zuerst aus `meta.yml` über `StoryMeta.load()`, fallen nur bei fehlender Story auf globale Defaults zurück.

Kein neuer `meta_story` Resolver. Die Meta-Awareness wird implizit durch die bereits existierende Entity-Infrastruktur gelöst.

## Motivation

Der aktuelle Stand hat drei Probleme:

1. **`configure-meta` Task ist verwaist.** Definiert in `.agents/skills/designbook/design/tasks/configure-meta.md`, aber in keinem Workflow referenziert. Er mischt HOW (6 interaktive Steps) mit WHAT (ein meta.yml schreiben).
2. **Doppelte Logik.** `StoryMeta.createByScene()` erledigt schon alles, was `configure-meta` manuell tut: Breakpoints aus design-tokens ziehen, Regions derivieren, Seed-Daten mergen, yml schreiben — nur vollständig nicht-interaktiv.
3. **Resolver kennen meta.yml nicht.** Der `breakpoints` Resolver liest immer `design-tokens.yml`, auch wenn die Story in ihrer meta.yml bereits festgelegt hat, welche Breakpoints sie nutzt. Das führt zu Drift sobald eine Story in ihrer meta Breakpoints abweichend vom globalen Default speichert.

Die `meta.yml` soll Single Source of Truth für per-Story Settings sein. Resolver sollen sie respektieren.

## Proposed Design

### 1. Rename: `DeboStory` → `StoryMeta`

Rein mechanisch. 103 Occurrences in 4 Dateien, alle im `storybook-addon-designbook` Package, keine externen Konsumenten.

- Klasse `DeboStory` → `StoryMeta`
- Interface `MetaYml` (intern) → `StoryMetaData` (öffentlich)
- Hilfs-Interfaces (`DeboStorySummary`, `DeboStoryCheck`, `DeboStoryCheckCurrent`, `DeboStoryCheckReference`, `DeboStoryScreenshot`) → `StoryMeta*` (z.B. `StoryMetaSummary`, `StoryMetaCheck`, …)

Betroffene Dateien:
- `packages/storybook-addon-designbook/src/story-entity.ts` (56 Treffer — Definitionsdatei)
- `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts` (30)
- `packages/storybook-addon-designbook/src/cli/story.ts` (15)
- `packages/storybook-addon-designbook/src/vite-plugin.ts` (2)

Dateiname `story-entity.ts` bleibt — die Datei enthält weiterhin die Entity, nur der Export-Name ändert sich.

### 2. Entfernen: `configure-meta` Task

- Löschen: `.agents/skills/designbook/design/tasks/configure-meta.md`
- Erhalten: `.agents/skills/designbook/design/resources/story-meta-schema.md` — bleibt als Dokumentations-Referenz zum yml-Format
- Grep nach `configure-meta` in allen Workflows / Stages — entfernen wo referenziert

Die semantische Lücke (wie kommt eine Story an ihre erste meta.yml?) wird durch `StoryMeta.createByScene()` abgedeckt, aufgerufen über CLI `story --create` (siehe `packages/storybook-addon-designbook/src/cli/story.ts`). Workflows müssen nicht angepasst werden, solange die Story vor Ausführung der verify-Pipeline erstellt ist.

### 3. `breakpoints` Resolver meta-aware machen

`packages/storybook-addon-designbook/src/resolvers/breakpoints.ts`

Neuer Flow:
1. Dependent Param hinzufügen: `from: story_id`
2. Im Resolver zuerst `StoryMeta.load(config, storyId)` aufrufen
3. Falls Story existiert UND `meta.reference.breakpoints` Einträge hat → die Keys als CSV-String zurückgeben
4. Ansonsten aktuelles Verhalten: `design-tokens.yml` lesen, `semantic.breakpoints` Keys als CSV zurückgeben

Workflow-Update in `.agents/skills/designbook/design/workflows/design-verify.md`:

```yaml
breakpoints:
  type: string
  resolve: breakpoints
  from: story_id   # neu
```

Der Resolver schreibt **nicht** in meta.yml. Persistenz läuft ausschließlich über `StoryMeta.createByScene()` und `StoryMeta.updateCheckResult()`.

### 4. Schema öffentlich machen

Der `StoryMetaData` Typ ist aktuell private in `story-entity.ts`. Er wird `export`iert, damit Tasks und Resolver ihn referenzieren können.

Zusätzlich: ein Schema-Eintrag `StoryMeta` in einer geeigneten `schemas.yml` (Pfad TBD in der Implementation-Phase, z.B. `scenes/schemas.yml#/StoryMeta` oder eigene `stories/schemas.yml`), der die yml-Struktur für Tasks beschreibt. Form spiegelt das TypeScript-Interface.

## Out of Scope

- **`reference_url` Meta-Awareness.** Bleibt wie heute: Workflow-Param, interaktive Erfassung in Intake-Stage. Wird in späterem Pass adressierbar, falls gewünscht.
- **Andere Resolver** (`story_url`, `reference_folder`). Keine Änderung — ihre Werte sind nicht per-Story in meta hinterlegt.
- **Neue Resolver.** Kein `meta_story` Resolver, kein `threshold` Resolver. Falls künftig weitere Felder aus meta gelesen werden müssen, folgen sie demselben Muster wie der umgebaute `breakpoints` Resolver.
- **Migration bestehender meta.yml Dateien.** Format ändert sich nicht, keine Migration nötig.

## Affected Files — Zusammenfassung

**Löschen:**
- `.agents/skills/designbook/design/tasks/configure-meta.md`

**Umbenennen (find+replace Symbol):**
- `packages/storybook-addon-designbook/src/story-entity.ts`
- `packages/storybook-addon-designbook/src/__tests__/story-entity.test.ts`
- `packages/storybook-addon-designbook/src/cli/story.ts`
- `packages/storybook-addon-designbook/src/vite-plugin.ts`

**Ändern:**
- `packages/storybook-addon-designbook/src/resolvers/breakpoints.ts` — meta-aware machen
- `packages/storybook-addon-designbook/src/resolvers/__tests__/breakpoints.test.ts` — neue Fälle (story existiert, story fehlt, meta hat breakpoints, meta hat keine breakpoints)
- `.agents/skills/designbook/design/workflows/design-verify.md` — `from: story_id` zu breakpoints-Param
- ggf. weitere Workflows, die `breakpoints` Resolver verwenden

**Hinzufügen:**
- `StoryMetaData` Export + optional Schema-Eintrag in passender `schemas.yml`

## Testing

- Unit-Tests im Addon-Package (`pnpm --filter storybook-addon-designbook test`) decken den neuen Resolver-Flow ab.
- `pnpm check` (typecheck + lint + test) muss grün sein.
- Manueller Sanity-Check: eine Story mit vorhandener meta.yml laufen lassen, bestätigen dass deren Breakpoints statt der globalen genutzt werden.

## Offene Punkte für die Implementation-Phase

- Exakter Pfad / Name für öffentlichen Schema-Eintrag (`stories/schemas.yml#/StoryMeta` vs. Eintrag in bestehender `schemas.yml`) — in der Plan-Phase festlegen.
- Liste der Interface-Renames (StoryMetaSummary/Check/…) final festlegen beim Umsetzen.
