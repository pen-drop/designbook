# Opus-Variante: 15-Sekunden-Kamerafahrt durch das echte Designbook

- **Modell:** Claude Opus 5.5 (`claude-opus-5-5`, laut CLI-Init), unabhängig von der Astra-Variante (`../astra/`) erstellt.
- **Ergebnis:** [`intro.mp4`](intro.mp4) (1920×1080, 30 fps, H.264 yuv420p, ohne Ton) und [`poster.png`](poster.png) (Frame bei 4,45 s: drei Komponenten-/Menü-Paare markiert).
- **Quelle:** Live-Storybook `http://localhost:37541`, Fixture-Workspace `/tmp/designbook-86-figma` (Theme `test_integration_drupal`).

## Dateien (alle unter `docs/media/intro-video/opus/`)

| Datei | Zweck |
| --- | --- |
| `capture.mjs` | Nimmt die echte Oberfläche auf (Playwright, 1600×900 CSS px, deviceScaleFactor 2) und schreibt die gemessenen Locator-Boxen nach `boxes.js` |
| `boxes.js` | Gemessene Bounding-Boxes (keine geschätzten Koordinaten) |
| `screenshots/*.png` | Sechs echte Aufnahmen, siehe unten |
| `film.html` | Zeitgesteuerte Komposition (`window.setTime(t)`): Kamera-Tracks, Match-Cuts, Lichtakzente |
| `render.mjs` | Rendert genau 450 Frames → `intro.mp4` und `poster.png`; `--stills t1,t2,…` für Kontrollbilder |

Reproduzieren (vom Repo-Root, Storybook muss laufen):

```bash
node docs/media/intro-video/opus/capture.mjs http://localhost:37541
node docs/media/intro-video/opus/render.mjs
```

Beide Skripte laden Playwright per `createRequire` über
`packages/integrations/test-integration-drupal/package.json` und nutzen das lokale `ffmpeg`.
Alle Pfade sind relativ zum Skript. Es kommen keine neuen Abhängigkeiten dazu.

## Routen und Aufnahmen

Die Story-IDs stammen aus `http://localhost:37541/index.json`. `capture.mjs` prüft per Assertion, dass sie existieren.

| Screenshot | Route | Interaktion (nur UI-Zustand, kein DOM-Eingriff) | Belegte Inhalte |
| --- | --- | --- | --- |
| `site-full.png` | `/iframe.html?id=designbook-sections-saas-demo-scenes--landing&viewMode=story` | Viewport 1300×860 = Breite des Storybook-Preview-Iframes, Full-Page | Komplette Webseite (Höhe 4071 px) |
| `sb-landing.png` | `/?path=/story/designbook-sections-saas-demo-scenes--landing` | Addon-Panel ausgeblendet, Release-Toast geschlossen, Ordner *Action* und *Data Display* aufgeklappt, Preview auf `scrollY = 2815` (Pricing-Sektion) gescrollt | Pricing-Karten Free/Pro/Business (per Assertion geprüft), Menüeinträge `saas-button`, `saas-check-list`, `saas-pricing-card` |
| `sb-entity.png` | `/?path=/story/entities-node-pricing-plan--card` | Panel ausgeblendet | Eigenständige Entity-Story `node/pricing_plan` (card), Record 0 = „Free“, `$0`; links *Entities › node › Pricing Plan › card* ausgewählt |
| `sb-entity-structure.png` | gleiche Story | Tab *Structure* gewählt, Panel um ca. 160 px vergrößert | Composition `node/pricing_plan (card)` ENTITY; Detail `ENTITY node/pricing_plan`, `mapping: designbook/entity-mapping/node.pricing_plan.card.jsonata — select: $[0]`, DATA SOURCE `price` → `slot: price 1 node` |
| `docs-mapping.png` | `/?path=/docs/entities-node-pricing-plan--docs` | – | Echte JSONata-Zeile `"price": $replace(field_price, "$", "&#36;"),` (Position über DOM-Range gemessen) |
| `datamodel-field.png` | `/?path=/story/designbook-foundation--foundation` | Panel ausgeblendet, Tab *Data Model* → Karte *Pricing plan* | `Pricing plan` NODE `node.pricing_plan`, Feldzeile `field_price · string · Price · ✓ · Display price including currency (e.g. $9)` (per Assertion geprüft) |

Pixelprüfung: Der Ausschnitt aus `site-full.png` bei `scrollY = 2815` und der Preview-Bereich in
`sb-landing.png` haben eine Pixeldifferenz von 0. Der Übergang von der Webseite zu Storybook ist
deshalb nahtlos und echt.

### Fachliche Belege für `field_price`

- `designbook/entity-mapping/node.pricing_plan.card.jsonata`: `"price": $replace(field_price, "$", "&#36;")`
- `designbook/data-model.yml`: `node.pricing_plan.fields.field_price` (string, Price, required)
- `designbook/data/node.pricing_plan.yml`: Record 0 `title: Free`, `field_price: $0`

Die Canvas-Page enthält inline SDC-Komponenten und **keine** `pricing_plan`-Entity-Knoten. Der Film
zeigt deshalb ausdrücklich den Wechsel zur separaten Entity-Story. Im Canvas-Baum wird keine
Beziehung vorgetäuscht.

Das Structure-Panel selbst zeigt nur Ausgabeschlüssel (`price → slot: price`) und keinen Feldnamen.
Die echte Feldbeziehung belegt deshalb die Mapping-Zeile auf der Docs-Seite derselben Entity.
Danach folgt die Datenmodell-Zeile.

## Ablauf (tatsächlich umgesetzt)

| Zeit | Bild | Bewegung und Akzent |
| --- | --- | --- |
| 0–0,95 s | Webseite (Hero) füllt das Bild | Leichter Push (Breite 1300 → 1236 px) |
| 0,85–1,9 s | Schneller Scroll-Whip zur Pricing-Sektion | Leichte vertikale Bewegungsunschärfe, maximal 4 px |
| 2,0–3,0 s | Zoom-out: Storybook-Sidebar erscheint um dieselben Pixel | Kamera 1300 → 1600 px |
| 2,95 / 3,5 / 4,05 s | Paare `saas-button` ↔ Business-Button, `saas-check-list` ↔ Pro-Liste, `saas-pricing-card` ↔ Free-Karte | Ring-Pop gleichzeitig an Seite und Menüeintrag, Lichtspur Menü → Komponente, kurzer Glanz über dem Element |
| 4,6–5,6 s | Kamera auf die Free-Pricing-Card | Schneller Quint-Zoom |
| 5,6–5,86 s | Match-Cut zur Entity-Story: `$0` bleibt stehen, die Entity-Story öffnet sich als Lichtkreis von dort | Lokaler Flare, kein Vollbild-Blitz |
| 5,8–6,75 s | Zoom-out auf die Entity-Story | Ring auf *Pricing Plan* und *card* in der Sidebar, Lichtspur zu `$0` |
| 7,9–8,35 s | Structure-Panel fährt hoch (Reveal der echten Panel-Aufnahme von unten) | Leuchtende Kante |
| 8,3–10,15 s | Panel kadriert | Ringe auf Composition-ENTITY und Detail-ENTITY mit Lichtspur, Mapping-Zeile, dann DATA SOURCE `price` ↔ `slot: price` |
| 10,15–10,95 s | Push in die `price`-Zeilen | – |
| 10,95–12,6 s | Lichtkreis-Match-Cut von `price` zur echten JSONata-Zeile | Ring `"price"`, dann `field_price` mit Lichtspur |
| 12,6–13,65 s | Lichtkreis-Match-Cut von `field_price` zur Datenmodell-Zeile `field_price` | Kamera kadriert Titel und Feldtabelle; Ringe auf `Pricing plan / node.pricing_plan` und der Zeile `field_price` |
| 13,85 s | – | Kurzes Aufleuchten der Zelle `field_price` |
| 14–15 s | Ruhiges Schlussbild | Komplett statisch: Kamera steht seit 13,65 s, Puls abgeklungen |

Es gibt keine Titelkarten, keinen erklärenden Text, keine Schlusskarte, keine KI- oder Log-Szenen
und keinen Figma-Wechsel. Alle Bilder sind ganz und unverzerrt (Assertion in `render.mjs` auf das
native Seitenverhältnis). Die Kamera skaliert und verschiebt nur. Es gibt kein Zerschneiden oder
Strecken.

## Validierung (beobachtet)

Beim letzten Durchlauf ausgeführt, nachdem die Screenshots neu aufgenommen worden waren und
`render.mjs` einmal synchronisierend gelaufen war:

```
ffprobe … intro.mp4  → h264 1920x1080 yuv420p, r_frame_rate=30/1, nb_frames=450, duration=15.000000
ffprobe -count_frames → nb_read_frames=450
ffmpeg -v error -i intro.mp4 -f null -  → keine Fehler (DECODE_OK)
Audio-Streams: 0
intro.mp4 6 384 126 Byte, poster.png 252 833 Byte
```

- Keyframes 0 / 4 / 7 / 10 / 13 / 14,5 s wurden direkt aus dem MP4 extrahiert und gesichtet, beim vorherigen Render auch als Kontaktbogen. Die Bildinhalte entsprechen der Tabelle oben. Namen und Werte (`saas-pricing-card`, `node/pricing_plan`, `slot: price`, `field_price`) sind lesbar.
- Korrekturen nach Sichtung: Blur beim Scroll-Whip reduziert; Structure-Kadrierung erweitert, damit die Composition-Spalte sichtbar bleibt; Crossfades mit Geisterbildern durch ankerbasierte Lichtkreis-Reveals ersetzt; Schlussbild so kadriert, dass „← Back to Data Model“ nicht angeschnitten ist.
- Ruhe der letzten Sekunde: Die Komposition ist bei t = 14,1 und t = 14,9 pixelidentisch (Diff-BBox `None`). Die decodierten MP4-Frames unterscheiden sich dort nur durch x264-Kodierungsresiduen.
- `render.mjs` bricht bei Seitenfehlern oder verzerrten Bildern per Assertion ab.

## Grenzen

- **Native Storybook-Hervorhebung:** In `sb-landing.png` trägt der Sidebar-Ordner *Data Display* den hellblauen Hover/Fokus-Hintergrund von Storybook (`:focus`-Regel, ausgelöst durch das Aufklappen). Das ist echter, harmloser UI-Zustand. Er bleibt in dieser Fassung sichtbar; am Produkt wurde nichts verändert.
- Das Panel wird hereingefahren, indem die echte Aufnahme mit Panel von unten über die Aufnahme ohne Panel aufgedeckt wird. Storybook animiert das Panel selbst nicht.
- Die Match-Cuts richten echte Anker aus (`$0`, `price`, `field_price`). Die umgebenden Layouts der beiden Ansichten unterscheiden sich, deshalb überdeckt der Lichtkreis den Wechsel für etwa 0,26 s.
- Die Bewegungsunschärfe beim Scroll-Whip ist ein Postproduktionseffekt, die Seite selbst ist unverändert.
- `capture.mjs` hängt vom laufenden Storybook auf Port 37541 und vom aktuellen Fixture ab. Nach Fixture-Änderungen erst `capture.mjs`, dann `render.mjs` ausführen.
