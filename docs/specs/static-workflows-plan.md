# Designbook: Umsetzungsplan für statische Workflows

Abhängigkeit: `static-workflows-spec.md`. Architektur bestätigt; dieser Plan beschreibt die nachfolgende Implementierung.

- [ ] 1. Alle Workflow-/Run-Konsumenten inventarisieren; neues kanonisches YAML-Schema mit Definition und Laufzustand festlegen. Gegenbeispiele für unvollständige Struktur, unbekannte Abhängigkeiten/Zyklen und Runtime-Expansion als Vertragstests vorbereiten.
- [ ] 2. CLI-Discovery als reine Planungshilfe isolieren. Effektive Tasks, Rules, Blueprints, Schemas und Konfigurationsanweisungen liefern; agentengeschriebenes Dokument vollständig validieren/persistieren. Kontextinhalte in die YAML aufnehmen und intern referenzieren.
- [ ] 3. Statischen Run-/Task-Lebenszyklus implementieren. `done`, Ergebnisregistrierung, Dateiausgabe, Validierung, atomare Zustandsupdates, offene Fehler und Wiederaufnahme über die feste Definition führen.
- [ ] 4. Gemeinsame Aufbau-Anleitung und `execute-workflow`-Skill erstellen. Explizite Übergabe per Pfad, Korrekturversuche im bestehenden Task, fortsetzbare Blockaden und Task-Kontext für Subagents dokumentieren.
- [ ] 5. Sämtliche fachlichen Skills in Intakes umwandeln; Templates auf ausführbare Arbeitsschritte reduzieren. Explizit Vision, Data Model, Tokens, Sections/Shape Section/Design Screen und die restlichen Workflow-Skills abdecken. Vorausgesetzte Komponenten-/Zielmengen vollständig im Intake bestimmen.
- [ ] 6. `design-verify`/`sync-verify` in vorgeplante Prüfung und automatisch anschließendes Reparatur-Intake mit vollständiger Issue-Liste aufteilen. Leere Liste, erfolglose Reparatur und Nachprüfung ohne Tasklistenmutation behandeln.
- [ ] 7. Runtime-Task-Expansion, Stage-Resolver mit strukturellem Einfluss, `before`/`after`-Kindworkflow-Erzeugung und zugehörige Zustände/Tests entfernen. Unbenutzte Codepfade und ausschließlich hierfür nötige Abhängigkeiten löschen; keine Kompatibilitätsschicht.
- [ ] 8. `--plan`/`--from-plan` und aktive Aufrufstellen entfernen. GAIA-Spec-/Coding-Prosa, `WORKFLOW.md`, Skill-Architekturregeln und Dokumentation auf den neuen Vertrag umstellen.
- [ ] 9. Storybook-Anzeige, Summary, Tester und Fixtures auf statische YAML umstellen. Meaningful Regressionstests für eingebetteten Kontext, konstante Taskstruktur, Korrektur, Wiederaufnahme und parallele Abschlüsse ergänzen.
- [ ] 10. `static-workflows-test-plan.md` ausführen. `pnpm check` und reale `debo-test`-Läufe aus frischen Test-Workspaces im Implementierungs-Worktree belegen. Architektur-/Code-Review gegen AC01–AC12 durchführen.

Für geschützte Skill-Dateien zuerst `designbook-skill-creator`, für Addon-Code `designbook-addon-skills` laden. Test-Workspaces sind eigenständige Fixtures und keine Git-Worktrees. Alte Artefakte werden nicht repariert oder übernommen.
