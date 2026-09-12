# Plan: Workflow-Effizienz mit belegbarer Einzelwirkung

Ticket: [DESIGNBOOK-58](https://gaia.keytec.de/admin/gaia/ticket/892).
Status: Gesamtvertrag im grill-me-Interview bestätigt am 2026-09-07.
Gehört zu `workflow-efficiency-spec.md` und zum Optimierungs-Subticket von
DESIGNBOOK-56. Dieser Plan beschreibt noch nicht ausgeführte Arbeit.

- [ ] 1. Messbasis einfrieren. Aktuellen Commit, Modell-IDs und CLI-Versionen,
  Reasoning, Referenz und Inputs für drupal-web/design-shell dokumentieren.
  Bestehende Befehle und Result-Metriken inventarisieren. Unabhängige
  design-entity-/design-screen-Fälle mit geeigneten Referenzen bestimmen;
  fehlende Fixtures vor dem Einfrieren ergänzen. Modellvarianten nicht während
  einer Messreihe wechseln. Unique Workspace, Report-Pfad und Storybook-Port je
  parallelem Lauf; eine Stunde Timeout je CLI-Aufruf.
- [ ] 2. Messrahmen absichern. Native Mehrturn- und Subagent-Usage gegen Logs
  prüfen; den erfolgreichen Grok-Headless-Smoke-Test zu einem Promptfoo-Adapter
  mit belegter Fehler- und Usage-Behandlung ausbauen. Bestehende Codex-/Claude-
  Provider wiederverwenden. Score-Schema, Referenzintegrität und fehlende
  Messwerte mit aussagekräftigen negativen Fällen prüfen. Jede Runner-/Scorer-
  Änderung separat erfassen; anschließend neue Baseline.
- [ ] 3. Korrektheit vor Effizienz herstellen. Fehlende Task-Instruktionen,
  falsche Bild-Output-Verträge und ungültige Verify-Berichte diagnostizieren und
  beheben. Footer- und sonstige Renderprobleme über generalisierbare Skill-/CLI-
  Korrekturen bearbeiten, nicht durch Senken der Schwellen oder Austauschen der
  Referenz. Mindestens drei erfolgreiche frische Codex-Baseline-Läufe pro Fall
  erfassen; alle fehlgeschlagenen Vorversuche bleiben in der Historie.
- [ ] 4. Discovery-Wiederholung isoliert reduzieren. Katalog einmal speichern
  und gezielt lesen, ohne benötigtes Material auszulassen. Hypothese und
  Einzelpatch dokumentieren, über Codex/Promptfoo plus Verify messen und nach
  Qualitätsgates behalten oder verwerfen.
- [ ] 5. Gemeinsame eingebettete Inhalte isoliert deduplizieren. Vorhandene
  interne Kontext-/Schema-Referenzen nutzen; nur bei belegter Lücke den
  kanonischen Vertrag erweitern. Vollständigkeit, Herkunft, Referenzauflösung
  und unveränderte Ausführungssemantik testen. YAML-Größe und tatsächlich ans
  Modell ausgegebene Inhalte getrennt messen.
- [ ] 6. Kontextausgabe isoliert reduzieren. Taskbezogene instructions und
  knappe CLI-Bestätigungen untersuchen. Diagnoseinformationen müssen gezielt
  verfügbar bleiben. Keine neue fachliche Regelwahl und keine externen
  Instruktionspfade während der Ausführung einführen.
- [ ] 7. Weitere Hebel nacheinander testen. Referenzextraktion im Intake mit
  vorhandenen CLI-Hilfen, danach Workflow-Aufteilung und danach Subagents
  untersuchen. Pro Hypothese Einzelwirkung gegen den festgehaltenen Stand
  messen; keine ungeprüfte Bündelung. Subagents zählen zum Aufwand und dürfen
  nur festgelegte Tasks übernehmen. Forschung standardmäßig bei 25 Kandidaten
  oder fünf aufeinanderfolgenden verworfenen Kandidaten beenden; früher bei
  belastbar erreichtem Ziel oder Nutzerabbruch. Grenzen im Run-Manifest führen.
- [ ] 8. Prospektive Gewinne bestätigen. Je Kandidat mindestens drei frische
  Codex-Läufe pro Baseline und Kandidat und betroffenem Fall; Median, Streuung,
  Qualität und Fehlversuche auswerten. Held-out-Daten aus dem Optimizer-Kontext
  halten. Nur nachweislich hilfreiche Änderungen übernehmen. Kosten der
  Forschung einschließlich verworfener Kandidaten separat bilanzieren.
- [ ] 9. Kombination und Übertragbarkeit prüfen. Beibehaltene Änderungen
  gemeinsam erneut mit Codex messen. Ablation einzelner Maßnahmen einsetzen,
  wenn Wechselwirkungen ihre Zuordnung unklar machen. Finale design-shell-
  Läufe und die gemeinsamen design-entity-/design-screen-Regressionsfälle
  mit Codex, Opus und Grok 4.6 durchführen; immer design-verify ausführen.
  Alle Abschlussprüfungen müssen erfolgreich sein. Die drei Modelle ersetzen
  keine Wiederholungen der Codex-Effizienzmessung.
- [ ] 10. Evidenz und Ergebnis veröffentlichen. CSV-Historie vollständig
  committen, kompakte Tabelle je Maßnahme mit Hypothese, Commit, Stichprobe,
  Tokens/Dauer vorher und nachher, Verify-Ergebnis und keep/discard/unevaluable
  erstellen. Main, Verify, Reparatur, Subagent und Optimizer sauber zählen;
  fehlende Usage ausdrücklich markieren. Bericht mit nachprüfbaren Log- und
  Artefaktpfaden verknüpfen. pnpm check ausführen; geprüften Quellstand und
  tatsächliche Gate-Ergebnisse im Ticket veröffentlichen.

## Prüfschwerpunkte

CLI-/Vertragstests prüfen vollständige Task-Kontexte nach Deduplizierung,
ungültige interne Referenzen, unveränderte gespeicherte Definitionen bei
Quelländerungen, direkte Bildausgaben ohne Binärdaten im YAML und negative
Score-/Referenzintegritätsfälle. Provider-Tests prüfen fehlgeschlagene Aufrufe,
Timeouts sowie Tokenaggregation ohne Doppelzählung. Für geschützte Skills zuerst
designbook-skill-creator und für Addon-TypeScript designbook-addon-skills laden;
writing-for-agents bei Agentenprosa anwenden.

Jeder reale Designfall läuft über debo-test/Promptfoo aus einem frischen
Workspace, mit separatem design-verify, unverändertem Vergleichsscope und
festgehaltenen Modell-/Umgebungsparametern. Subagents schlagen Optimierungen
begrenzt vor; der Testfall selbst läuft durch den offiziellen Runner.

Bei ungültiger Baseline bleibt der Befund Korrektheitsarbeit. Bei ausbleibendem
Effekt endet die Forschung mit belegtem Negativergebnis; das Effizienz-
Akzeptanzkriterium wird dadurch nicht als erfüllt markiert. Keine Schwellen,
Messwerte oder Fehlversuche ändern, um einen Gewinn zu erzeugen.
