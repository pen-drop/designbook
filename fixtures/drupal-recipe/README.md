# Cooks Delight — dieselben Prompts für Demo und Promptfoo

Die `prompt`-Blöcke der [Cases](cases/) sind die einzige Quelle der fachlichen
Prompts. Jeder Prompt ruft die eigentlichen installierten Skills auf und verlangt
das Lesen ihrer `SKILL.md`. Promptfoo ergänzt nur Phasengrenzen und Evidenzvorgaben;
Intake, Planung und Ausführung gehören den Skills. Das YAML-Feld `workflow` bleibt
als Zuordnung für Ergebnisprüfungen und automatische Verifikation erhalten. Für das Video
zeigen wir diese echten Aufträge und Ergebnisse; die kurzen Titel unten sind
Schnittmarken, keine nachträglich erfundenen Terminal-Eingaben.

| Reihenfolge | Case / Prompt | Sichtbares Ergebnis |
| --- | --- | --- |
| 1 | [Show Figma file](cases/01-reference.yaml) | Ausgewählter Rezept-Frame und echte Referenzaufnahme |
| 2 | [Build vision](cases/02-vision.yaml) | Produktvision; zusätzlich Section `recipes` als technische Grundlage |
| 3 | [Build model based on screen](cases/03-data-model.yaml) | Recipe-Modell; anschließend passende Beispieldaten |
| 4 | [Build tokens based on screen](cases/04-tokens.yaml) | Farben und Typografie; anschließend daraus generiertes CSS |
| 5 | [Build shell · show shell](cases/05-shell.yaml) | Header und Footer als eigenständiges Zwischenergebnis |
| 6 | [Design screen](cases/06-screen.yaml) | Rezeptdetailseite, Entity-Mapping und berechnete Gesamtzeit |

## Referenz und Umfang

[Figma-Datei](https://www.figma.com/design/jNxa1mBeUyh2eoAQrjcvhd/-FREE--Cooking---Recipes-Blog-Template--Community-?node-id=0-1).
Der gelieferte Link bezeichnet die Seite `0:1`. Case 1 ermittelt den echten Desktop-Frame
mit der Überschrift **Lemon Garlic Roasted Chicken**. Bei mehreren Treffern oder fehlendem
Figma-MCP-Zugriff stoppt er mit den konkreten fehlenden Angaben. Kein Framer-/Website-Ersatz.
Die veröffentlichte Referenz zeigt Frame `58:2`; die Aufnahme wurde vom Nutzer freigegeben.
Die Schicht `reference` enthält diese Aufnahme unverändert inklusive Assets und Freigabe.

Das Rezept ist `node.recipe`, keine Canvas-Landingpage. Die Demo-Logik ist
`field_prep_minutes + field_cook_minutes` → formatierte Gesamtzeit. 20 + 40 Minuten
sind ausdrücklich unsere Beispieldaten; der Screen belegt nicht automatisch diese
Aufteilung. Ein zweiter Test mit 10 + 25 Minuten muss 35 Minuten liefern.
Keine Portionsberechnung, Buchung, Commerce, Drupal-Synchronisierung oder Videoerzeugung.

## Vorbereiteter Workspace

Der laufende Demo-Workspace ist `/tmp/designbook-86-recipe`. Alle Befehle unten
laufen vom Root dieses Ticket-Worktrees. **Immer `--prepared-workspace` verwenden**:
ohne dieses Flag setzt der normale Runner vor jedem Case den Workspace neu auf.
Cases im vorbereiteten Workspace strikt nacheinander ausführen. Frühere Ergebnisse
sind die Eingaben der späteren Cases. Nicht mehrere Cases gleichzeitig starten.
Ein Fortsetzen trotz Fehlern benötigt eine bewusste Entscheidung; bekannte Fehler bleiben
im Report erhalten. Für diesen Durchlauf wurde das Fortsetzen nach der Shell autorisiert.

Für eine neue Aufnahme in Case 1 muss die CLI Zugriff auf Figma haben. Spätere Cases
nutzen die gespeicherte Referenz. Die Beispiele verwenden Claude mit `opus`;
der Modellalias wird durch die tatsächlich installierte Claude-CLI aufgelöst.
Bei Shell und Screen wird Opus explizit auch als Executor verwendet.

```bash
recipe_step() {
  ./promptfoo/scripts/run-single.sh "$1" --suite drupal-recipe \
    --workspace /tmp/designbook-86-recipe --prepared-workspace \
    --provider claude --model opus "${@:2}"
}

recipe_step 01-reference
```

**Nach Case 1:** den tatsächlich ausgewählten Frame und die exportierte Referenz
ansehen. Eine erforderliche Referenzfreigabe über den regulären Designbook-Ablauf
geben; die Cases erfinden weder Zustimmung noch simulierte Freigaben.
Der Community-Link und die Zustimmung zum Rezeptkonzept ersetzen keine Prüfung
des später tatsächlich aufgenommenen Frames.

Dann jeweils nach erfolgreichem vorherigem Schritt:

```bash
recipe_step 02-vision
recipe_step 03-data-model
recipe_step 04-tokens
recipe_step 05-shell --executor-provider claude --executor-model opus
recipe_step 06-screen --executor-provider claude --executor-model opus
```

Case 5 muss die Shell-Aufnahme sichern, bevor Case 6 das Ergebnis ergänzt.
Shell und Screen erhalten automatisch die separate Design-Verifikation des Runners.
Desktop wird mit den ausgewählten Referenzregionen verglichen; 390px prüft zusätzlich
Überlauf und Lesbarkeit. Ohne mobile Figma-Referenz gibt es keinen mobilen Pixelvergleich.

## Erneut leer aufsetzen

Nur für einen **bewussten Neustart**; dies löscht den angegebenen Workspace samt
seiner bisherigen Ergebnisse. Laufendes Storybook vorher mit dessen CLI stoppen.
Rohlogs außerhalb des Workspaces bleiben erhalten.

```bash
./scripts/setup-workspace.sh drupal-recipe --into /tmp/designbook-86-recipe
./scripts/setup-test.sh drupal-recipe 01-reference --into /tmp/designbook-86-recipe
```

Die `empty`-Schicht entfernt nur die mitgelieferten Demo-Komponenten und Demo-Section.
Sie enthält kein vorgebautes Rezept und keine fingierten Figma-Beobachtungen.

## Logs und Konfigurationsprüfung

Jeder Aufruf legt einen eigenen Report-Ordner unter `promptfoo/reports/` an. Darin
liegen der effektive Prompt, native CLI-Logs, Fehler, Kontextprotokolle und Ergebnisse.
Shell/Screen enthalten außerdem die getrennten Intake-/Plan-/Executor-/Verify-Nachweise.
`promptfoo/results.csv` erhält die tatsächlich ausgeführten Ergebnisse und Modellangaben.
Rohlogs bleiben gitignored; vor Veröffentlichung von Videoausschnitten private Inhalte prüfen.
Für eine echte Terminalaufnahme zusätzlich den Bildschirm aufnehmen; JSONL allein ist kein Video.

Alle sechs Konfigurationen ohne Modellaufruf und ohne Workspace-Reset prüfen:

```bash
for step in 01-reference 02-vision 03-data-model 04-tokens 05-shell 06-screen; do
  case "$step" in
    05-shell|06-screen) recipe_step "$step" --executor-provider claude --executor-model opus --config-only ;;
    *) recipe_step "$step" --config-only ;;
  esac || break
done
```

`--config-only` belegt die Runner-Konfiguration, nicht Figma-Zugriff oder Designqualität.
Die gespeicherten Schichten stammen aus den tatsächlichen Skill-Ausführungen.
Die ursprünglichen Reports bleiben maßgeblich für deren Pass-/Fail-Status.

## Gespeicherte Schritt-Fixtures

Jede Schicht enthält nur die Ausgaben ihres Schritts in theme-relativen Pfaden.
`snapshots.json` dokumentiert die SHA-256-Dateihashes. Pläne und Laufzeitlogs bleiben
in den Reports und werden nicht als erledigte Arbeit in frische Tests übernommen.

| Schicht | Inhalt | Zustand |
| --- | --- | --- |
| `reference` | Freigegebener Figma-Frame, Beobachtungen, Assets | veröffentlicht |
| `vision` | Vision und leere Recipes-Section | erstellt |
| `data-model` | Modell, Beispieldaten, Rezeptbilder | erstellt; Datenvalidator meldet Warnungen |
| `tokens` | Tokens, CSS-Generatoren, CSS und lokale Fonts | erstellt; korrigierte Assertions bestanden |
| `shell` | SDC-Komponenten, Shell-Szene, Shell-Assets | Menüumbruch korrigiert und bei 1440/1024/768/390/320 geprüft; Footer-Trenner offen; Pixelvergleich nicht auswertbar |
| `screen` | 10 SDC-Komponenten, 7 Mappings, 6 Icons, Rezept-Szene | 20/20 Tasks; Build, Bildknoten, Struktur und Zeitberechnung geprüft; visuelle Abweichungen bleiben |

Die Cases deklarieren alle vorherigen Schichten. Ohne `--prepared-workspace`
baut der Runner einen frischen Workspace mit genau diesen Eingaben auf. Damit kann
beispielsweise `06-screen` ohne erneuten Figma-Zugriff oder erneute Grundlagenerzeugung
starten. Dafür einen eigenen Workspace verwenden, niemals den laufenden Demo-Workspace.

`recipes-section--overview` ist die Übersicht der Section. In der Vision-Fixture ist
`scenes: []` absichtlich leer; erst `06-screen` ergänzt den eigentlichen Rezept-Screen.

### Bildfelder und vollständiger Composition-Baum

Field-Map-Bindings unterstützen Bildfelder als Slots. Der Bildstil kommt aus
`settings.image_style`; das Mapping übernimmt `src` und `alt`. Fehlende Felder
und leere Listen ergeben leere Slots; einzelne und mehrere Bilder ergeben Listen.
Referenz-Slots bleiben ebenfalls bei einem einzelnen Datensatz Listen.
`plan tree` löst den Dateipfad-Alias `design-system:shell` und dessen
`with.content` auf; deklarierte SDC-Varianten werden geprüft.

Der zusätzliche [Korrektur-Case](cases/03-model-base-fields.yaml) lief über den
echten `data-model`-Skill erfolgreich: `name` ist jetzt auf den drei Taxonomie-Bundles
und `description` auf `author` explizit deklariert. Nur diese vier Felder wurden
ergänzt; Beispieldaten, Referenz, Tokens und Shell blieben unverändert.
Die korrigierte `data-model`-Schicht ist gespeichert. Case 3 fordert die Basisfelder
auch bei einer vollständigen Neuerzeugung an.

Der erneute Screen-Lauf nutzt `/tmp/designbook-86-recipe-complete`; Intake und
Planung sowie alle 20 Ausführungs-Tasks sind bestanden. Im Structure-Panel stehen
ein vollständiges Rezept, sieben Zutaten, vier Schritte, ein Autor, zwei Teaser
und sieben Bilder. Die Mapping-Detailansicht und Bildpfad, Alt-Text und Bildstil
des Hero-Bildes wurden geprüft. Der temporäre 10+25-Zeitcheck liefert 35 Minuten;
die Originaldaten sind danach bytegleich wiederhergestellt.

Die sieben Schichten wurden in `/tmp/designbook-86-recipe-snapshot` frisch geladen:
170 Dateien stimmen mit den gespeicherten Hashes überein, der Storybook-Build
enthält `designbook-sections-recipes-scenes--recipe-detail`.
Der [Verify-Case](cases/verify-screen.yaml) lädt den fertigen Stand für weitere
Prüfungen. Ein reiner Neuaufbau ohne Modellaufruf:

```bash
./scripts/setup-workspace.sh drupal-recipe --into /tmp/designbook-recipe-preview
./scripts/setup-test.sh drupal-recipe verify-screen --into /tmp/designbook-recipe-preview
pnpm --dir /tmp/designbook-recipe-preview/web/themes/custom/test_integration_drupal build-storybook
```

Die Datei-Fixture ist ein funktionierender Zwischenstand, keine visuelle Freigabe.
Die automatische Verifikation hat die korrekte Actual-Aufnahme veröffentlicht
(`9dea582d07ece54e/05722fdab820892a`), benötigt aber deren Screenshot-Freigabe;
es gibt noch keinen Verify-Score. Der Gesamt-Audit ist deshalb nicht bestanden.
Zusätzlich wurden im Ausführungslauf direkte Playwright-Aufnahmen statt der
vorgegebenen Capture-CLI verwendet, und der Planner hat Addon-Quellcode gelesen.
Diese Log-Verstöße bleiben trotz bestandener funktionaler Prüfungen dokumentiert.
Eigenständige SDC-Varianten-Vorschauen wählen weiterhin teilweise die falsche Variante.
Share-Leiste, Subscribe-Bereich, Play-Overlay, Karten-Buttons und Vegan-Badge fehlen
gegenüber Figma; der Teaser-Bildausschnitt weicht ab. Die ausgegebenen Breitenklassen
nutzen wie die vorhandene Shell `max-w-[var(--container-*)]`, um Kollisionen mit
Abstandstokens zu vermeiden; die widersprüchliche Utility-Regel bleibt dokumentiert.

### Menü-Korrektur

`fix-menu-wrap` nutzt den echten `design-shell`-Skill. Ab 1024px bleibt das Menü
zwischen Logo und Aktionen in einer Zeile; bei 768px steht es in einer eigenen
Zeile. Bei 390/320px entsteht ein ausgeglichenes 2×2-Raster ohne getrennte Labels.
Nur `header.twig` und der Hauptmenü-Zweig von `navigation.twig` wurden geändert;
alle übrigen 168 gespeicherten Dateien sind hashgleich. Der Storybook-Build und
der Font-/Staleness-Check bestehen.

Der Lauf `fix-menu-wrap-main-w6tN08` bleibt insgesamt **FAIL**: Der Rezeptinhalt
überläuft bei 320px durch die Überschrift „Instructions“, außerhalb des Headers.
Außerdem lieferte die deklarierte Capture-Matrix keine Zellen; der Worker speicherte
Messungen, aber keine kanonischen Screenshots. Diese Einschränkungen werden nicht
als bestandene Prüfung gewertet. Die Videoaufnahmen sind separate Medienaufnahmen.
