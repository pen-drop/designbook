# DESIGNBOOK-39 — Gemappte View/Form Modes in der Data-Model-Übersicht

**Ticket:** DESIGNBOOK-39 · **Workflow:** gaia_feature · **Sub-work:** `work:code` · **Task-Art:** `addon-feature`
**Datum:** 2026-08-05

## Problem

Die Data-Model-Übersicht (Foundation → Tab „Data Model") zeigt pro Bundle eine Karte, aber
**nichts** darüber, was am Bundle schon designt ist. Ob ein View Mode gemappt ist (eine
`entity-mapping/<type>.<bundle>.<view_mode>.jsonata` besitzt und damit eine Story hat), ist heute
nur über zwei Klicks in der Detailansicht ablesbar. `form_modes` werden im UI **gar nicht**
gerendert. Die Übersicht soll den Fortschritt selbst tragen: pro Bundle sichtbar, welche View- und
Form-Modes deklariert und welche davon gemappt sind — mit direktem Sprung in die Story.

## Zielbild

Jede Bundle-Karte zeigt Badge-Listen „View Modes" und „Form Modes" mit **Soll und Ist**
gleichzeitig; gemappte Badges springen per Klick direkt in die Storybook-Story; die Detailansicht
bekommt erstmals einen Form-Modes-Abschnitt. Kein Umbau von Indexer, Renderer oder Story-Erzeugung;
keine Schema-Änderung.

## Rahmen (vom PM festgelegt, unverhandelbar)

- Badge-Liste mit Soll **und** Ist — kein Zähler, nicht nur die gemappten Modes.
- Beide Zustände **ohne Hover** unterscheidbar.
- Klickziel eines gemappten Badges ist die **Story**, nicht die Detailansicht; ein offenes Badge
  navigiert nicht; der bestehende Karten-Klick bleibt und darf durch den Badge-Klick nicht
  mitausgelöst werden.
- `view_modes` und `form_modes` gleichwertig, plus neuer „Form Modes"-Abschnitt in der Detailansicht.
- **Kein neues Story-Adressierungsschema** — Titel/Name aus den bestehenden Indexer-Helpern
  (`entityStoryGroup`, View-Mode-Name, `<form_mode> (form)`) wiederverwenden, nicht nachbauen.
- Kein Umbau von Indexer/Renderer/Story-Erzeugung; keine Änderung an `data-model.schema.yml`.
- Addon-Arbeit über `designbook-addon-skills`; Manager-Styling-Regel, falls der Manager berührt wird
  (hier nicht der Fall — die Übersicht ist preview-seitig).

## Entscheidungen (die 7 offenen Spec-Punkte)

### 1 — Bezugsweg des Mapped-Status: **(b) neuer Listing-Endpunkt**

Die Übersicht (`DeboDataModel`, `DeboLink`, `DeboSection`) läuft **preview-seitig**
(`storybook/preview-api`). Der Storybook-Story-Index ist über `useStorybookApi`
(`storybook/manager-api`) **nur manager-seitig** erreichbar — Option (c) fällt damit ohne
Channel-Roundtrip praktisch aus.

Gewählt: **ein Listing-Endpunkt** `GET /__designbook/list?dir=entity-mapping|form-mapping` in
`vite-plugin.ts`, der die vorhandenen `.jsonata`-Dateinamen des Verzeichnisses zurückgibt. Ein Fetch
je Verzeichnis für die gesamte Übersicht (O(1) statt N Requests), und alle Badges lösen in **einem**
Schritt auf → erfüllt das „kein Umschlagen"-Gebot (Entscheidung 3) sauber. Der Endpunkt folgt dem
etablierten Muster von `/__designbook/status` (`readdirSync`) inkl. des Path-Guards von
`/__designbook/load` (resolved Pfad muss innerhalb `designbookDir` bleiben).

**Alternative (a)** — ein `designbookFileExists()` je deklariertem Mode über den bestehenden
`/__designbook/load`: keine Middleware-Änderung, aber N Requests; um AC 13 zu halten, müssten alle
per `Promise.all` gesammelt und erst danach angewendet werden. Verworfen zugunsten O(1) + einfachem
Flip-freien Ladeverhalten.

### 2 — `entityStoryGroup` browser-tauglich: **in ein reines Modul extrahieren**

`entityStoryGroup` ist rein, hängt nur an `namespaceFor` (rein, in `data-pool.ts`) und
`titleCaseBundle` (rein, lokal). Beide liegen jedoch in Modulen, die auf Modulebene `node:fs` /
`node:path` importieren → im Browser nicht ladbar.

Gewählt: neues Modul **`renderer/story-address.ts`** ohne jeden `node:*`-Import, das exportiert:
`titleCaseBundle`, `namespaceFor`, `entityStoryGroup` und neu **`formStoryName(fm) => \`${fm} (form)\`\`**
(die Story-**Name**-Bildung des Form-Modes, die heute inline in `preset.ts:117` steht). `data-pool.ts`
importiert `namespaceFor` von dort zurück; `entity-module-builder.ts` und `preset.ts` importieren
`entityStoryGroup`/`titleCaseBundle`/`formStoryName` von dort; die Badge-Komponente importiert
`entityStoryGroup`/`formStoryName` von dort. So bleibt **eine** Quelle für Titel und Name → Sidebar
und Badge-Link können nicht divergieren (AC 7), und das Indexer-/Renderer-Verhalten bleibt
byte-identisch (AC 12). Der View-Mode-Story-Name ist die Identität (`view_mode`), braucht keinen
Helper.

### 3 — Ladeverhalten: **neutraler Pending-Zustand, gleichzeitiges Auflösen**

Karten und Badge-**Labels** rendern sofort aus den Deklarationen in einem **neutralen
Pending-Zustand** (nicht „offen"). Der eine Fetch je Verzeichnis liefert die Mapped-Menge; danach
lösen **alle** Badges gleichzeitig in ihren Endzustand auf. Ein Badge wird nie als „offen" gezeigt,
bevor sein Status bekannt ist → kein sichtbares Umschlagen offen→gemappt (AC 13).

### 4 — Verwaiste Mappings: **als Extra-Badge zeigen**

Eine `.jsonata`-Datei ohne passende Deklaration im `data-model.yml` wird als **zusätzliches
Orphan-Badge** dargestellt, um die Inkonsistenz sichtbar zu machen. Damit gibt es **drei** ohne
Hover unterscheidbare Zustände:

- **mapped** — deklariert **und** Datei existiert → hervorgehoben, klickbar → Story.
- **open** — deklariert, keine Datei → ausgegraut, **nicht** klickbar.
- **orphan** — Datei existiert, **keine** Deklaration → eigener Warn-/Hinweis-Stil, **klickbar**
  (die Datei erzeugt eine Story), sichtbar als Inkonsistenz.

Die per-Deklaration-Badges (AC 1/3) bleiben unberührt; Orphan-Badges kommen **zusätzlich** hinzu.
Ein Bundle ohne jedes Badge (weder Deklaration noch Mapping) zeigt **keinen** Abschnitt (AC 9) — die
Section rendert genau dann, wenn ≥ 1 Badge existiert.

### 5 — Config-Entities: **identische Behandlung**

Die `Config`-Gruppe nutzt dieselbe `EntityGroup`/`DeboCard`. `entityStoryGroup` liefert für ein
Config-Bundle den Titel `Config/<type>/<bundle>` (Leaf = roher Bundle-Name), für Content
`Entities/<type>/<TitleCaseBundle>`. Die Badge-Liste gilt identisch; keine Sonder-Semantik oder
-Beschriftung. AC 7 verlangt genau diese Parität (auch für ein Config-Bundle).

### 6 — Form-Mapping-Ausdruck in der Detailansicht: **ja, analog**

Der neue „Form Modes"-Abschnitt der Detailansicht bekommt — analog zum eingeklappten „Entity
Mapping" bei View Modes — einen eingeklappten „Form Mapping"-Block, der
`form-mapping/<type>.<bundle>.<form_mode>.jsonata` lazy nachlädt. Die bestehende
`ViewModeMapping`-Komponente wird über eine `dir`-Prop (`entity-mapping` | `form-mapping`)
generalisiert und in beiden Abschnitten wiederverwendet (nicht dupliziert).

### 7 — Fixture-Abdeckung: **eigenständige neue Fixture + Case**

Neue, isolierte Fixture unter `drupal-web`, die den gemischten Stand direkt komponiert (statt ihn
per Workflow-Lauf zu erzeugen). Sie enthält in `designbook/`:

- **`data-model.yml`** mit
  - einem Content-Bundle mit **≥ 1 gemapptem und ≥ 1 nicht gemapptem View Mode** **und** **≥ 1
    gemapptem und ≥ 1 nicht gemapptem Form Mode**,
  - einem **modeless** Bundle (ohne view/form_modes) → AC 9,
  - einem **Config-Bundle** mit ≥ 1 gemapptem View Mode → AC 7-Parität;
- **`entity-mapping/` + `form-mapping/`** mit dem passenden **Teilsatz** an `.jsonata` (nur die
  gemappten Modes) **plus einer verwaisten Mapping-Datei** ohne Deklaration → Entscheidung 4;
- **minimale SDC-Komponenten + `data/`-Records**, damit die gemappten Stories tatsächlich bauen.

Dazu ein serve-orientierter Case `fixtures/drupal-web/cases/data-model-modes.yaml` (fixtures:
`[vision, tokens, data-model-modes]`). Verifikation: `debo-test run drupal-web data-model-modes`
provisioniert das Workspace und startet Storybook; die Prompt-Ausführung wird verneint
(„workspace ready for manual use"), und das ausführbare Gherkin-Szenario klickt im laufenden
Storybook den Pfad Foundation → Tab „Data Model" → Badge → Story. `pnpm check` läuft zusätzlich, da
Addon/TS berührt ist.

## Betroffene Artefakte

Neu:
- `packages/storybook-addon-designbook/src/renderer/story-address.ts`
- `packages/storybook-addon-designbook/src/components/ui/DeboModeBadges.jsx` (Badge-Listen-Komponente
  für View/Form Modes; genauer Name/Schnitt im Plan)
- Tests: `story-address` (Reinheit + Parity gegen `indexEntity`/`indexForm`, inkl. Config-Bundle),
  Listing-Endpunkt, Badge-Komponente (mapped/open/orphan-Zustände, Klickverhalten, `stopPropagation`)
- Fixture `fixtures/drupal-web/data-model-modes/**` + Case `fixtures/drupal-web/cases/data-model-modes.yaml`

Geändert:
- `packages/storybook-addon-designbook/src/renderer/data-pool.ts` (namespaceFor → import aus story-address)
- `packages/storybook-addon-designbook/src/renderer/entity-module-builder.ts` (Helper-Imports)
- `packages/storybook-addon-designbook/src/preset.ts` (Helper-Imports + `formStoryName`)
- `packages/storybook-addon-designbook/src/vite-plugin.ts` (Listing-Endpunkt)
- `packages/storybook-addon-designbook/src/components/designbookApi.js` (`listDesignbookFiles`)
- `packages/storybook-addon-designbook/src/components/display/DeboDataModel.jsx` (Badge-Listen an der Karte)
- `packages/storybook-addon-designbook/src/components/ui/DeboCard.jsx` (Slot für die Badge-Listen)
- `packages/storybook-addon-designbook/src/components/display/DeboDataModelDetail.jsx` (Form-Modes-Abschnitt, `ViewModeMapping` generalisiert)

Explizit **unverändert**: `data-model.schema.yml`, das Verhalten von `indexEntity`/`indexForm`,
Renderer, Story-IDs/Gruppen/Reihenfolge.

## Risiken & Gegenmaßnahmen

- **Extraktion von `entityStoryGroup` muss verhaltensgleich sein.** → Bestehende Tests plus ein
  neuer struktureller Parity-Test, der Badge-Adresse und Indexer-Ausgabe (`indexEntity`/`indexForm`)
  für dasselbe File vergleicht, inkl. Config-Bundle (AC 7, 12).
- **Preview kann den Manager-Story-Index nicht lesen.** → bewusst Middleware statt Index (Entsch. 1).
- **Story-Bau der eigenständigen Fixture erfordert echte Komponenten/Daten.** → minimal halten (ein
  kleines SDC pro gemapptem Mode), an der bestehenden `design-entity`-Fixture als Muster orientieren.
- **Badge-Klick löst Karten-Klick mit aus.** → `event.stopPropagation()` im Badge-Handler; Test dafür (AC 8).

## Nicht in diesem Ticket

Kein Umbau von Indexer/Renderer/Story-Erzeugung; keine Schema-/Datenmodell-Format-Änderung; kein
Editieren des Datenmodells aus dem UI; keine Änderung an Designbook-Skills; kein Fortschritts-Rollup
über Bundles/Sections (kein Projekt-Dashboard).
