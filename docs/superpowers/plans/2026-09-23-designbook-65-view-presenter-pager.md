# Implementation Plan — DESIGNBOOK-65 (Scope: DB65-A · confirmed)

Source: gaia ticket DESIGNBOOK-65, comment `94c11215-fc72-4246-8be6-fcdc8f4be41b` (plan),
argued from spec comment `6d5a40f1-bfcb-4037-b239-72649bf98aa0`, verified by test-plan
comment `df4f774b-9940-4f00-b62e-06ebdfa080b9`. Scope confirmed in comment
`c1148cf3-4744-4bfc-a891-b9c7dceae99e` (DB65-A).

**Ziel:** Ein widerspruchsfreier, testbarer Vertrag für Varianten, Komponenten-Komposition,
View-Ownership nach Build Form, Pager und authentifizierten Capture — portabel im Core,
Drupal-Mechanik in `designbook-drupal`.

**Architektur:** Regeln und Blueprints im 4-Ebenen-Modell (workflow → stage →
task/blueprint/rule) unter dem *intake-first*-Vertrag aus DESIGNBOOK-56. Der
Display-Builder-Zweig wird als Entscheidungsregel geschrieben; er braucht keine
Engine-Änderung, weil `build_form` ein freier String aus `entity_mapping.templates` ist.

## Global Constraints

- `designbook-skill-creator` **muss** vor jeder Bearbeitung unter `.agents/skills/designbook*/`
  geladen sein (CLAUDE.md); dazu `matt-skills-curated:writing-for-agents` und
  `rules/writing-files.md`.
- Skill-Quellen liegen in `.agents/skills/`; `.claude/skills/` ist ein Symlink und wird nie
  separat bearbeitet.
- **Keine neue `extends:`/`provides:`/`constrains:`/`suggests:`-Frontmatter** — der Mechanismus
  ist im Addon entfernt (0 Codetreffer) und wäre wirkungslos. Constraints als Rule-Prosa +
  `## Checks`-Tabelle.
- Jede Rule-Datei trägt eine `## Checks`-Tabelle im Format
  `| ID | Severity | What to verify | Where |`; Check-IDs global eindeutig.
- Blueprints dürfen **keine** gemessenen Designwerte (Pixel, `rem`, feste Row-Counts) und
  **keine** Verweise auf Rule-Dateien enthalten.
- Keine Leando-Konkreta im Core: keine UIDs, Routen, DDEV-URLs, `bibb_theme:*`, `b:`-Präfixe,
  Theme-Dateinamen, deutschen UI-Labels.
- Keine Migrations-/Kompatibilitätspfade; Fixtures werden frisch aufgebaut.
- `pnpm check` (typecheck → lint → test, fail-fast) aus dem Repo-Root bei jeder Änderung an
  `packages/`.

---

## Phase 1 — Core-Verträge (work:docs)

### Task 1: Variantentransport (V-1) + Auflösung von I-1
- [ ] `.agents/skills/designbook/design/rules/variant-transport.md` anlegen: `variants:` ist der
  einzige Deklarationsort; die Renderpfad-Matrix (Story-Argument / Mapping-Auswahl /
  `variant_id`) als Tabelle; `## Checks` mit mindestens einem Check „kein `variant`/`*_variant`
  unter `props`".
- [ ] `.agents/skills/designbook-drupal/components/rules/sdc-components.md:98–99` ändern:
  Story-Dateien wählen die Variante über den Story-Auswahlkanal, nicht über `props.variant`.
  Zeile 77 bleibt.
- [ ] Prüfen, dass keine andere Stelle `props.variant` als gültig beschreibt:
  `grep -rn "props.variant\|props\.properties.*variant" .agents/skills`.
- [ ] Skill-Validierung laufen lassen; Findings auflösen.
- [ ] Commit.

### Task 2: Typisierte Komponentengrenze (V-2)
- [ ] `.agents/skills/designbook/design/rules/typed-component-boundary.md` anlegen. Kern:
  Variation über benannte typisierte Props oder deklarierte Varianten. **Zulässig** benennen
  (Attribut-/Class-Merge am eigenen Root-Element), **unzulässig** benennen (ein
  `class`/`classes`-Prop, das ein aufrufendes Element befüllt) — die Abgrenzung ist der Zweck
  der Regel (AC-3).
- [ ] `## Checks`: Layout-Injektion über `classes`, Farb-/Größen-/Padding-Variation über
  `classes`, neues offenes `class`-Prop.
- [ ] Skill-Validierung; Commit.

### Task 3: Presenter-Komposition (V-3)
- [ ] `.agents/skills/designbook/design/rules/presenter-composition.md` anlegen: Presenter
  besitzen Datenfluss, Bedingungen, Schleifen, Render-Metadaten, Slots, Variantenauswahl;
  sichtbares wiederverwendbares Markup kommt aus einer Komponente. Pflicht:
  Komponenten-Inventar vor neuem Markup prüfen und die Wiederverwendungsentscheidung
  protokollieren.
- [ ] Gegen `designbook/skills/data-model/rules/presenter-template.md` prüfen, dass nichts
  dupliziert wird (Single Source of Truth) — bei Überschneidung dort verweisen statt kopieren.
- [ ] Skill-Validierung; Commit.

### Task 4: Authentifizierte Capture-Parität (V-6) + I-8
- [ ] `.agents/skills/designbook/design/rules/authenticated-capture-parity.md` anlegen:
  derselbe relevante Benutzerzustand wie die Referenz; Authentifizierung über die vorhandene
  Session-/Capture-Abstraktion; **positive** Zustandsprüfung vor dem Screenshot;
  Login-/Redirect-200-/Leerzustand brechen ab und erzeugen keinen Diff-Score. Keine UID, keine
  URL, keine Zugangsdaten.
- [ ] `.agents/skills/designbook/skills/extract-reference/resources/intake.md` ergänzen: die
  Zustandsprüfung als Schritt vor dem Capture; der Abbruch als Ergebnis.
- [ ] Prüfen, ob `design/rules/screen-compare.md` einen Pfad hat, der trotz Abbruch einen Score
  liefert; falls ja, dort den Abbruch durchreichen.
- [ ] Skill-Validierung; Commit.

---

## Phase 2 — Drupal-Verträge (work:docs)

### Task 5: View-Ownership-Matrix (V-4)
- [ ] `.agents/skills/designbook-drupal/data-mapping/blueprints/views.md` umschreiben. Die
  Build-Form-Entscheidung als **erste** Struktur: Zweig „Display Builder" (direkte Bindung
  über Display-Builder-Konfiguration, kein View-Presenter, konkreter Config-Owner benannt) und
  Zweig „ohne Display Builder" (View-Wrapper ist Presenter-Template, komponiert die
  View-Komponente, reicht Rows/Empty/Exposed Form/Pager als gerenderte Bereiche weiter).
- [ ] Row-Rendering in beiden Zweigen als eigener deklarativer UI-Patterns-/Views-Style-Vertrag
  festhalten; der View-Presenter rekonstruiert keine Row-Komponente.
- [ ] Container-Ownership festhalten: genau ein Owner unterhalb der View-Entity bzw. in deren
  Display-Bindung; die Scene führt die View-Entity unverpackt.
- [ ] Den Pager-Abschnitt entfernen und durch den Verweis auf die Pager-Bindung ersetzen (der
  Blueprint selbst entsteht in Task 6). Keine Rule-Datei-Verweise.
- [ ] `.agents/skills/designbook-drupal/data-model/rules/presenter-template-surfaces.md`
  umschreiben: die View-Build-Form-Matrix modellieren statt View pauschal als presenter-template
  zu führen. `## Checks` um einen Check „kein View-Presenter im Display-Builder-Zweig" und
  „genau ein Container unterhalb der View-Entity" ergänzen.
- [ ] Die Build-Form-Werte in `entity_mapping.templates` dokumentieren — **nicht** als Enum in
  `schemas.yml`.
- [ ] Skill-Validierung; Commit.

### Task 6: Pager-Blueprint (V-5) + I-6 + I-7
- [ ] `.agents/skills/designbook-drupal/data-mapping/blueprints/pager.md` anlegen: generischer
  Pager-Theme-Hook → Pager-Presenter-Template → Pager-SDC-Komponente über typisierte
  Props/Slots. Gilt build-form-unabhängig. Standard-, Mini-, Infinite-Scroll- und
  „kein Pager"-Konfigurationen unterscheiden. Die im Pager-Preprocess tatsächlich verfügbaren
  Werte auflisten und festhalten, dass keine Gesamtzahl erfunden wird, wenn der Theme Hook sie
  nicht liefert.
- [ ] `.agents/skills/designbook-drupal/components/blueprints/pager.md` anlegen: die Pager-SDC
  mit typisierten Props/Slots (I-7 schließt die Lücke, auf die `views.md:69–84` heute ins Leere
  verweist).
- [ ] `.agents/skills/designbook-drupal/data-mapping/blueprints/presenter-template.md` ändern:
  den Pager herauslösen; Form und Exposed Filter bleiben.
- [ ] Load-more-Abgrenzung festhalten: kein handplatzierter Load-more-Control neben einem
  Standard-Pager; ein echter Infinite-Scroll-Pager nutzt seine Komponente über seinen eigenen
  Pager-Presenter.
- [ ] Skill-Validierung; Commit.

### Task 7: Portierte Leando-Regeln
- [ ] Core: `design/rules/icon-sprite.md`, `design/rules/local-image-assets.md`,
  `design/rules/referenced-content-view-mode.md`, `design/rules/story-image-node-renderer.md`,
  `design/rules/component-contract-index.md` (aus `sdc-regeln.md`),
  `skills/sample-data/rules/match-reference-entity.md` (Verzeichnis neu).
- [ ] `designbook-css-tailwind/rules/token-backed-utilities.md` (aus `css-to-tailwind.md`, ohne
  Leando-Farbpalette).
- [ ] Drupal: `components/rules/js-behavior.md`, `components/rules/slot-rendering.md`,
  `data-mapping/rules/inline-image.md`.
- [ ] Nach jedem Port:
  `grep -rniE 'bibb|leando|b:[a-z-]+|cockpit|anmeldung|suche|app-(teaser|stream|picture)|174704' <datei>`
  muss leer sein.
- [ ] Skill-Validierung über alle drei Skills; Commit.

---

## Phase 3 — Fixtures und Nachweis (work:code)

### Task 8: Fixture-Zweig „ohne Display Builder"
- [ ] `fixtures/drupal-web/sync-view-presenter/` von `sync-scene-rich` ableiten:
  `data-model.yml` mit einer paginierten View, deren Seiten-Bundle eine
  Nicht-Display-Builder-Build-Form trägt.
- [ ] `fixtures/drupal-web/cases/sync-view-presenter.yaml` anlegen. Assertions: View-Config
  emittiert; **ein** View-Presenter-Template geschrieben; **ein** Pager-Presenter-Template
  geschrieben; Pager-SDC im Pager-Presenter aufgerufen; `uncovered_units_count === 0`; keine
  Content-Units.
- [ ] `./scripts/setup-test.sh drupal-web sync-view-presenter` und
  `./scripts/start-drupal-workspace.sh --workspace workspaces/db65-presenter`.
- [ ] `debo-test run drupal-web sync-view-presenter --workspace workspaces/db65-presenter`;
  `workflow summary --json` erfassen.
- [ ] Commit.

### Task 9: Fixture-Zweig „Display Builder"
- [ ] `fixtures/drupal-web/sync-view-display-builder/` anlegen: dieselbe View, Seiten-Bundle mit
  Display-Builder-Build-Form in `entity_mapping.templates`.
- [ ] `fixtures/drupal-web/cases/sync-view-display-builder.yaml` anlegen. Assertions: **kein**
  `views-view*.html.twig`-Presenter geschrieben (negativer Nachweis für AC-6); Pager-Presenter
  **trotzdem** geschrieben und Pager-SDC aufgerufen (AC-9, build-form-unabhängig); genau ein
  Container unterhalb der View-Entity (AC-8); `uncovered_units_count === 0`.
- [ ] `debo-test run drupal-web sync-view-display-builder --workspace workspaces/db65-displaybuilder`
  (eigener `--workspace`, damit beide Läufe parallel laufen können).
- [ ] Commit.

### Task 10: Vertragsgrenzen-Cases
- [ ] Case für Variantentransport: eine Komponente mit `variants:`, deren Auswahl über
  Story-Argument und `variant_id` reist; Assertion, dass in keiner erzeugten Datei
  `props.variant` steht.
- [ ] Case für die Class-Grenze: ein Versuch, ein offenes `class`-Prop einzuführen, muss
  abgelehnt werden; das Root-Attribute-Merging der eigenen Komponente bleibt erlaubt.
- [ ] Case für Presenter-Komposition: ein Mapping, das vorhandenes Komponenten-Markup nachbauen
  würde, muss auf die Komponente verwiesen werden.
- [ ] Case für den Auth-Capture-Abbruch: ein geschütztes Subjekt ohne bestätigte Session bricht
  ab und erzeugt **keinen** Score; mit bestätigter Session entsteht ein Vergleich.
- [ ] Jeden Case laufen lassen; Ergebnisse erfassen; Commit.

### Task 11: Abschluss
- [ ] `pnpm check` aus dem Repo-Root.
- [ ] `gaia validate .`
- [ ] Skill-Validierung über `designbook`, `designbook-drupal`, `designbook-css-tailwind`.
- [ ] Zwei Folge-Tickets einreichen (Schema-Komposition; `UPSTREAM-designbook-issues.md`-Auswertung).
- [ ] DESIGNBOOK-6 schließen mit Verweis auf die hier gelieferten Cases.
- [ ] MR gegen `next`, squash + delete source branch, Trailer `ref:DESIGNBOOK-65`.
