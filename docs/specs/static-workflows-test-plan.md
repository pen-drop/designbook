# Designbook: Testplan für statische Workflows

Status: konkreter Testplan zur Review; noch nicht separat vom Nutzer bestätigt. Architektur und Scope sind bestätigt. Vor Coding Testplan bestätigen lassen; keine Tests oder Testresultate durch diese Spezifikationsarbeit vorwegnehmen.

## 1. CLI-/Schema-/Lebenszyklus-Vertrag

- Typ: Unit- und CLI-Vertragstests mit Vitest, Typecheck und Lint.
- Befehl: `pnpm check` im Implementierungs-Worktree.
- Begründung: Vollständigkeit und Unveränderlichkeit der Definition sowie `done`/Resume/Ergebnisvalidierung sind maschinelle Verträge; diese Grenze lässt sich gezielt ohne Modellvariabilität testen.
- Fälle: ungültige IDs/Abhängigkeiten/Zyklen, fehlender Kontext/strukturelle Eingaben; statische spätere Ergebnisbezüge; nachträglich geänderte Rule-Dateien; abgelehnte Ergebnisse und erfolgreiche Korrektur desselben Tasks; blockiert/Resume; parallel abgeschlossene vorhandene Tasks; keine Aufrufe von Runtime-Discovery und keine Änderung an Taskmenge/Zielen/Regeln; alte Flags nicht mehr angeboten/akzeptiert.
- Erwartung: Neue Vertragsfälle schlagen gegen das bisherige dynamische Modell fehl und bestehen mit dem statischen Modell. Gesamtes `pnpm check` grün. Keine Schema-/Format-Migrationstests schreiben.
- Kriterien: AC02–AC09, AC11–AC12.

## 2. Fachliche Integration über den offiziellen Tester

Typ: reale Agent-/CLI-/Storybook-Integration über den `debo-test`-Skill. Jeden Fall aus einem frischen Test-Workspace ausführen; Tester aus dem ticketbezogenen Implementierungs-Worktree starten. Vorher die bestehenden Fixtures an das neue Modell anpassen. Die folgenden Angaben sind Skill-Aufrufe, keine erfundenen Shell-Binaries:

| Skill-Aufruf | Beobachtung und Zweck |
| --- | --- |
| `debo-test run drupal-petshop vision` | Vollständiger Vision-Intake vor dem Run, Vision-Artefakt entsteht, keine Intake-Task, identische Taskdefinition vor/nach Ausführung. |
| `debo-test run drupal-petshop data-model` | Modellentscheidungen vor dem Run, passende Drupal-Regeln eingebettet, gültiges Data Model; keine Laufzeit-Expansion. |
| `debo-test run drupal-petshop tokens` | Token-Intake/-Artefakte erfüllen denselben Vertrag. |
| `debo-test run drupal-petshop sections` | Vollständige Section-Liste vor Start; Taskanzahl und Zielmengen unverändert. |
| `debo-test run drupal-petshop design-screen` | Screen-/Komponentenziele vorher bekannt; Render/Artefakte und eingebetteter Kontext korrekt. |
| `debo-test run drupal-petshop design-component` | Automatische Pfadübergabe an Executor; Component-Artefakte und Runabschluss korrekt. |
| `debo-test run drupal-stitch design-verify-screen-homepage` | Prüfworkflow liefert Issues; eigener, danach vollständig geplanter Reparaturlauf; keine Tasks nachträglich im Prüflauf. |

- Die Verify-Fixture muss gezielt mindestens ein reproduzierbares Issue erzeugen; ein zufällig fehlerfreier Render belegt den Reparaturvertrag nicht. Ergänzende Fälle für leere Issue-Liste und nicht erfolgreich korrigierbaren Task sind bei der Implementierung als Fixture/Vertragstest anzulegen.
- Erwartung: Artefaktprüfungen bestehen, jeder Lauf startet vollständig, alle Definitionen bleiben während Ausführung konstant; Reparaturlauf bekommt die gesamte Issue-Liste vor Start. Summary und Fortschrittsanzeige lesen korrekt aus dem neuen Vertrag.
- Kriterien: AC01–AC12, insbesondere ausdrückliche Abdeckung von Vision und Data Model.
- `scenario_required: true`: Storybook-Render und Workflow-Fortschritt über diese offizielle Tester-/Browser-Strecke verifizieren; keine zusätzliche universelle BDD-Infrastruktur einführen.

## 3. Architektur- und Konsumentenprüfung

- Typ: gezielte Quelltext-/Dokumentationsprüfung und Diff-Review.
- Pfad: aktive `.agents/skills/designbook*/`, `packages/storybook-addon-designbook/src/`, `fixtures/`, `WORKFLOW.md` und aktive CLI-Dokumentation.
- Erwartung: Kein Ausführungspfad expandiert Tasks oder entdeckt neue Rules. Keine aktiven `--plan`-/`--from-plan`-Aufrufe; keine Intake-Stages in Templates/Runs. Historische Spezifikationen sind von der Textsuche auszunehmen. `sb` bleibt Passthrough.
- Kriterien: AC01–AC06, AC08, AC12.

## Evidenz und Bestätigung

Für jede Prüfung dauerhaft festhalten: genauer Befehl/Skill-Aufruf, beobachtetes Ergebnis, geprüfter Commit. Tester-Summaries und relevante Render-/Fehlerbelege im Ticket verlinken. Bis zur tatsächlichen Ausführung sind alle AC-Prüfungen offen; die Zustimmung zur Architektur ist kein bestandener Test.

Confirmation: ausstehend für diesen konkreten Testplan; vor Coding einzuholen.
