# Workflow-Effizienz bei gleicher Ergebnisqualität

Ticket: [DESIGNBOOK-58](https://gaia.keytec.de/admin/gaia/ticket/892), Subticket von DESIGNBOOK-56.
Status: Im grill-me-Interview am 2026-09-07 bestätigt.
Die Spec und der Plan werden auf ausdrücklichen Nutzerauftrag vollständig als
GAIA-Kommentare veröffentlicht. Implementierung und neue Messläufe sind Folgearbeit
im Subticket; diese Dokumente behaupten keine bestandenen Optimierungstests.

## Ziel und Umfang

Designbook soll gleichwertige oder bessere Ergebnisse mit reproduzierbar weniger
Tokens und kürzerer Laufzeit erzeugen. Forschung, Umsetzung und Wirkungsnachweis
gehören in dieses Ticket. Jede Maßnahme erhält einen eigenen Vergleich; die
kombinierte Lösung wird anschließend erneut geprüft. Eine kleinere tasks.yml ist
ein Diagnosewert, aber allein kein Erfolgskriterium.

Primärer Trainingsfall ist `drupal-web / design-shell`. Codex CLI mit
`gpt-5.6-luna` bleibt das feste Entwicklungs- und Vergleichsmodell. Opus dient als
Qualitätsreferenz; bessere Ergebnisse werden gemessen und nicht vorausgesetzt.
Die Abschlussprüfung erfolgt mit Codex, Opus und Grok 4.6. Gemeinsame Änderungen
werden zusätzlich mit design-entity und design-screen als getrennten,
vorab festgelegten Validierungsfällen abgesichert.

## Ausgangsbefunde

Die vorhandenen Läufe vom 2026-09-07 sind diagnostisch, keine gültigen
Effizienzbaselines:

DESIGNBOOK-57 wurde über PR #162 in den Parent-Branch übernommen (Merge-Stand
`b3a42daa`). Die neue Baseline muss dessen Schreibverträge, Fixtures und
Scorer-Änderungen enthalten; die folgenden Zahlen stammen aus dem Stand davor.

| Modell | Tokens einschließlich Verify | Laufzeit einschließlich Verify | Befund |
| --- | ---: | ---: | --- |
| Codex | 23.161.206 | 36,2 Minuten | Verkürzte Task-Instruktionen; ungültiges Score-Format; vier visuelle Vergleiche oberhalb der Schwelle |
| Opus | 91.281.764 | 62,6 Minuten | Vollständige Task-Instruktionen; vier von sechs visuellen Checks bestanden, beide Footer-Checks fehlgeschlagen |

Codex hat große Discovery-Ausgaben mehrfach in den Kontext geladen. Opus hat
vollständige Inhalte stark dupliziert. Im Codex-Verify wurden PNG-Ausgaben als
Strings deklariert und Binärinhalte im Laufzustand gespeichert; tasks.yml wuchs
auf etwa 1,76 MB. Ein geändertes Referenzartefakt oder fehlerhaftes Score-Format
macht eine Messung nicht zu einem erfolgreichen Lauf.

Tokenzahlen enthalten viele Cache-Reads und sind keine direkte Kostenangabe.
Grok 4.6 hat bisher nur einen erfolgreichen Headless-Smoke-Test mit
`--single` und `streaming-messages-json` geliefert; ein vollständiger
Promptfoo-Designlauf und die belastbare Mehrturn-Tokenzählung stehen aus.

## Architekturvertrag

1. Discovery wird bei unverändertem Template und Kontext einmal durchgeführt,
   als Katalog gespeichert und gezielt gelesen. Die Referenzanalyse bleibt im
   Intake erreichbar und wird vor strukturellen Planungsentscheidungen geladen.
2. Gemeinsame Task-Instruktionen, Rules, Blueprints, Konfigurationsanweisungen und
   Schemas werden vollständig einmal in die Definition eingebettet und intern
   referenziert. Inhalte dürfen nicht durch Zusammenfassungen ersetzt werden.
3. `workflow instructions` liefert den benötigten Kontext eines bekannten Tasks.
   Vollständige Workflow-Dumps und wiederholte breite Discovery-Ausgaben werden
   vermieden; erfolgreiche CLI-Zustandsupdates liefern knappe Bestätigungen.
4. Die vollständige Taskliste bleibt agentengeschrieben und vor Ausführung fest.
   Die CLI darf Inhalte zugänglich machen, validieren und persistieren, aber
   keine neue Taskliste kompilieren. Zur Laufzeit gibt es keine erneute Discovery.
   Änderungen an Skill-Quelldateien beeinflussen gespeicherte Runs nicht.
5. Bildausgaben bleiben direkte Dateien mit dem gültigen Output-Vertrag und
   Bildvalidator. Binärdaten werden weder in YAML-State noch in Textprompts kopiert.
6. Referenzextraktion, Workflow-Aufteilung und Subagent-Nutzung sind getrennte
   Optimierungshypothesen. Bestehende CLI-Hilfen wiederverwenden. Jeder Subagent
   erhält nur seinen festgelegten Arbeitskontext; seine Nutzung wird mitgezählt.
7. Kein Migrationscode, keine Kompatibilitätsleser und keine Reparaturen alter
   Laufartefakte. Alle Messläufe beginnen in frischen, isolierten Workspaces.

## Mess- und Qualitätsvertrag

Promptfoo ist der einzige Runner hinter debo-test. Auf design-shell,
design-entity und design-screen folgt immer eine separate design-verify-Phase.
Erfolg setzt gültige Artefakte, vollständige und unveränderte Definitionen,
nachvollziehbare Logs, einen gültigen Score und bestandene visuelle Checks voraus.
Ein beendeter CLI-Prozess oder formal gültiger Score allein genügt nicht.
Referenz und Vergleichsscope bleiben unverändert; Reparaturen dürfen die erzeugte
Implementierung im vorgesehenen Reparaturablauf ändern und zählen zum Aufwand.

Zuerst Korrektheitsprobleme beheben und eine erfolgreiche Codex-Baseline herstellen.
Verbesserungen gegenüber fehlerhaften Läufen als Korrektheitsgewinn ausweisen.
Erst gegen eine valide Baseline Effizienzgewinne bewerten. Modell, Reasoning,
Inputs, Referenz, Schwellen, Scope und Umgebung pro Vergleich festhalten.
Eine Stunde Timeout gilt pro CLI-Aufruf; Promptfoo-Ergebnis-Caching bleibt aus.
Änderungen am Messrahmen erfordern eine neue Baseline.

Für belastbare Codex-Vergleiche mindestens drei frische Läufe pro Baseline und
Kandidat und geprüftem Fall verwenden. Median, Streuung, Erfolgsquote und alle
Versuche ausweisen. Drei Wiederholungen sind eine erste Absicherung und kein
pauschaler statistischer Signifikanznachweis; bei unklarem Effekt weiter messen
oder das Ergebnis als uneindeutig verwerfen. Einzelläufe dürfen Kandidaten
frühzeitig aussortieren, aber keine Einsparung belegen.

Ziel sind weniger Gesamttokens und kürzere Gesamtlaufzeit bei bestandenen Gates.
Es gibt keine feste Prozentvorgabe. Gegenläufige Effekte ausdrücklich bewerten,
statt sie als unbedingten Gewinn zu melden. Modellvergleiche werden getrennt
berichtet und ersetzen keinen Codex-Vorher/Nachher-Vergleich.

Die versionierte `promptfoo/results.csv` enthält alle Versuche und Phasen mit
Run-/Varianten-ID, Fall, Modell/Settings und Quellstand, Dauer, Input-, Cache-,
Output- und verfügbaren Reasoning-Tokens, Gesamttokens, Usage-Quelle/-Scope und
Subagent-Anteil sowie design-verify-Score, bestandenen/gesamten Checks,
Diff-Werten und Issue-Schweregraden. Bestehende Spalten wiederverwenden; fehlende
Messwerte bleiben unbekannt. Hauptlauf, Verify, Reparaturen und Fehlversuche
zählen zur Bilanz. Optimizer-Verbrauch separat sowie im Experimentgesamtaufwand
ausweisen. Native Logs und Artefakte bleiben mit den CSV-Zeilen nachvollziehbar
verknüpft; vollständige temporäre Workspaces gehören nicht in Git.

## Akzeptanzkriterien

- AC1: Die vollständigen Instruktions- und Output-Verträge bleiben erhalten;
  interne Deduplizierung und gezielte Kontextausgabe sind durch Tests belegt.
  Gespeicherte Runs bleiben unabhängig von späteren Änderungen ihrer Quellen.
- AC2: Referenzanalyse erfolgt im Intake; alle Ziele, Abhängigkeiten und Regeln
  stehen vor Ausführung fest. Keine dynamische Expansion oder Runtime-Discovery.
- AC3: Bildausgaben werden als Dateien validiert; YAML-State enthält keine PNG-
  Binärinhalte. Score-Format und Referenzintegrität werden verlässlich geprüft.
- AC4: Codex ist das feste Trainingsmodell. Für jede beibehaltene
  Effizienzmaßnahme liegen Hypothese, isolierter Vergleich, mindestens drei
  frische Baseline-/Kandidatenläufe pro Fall, Qualitätsgates und Entscheidung vor.
- AC5: Der kombinierte Endstand belegt reproduzierbar weniger Tokens und kürzere
  Laufzeit gegenüber der gültigen Codex-Baseline bei gleicher oder besserer
  Qualität. Uneindeutige Ergebnisse und Zielkonflikte werden ausdrücklich benannt
  und nicht als erfülltes Effizienzziel ausgegeben.
- AC6: Finale Prüfungen mit Codex, Opus und Grok 4.6 bestehen einschließlich
  design-verify. Gemeinsame Änderungen sind auch mit design-entity und
  design-screen abgesichert; deren Referenzen und Fälle werden vor Messbeginn
  festgelegt und nicht auf Trainingsbefunde zugeschnitten.
- AC7: CSV und ein kompakter Ergebnisbericht sind committet. Alle Versuche,
  Phasen, Fehler und nachweisbaren Subagent-/Optimizer-Verbräuche werden korrekt
  berücksichtigt; keine geschätzten Tokens als Messwerte ausgeben.
- AC8: Guarded Skills folgen designbook-skill-creator und writing-for-agents.
  Der offizielle debo-test/Promptfoo-Weg und `pnpm check` bestehen vor Abschluss.

## Abgrenzung und Prior Art

Suche in GAIA nach Optimierung, token, Promptfoo und Deduplizierung, jeweils
Titel und Beschreibung, anschließend auf das Designbook-Projekt eingegrenzt.
Leere Suchergebnisse durch eine bekannte Trefferabfrage kontrolliert.
Kein bestehendes Ticket trägt diesen neuen Promptfoo-/Codex-Vergleich auf Basis
der statischen Workflows aus DESIGNBOOK-56.

DESIGNBOOK-15 ist abgeschlossene Vorarbeit zu Geschwindigkeitsproblemen der
früheren dynamischen Engine und Hilfsbefehlen; diese Mechanik nicht neu bauen.
DESIGNBOOK-40 definiert bestehende Authoring-Prinzipien. DESIGNBOOK-57 behandelt
Anlegen/Ändern der Design-Skills, nicht diese Effizienzmessung. Weitere Treffer
betreffen Drupal-Synchronisierung und Design-Tokens. DESIGNBOOK-56 ist das
übergeordnete Architektur-Ticket; sein Vertrag gilt weiter.
