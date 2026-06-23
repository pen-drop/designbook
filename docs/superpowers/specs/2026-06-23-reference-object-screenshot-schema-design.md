# Reference-Objekt, stabile Baseline & einheitliches Screenshot-Schema

**Datum:** 2026-06-23
**Status:** Design (bereit für Review → Implementierungsplan)
**Baut auf:** PR #112 (isolate-and-capture) — der Capture-Mechanismus für Baseline + Story.

## Problem

Heute ist der Reference-/Screenshot-Datenfluss zersplittert und teils falsch:

- **`extract-reference`** (in design-screen/entity/shell) greift eine **ad-hoc** Reference-Aufnahme (loses `screenshot`-Feld ohne Pfad → eine einzelne `app-signage.png`), die NICHT die per-(breakpoint,region,state) Baseline ist, und schreibt **keine** `meta.yml`.
- **`setup-compare`** (design-verify) baut `stories/<id>/meta.yml` jedes Mal neu und `capture-reference` greift die Referenz bei **jedem** verify-Lauf erneut → die „Source-Baseline" ist nicht stabil.
- Datenmodell zersplittert: `Check` (region, selector, reference_selector, breakpoint, state, file_suffix), `Region` (id, selector, reference_selector), `ReferenceFolder` (loser Standalone-Type). Eine **Reference** ist gar nicht als Objekt modelliert (Upstream-Issue #4).

Gewünscht:

1. **Source-Reference-Screenshots = stabile Baseline pro Reference.** Einmal gegriffen, eingefroren, von jedem verify-Lauf wiederverwendet.
2. **`extract-reference` erzeugt die `meta.yml`** (das Reference-Objekt), nicht `setup-compare`.
3. **Reference als first-class Objekt**, von `stories/<id>/meta.yml` referenziert.
4. **Ein einheitliches `Screenshot`-Schema** (atomare Capture-Einheit) auf beiden Seiten.

## Kernmodell

### `Screenshot` — atomare Capture-Einheit

Ein `Screenshot` beschreibt **genau ein** aufgenommenes Bild, identisch auf Reference- und Story-Seite:

```yaml
Screenshot:
  element: full          # benannter Vergleichs-Gegenstand (vormals "region")
  state: rest         # rest | <interaction-state>
  breakpoint: xl      # token-breakpoint id
  selector: app-signage   # CSS-Selektor DIESER Seite; "" ⇒ isolierte Wurzel / full
  # path abgeleitet: <breakpoint>--<element>--<state>.png  (file_suffix entfällt; rest ⇒ ...--rest)
```

Identität = `(element, state, breakpoint)`. Reference-Baseline und Story sind je eine Liste von
`Screenshot`s; der Vergleich paart sie über `(element, state, breakpoint)`. Der **`selector` lebt am
Screenshot** (denormalisiert) — jede Capture-Zeile ist standalone lesbar. Damit entfällt der
`reference_selector`/`selector`-Split: jede Seite hat in ihrer meta schlicht `selector`, der
Kontext (welche meta) disambiguiert.

### `element` statt `region`

Der benannte Vergleichs-Gegenstand heißt **`element`** (id wie `full`, `header`, `footer`). „region"
implizierte ein rechteckiges Gebiet (passte zum alten bbox-Crop); die Isolate-Mechanik isoliert ein
benanntes Element/Teil. Ein `Element` (Definition) trägt:

```yaml
Element:
  id: full
  selector: app-signage     # diese Seite (Reference: reference-Selektor; Story: story-Selektor)
  states:                   # rest + jeder interaktive State
    - { name: rest, steps: [] }
    - { name: open, steps: [ ... ] }
  breakpoints: [xl, lg]
```

Die materialisierten `Screenshot`-Dateien sind aus `elements × states × breakpoints` ableitbar; die meta
listet die `Element`-Definitionen, die PNG-Dateien liegen daneben.

### `Reference` — first-class Objekt (löst Upstream-Issue #4)

Serialisiert nach `references/<hash>/meta.yml`. `<hash>` = SHA256(normalisierte source-url), erste
12 Hex (bestehender `ReferenceFolder`-Resolver).

```yaml
Reference:
  source: { url: https://leando.de/, ... }
  elements: [ Element{ selector = reference-Selektor }, ... ]
  extract: extract.json     # bestehende DesignReference (Struktur, assets, fonts)
  assets_dir: assets/
  # Baseline-PNGs daneben: <bp>--<element>--<state>.png
```

Das Objekt **akkumuliert**: jede neue `(element, state, breakpoint)` wird **einmal** gegriffen,
eingefroren, **nie** neu — bis explizites Refresh (siehe unten). Bestehende Baseline-PNGs werden
reused.

### `StoryMeta` — Bindung an die Reference

`stories/<id>/meta.yml` schrumpft auf eine Bindung:

```yaml
StoryMeta:
  reference: <hash>          # Verweis auf das Reference-Objekt
  elements: [ Element{ selector = story-Selektor } ]   # story_selector pro element; "" ⇒ isolierte Story (#storybook-root)
```

Story-Screenshots: `stories/<id>/screenshots/<bp>--<element>--<state>.png`, verglichen gegen die fixe
Baseline unter `references/<hash>/`.

## Capture-Ownership

### Geteilte, idempotente `ensure-baseline`-Einheit

Reference-Baseline-Capture wird ein **idempotenter, geteilter** Task (das heutige `capture-reference`
umgebaut):

> Für `(element, state, breakpoint)`: existiert das PNG unter `references/<hash>/`? Ja → reuse. Nein →
> isolate-and-capture (PR #112: `selector` ans body-Root heben → full-page transparent) → schreiben.

Aufrufbar aus **beiden** Workflow-Familien. Schreibt in die **Reference**, nie in die Story.
(Source-Reference-Capture in design-* ist **erlaubt** — nur die *Story*-Screenshots sind
verify-exklusiv.)

### Refresh-Policy

Baseline + `extract.json` bleiben stabil, solange `references/<hash>/` existiert. Neu-Greifen **nur**
via explizitem `--refresh-reference` (oder `references/<hash>/` löschen). Default: nie automatisch →
Determinismus gewahrt.

## Workflow-Änderungen

### design-entity / design-screen / design-shell · reference-Stage (`extract-reference`)

- **Fragt** (falls nicht aus Prompt/meta ableitbar): welche Breakpoints, welche Elements (id +
  reference-Selektor). Werte werden in der Reference **persistiert** → keine Re-Frage bei Folgeläufen.
- Extrahiert `extract.json` + assets/fonts (wie heute) **und** schreibt `references/<hash>/meta.yml`
  (das `Reference`-Objekt) **und** greift die Baseline für die abgefragten `(element,state,breakpoint)`
  über die `ensure-baseline`-Einheit.

### design-verify

- **Fragt ebenfalls** Breakpoints + Elements/Selektoren; **ergänzt** fehlende Baselines über dieselbe
  `ensure-baseline`-Einheit (vorhandene reused — akkumuliert in dieselbe Reference).
- `setup-compare` → schreibt nur die **Story-Bindung** (`stories/<id>/meta.yml`: `reference: <hash>`
  + `story_selector` pro Element) und liefert die `Screenshot`-Liste der Story-Seite.
- `capture` → **nur Story** (kein reference-capture mehr).
- `compare` → Story-`Screenshot` vs. fixe Baseline-`Screenshot`, gepaart über `(element,state,breakpoint)`.
- `re-capture` nach polish → **nur Story** (Baseline bleibt fix → genau der „stabil"-Gewinn: der Diff
  misst Story-Drift, nicht Referenz-Rauschen).

### Ask-Ergonomie

Beide Workflows: vorhandene Werte (Prompt/meta) nutzen, sonst fragen. Persistenz in Reference/Story
meta → Folgeläufe fragen nicht erneut. Ein „Do NOT ask"-Prompt liefert die Werte inline (wie in den
Test-Cases).

## Addon-Read-Pfad

Panel liest `stories/<id>/meta.yml` → folgt `reference: <hash>` → `references/<hash>/meta.yml` für
`elements`/`states`/`breakpoints` + Baseline-PNGs (Reference-Overlay); Story-PNGs aus
`stories/<id>/screenshots/`. `StoryMeta.toJSON()` (story-entity.ts) und der `/__designbook/story/<id>`
Endpoint (vite-plugin.ts) lösen die Reference auf und liefern `elements` (statt `breakpoints.regions`)
sowie `referenceDir`. `VisualCompareTool.tsx` liest `elements` statt der heutigen `regions`-Struktur.

## Schema-Konsolidierung

- **Neu:** `Screenshot { element, state, breakpoint, selector }`, `Element { id, selector, states[{name,steps}], breakpoints[] }`, `Reference { source, elements, extract, assets_dir }`.
- **Umgebaut:** `StoryMeta` → `{ reference, elements[{id, selector}] }`.
- **Entfällt:** `Check` (region/selector/reference_selector/breakpoint/state/file_suffix), `Region`
  (id/selector/reference_selector), das lose `ReferenceFolder`-only-Modell, das `file_suffix`-Feld
  (Pfad leitet `state` direkt ab).
- Alle Schema-Änderungen via `designbook-skill-creator` (`rules/schema-files.md`).

## Edge Cases & Limitations

- **Kein Match (Selektor):** isolate-and-capture fällt auf full-page zurück + Warnung, nie fail
  (PR #112). Gilt für Reference- wie Story-Seite.
- **States:** aus `extract.json` Behaviors. Reference-Steps laufen auf Reference-DOM, Story-Steps auf
  Story-DOM — gleiche `state`-Namen, Selektoren ggf. seitenspezifisch (jede Seite hält ihre `steps`
  in ihrer `Element`-Definition).
- **Geteilte Reference:** mehrere Stories (Shell, mehrere Screens) binden denselben `<hash>` → eine
  Baseline, kein Doppel-Capture.
- **Reference-Limitationen** (von PR #112 geerbt): `querySelector` pierct nicht Shadow-DOM/iframe;
  Container-Queries ohne Container-Ancestor; out-of-flow Overflow.

## Testing

From-scratch (keine Migration — bestehende Artefakte disposable):

1. design-entity (signage, leando.de, element `full`/`app-signage`, bp xl) → schreibt
   `references/<hash>/meta.yml` (Reference-Objekt) + `xl--full--rest.png` Baseline + `extract.json`.
2. design-verify (signage, elements `full`, bp xl+lg) → reused `xl` Baseline, greift `lg` Baseline
   einmal, schreibt `stories/<id>/meta.yml` (Bindung), capturet nur Story-PNGs, vergleicht.
3. Addon-Dropdown gefüllt (Reference-Overlay + Story-Screenshots).
4. Zweiter verify-Lauf → Baseline unverändert (stabil); nur Story neu gegriffen.
5. `--refresh-reference` → Baseline neu gegriffen.
