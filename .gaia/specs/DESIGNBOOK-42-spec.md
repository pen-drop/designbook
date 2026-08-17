# DESIGNBOOK-42 — Spec & Implementation Plan

**Ticket:** sync-to: Scene 1:1 nach Drupal — Presenter-Template, Block-Regel, Field/Form, View-Template, Shell-Regions
**Workflow:** `gaia_feature` · **Sub-works:** `work:code`, `work:docs` · **Task-Art:** sync-Feature (Skill-Regeln + Drupal-Blueprints + erzeugte Artefakte; echte Drupal-Seite als Ergebnis)
**Runtime surface:** ja — echte Drupal-Seite. Funktionaler Nachweis + 1:1-Messung laufen in coding über den `debo-test`-Tester (Suite `drupal-web`, `--validate sync-verify`) gegen eine laufende Drupal-/Storybook-Instanz, nie ad-hoc. Reine Skill-/Blueprint-/Schema-Prosa wird zusätzlich doc-strukturell geprüft.
**Querbezug:** DESIGNBOOK-41 (PR #154, gemerged, `5a1530a3`) hat den View-Validator-Fallstrick bereits behoben — siehe D9. DESIGNBOOK-38 (PR #151, `b2487329`) lieferte den Scene-Zweig + `sync-verify (kind: scene)` — das Verifikations-Vehikel dieses Tickets.

---

## 1. Problem

`sync-to` soll eine Scene **1:1** nach Drupal übertragen. Heute tut es das nicht zuverlässig, weil
an fünf Stellen **keine Regel** steht und der Agent im Einzelfall entscheidet (zwei Läufe → zwei
Configs). Grundierung am realen Bestand (Pfade/Zeilen verifiziert; drei Ticket-Angaben waren
ungenau — siehe §2):

- **1:1-Anspruch steht nirgends.** `sync-to/SKILL.md` (26 Z., Thin-Index) nennt weder „1:1" noch
  „config-only". `transform.md:87` führt umgekehrt das Drupal-Schema als Leitlinie: „Use `prepared`
  as the primary guide for what properties to produce and which are required."
- **Stiller Ausweg.** `transform.md:89` legt die Blueprint-Präzedenz fest; Stufe 4 ist „with no
  matching blueprint, author from `prepared` alone." Schemakonform, aber nicht zwingend die Scene.
- **Presenter-Template.** Die Zeichenkette `presenter` kommt in `.agents/skills/**` **null** Mal
  vor (verifiziert). Wann ein Template nötig ist, steht nirgends.
- **Block-Entscheidung.** `data-model/blueprints/block_content.md` + `block_plugin.md` existieren;
  `block_plugin.md:11-13` trägt `suggests.component_by_family` — ausdrücklich „a discovery signal
  only". `data-model/rules/layout-builder.md:28-29` und `rules/canvas.md:9,23` regeln nur das
  *Wie* nach der Block-Wahl. **Keine Regel sagt, *wann* ein Block entsteht und welcher Typ.**
- **Field/Form.** Läuft über `form-display.md` (`config_name: core.entity_form_display.*`) —
  handgeführte Form-Display-Config, nicht über ein Presenter-Template.
- **View-Template.** `views.md` bindet nur über Prosa (`domain: data-mapping`, kein `config_name`,
  kein `template:`-Wert). Es gibt kein deklariertes View-Template, auf das ein Datenmodell zeigt.
- **Shell-Regions** (Ziel G) und **Scene-Ergänzung** (Ziel H): die Shell kennt nur
  `header`/`content`/`footer`.

## 2. Korrekturen an Ticket-Angaben (am realen Bestand verifiziert)

Damit die Spec nicht auf falschen Referenzen aufsetzt:

1. **`template:`-Enum existiert nicht.** `data-model/schemas.yml` definiert `view_modes.*.template`
   (Z. 29) und `form_modes.*.template` (Z. 45) je als **`{ type: string }` ohne Enum**. Der
   Ticket-Wert `view-entity` kommt **nirgends** vor. Der einzige `[layout-builder, canvas]`-Enum
   sitzt auf einem **anderen** Feld: `ConfigNameUnit.build_form` in `sync-to/schemas.yml:155`. Die
   Template-Semantik (`field-map`/`layout-builder`/`canvas`) ist heute nur **Prosa** in Rules +
   Blueprints, nicht Schema-erzwungen.
2. **`views.md`-Fallstrick nicht bei `:82`.** Die Datei hat 76 Zeilen; die Fallstrick-/Workaround-
   Passage ist bei **Z. 22-26** — und **DESIGNBOOK-41 hat sie bereits umgeschrieben** (D9).
3. **Rule-Pfade.** `layout-builder.md`/`canvas.md`-Rules und `reference-field-semantics.md` liegen
   unter **`designbook-drupal/...`**, nicht `designbook/skills/...`. `shell-scene-constraints.md`
   liegt unter `designbook/design/rules/`.

## 3. Decision (design)

### 3.1 Ticket-Schnitt (D13) — Ziel G abgetrennt

A–F hängen über das Presenter-Template zusammen und bleiben in **DESIGNBOOK-42**. **Ziel G
(Shell-Regions)** und die **Region-Hälfte von Ziel H** (Scene-Format für Regions) werden in ein
**neues, verlinktes Ticket** ausgelagert (angelegt nach Spec-Bestätigung, §7). Die **Block-Hälfte
von H** bleibt hier bei D. Damit ist 42 um den Presenter-Template-Kern kohärent; Regions sind eine
eigenständige Struktur-Frage.

### 3.2 Presenter-Template — die Schlüsseldefinition (D2/D3/D4/D5)

**Presenter-Template** := eine **erzeugte Twig-Theme-Datei** im aktiven Drupal-Theme, die Entity-/
View-Felder auf die Props/Slots einer SDC-Komponente abbildet. Sie entsteht **genau dann**, wenn
die Bindung **nur über Drupal-Theme-Methoden** herstellbar ist (Forms, Pager, Exposed-Filter) und
deshalb **nicht** als UI-Patterns-Display-Config ausgedrückt werden kann.

- **Config-first, Twig-fallback (Hybrid).** Die Regel „wann ein Template nötig ist" (Ziel C) ist
  damit deterministisch entscheidbar: ist die Präsentation **UI-Patterns-bindbar** → Config, d. h.
  `template: field-map` (**kein** Presenter-Template); ist sie **theme-methoden-only** → ein
  **Presenter-Template** (Twig).
- **Verhältnis zu `field-map`/`layout-builder`/`canvas` (D3).** `field-map` ist die **UI-Patterns-
  Manifestation** der Feld-Präsentation (der Normalfall), **kein** Presenter-Template und wird nicht
  ersetzt. `layout-builder`/`canvas` bleiben **Whole-Page-Build-Forms** (Passthrough), unberührt —
  `resolve-filter` verlässt sich weiter auf sie (`layout-builder`⇒LB, `canvas`⇒Display Builder).
  Das Presenter-Template sitzt **daneben** als der Twig-Weg für theme-methoden-only-Flächen; als
  deklarierter Datenmodell-Wert heißt er **`template: presenter`** (view_mode **und** form_mode).
- **Wer erzeugt es + Config-only-Vertrag (D4/D5).** **`sync-to` erzeugt beides**: Config immer,
  plus das Presenter-Template (Twig) dort, wo die Bindung theme-methoden-only ist. Der Config-only-
  Vertrag des Scene-Zweigs wird in `sync-to/workflows/sync-to.md` und `tasks/resolve-filter.md`
  **neu formuliert**: von „config-only" zu **„Config, plus ein Presenter-Template dort, wo die
  Bindung Drupal-Theme-Markup braucht"** (AC18). Der **Kind-Dispatch und die Stage-Kette
  `resolve-filter → transform → sync` bleiben unverändert** (AC17). Das **Wie** der Twig-Erzeugung
  (Theme-Pfad, Template-Namenskonvention, Feld→Prop/Slot-Materialisierung) ist ein
  **`designbook-drupal`-Blueprint** — **kein** Backend-Code im Core (AC16).

### 3.3 1:1-Anspruch ausgeschrieben + prüfbar (Ziel A · D1)

- **Ausgeschrieben (AC1).** `sync-to/SKILL.md`, `resolve-filter.md`, `transform.md` sagen
  ausdrücklich: Entity-Modell und Scene werden **unverändert** übernommen; **das Drupal-Schema
  bestimmt die *Form*, die Scene den *Inhalt*.** `transform.md:87` wird entsprechend eingeordnet:
  `prepared` ist maßgeblich für **Shape** (welche Properties erlaubt/required), die **Scene** für
  die **Werte**.
- **Prüfbar (AC2).** „1:1" wird über **`@designbook/sync-verify` (kind: scene)** definiert — die
  visuelle Render-Reconciliation der echten Drupal-Seite gegen die Storybook-Story der Scene (aus
  DESIGNBOOK-38). Gemessen in coding an **≥ 1** Scene-Case. `sync-verify` selbst wird **nicht**
  umgebaut.

### 3.4 Stufe-4-Fallback sichtbar (Ziel B · D12)

Jede **heute vorkommende** Unit-Art bekommt einen deckenden Blueprint; ein dennoch erreichter
Stufe-4-Fall („author from `prepared` alone") wird zu einem **sichtbaren, gemeldeten Zustand** im
`sync-to`-Outtake/Gate — nie mehr stillschweigend (AC14). `transform.md:89` formuliert Stufe 4 als
Melde-Pflicht um.

### 3.5 Block-Regel (Ziel D · D6/D7)

Eine neue **`designbook-drupal`-Data-Model-Rule** entscheidet **deterministisch** aus dem
**Datenmodell** (Ziel: keine Einzelfallermessung, AC5):

- Datenmodell deklariert ein **`block_content`-Bundle** ⇒ **`block_content`** (Content-Block).
- Datenmodell trägt einen **`block_plugin`-Eintrag** ⇒ **`block_plugin`** (Plugin-Platzierung).
- Ein Scene-Knoten **ohne** Block-Bundle, inline im Layout ⇒ **kein Block** (Inline-Komponente).
- `suggests.component_by_family` (`block_plugin.md`) bleibt **Hinweis** und ersetzt die Regel nicht.

### 3.6 Field/Form über das Presenter-Template (Ziel E · AC6/AC7)

Form-Handling läuft über ein **Presenter-Template** (Forms sind theme-methoden-only), **nicht** mehr
über handgeführte `core.entity_form_display.*`-Config als vorgeschriebenen Weg. Die bestehende
**UI-Patterns-Bindung** bleibt der Feld-Weg: Prop-Hints (`literal`/`field`/`token`) → `designbook_ui_patterns`-
Drush-Registry; **feldgerenderter Inhalt bleibt in Slots** (`reference-field-semantics.md` gilt
unverändert, AC7) — an einem erzeugten Artefakt belegt.

### 3.7 Einheitliches View-Template (Ziel F · D8 · AC8/AC9)

Views bekommen **ein** deklariertes Template: ein **`template:`-Wert** im `config.view.<id>`-
`view_modes`-Eintrag **plus** ein `config_name: 'views.view.*'`-**Trigger** an `views.md` (wie
`form-display`/`layout-builder-display` über `config_name` binden, statt nur Prosa). **Rows** über
**UI-Patterns**-Config (die selbst-enthaltene Row-Bundle-Enumeration aus dem post-41-`views.md`);
**Pager/Exposed-Filter** (theme-methoden-only) über das **Presenter-Template**. UI-Patterns-Bindung
an einer gerenderten Liste belegt (AC9).

### 3.8 Ziel H — Scene-Ergänzung: für Blocks ausdrücklich verneint

Weil die Block-Wahl (D6) **aus dem Datenmodell** kommt, trägt die Scene die nötige Information
bereits — das **Scene-Format wird für Blocks nicht erweitert** (Ziel H hier **ausdrücklich
verneint**, AC13). Die **Region-Hälfte** von H wandert mit Ziel G ins neue Ticket. Ergibt ein
coding-Case wider Erwarten doch eine Scene-Mehrdeutigkeit beim Block, meldet coding das zurück,
statt zu raten (dann Scene-Schema + Validator — aber nicht antizipiert).

## 4. Resolved decisions (alle 14)

| # | Offene Entscheidung | Wahl | Begründung |
|---|---|---|---|
| **D1** | Was „1:1" prüfbar heißt | `sync-verify` (kind: scene), ≥ 1 Case | Etablierte, akzeptierte Messung (DESIGNBOOK-38); in der Evidenz-Liste genannt; kein Neubau. |
| **D2** | Was ein Presenter-Template ist | Erzeugte **Twig-Theme-Datei**; nur für **theme-methoden-only**-Flächen; Config-first/Twig-fallback | Deckt, was UI-Patterns nicht kann (Forms/Pager/Exposed-Filter); hält den Rest config-only. |
| **D3** | Verhältnis zu bestehenden `template:`-Werten | `field-map` = **UI-Patterns-Manifestation** (kein Presenter); `layout-builder`/`canvas` unberührt; Presenter **daneben** als `template: presenter` | Kleinste kohärente Änderung; erhält die Build-Form-Unterscheidung, auf die `resolve-filter` zeigt. |
| **D4** | Wer das Presenter-Template erzeugt | **`sync-to`** (Config + Twig-Fallback); Twig-*Wie* in `designbook-drupal` | Ein Sync-Pfad, Kind-Dispatch unverändert; Backend-Neutralität gewahrt. |
| **D5** | Bricht E den Config-only-Vertrag? | **Ja** → Vertrag in `sync-to.md`/`resolve-filter.md` neu formuliert (AC18) | Hybrid verlangt es; Widerspruch bleibt nicht stehen. |
| **D6** | Kriterium Block-Entscheidung | **Datenmodell** als Quelle (`block_content`-Bundle / `block_plugin`-Eintrag / inline) | Deterministisch, keine Einzelfallermessung (AC5); `suggests` bleibt Hinweis. |
| **D7** | Woher die Block-Info kommt | Aus dem **Datenmodell** | Scene trägt es über das Modell; H nicht getriggert (§3.8). |
| **D8** | View-Template-Name + Trigger | `template:`-Wert **+** `config_name: 'views.view.*'`-Trigger an `views.md` | Deklariert „wie die übrigen" (AC8), Bindung config-gebunden statt Prosa. |
| **D9** | View-Validator-Fallstrick | **Bereits in DESIGNBOOK-41 behoben** (gemerged, `5a1530a3`); kein eigenes Ticket | post-41-`views.md` enumeriert echte Row-Bundle-Records → Validator findet sie („No sample records found" weg). Abgestimmt (AC10). |
| **D10** | Wie Regions deklariert werden | **→ neues G-Ticket** | Ziel G abgetrennt (D13); Region-Mechanik dort entschieden. |
| **D11** | Wie Regions beim Sync abgebildet werden | **→ neues G-Ticket** | dito. |
| **D12** | Umfang Ziel B (Stufe 4) | **Bekannte Unit-Arten decken + Rest als gemeldeter, sichtbarer Zustand** | Schließt die reale Lücke, macht den Rest explizit (AC14). |
| **D13** | Ticket-Schnitt | **G (+ Region-H) abtrennen**; 42 behält A–F + Block-H | Hybrid vergrößert A–F; Regions sind unabhängig. |
| **D14** | Fixture-Abdeckung | drupal-web-Cases: Presenter-Template (Form/Pager→Twig), **beide** Block-Typen, View-Template mit UI-Patterns; **Verstoß-Case** (Block-Typ unbestimmbar). Region-Fixture → G-Ticket | Deckt jeden neuen Weg + RED (AC20/AC21). |

## 5. Verifikations-Vehikel (coding)

**Primär:** `debo-test`, Suite **`drupal-web`**, aus **diesem Worktree** (isolierte `workspaces/`),
gegen live Drupal (`start-drupal-workspace.sh`) + Storybook. Muster: `sync-verify-scene.yaml`
(DESIGNBOOK-38) — PART A `/debo sync-to` (Scene-Zweig) → drush `config:import` → PART B
`/debo sync-verify story:<scene> kind:scene` (Render-Reconciliation, ScoreReport) → PART C
Idempotenz. Erweiterung/neue Cases decken Presenter-Template, beide Block-Typen und View-Template
ab; ein **Verstoß-Case** liefert RED vor GREEN.

**Sekundär:** doc-strukturelle Checks (Markdown/Link/Frontmatter/Workflow/Contract) für die reinen
Skill-/Blueprint-/Rule-/Schema-Prosa-Kriterien; `git diff` für die Nicht-Regression von
Config-Zweig + Kind-Dispatch; `pnpm check` bei Addon/TS-Berührung.

## 6. Risks

- **R1 — UI-Patterns-Form-/Pager-Bindung (höchstes).** Die These „Forms/Pager/Exposed-Filter sind
  theme-methoden-only, also Presenter-Twig" muss am realen UI-Patterns-2-Verhalten belegt werden.
  *Mitigation:* der Presenter-Case in coding rendert **eine** solche Fläche real; kann eine Fläche
  doch als Config gebunden werden, ist sie kein Presenter-Fall (Regel greift trotzdem — sie
  entscheidet nach „bindbar?").
- **R2 — `sync-to` schreibt Theme-Dateien.** Erweiterter Vertrag; Regressionsrisiko am bisher
  strikt config-only-Scene-Zweig. *Mitigation:* Twig-Emission strikt auf theme-methoden-only-Units
  begrenzt; Config-Zweig per `git diff` unverändert (AC17); `designbook-drupal` trägt das *Wie*.
- **R3 — Presenter-Template-Naming-Kollision.** `template: presenter` (Twig) vs. `field-map`
  (UI-Patterns) müssen sauber getrennt bleiben, sonst rät der Agent doch. *Mitigation:* die C-Regel
  benennt das Bindbarkeits-Kriterium explizit; Blueprints tragen die Trigger.
- **R4 — Stufe-4-Meldung ohne Addon-Hook.** Fällt der „gemeldete Zustand" nur in Prosa, ist er
  schwach. *Mitigation:* Meldung an das bestehende `workflow summary`/Gate hängen; falls dafür
  Addon/TS nötig, `pnpm check` grün.
- **R5 — Verstoß-Case (RED).** Ein Block-Typ-unbestimmbar-Case muss real **abgelehnt** werden, nicht
  nur „nicht erzeugt". *Mitigation:* Regel formuliert die Ablehnung als Fehler/Meldung; Case
  assertet den RED-Zustand vor GREEN.

## 7. Ticket-Split — neues G-Ticket (nach Spec-Bestätigung anzulegen)

Nach Bestätigung dieser Spec wird ein GAIA-Feature-Ticket angelegt und mit 42 verlinkt (AC13):

- **Titel (Vorschlag):** „Shell-Regions: zusätzliche Regions in der Shell-Scene deklarieren & syncen"
- **Umfang:** Ziele **G** + Region-Hälfte von **H** — `shell-scene-constraints.md` um weitere
  Regions über `header`/`content`/`footer` erweitern (`$content` bleibt der eine Injection-Point,
  AC12); Scene-Format-Erweiterung für Region-Deklaration (offene Entscheidung 10) + Sync-Abbildung
  auf Drupal-Regions (offene Entscheidung 11); `region-properties.md`-Materialisierung nutzt der
  bestehende SDC-Weg; drupal-web-Fixture „Shell mit zusätzlicher Region".
- **Verlinkung:** als `referenced_tickets`/`blocked_by` je nach Reihenfolge; die 42-ACs 11 und die
  Region-Anteile von 13/19/21 sind dort abgenommen.

## 8. Acceptance ↔ evidence matrix (25 AC)

| AC | Womit belegt | Zweig |
|---|---|---|
| 1 — 1:1 ausgeschrieben; `transform.md:87` eingeordnet | Lesen SKILL.md/resolve-filter/transform + `git diff` | docs |
| 2 — „1:1" prüfbar (sync-verify), an ≥1 Fall gemessen | `debo-test … --validate sync-verify`; ScoreReport am Ticket | code |
| 3 — Presenter-Template definiert (was/wann/wer/vs. field-map/LB/canvas) | Lesen der neuen Definition + C-Regel | docs |
| 4 — pro Bundle/View-Mode entscheidbar, ob Template + welches | C-Regel (Bindbarkeits-Kriterium) gelesen | docs |
| 5 — Block-Regel (wann Block, welcher Typ, wann keiner); `suggests` bleibt Hinweis | Lesen der neuen Block-Rule | docs |
| 6 — Field/Form über Presenter-Template; Form-Display nicht mehr vorgeschrieben | Lesen `form-display.md`/E-Regel + erzeugtes Presenter-Artefakt | code+docs |
| 7 — feldgerenderter Inhalt in **Slots**, nicht skalaren Props | erzeugtes Artefakt im Presenter-Case | code |
| 8 — View: `template:`-Wert + Trigger, nicht nur Prosa | Lesen `views.md`-Frontmatter (`config_name`) + data-model | docs |
| 9 — View-Ausgabe über UI-Patterns an Komponente gebunden | gerenderte Liste im View-Case | code |
| 10 — View-Fallstrick behoben/verlinkt, mit 41 abgestimmt | Verweis auf DESIGNBOOK-41 `5a1530a3` (bereits behoben) | docs |
| 11 — Shell trägt weitere Regions | **→ G-Ticket** | (abgetrennt) |
| 12 — keine Regression am `$content`-Mechanismus | 42 fasst die Shell nicht an; `git diff` shell-scene-constraints unverändert; Screen-Scene rendert | code |
| 13 — Ziel H eingelöst/verneint | Block-H **verneint** (Datenmodell trägt es, §3.8); Region-H → G-Ticket | docs |
| 14 — Stufe 4 abgedeckt/gemeldet, nicht still | Lesen `transform.md:89`-Neufassung + Meldung im Outtake | docs+code |
| 15 — für **jede** der 14 Entscheidungen Begründung; Split-Ziele als Tickets angelegt+verlinkt | §4 + angelegtes G-Ticket (§7) | docs |
| 16 — kein Drupal-Spezifikum im Core | `grep`: neue Block-Rule/Presenter-*Wie* in `designbook-drupal`; Core nur neutrale Begriffe | docs |
| 17 — keine Regression am Kind-Dispatch; Config-Zweig unverändert | `git diff` + Config-Case (`sync-node` o. ä.) grün | code |
| 18 — Config-only-Vertrag neu formuliert (kein stehender Widerspruch) | `git diff` sync-to.md/resolve-filter.md | docs |
| 19 — Seite: Hauptinhalt, Block, View-Liste dort, wo Scene sie hat | `sync-verify`-ScoreReport im erweiterten Scene-Case | code |
| 20 — Verstoß-Fall abgelehnt/gemeldet (RED vor GREEN) | Verstoß-Case (Block-Typ unbestimmbar) | code |
| 21 — Fixtures: Presenter-Template, beide Block-Typen, View-Template+UI-Patterns | neue/erweiterte drupal-web-Cases | code |
| 22 — `pnpm check` grün | `pnpm check` | code |
| 23 — in laufender Instanz über `debo-test` verifiziert (nicht ad-hoc) | `workflow summary --json` am Ticket | code |
| 24 — Standing `work:code`: RED vor GREEN; Szenario als Klickpfad | Verstoß-Case + `.feature`-Szenario (in coding) | code |
| 25 — Standing `work:docs`: Doc-Checks (Markdown/Link/Frontmatter/Workflow/Contract) grün | Doc-Struktur-Checks | docs |

## 9. Implementation plan (Checkbox — für coding)

- [ ] **`designbook-skill-creator` laden** (Pflicht vor Editieren von task/rule/blueprint/schemas.yml
      unter `designbook/`/`designbook-drupal/` — CLAUDE.md) + `rules/{task-files,rule-files,blueprint-files,schema-files,common-rules}.md`.
- [ ] **Ziel A (AC1):** `sync-to/SKILL.md` + `tasks/resolve-filter.md` + `tasks/transform.md`: den
      1:1-Anspruch ausschreiben (Entity-Modell + Scene unverändert; Schema = Form, Scene = Inhalt);
      `transform.md:87` von „primary guide" auf „`prepared` = Shape, Scene = Werte" einordnen.
- [ ] **Ziel B (AC14):** `transform.md:89` Stufe 4 als **gemeldeten, sichtbaren** Zustand
      formulieren; bekannte Unit-Arten mit Blueprint decken; Meldung an `workflow summary`/Gate.
- [ ] **Ziel C/D2/D3 (AC3/AC4):** Presenter-Template **definieren** (Core-neutraler Begriff in
      `designbook` — Definition + „wann nötig"-Bindbarkeits-Regel: UI-Patterns-bindbar ⇒ `field-map`
      Config; theme-methoden-only ⇒ `template: presenter` Twig). `data-model/schemas.yml`:
      `template:`-Werte dokumentieren; wo möglich per Enum härten (`feedback_schema_first`).
- [ ] **Ziel E (AC6/AC7):** Presenter-Template-*Wie* als **`designbook-drupal`-Blueprint** (Theme-
      Pfad, Namenskonvention, Feld→Prop/Slot, Forms/Pager/Exposed-Filter); `form-display.md` von
      „vorgeschriebener Weg" entkoppeln; UI-Patterns-Slot-Semantik (`reference-field-semantics.md`)
      unverändert bestätigen.
- [ ] **Ziel D (AC5):** neue **`designbook-drupal`-Data-Model-Rule** „wann ein Block entsteht +
      welcher Typ" (Datenmodell als Quelle; `block_content`/`block_plugin`/inline; `suggests` bleibt
      Hinweis); Ablehnung eines unbestimmbaren Falls als Fehler/Meldung (AC20).
- [ ] **Ziel F (AC8/AC9):** `views.md` um `config_name: 'views.view.*'`-Trigger ergänzen; View-
      `template:`-Wert im `config.view.<id>`-`view_modes`-Eintrag; Rows via UI-Patterns,
      Pager/Exposed-Filter via Presenter-Template.
- [ ] **Ziel D5/AC18:** Config-only-Vertrag in `sync-to/workflows/sync-to.md` +
      `tasks/resolve-filter.md` neu formulieren („Config, plus Presenter-Template wo theme-methoden-
      only"); Kind-Dispatch + Stage-Kette unverändert lassen (AC17).
- [ ] **D9/AC10:** in `views.md`/Spec festhalten, dass der Validator-Fallstrick in DESIGNBOOK-41
      (`5a1530a3`) behoben ist — kein neues Ticket.
- [ ] **Fixtures (AC21/D14):** drupal-web-Cases — (a) Presenter-Template (Form **oder** Pager/
      Exposed-Filter → Twig), (b) `block_content` **und** `block_plugin` in einer Scene, (c) View-
      Template mit UI-Patterns-Bindung, (d) **Verstoß-Case** (Block-Typ unbestimmbar, RED). Muster:
      `sync-verify-scene.yaml`; Scene-Seeds unter `fixtures/drupal-web/<workflow>/`.
- [ ] **Szenario (AC24):** abstraktes `.feature` (Klickpfad: Scene syncen → Drupal-Preview →
      Hauptinhalt/Block/View-Liste dort, wo die Scene sie hat).
- [ ] **Verifikation (AC2/AC19/AC23):** aus diesem Worktree `debo-test run drupal-web <case>`
      (+ `--validate sync-verify`); `workflow summary --json` ans Ticket.
- [ ] **Nicht-Regression (AC12/AC17):** `git diff` shell-scene-constraints unverändert; Config-Case
      (`sync-node`/`sync-view`) grün; Screen-Scene rendert (`$content` ein Injection-Point).
- [ ] **AC16:** `grep` — keine neuen Backend-Codepfade/Drupal-Spezifika im Core.
- [ ] **`pnpm check` (AC22)** bei Addon/TS-Berührung; `designbook-skill-creator`-Konformität grün (AC25).

## 10. Artifacts

- Diese Spec: `.gaia/specs/DESIGNBOOK-42-spec.md` (committed).
- **Editiert (docs, coding):** `sync-to/{SKILL.md, workflows/sync-to.md, tasks/resolve-filter.md,
  tasks/transform.md}`; `sync-to/schemas.yml`/`data-model/schemas.yml` (Template-Werte);
  `designbook-drupal/data-mapping/blueprints/{views.md, form-display.md}`.
- **Neu (docs, coding):** Presenter-Template-Definition + C-Regel (Core `designbook`); Block-Rule +
  Presenter-*Wie*-Blueprint (`designbook-drupal`).
- **Neu (code, coding):** drupal-web-Cases + Scene-Seeds + erzeugtes Presenter-Twig-Artefakt;
  `.feature`-Szenario.
- **Neues Ticket:** G (Shell-Regions), angelegt + verlinkt nach Bestätigung (§7).

## 11. Standards / Domain skills binding

- **`designbook-skill-creator`** — verbindlich vor jedem Editieren von task/rule/blueprint/schemas.yml
  unter `designbook/`/`designbook-drupal/` (CLAUDE.md). Coding lädt es **vor** dem Editieren.
- **`designbook-test`** — Vehikel für den funktionalen + 1:1-Nachweis (`debo-test run …` aus dem
  Worktree, isolierte `workspaces/`).
- **Backend-Neutralität** (CLAUDE.md / `feedback_no_backend_code_in_core`): Kernregeln + neutrale
  Begriffe im Core `designbook/`; Drupal-Spezifika (Block-Rule, Presenter-*Wie*) als Blueprints/
  Rules in `designbook-drupal`. **Keine Migration** (bestehende Scenes/Fixtures/Config wegwerfbar).
