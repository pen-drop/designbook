# Designbook — Storytelling für den 15-Sekunden-Film

Status: In der Unterhaltung bestätigte Richtung. Zwei eigenständige Umsetzungen
mit Astra und Opus liegen in diesem Ordner; siehe [Videovergleich](index.html).
Diese Vorgabe ersetzt das Konzept des bisherigen 22-Sekunden-Films. Auf der
Landingpage bleibt dieser bis zur Auswahl einer neuen Fassung eingebunden.

## Geschichte

Eine fertige Webseite wird als strukturiertes System erkennbar: Zuerst sieht man
nur die Seite, dann ihre Komponenten in Storybook, anschließend eine Entity mit
ihrem Mapping und schließlich das zugehörige Datenfeld.

Ein durchgehender Kameraflug durch das echte Produkt. Keine KI-Szenen,
Claude-Logs, Figma-Wechsel oder erklärenden Texttafeln. Die Benutzeroberfläche
und die synchronen Hervorhebungen erzählen die Geschichte.

## Ablauf — insgesamt 15 Sekunden

| Zeit | Bild und Kamerabewegung | Bewegung und Akzent |
| --- | --- | --- |
| 0–2 s | Die fertige Webseite füllt das Bild. | Leichter Kameraschub in die Seite. |
| 2–5 s | Die Kamera zoomt etwas heraus; die Storybook-Seitenleiste erscheint. | Drei Komponenten auf der Seite und ihre Einträge links im Menü poppen jeweils gleichzeitig auf. Ein kurzer Lichtimpuls betont jedes Paar. |
| 5–8 s | Die Kamera zieht zur Pricing Card. Links wird die passende Entity `pricing_plan` angezeigt. | Schneller, gezielter Zoom. Ein heller Übergangsimpuls begleitet den Wechsel zur Entity-Story. |
| 8–11 s | Unten erscheint das Structure-Panel mit der ausgewählten Entity und ihrem Mapping. | Das Panel fährt hoch. Eine Lichtspur verbindet Entity, Komponente und Mapping. |
| 11–14 s | Die Kamera zoomt ins Mapping und folgt der Zuordnung zum passenden Datenfeld, beispielsweise `field_price`. | Schneller Fokuswechsel; Quellfeld und Ausgabe werden gemeinsam hervorgehoben. |
| 14–15 s | Die konkrete Zuordnung bleibt sichtbar. | Das Feld leuchtet kurz auf. Danach eine Sekunde Ruhe zum Verstehen. |

## Bewegungsstil

- Sehr dynamisch, schnell und rhythmisch: kurze Beschleunigungen, klare Zielpunkte.
- Komponenten und zugehörige Menüeinträge immer synchron hervorheben.
- Blitzer gezielt auf Übergängen: kurze Lichtkanten, Leuchten und Lichtimpulse.
- Kein dauerhaftes Vollbildflackern. Die Blitzer unterstützen die Orientierung.
- Screenshots und UI-Elemente nicht willkürlich zerschneiden oder verzerren.
- Zooms halten den gerade wichtigen Namen, Wert oder Zusammenhang lesbar.
- Die letzte Sekunde bleibt ruhig; keine zusätzliche Schlusskarte.

## Fachliche Grundlage der Aufnahme

Die aktuelle Figma-Fixture enthält eine Canvas Page mit einem inline
Komponentenbaum. Die dort sichtbare Pricing Card ist kein eingebetteter
`pricing_plan`-Entity-Verweis. Der Entity-Schritt wechselt deshalb nachvollziehbar
zur separaten Entity-Story. Der Film darf keine nicht vorhandene Entity-Verknüpfung
innerhalb der Canvas Page vortäuschen.

Die aufgenommene Entity-Story ist `entities-node-pricing-plan--card`. Das
Structure-Panel zeigt den aufgelösten Slot `price`; die tatsächliche
JSONata-Zuordnung liest `field_price`. Die Schlussansicht zeigt dieses Feld
im Datenmodell. Die unterschiedlichen UI-Bezeichnungen bleiben erhalten.

Mit dem letzten Schritt „Data Mapping“ ist in diesem Storyboard der Wechsel vom
Mapping zum zugehörigen Datenmodell/Feld gemeint. Diese Interpretation wird mit der Detailansicht des Pricing-plan-Datenmodells
umgesetzt.

## Schlüsselbilder der Umsetzung

Die Kamerafahrt basiert auf diesen Aufnahmen aus der echten Oberfläche:

1. Webseite ohne Storybook-Chrome.
2. Webseite mit Seitenleiste und synchron markierten Komponenten.
3. Pricing-Entity mit passendem Eintrag links.
4. Structure-Panel mit sichtbarem Mapping.
5. Mapping und zugehöriges Datenfeld als Schlussbild.

Die variantenspezifischen Aufnahmen, Kamerafahrten und Render-Anweisungen liegen
in `astra/` und `opus/`. Beide Filme dauern 15 Sekunden.
