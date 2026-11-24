# Designbook: vollständige Workflows vor der Ausführung

Status: Architektur im `matt-skills-curated:grill-me`-Interview bestätigt. Implementierung und Testausführung sind Folgearbeit.

## Problem und Ziel

Designbook konstruiert heute Workflows während ihrer Ausführung. `workflow create` löst Parameter auf und expandiert Tasks; Stage-Ergebnisse liefern weiteren Scope für spätere Expansion. `before`/`after` erzeugen zusätzliche Abläufe. Selbst `--plan` führt einen Teil des Workflows aus. Dadurch vermischen sich fachliche Klärung, Ablaufplanung und Ausführung.

Künftig gilt für ganz Designbook:

`fachlicher Intake → Agent schreibt vollständigen Workflow mit CLI-Hilfe → execute-workflow <pfad>`

Die bestehenden Workflow-Dateien sind ausschließlich Templates. Der Agent schreibt die konkrete Taskliste selbst. Es gibt keinen automatischen Workflow-Compiler, der die bisherige Expansion lediglich vorverlegt. Die CLI liefert passende Bausteine und validiert/persistiert das explizite Dokument.

## Bestätigte Entscheidungen

1. Alle fachlichen Workflow-Skills werden Intakes außerhalb des ausgeführten Workflows. Das gilt ausdrücklich für `vision`, `data-model`, `tokens`, `sections`, `shape-section`, `sample-data`, `design-component`, `design-screen`, `design-entity`, `design-shell`, `design-verify`, `sync-verify`, `sync-to`, `css-generate`, `import` und `install`. `sb` bleibt als bestehender Server-CLI-Passthrough ohne künstlichen Workflow erhalten.
2. „design-section“ bezeichnet in der Unterhaltung die Section-/Screen-Familie; der Umbau umfasst die vorhandenen Skills `sections`, `shape-section` und `design-screen`, ohne allein deshalb einen neuen Alias einzuführen.
3. Intake klärt alle Entscheidungen, welche Taskliste, Zielobjekte, Abhängigkeiten und Regeln bestimmen. Es erzeugt keine Workflow-Tasks, ruft kein `done` auf und zählt nicht zum Ausführungsfortschritt.
4. Jeder Intake-Skill baut den vollständigen Workflow und ruft danach immer `execute-workflow <pfad>` auf. `--plan` und `--from-plan` entfallen vollständig, einschließlich Parser, Dokumentation und aktiver Aufrufstellen.
5. Eine gemeinsame Aufbau-Anleitung beschreibt den Planungsmechanismus. Die einzelnen Skills enthalten ihre fachlichen Fragen, Referenzanalyse, Eingabeaufbereitung und Übergabe. Eine gemeinsame Ausführungs-Skill ist alleiniger Besitzer des Taskloops.
6. Die CLI entdeckt weiterhin passende Templates, Tasks, Rules, Blueprints, Schemas und Projektkonfiguration anhand von Framework/Backend und den bestehenden Integrationsregeln. Sie stellt diese beim Planen bereit; der Agent schreibt die konkreten Tasks.
7. Das generierte YAML enthält die vollständige Taskliste einschließlich aller geltenden Task-Anweisungen, Rules, Blueprints, Konfigurationsanweisungen und Validierungsschemas als Inhalte mit Quellenangaben. Quellenpfade sind Herkunftsnachweise, keine beim Ausführen erneut aufzulösenden Instruktionen.
8. Während der Ausführung gibt es keine erneute Skill-/Template-/Rule-Discovery. Subagents dürfen ihren schon festgelegten Ausschnitt aus dem generierten Workflow gezielt laden. Das erlaubt Kontextportionierung, aber keine neue Regelauswahl und keine Task-Erzeugung.
9. `workflow done` bleibt als Validierungs- und Fortschrittsgrenze erhalten. Es prüft die hinterlegten Abschlussanforderungen und Ergebnisse und aktualisiert die Workflow-YAML. Ergebnisvalidierung und bestehende Dateiausgabe bleiben erhalten, soweit sie ohne Ablaufkonstruktion auskommen.
10. Fehlerhafte Ergebnisse werden durch den ausführenden Agenten innerhalb desselben Tasks zu korrigieren versucht und erneut validiert. Ein Fehlschlag darf nicht als `done` verbucht werden. Bleibt eine konkrete Blockade trotz Korrekturversuch bestehen, bleiben Task und Lauf offen/blockiert und fortsetzbar; keine unbegrenzte Wiederholung ohne neue Handlung oder Erkenntnis.
11. Neu entdeckte Issues werden Ausgabe eines abgeschlossenen Prüfworkflows. Danach übernimmt automatisch ein Reparatur-Intake die vollständige Issue-Liste, plant einen separaten Reparaturworkflow und ruft denselben Executor auf. Bei leerer Issue-Liste entfällt der Reparaturlauf. Es entsteht keine automatische Endlosschleife aus Prüf- und Reparaturläufen.
12. Alte Artefakte sind disposable. Keine Migration, Kompatibilitätsleser, Legacy-Reparaturen oder Unterstützung alter Flags.

## Verträge

### Intake und Templates

Intake darf vorhandene Projektartefakte lesen, Referenzen untersuchen und fachliche Fragen klären. Alle Komponenten, Sections, Entity-/Bundle-Ziele und anderen vervielfachenden Eingaben müssen vor dem Start aufgelistet sein. Bei `vision` findet das Produktgespräch vollständig hier statt; bei `data-model` werden Modellierungsentscheidungen hier getroffen. Ein Workflow erzeugt danach die daraus bestimmten Artefakte.

Templates beschreiben die ausführbaren Arbeitsschritte als Vorlage. Sie enthalten keine Intake-Stages. Fachliche Intake-Anweisungen werden in den jeweiligen Skill verlagert; gemeinsam genutzte Planungsmechanik wird nicht pro Skill dupliziert. Wiederholbare Template-Schritte sind Hinweise an den planenden Agenten, keine vom Executor interpretierbare `each`-DSL. Bedingte Vorarbeiten wie CSS-Erzeugung werden vorab entschieden und als konkrete Tasks eingeplant. Verbliebene Abhängigkeiten zwischen mehreren Workflows müssen vor deren jeweiligem Start vollständig geplant sein; Laufzeit-Hooks werden entfernt.

### Generiertes YAML

Ein neuer, kanonischer Vertrag trennt unveränderliche Definition und veränderlichen Laufzustand in derselben YAML:

- Workflow-Identität und Template-Herkunft; vollständig bestimmte strukturelle Eingaben.
- Stabile, eindeutige Task-IDs, Titel, Zielobjekte, Reihenfolge/`depends_on` und konkrete Task-Parameter.
- Eingebetteter Task-Text, Rules, Blueprints und Konfigurationsanweisungen; gemeinsame Inhalte dürfen einmal innerhalb der YAML stehen und intern referenziert werden.
- Eingebettete Ergebnis-/Abschlussschemas, deklarierte Ausgaben, Zielpfade und Validatoren. Bestehende Validator-Implementierungen werden weiterhin als Code ausgeführt; das ist keine dynamische Auswahl fachlicher Regeln.
- Explizite Datenbezüge auf Ergebnisse bekannter Vorgänger sind erlaubt. Sie dürfen nicht Task-Anzahl, Zielobjekte, Abhängigkeiten oder Regelzuordnung bestimmen. Dadurch bleibt etwa ein späterer Task auf ein vorher erzeugtes Artefakt bezogen, ohne neue Aufgaben zu entdecken.
- Laufzustand mit Taskstatus, Ergebnissen, Validierungsbefunden, Zeitpunkten, Korrektur-/Blockadeinformation und Workflowstatus.

Die konkreten Feldnamen werden im kanonischen Schema einheitlich definiert; diese Spec verlangt keine zusätzliche universelle Ausdruckssprache. Bestehende Datenzugriffe nur erhalten, soweit sie für statisch deklarierte Ergebnisbezüge erforderlich sind.

Vor Ausführungsbeginn validiert die CLI Vollständigkeit, eindeutige IDs, existierende Abhängigkeiten, Zyklenfreiheit, gültige interne Kontextreferenzen, strukturelle Pflichtparameter und vollständige Abschlussverträge. Ungültige oder unvollständige Dokumente starten keine Tasks. Discovery/Ergebnisse dürfen keine fehlende Struktur nachträglich auffüllen.

### CLI und Executor

Die vorhandene CLI wird auf drei Verantwortungen reduziert:

1. Planung unterstützen: relevante Bausteine und effektive Konfiguration anzeigen; agentengeschriebenes Dokument validieren und speichern. Keine Taskliste generieren.
2. Ausführung begleiten: den fertigen Workflow beziehungsweise einen Task-Ausschnitt lesen, vorhandene Tasks starten/fortsetzen und Laufzustand führen.
3. Abschluss prüfen: `done` und erforderliche Ergebnis-/Dateihilfen validieren und persistieren ausschließlich Ergebnisse und Zustand der feststehenden Tasks.

`execute-workflow <pfad>` ist ein Skill-Aufruf, kein zusätzlicher autonomer CLI-Workflow-Generator. Der Skill lädt die fertige Definition, arbeitet die bekannten Abhängigkeiten ab, delegiert bei Bedarf vorhandene Tasks an Subagents, behandelt Korrekturen und ruft die CLI zum Validieren/Persistieren auf. Normales Lesen von Projektcode, Eingabeartefakten und Task-Ergebnissen bleibt möglich.

`done` fügt keine Tasks hinzu, entfernt keine Tasks, selektiert keine Regeln, startet keinen Folgeworkflow und führt keine Stage-Expansion durch. Bei fehlgeschlagener Validierung bleibt der Task offen; bei Erfolg werden Fortschritt und Ergebnisse gespeichert. Wiederaufnahme verwendet dasselbe Dokument und dieselbe Definition. Bei parallelen Taskabschlüssen darf kein Update verloren gehen; vorhandene atomare/gesperrte Schreibmechanismen wiederverwenden.

### Prüfung und Reparatur

Beispiel: Der Intake von `design-verify` kennt Story und Referenz und plant die Prüfung. Der Prüfworkflow erfasst und vergleicht das tatsächliche Render und liefert die vollständige Issue-Liste. Erst nach dessen Ende plant das Reparatur-Intake aus diesen Issues konkrete Korrektur-Tasks. Eine Nachprüfung kann vorab Teil dieses Reparaturworkflows sein. Ihre Befunde verändern dessen Taskliste nicht. Verbleibende Issues werden berichtet und benötigen gegebenenfalls einen weiteren separat geplanten Auftrag.

Dieselbe Trennung gilt für `sync-verify` und alle vergleichbaren Abläufe. Sie ist von der unmittelbaren Korrektur eines ungültigen Task-Ergebnisses vor `done` zu unterscheiden.

### GAIA und bestehende Konsumenten

Alle aktiven Aufrufe und Prosa zu `--plan`/`--from-plan` im Repository werden angepasst, insbesondere `designbook-gaia` und `WORKFLOW.md`. Eine GAIA-Spec beschreibt die beabsichtigte Arbeit ohne Aufruf eines nun sofort ausführenden Intake-Skills; GAIA-Coding ruft den passenden Intake-Skill mit der spezifizierten fachlichen Aufgabe auf. Es wird kein verdecktes Ersatz-Flag zum Planen eingeführt. Die fachliche Scope-Beschreibung darf als Intake-Eingabe dienen; der Executor nutzt ausschließlich den daraus generierten Workflow.

Storybook-Fortschrittsanzeige, Summary, Tester und Auswertungen lesen den neuen statischen Vertrag. Historische Specs bleiben historische Dokumente; sie werden nicht als aktive Aufrufstellen umgeschrieben.

## Betroffene Implementierungsflächen

- `packages/storybook-addon-designbook/src/workflow.ts`: `expandTasksFromParams`, Stage-Neuexpansion, `awaiting-after`, Kindworkflow-Erzeugung und Kaskaden entfernen; statische Zustands-/Ergebnispersistenz erhalten.
- `src/cli/workflow.ts`, `src/cli/workflow-discovery.ts`, `src/workflow-resolve.ts`: Discovery als Planungshilfe abgrenzen, Runtime-Resolver/Expansion entfernen; Schema- und Rule-Auflösung ausschließlich beim Zusammenbauen.
- `src/workflow-types.ts`, `src/workflow-lifecycle.ts`, Ergebnisvalidatoren, Summary und Konsumenten des bisherigen `stage_loaded`/`step_resolved`-Formats auf den neuen Vertrag umstellen.
- `.agents/skills/designbook/skills/*`, gemeinsame Ressourcen, Templates und Integrationen unter `.agents/skills/designbook-*`: Intake/Planung/Execution trennen; neue gemeinsame Aufbau-Anleitung und `execute-workflow`-Skill.
- `.agents/skills/designbook-skill-creator/`: Architekturregeln und Beispiele anpassen, soweit sie das bisherige Workflow-/Intake-Modell vorschreiben.
- `.agents/skills/designbook-test/`, `fixtures/*/cases/`, aktive GAIA-Prosa und Projektdokumentation aktualisieren.

Vor Änderungen an geschützten Skill-Dateien `designbook-skill-creator` laden; für Addon-TypeScript `designbook-addon-skills` verwenden. Änderungen nur an kanonischen `.agents/skills/`-Quellen.

## Akzeptanzkriterien

- AC01: Alle genannten Workflow-Skills einschließlich Vision, Data Model und Sections verwenden denselben Intake → vollständiger Workflow → Executor-Vertrag. Intake erscheint in keinem Run als Task/Stage.
- AC02: Der Agent schreibt alle konkreten Tasks; die CLI liefert passende Framework-/Backend-Bausteine, validiert und persistiert, expandiert aber keine Tasklisten.
- AC03: Der Run startet ausschließlich aus einem vollständigen YAML-Dokument mit feststehenden Task-IDs, Zielen, Abhängigkeiten und Regeln. Unvollständige Struktur wird vor Start abgewiesen.
- AC04: Task-Anweisungen, Regeln, Blueprints, Konfigurationsanweisungen und Schemas sind eingebettet. Änderungen an Skill-Quelldateien nach Planung beeinflussen den Run nicht.
- AC05: Subagents können gespeicherte Task-Kontexte gezielt laden, ohne neue Discovery oder Änderungen an der Definition.
- AC06: `--plan` und `--from-plan` existieren in aktiven APIs/Skills/Konsumenten nicht mehr. Jeder Intake übergibt nach erfolgreicher Erstellung automatisch den Pfad an `execute-workflow`.
- AC07: `done` validiert die hinterlegten Anforderungen und aktualisiert YAML-Ergebnisse/-Status. Fehler lassen den Task offen; ein korrigiertes Ergebnis kann denselben Task erfolgreich abschließen.
- AC08: Taskliste, Zielobjekte, Abhängigkeiten und Regeln bleiben während `done`, Ergebnisregistrierung, Wiederaufnahme und Fehlerbehandlung identisch. Kein Runtime-`each`, Stage-Expansion oder `before`/`after`-Workflow-Aufbau verbleibt.
- AC09: Nicht erfolgreich korrigierbare Fehler werden mit Fehler- und Versuchsinformation als fortsetzbare Blockade gespeichert. Keine falsche Fertigmeldung oder endlose identische Wiederholung.
- AC10: Prüfungsbefunde erzeugen keine Reparatur-Tasks im laufenden Prüfworkflow. Die vollständige Issue-Liste wird automatisch an ein separates Reparatur-Intake übergeben; bei leerer Liste kein Reparaturworkflow.
- AC11: Ergebnisbezüge zwischen bekannten Tasks, Dateiausgabe, Validatoren, Fortschrittsanzeige und Wiederaufnahme funktionieren mit dem statischen Vertrag. Gleichzeitige Abschlüsse verlieren keine Updates.
- AC12: GAIA-Aufrufe, Tester, Architekturregeln und Dokumentation sind konsistent; es gibt keine Ersatz-Planungsflags und keine Unterstützung/Migration alter Laufartefakte.

## Verifikation und Grenzen

Die Architektur wurde im Interview bestätigt, einschließlich der expliziten Ausweitung auf Data Model und Vision. Der konkrete Umsetzungs-/Testplan liegt separat zur Review vor. Diese Spezifikationsarbeit führt keine Produktänderung aus und behauptet keine bestandenen zukünftigen Akzeptanztests.
