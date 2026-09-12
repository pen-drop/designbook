# Refaktor Workflow Engine — Spec (DESIGNBOOK-59)

## Ziel und Kontext

DESIGNBOOK-59 (gaia_feature, work:code) ist Folgearbeit zu DESIGNBOOK-56 (Trennung fachlicher Intake / statische Ausführungsdefinition) und DESIGNBOOK-58 (Discovery-Katalog + CLI-Capture-Pfad). Ziel ist ein konsistenter Engine-Vertrag für die vier Verantwortlichkeiten Discovery, Intake/Planung, Definition und Ausführung — mit der CLI als einheitlichem Zugang. Die fachliche Taskliste bleibt agentengeschrieben und steht vor der Ausführung fest.

## Ausgangslage

Alle Pfade unter `packages/storybook-addon-designbook/`. Es gibt kein separates conductor-Paket.

### Zwei-Hälften-Architektur

- **Planungs-Hälfte** (Discovery → Katalog → Create): `cli/workflow.ts`, `workflow-resolve.ts`, `planning-sources.ts`, `planning-schema.ts`, `schema-block.ts`, `workflow-schema-merge.ts`, `planning-contracts.ts`. `workflow discover <id>` (`cli/workflow.ts:44-90`) resolved Stages, embedded die Datei-Bytes jeder gematchten Task/Rule/Blueprint und emittiert Katalog-JSON. `workflow create` schreibt ein YAML-Definitionsdokument; `workflow validate` prüft Katalog-Fidelity (`validateCatalogueDefinition`, `workflow-document.ts:446`).
- **Ausführungs-Hälfte** (steps/instructions/start/done/block/summary): `workflow-store.ts`, `workflow-steps.ts`, `workflow-document.ts`. Liest ausschließlich das gespeicherte Dokument, nie Discovery. `definition_digest` (SHA-256) friert die Definition ein (`validateDocument`, `workflow-document.ts:583`).

Gespeicherte Definition heute: YAML `tasks.yml` unter `$DESIGNBOOK_DATA/workflows/changes/<run-id>/tasks.yml`. `WorkflowDocument = { definition, state }` (`workflow-document.ts:86`); `definition.context` ist eine flache Registry eingebetteter Datei-Bodies (dedupliziert); `TaskDefinition` trägt `outputs` mit Schema/Validators/Submission.

### Matching-Semantik

Zwei Namespaces (`planning-sources.ts:200-265`):

- `trigger:` (WHEN; Keys `steps`, `domain`) — OR-verknüpft, **strikt**: undefinierter Kontext matcht NICHT.
- `filter:` (WHERE; Keys `backend`, `frameworks.*`, `extensions`, `type`) — AND-verknüpft, **deferring**: undefiniert matcht.

### Intake-Zustand nach DESIGNBOOK-56

Intake existiert nur als Planungs-Prosa (`skills/<wf>/resources/intake.md`) plus Metadaten-Assoziationen. Es gibt keine ausführbaren Intake-Tasks und keine intake-Stage in Templates. Die Assoziationen:

- `trigger.steps: [<wf>:intake]` in `designbook/design/blueprints/static-assets.md:5`, `designbook/design/rules/entity-reference-rendering.md:3`, `designbook-css-tailwind/blueprints/css-naming.md:6` (Tokens: `tokens:intake`)
- `trigger.domain: design.intake` in `designbook-stitch/rules/stitch-import.md:3` und `provide-stitch-url.md:4`

### Der Bruch

`workflow discover` resolved nur die Ausführungs-Stages des Templates; kein Template hat eine intake-Stage. Der Matcher matcht `<wf>:intake` daher NIE beim Planen — Intake-getaggte Regeln werden erst zur Ausführungszeit ihres jeweiligen Execution-Steps geliefert. Die CLI liefert dem Intake-Planer heute keinen aufgelösten Intake-Regelsatz; Agenten müssen Skill-Links manuell ableiten.

### Mixed-Responsibility-Regeln

Planung und Ausführung sind vermischt in `designbook/design/rules/website-capture-observations.md` und `storybook-capture-observations.md` (Trigger auf Execution-Step `observe-*`, Body dominiert von Intake-/Planungsinhalt) sowie — mit kleinerer Überlappung — `designbook/design/rules/playwright-validate.md`.

### Autoritätsspec fürs Authoring

`designbook-skill-creator` (`rules/task-files.md`, `rule-files.md`, `blueprint-files.md`, `schema-files.md`, `workflow-files.md`, `common-rules.md`, `writing-files.md`). WHAT-vs-HOW: Tasks = WAS (outputs/params/deps), Blueprints = überschreibbares WIE, Rules = harte Invarianten; Rules/Blueprints dürfen keine `params:` deklarieren; `schemas.yml` ist single source of truth (Task-Results referenzieren via `$ref`).

## Zielarchitektur

Neue Pipeline mit vier klar getrennten Verantwortlichkeiten:

1. **Intake (Planung)**: ein Intake-Skill pro Workflow. Erste Aktion ist das neue CLI-Kommando `intake <workflow>`, das den aufgelösten Intake-Kontext liefert. Der Skill trifft strukturelle Entscheidungen, löst offene Auswahlwerte auf und schreibt den MD-Plan.
2. **Definition = MD-Plan** (kein YAML `tasks.yml` mehr): selbst-enthaltenes Markdown mit Checkbox-Tasks, pro Task einem eingefrorenen Output-Contract (Schema + Validators als fenced-Block, aus der Task-Datei kopiert), eingebettetem Pflicht-Kontext, aufgelösten Params/Targets/Instructions und einem Results-Block, den `done` füllt. Der Run-State lebt im MD-Plan (Checkboxen + Results-Blöcke), kein Sidecar.
3. **Ausführung**: ein Executor ohne Intake-Skill liest den Plan und ruft `workflow done` je Task. Keine neue Discovery, keine Ablaufkonstruktion.
4. **CLI = Leser + Validator**: die Matching-/Katalog-/Merge-/Create-Logik verlässt die CLI.

Datenfluss:

```
Skill-Quellen (tasks/rules/blueprints/schemas.yml)
        │
        │  intake <workflow>          (config-gefilterter, aufgelöster Kontext)
        ▼
Intake-Kontext ──► Intake-Skill ──► MD-Plan (eingefrorene Contracts,
   (Rules/Blueprints,  (Entscheidungen,     eingebetteter Kontext,
    Task-Palette,       Auswahl auflösen,   Checkbox-Tasks, Results-Blöcke,
    kanonischer Inhalt) Plan schreiben)     Plan-Digest)
                                              │
                                              │  Executor (ohne Intake-Skill)
                                              ▼
                              workflow done <plan> --task X --data-file r.json
                                              │  (validiert nur gegen den
                                              │   eingebetteten Contract)
                                              ▼
                              Run-State im Plan (Checkboxen + Results)
```

`reference`/`capture`-Kommandos bleiben bestehen — sie sind echte Beobachtungs-IO für `extract-reference`, keine Planungslogik.

## Der intake-CLI-Vertrag (AC-2, AC-4)

`intake <workflow>` liest und liefert für den config-gefilterten Kontext:

- **(a) Intake-Rules und -Blueprints**: getaggt via `trigger.steps: [<wf>:intake]` bzw. `trigger.domain: design.intake`. Die bestehenden Metadaten werden jetzt aufgelöst statt ignoriert; die Domain-Zuordnung bleibt semantisch abgedeckt.
- **(b) Task-Palette**: die Task-Contracts, die der Intake-Skill in den Plan einfriert. Es entstehen KEINE neuen ausführbaren Intake-Tasks.
- **(c) Kanonischer Inhalt eingebettet** plus Herkunft (`source`) plus expliziter, geordneter Leseauftrag vor abhängigen Entscheidungen.

Die Skill-Datei bleibt die einzige gepflegte Quelle; die Einbettung ist maschinell abgeleitet, keine zweite gepflegte Kopie. Für identischen aufgelösten Kontext ist die Ausgabe reproduzierbar.

## Offener Kontext und Gating (AC-3)

`intake` weist offene Selektoren (z. B. `source = website/figma/storybook` bei `extract-reference`) explizit als OFFEN aus. Regeln und Tasks, die von einem unaufgelösten trigger-/filter-Wert abhängen, kommen gegated bzw. konditional gruppiert zurück — nie flach in einen vermeintlich vollständigen Satz gemischt. Der Intake muss die Auswahl auflösen, bevor er abhängige Tasks einfriert.

Die strikte trigger- / deferring-filter-Semantik bleibt der Sicherheitshebel: offener Kontext darf keinen irreführend vollständigen Regelsatz ergeben.

## MD-Plan-Format und done-Validierung (AC-5, AC-6)

`workflow done <plan> --task X --data-file r.json` validiert das Ergebnis ausschließlich gegen den im Plan eingebetteten Contract und führt die deklarierten Datei-Validators aus. Kein Skill-Re-Read. Der Plan-Digest friert die Definition ein.

**Autonomie-Vertrag (AC-5):** der Plan muss ohne Intake-Skill autonom ausführbar sein. Fehlt eine Pflichtregel oder ein gefordertes Planungsergebnis, ist der Plan unvollständig/ungültig und wird von `done` bzw. einem Plan-Validate abgewiesen — mit Quelle und fehlender Pflicht. Ein bloßes „gelesen“-Flag zählt nicht als Erfüllungsnachweis.

### Kontext pro Step, Wiederholung per Referenz

Kontext ist **pro Step** gebunden, nicht pro Task inline dupliziert. Der Plan trägt zwei plan-weite Registries, aus denen die Steps per Referenz schöpfen:

- **`## Context`** — jede Rule/jedes Blueprint einmalig unter einem stabilen, source-abgeleiteten Key mit Herkunft. Jeder Step deklariert `Context: [key, …]` als reine Referenzen. Eine Rule, die in mehreren Steps gilt, steht **einmal** in der Registry und wird pro Step referenziert; kein Duplikat. Das entspricht dem Dedup-Modell der alten `definition.context`-Registry.
- **`## Schemas`** — ein `definitions:`-Block, in den der Intake alle benötigten Typen aus `schemas.yml` einmalig einfriert (transitiv aufgelöste `#/definitions/<Name>`). Jeder Task-Contract referenziert per `$ref: '#/definitions/<Name>'`, nie inline dupliziert. `workflow done` kompiliert die `definitions`-Registry einmal in AJV und validiert gegen das `$ref`-aufgelöste Schema.

Beispiel-Skelett eines MD-Plans:

~~~markdown
# Plan: design-component
<!-- digest: <sha256 über workflow + definitions + context + steps (ohne results)> -->

## Schemas
```yaml
definitions:
  ComponentResult:
    type: object
    required: [id]
    properties: { id: { type: string } }
```

## Context
### ctx:entity-reference-rendering (source: /abs/.../rules/entity-reference-rendering.md)
<eingebetteter kanonischer Body>

### ctx:static-assets (source: /abs/.../blueprints/static-assets.md)
<eingebetteter kanonischer Body>

## Steps

### Step: component
Context: [ctx:entity-reference-rendering, ctx:static-assets]

- [ ] create-component — pet-card

  #### Params
  component_id: pet-card
  target: components/pet-card/

  #### Contract
  ```yaml
  outputs:
    component:
      required: true
      submission: data
      schema: { $ref: '#/definitions/ComponentResult' }
      validators: [component]
  ```

  #### Results
  <!-- von `workflow done` gefüllt -->
~~~

Checkbox-Status und Results-Block bilden den Run-State; es gibt kein Sidecar-Dokument.

## CLI- und Schema-Verträge (was bleibt, was entfällt)

Bleibt:

- Ausführungskommandos gegen den MD-Plan, insbesondere `workflow done` mit Contract-Validierung und Digest-Prüfung.
- `reference`/`capture`-Kommandos (Beobachtungs-IO für `extract-reference`).
- Die trigger-/filter-Matching-Semantik als Grundlage der `intake`-Auflösung.
- `schemas.yml` als single source of truth; Task-Contracts werden daraus in den Plan eingefroren.

Neu:

- `intake <workflow>` als einziger Discovery-Zugang für die Planung.

Entfällt:

- Der discover/create/validate-Katalogpfad, `planning-contracts`, YAML-Definition-Writer/-Reader und der Katalog-Merge. Die Matching-/Katalog-/Merge-/Create-Logik verlässt die CLI; die zugehörigen TS-Module werden entfernt.

## Addon/Panel-Vereinfachung

Das Panel wird auf reine Log-Ausgabe reduziert: keine Tabs, keine Katalog- oder Definition-UI. Die obsoleten TS-Module (discover/create/validate-Katalogpfad, `planning-contracts`, YAML-Definition-Writer/-Reader, Katalog-Merge) werden gelöscht.

## Skill-Authoring-Auswirkungen

Alle Skill-Dateiänderungen folgen `designbook-skill-creator` (inkl. `common-rules.md`, `writing-files.md`) und `writing-for-agents`: Tasks = WAS, Blueprints = überschreibbares WIE, Rules = harte Invarianten; keine `params:` in Rules/Blueprints; Schemas via `$ref` aus `schemas.yml`.

Mixed-Responsibility ordnen: die Capture-Planungsinhalte aus `website-capture-observations.md` und `storybook-capture-observations.md` gehören in den Intake-Kontext (Planung); die Ausführungskommandos bleiben Execution-Rule. Website-/Storybook-Capture sind Prüfbeispiele, keine Beschränkung — `design-component`, weitere Design-Workflows, Tokens und die Integrationen werden ebenso berücksichtigt.

## Repräsentative frische Fälle (AC-7)

Vier Fälle, jeweils mit frischem Fixture-Workspace via `designbook-test`:

1. `design-component`
2. `extract-reference`
3. `tokens`
4. `css-tailwind` (Integrationsfall; rein Storybook, kein DDEV — schnellster grüner Nachweis)

Nachweis je Fall: `intake` erzeugt einen gültigen MD-Plan → der Executor führt ihn via `workflow done` aus → die Outputs validieren → `pnpm check` grün.

## Testplan

- **Unit/Vitest**: intake-Matching passend/unpassend über Workflow × Phase × Source × Backend/Framework × Integration; offener Selektor ⇒ gegateter, nicht-vollständiger Satz; `done` validiert gegen den eingefrorenen Contract; Plan-Digest-Immutabilität / keine Re-Discovery.
- **Contract**: `<wf>:intake` / `design.intake` bleiben semantisch aufgelöst; die Domain-Zuordnung ist abgedeckt.
- **debo-test**: die vier frischen Fälle end-to-end; `pnpm check` grün.

## Nicht-Ziele

- Die zwei bekannten Schema-Create-Pfad-Bugs (`collectedSchemas` wird nach dem Merge nie zurückgeschrieben; toter `widenDefinitionEnums`) werden in diesem Ticket nicht gefixt — sie kommen als Folgearbeit.
- Keine Migration (AC-8): alte YAML-Definitionen, Katalog und `planning-contracts` werden gelöscht, nicht migriert. Skills und Fixtures werden direkt auf den MD-Plan-Vertrag umgestellt. On-Disk-Artefakte sind disposable.

## Akzeptanzkriterien

- **AC-1**: „Spec beschreibt Verantwortlichkeiten und Datenfluss für Discovery, Intake/Planung, Definition und Ausführung sowie die CLI-/Schema-Verträge.“ — Erfüllt durch die Abschnitte Zielarchitektur (Pipeline + Datenflussdiagramm) und CLI- und Schema-Verträge.
- **AC-2**: „CLI liefert Intake-Regeln und -Blueprints gezielt und vollständig für einen aufgelösten Kontext; bestehende workflowqualifizierte Intake-Zuordnungen und die Domain-Zuordnung bleiben semantisch abgedeckt, ohne ausführbare Intake-Tasks.“ — Erfüllt durch den intake-CLI-Vertrag: `<wf>:intake`- und `design.intake`-Metadaten werden aufgelöst, die Task-Palette ersetzt ausführbare Intake-Tasks.
- **AC-3**: „Tests belegen passende und unpassende Kombinationen von Workflow, Phase, Quelle, Backend/Framework und Integration; offener Kontext ergibt keinen irreführend vollständigen Regelsatz.“ — Erfüllt durch Offener Kontext und Gating plus die Unit-/Vitest-Matrix im Testplan.
- **AC-4**: „Pflichtinhalte und Herkunft stammen aus kanonischen Quellen, vollständig bereitgestellt; expliziter Leseauftrag vor abhängigen Planungsentscheidungen.“ — Erfüllt durch Punkt (c) des intake-CLI-Vertrags: kanonischer Inhalt eingebettet, `source`-Herkunft, geordneter Leseauftrag; Skill-Datei bleibt einzige gepflegte Quelle.
- **AC-5**: „fehlende Pflichtregeln bzw. geforderte Planungsergebnisse werden im Validierungs-/Review-Verfahren mit Quelle und fehlender Pflicht gemeldet; gelesen-Flag zählt nicht.“ — Erfüllt durch den Autonomie-Vertrag: `done` bzw. Plan-Validate weisen unvollständige Pläne mit Quelle und fehlender Pflicht ab.
- **AC-6**: „gespeicherter Ausführungskontext bleibt unverändert; Ausführung betreibt keine neue Discovery oder Ablaufkonstruktion; Tests sichern den Vertrag.“ — Erfüllt durch MD-Plan-Format und done-Validierung: Plan-Digest, Validierung nur gegen den eingebetteten Contract, Executor ohne Discovery; abgesichert im Testplan.
- **AC-7**: „repräsentative frische Fälle decken mindestens design-component, extract-reference, tokens und einen konfigurierten Integrationsfall ab; pnpm check grün.“ — Erfüllt durch die vier frischen Fälle (mit `css-tailwind` als Integrationsfall) und deren Nachweisdefinition.
- **AC-8**: „keine Migration, Kompatibilitätsleser oder Reparaturen alter Artefakte; Writer, Reader, Skills und Fixtures verwenden den neuen Vertrag direkt.“ — Erfüllt durch die Nicht-Ziele: alte Artefakte werden gelöscht, Writer/Reader/Skills/Fixtures direkt umgestellt.
