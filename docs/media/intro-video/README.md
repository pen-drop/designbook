# Intro-Video: Rezept

Die aktuelle [15-Sekunden-Fassung](recipe/intro.mp4) zeigt den Rezept-Entwurf,
Vision, Datenmodell, Tokens, Shell und das fertige Ergebnis in Storybook.
[Video ansehen](index.html) · [Storytelling](STORYTELLING.md)

Alle verwendeten Aufnahmen liegen unter `recipe/screenshots/`. Die Log-Auszüge
stammen aus echten Promptfoo-Claude-Läufen; `recipe/excerpts.json` nennt die Quellen.
Es sind nachträglich gesetzte Auszüge, keine Aufnahme einer neuen Terminal-Session.

Erneut rendern (mit vorhandenen Bildern, ohne laufendes Storybook):

```bash
node docs/media/intro-video/recipe/render.mjs
```

Neu aufnehmen benötigt den fertig aufgebauten Rezept-Workspace und die ursprünglichen,
gitignored Promptfoo-Reports für die Auszüge:

```bash
STORYBOOK_URL=http://localhost:34211 node docs/media/intro-video/recipe/capture.mjs
```

Voraussetzungen: installierte Repository-/Integration-Abhängigkeiten, Playwright
Chromium und `ffmpeg`. Der Renderer prüft Browserfehler, sechs Szenen, eine stehende
letzte Sekunde und erfolgreichen Export: 450 Frames, 1280 × 720, 30 fps, ohne Ton.

Lokal ansehen: `python3 -m http.server 4187 --directory docs/media/intro-video`.
Die Landingpage bleibt bis zur Auswahl der Filmfassung bei ihrer bisherigen Einbindung.

## Frühere Pricing-Entwürfe

Zwei eigenständige, stumme 15-Sekunden-Fassungen des
früheren Pricing-Storytellings. Alle Bilder stammen aus der echten,
bereinigten Figma-Canvas-Fixture. Kamera und Lichtimpulse sind nachträglich animiert.

[Astra](astra/intro.mp4) · [Opus](opus/intro.mp4)

| Fassung | Film | Umsetzung | Neu rendern |
| --- | --- | --- | --- |
| GPT-6 Astra | [intro.mp4](astra/intro.mp4) | [Bericht](astra/report.md) | `node docs/media/intro-video/astra/render.mjs` |
| Claude Opus | [intro.mp4](opus/intro.mp4) | [Bericht](opus/report.md) | `node docs/media/intro-video/opus/render.mjs` |

Die Render-Befehle laufen vom Repository-Root und verwenden die mitgelieferten
Screenshots. Voraussetzung: Repository-/Integration-Abhängigkeiten, Playwright
Chromium und `ffmpeg` auf PATH. Kein laufendes Storybook für das Rendern nötig.
`film.html` enthält jeweils die Kamerafahrt; `capture.mjs` dokumentiert die
Aufnahme der echten Oberfläche. Ein erneutes Aufnehmen benötigt die laufende
`drupal-figma/saas-canvas`-Fixture und deren URL im jeweiligen Capture-Skript.

Für eine lokale Vergleichsansicht:

```bash
python3 -m http.server 4187 --directory docs/media/intro-video
```

Danach `http://localhost:4187/` öffnen. Die Landingpage verwendet weiterhin den
vorherigen Film, bis eine Fassung ausgewählt wird.

## Aufnahmen

`astra/screenshots/` und `opus/screenshots/` enthalten die tatsächlich verwendeten
Ansichten: Webseite, Storybook, separate Pricing-Entity, Structure-Mapping und
Datenmodell-Detail. Opus nimmt zusätzlich die echte Mapping-Codeansicht auf.

Die Canvas Page enthält inline Komponenten. Der Film wechselt deshalb ausdrücklich
zur separaten Entity-Story. Das Structure-Panel zeigt den aufgelösten Slot `price`;
die JSONata-Zuordnung liest `field_price`, das anschließend im Datenmodell erscheint.

Die ursprünglichen Referenzaufnahmen bleiben unter `screenshots/` erhalten:

| Datei | Inhalt |
| --- | --- |
| [01-webseite.png](screenshots/01-webseite.png) | Webseite ohne Storybook-Oberfläche |
| [02-storybook.png](screenshots/02-storybook.png) | Webseite mit Seitenleiste |
| [03-canvas-structure.png](screenshots/03-canvas-structure.png) | Canvas-Kompositionsbaum; kein Entity-Feldmapping |
| [04-datenmodell.png](screenshots/04-datenmodell.png) | Übersicht des Datenmodells |
