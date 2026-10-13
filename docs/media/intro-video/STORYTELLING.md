# Designbook — Rezept-Animatic, 20 Sekunden

Status: Die detaillierte Schnittvorlage wurde im Gespräch mit „ja bitte so
weitermachen“ bestätigt. Dieses Animatic prüft Kamera, Lesbarkeit und Zuordnung.
Die Gestaltung der finalen Lichtimpulse folgt erst nach der Beurteilung des Schnitts.

## Schnittvorlage

| Zeit | Überschrift / KI-Aktion | Bild und Kamera |
| --- | --- | --- |
| 0–2 | Bring your design. | Figma-Editor mit ausgewähltem Rezept-Frame `58:2`. Leichte Annäherung, Editorleisten erkennbar. **Aufnahme derzeit blockiert (HTTP 403); im Animatic ausdrücklich markierter Platzhalter vor dem echten Referenzbild.** |
| 2–4 | Let AI do the building. | Kamerafahrt nach rechts zum Claude-Terminal. Figma-Datei/Node bleiben sichtbar. Echte Prompt-Auszüge für Datenmodell und Tokens erscheinen und werden als Replay abgesendet. |
| 4–6 | Extract your data and tokens. | Kamera weiter nach rechts zu Storybook. Sidebar: nur Foundation, Design System und Sections. Zoom auf den tatsächlichen Datenmodell-Graph. |
| 6–7.5 | Extract your data and tokens. | Fokuswechsel zu den tatsächlichen Design-Tokens. Farben und Werte groß genug zur Orientierung, kein langer Logtext. |
| 7.5–9 | Build your scene. | Kamera zurück zu Claude. Die echten Prompt-Auszüge für Shell und Screen erscheinen. Danach Fahrt zur Scene in Storybook. |
| 9–10 | Build your scene. | Recipe Detail erscheint unter den drei Hauptpunkten. Rezeptkopf rechts, kurzer Zoom hinein und zurück, damit links und rechts gemeinsam sichtbar sind. |
| 10–13.5 | Structure your content. | Erste Scrollfahrt von oben nach unten: Recipe → Ingredient → Recipe Step → Author. Der Entity-Eintrag links und die Kontur rechts erscheinen im selben Frame. |
| 13.5–14 | Reveal your components. | Schnelle Fahrt zurück zum Seitenanfang. Entities bleiben stehen. |
| 14–18 | Reveal your components. | Zweite Scrollfahrt: Header → Detail page → Quantity item → Step block → Profile card. Komponenten erscheinen synchron links und rechts. |
| 18–20 | Not a design tool. / AI builds your design system. | Zurück zum Rezeptkopf, Kamera heraus auf das aufgebaute System. Letzte Sekunde vollständig ruhig. |

## Verbindliche Zuordnungen

Die Positionen stammen aus echten `db:s:`-Markern des gerenderten Rezepts bei
1140px Vorschau-Breite. `recipe/pairs.json` speichert Original-Locator, Box und
Startzeit; die Sidebar-Zeilen sind Aufnahmen der tatsächlichen Storybook-Einträge.

| Start | Eintrag links | Hervorhebung rechts | Nachweis |
| --- | --- | --- | --- |
| 10.10 s | Recipe | Überschrift als sichtbarer Teil des vollständigen Rezept-Entitys | `node.recipe.full.jsonata` |
| 10.95 s | Ingredient | Erste Zutatenzeile | `paragraph.ingredient.default.jsonata` → `quantity-item` |
| 11.80 s | Recipe Step | Erster Zubereitungsschritt | `paragraph.recipe_step.default.jsonata` → `step-block` |
| 12.65 s | Author | Autorenkarte | `taxonomy_term.author.default.jsonata` → `profile-card` |
| 14.05 s | Header | Gesamter Header | `header@0.header` |
| 14.80 s | Detail page | Rezeptüberschrift als sichtbarer Teil des Detail-page-Containers | `detail-page@0.content` enthält die Überschrift |
| 15.55 s | Quantity item | Erste Zutatenzeile | `quantity-item@0.content.ingredients.0` |
| 16.30 s | Step block | Erster Zubereitungsschritt | `step-block@0.content.steps.0` |
| 17.05 s | Profile card | Autorenkarte | `profile-card@0.content.author` |

Die vollständigen Recipe-/Detail-page-Container sind mehrere Bildschirmhöhen lang.
Deren Titel dient deshalb als Fokus; die Kontur behauptet nicht, die ganze Entity
abzugrenzen. Zutaten und Schritte werden exemplarisch einmal gezeigt.

## Bewegungsregeln

- Figma, Claude und Storybook liegen auf einer gemeinsamen horizontalen Bühne.
- Die Kamera verändert nur Position und einheitliche Skalierung der Aufnahmen.
- Vor einer Zuordnung sind Sidebar und Zielbereich gemeinsam im Bild.
- Entity-Konturen sind grün, Komponenten-Konturen orange. Eine Verbindungslinie
  macht die Zuordnung sichtbar. Einträge bleiben nach dem Pop-in erhalten.
- Der Bildschirm scrollt zweimal wirklich von oben nach unten, mit einem
  erkennbaren Rücklauf dazwischen. Keine beliebig geschnittenen Seitenausschnitte.
- Die kleine Claude-Anzeige bleibt während des Aufbaus in der Sidebar sichtbar.
- Noch keine ausgearbeiteten Blitzer, kein Sound und keine Vollbildblitze.

## Herkunft und ehrliche Inszenierung

`prompts.json` übernimmt wörtliche Sätze aus den gespeicherten Skill-Cases und
nennt ihre Quellen. Das Terminal ist ein beschriftetes **Replay gekürzter Prompts**,
keine neue Live-Ausführung und keine abgefilmte Terminal-Session. Die Antwortzeile
nennt den Ablauf, erfindet aber keine Tool-Ausgabe oder Erfolgsmeldung.

Die Sidebar wird für den Film aus echten Zeilen zusammengesetzt, vereinfacht und
zeitlich aufgebaut. Das ist eine Erklärung des Ergebnisses, keine Behauptung,
dass Storybook seine Navigation während eines echten Builds genau so animiert.
Die Seite, Entities, Komponenten und Tokens stammen aus dem funktionierenden
Rezept-Workspace. Die ursprünglichen Fixture-Audit-Befunde bleiben unverändert.

Der Figma-Editor ist ein notwendiges noch fehlendes Ausgangsbild. Solange
`recipe/figma.json` keinen geprüften Screenshot nennt, zeigt der Film dafür einen
sichtbaren Platzhalter und bleibt ein unvollständiges Animatic.
