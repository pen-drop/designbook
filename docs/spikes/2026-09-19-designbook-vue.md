# Spike: Vue-Komponenten in Designbook

Stand: 19.09.2026. Codebasis: `50c6b0856e19c8f8f04f6e7f803550cd7ac65e0f`.

## Entscheidungsvorschlag

**Designbook bekommt Vue als Komponenten-Framework, keinen eigenen Drupal-Vue-Workflow.**
Der Nutzer baut wie bisher Komponenten, Entity-Darstellungen und Screens. Das
Komponenten-Framework entscheidet, welche Dateien entstehen und wie Storybook sie
baut und rendert: Vue-SFCs statt SDC/Twig. Drupal bleibt unabhängig davon das Backend.

Lupus, Druxt und Nuxt sind für diese Kernentscheidung nicht erforderlich. Sie werden
erst relevant, wenn dieselben Komponenten in einer produktiven Website Daten,
Routing, Vorschauen und Server-Rendering erhalten sollen. Die Recherche dazu steht
im [Ökosystem-Bericht](2026-09-19-drupal-vue-ecosystem.md).

Der Spike umfasst Codeprüfung und einen ausgeführten Vue-SSR-Versuch. Er implementiert
keine vollständige Storybook- oder Drupal-Integration.

## Gleicher Ablauf, andere Komponentenausgabe

Der vorhandene Konfigurationsschnitt reicht als Ausgangspunkt:

```yaml
# Zielbild; vue ist aktuell noch keine vollständige unterstützte Integration.
backend: drupal
frameworks:
  component: vue
  css: tailwind
```

| Bereich | Verhalten mit Vue |
| --- | --- |
| Vision, Tokens, Sections, Referenzen | Gleiche Aufgaben und Artefakte |
| Datenmodell und Beispieldaten | Gleiche Drupal-Entitäten und Feldsemantik |
| Entity-Mapping und Szenen | Weiterhin JSONata und Komponentenbäume mit IDs, Props und Slots |
| Komponenten erstellen | `.vue` und passende Story-Dateien statt `.component.yml`/Twig |
| Storybook | Vue-Build und Vue-Renderer statt HTML/Twig |
| Drupal-Datenstruktur exportieren | Backend-Aufgabe; nicht durch Vue grundsätzlich verändert |
| Darstellung in Drupal/Frontend anbinden | Zielabhängig: SDC-Display-Konfiguration ist kein Vue-Deployment |

Wichtig: Gleicher Ablauf bedeutet nicht, dass SDC-spezifische Drupal-Displays oder
Twig-Presenter für Vue gültig werden. Dieser letzte Übergang bleibt eine eigene
Integrationsgrenze. Für das Entwerfen und Prüfen von Vue-Komponenten ist er nicht nötig.

## Was der vorhandene Code bereits ermöglicht

- Der [Component Builder](../../packages/storybook-addon-designbook/src/scene-model/builders/component-builder.ts)
  reicht Komponenten-IDs, Props und Slots durch, ohne Twig zu benötigen.
- [ComponentModule](../../packages/storybook-addon-designbook/src/scene-model/types.ts)
  stellt bereits `render(props, slots): unknown` bereit.
- [Szenenbau](../../packages/storybook-addon-designbook/src/scene-model/scene-module-builder.ts)
  und [Entity-Modulbau](../../packages/storybook-addon-designbook/src/scene-model/entity-module-builder.ts)
  erlauben `resolveImportPath` und `wrapImport`. Der vorhandene Default ist SDC.
- Der [Runtime-Renderer](../../packages/storybook-addon-designbook/src/addon/renderer/renderer.ts)
  kann Rückgaben von Vue-Komponenten weiterreichen; er erzwingt keine HTML-Ausgabe.

Damit braucht es weder einen zweiten Szenentyp noch ein Vue-spezifisches Datenmodell.
Die Wiederverwendung ist auf Codeebene begründet; vollständige Feature-Parität ist
noch nicht nachgewiesen.

## Konkrete Arbeit für Vue-Unterstützung

| Stelle | Erforderliche Änderung |
| --- | --- |
| Skill für Komponenten | Vue-Artefakte und Stories beim bestehenden `write-component` erzeugen; SDC-Regeln nur für SDC anwenden |
| Installation | Vue-Komponentenverzeichnis als Ziel zulassen; Drupal-Erkennung darf nicht zwingend ein Theme als Frontend-Ziel wählen |
| Komponenten-Inventar | Vue-Story-Namenskonvention in [story-patterns.ts](../../packages/storybook-addon-designbook/src/shared/config/story-patterns.ts) ergänzen; bisher nur SDC-Default |
| Preset/Build | Framework-Auswahl auswerten und Import-/Render-Anbindung an beide Modulbauer weitergeben; [preset.ts](../../packages/storybook-addon-designbook/src/addon/preset.ts) reicht diese Optionen derzeit nicht durch |
| Vue-Render-Anbindung | `.vue` importieren, Komponenten über `h()` erzeugen und benannte Slots als Funktionen übergeben |
| Generierte Stories | Vue-kompatible Story-Komponente erzeugen und bei Args-Änderungen neu rendern; [csf-prep.ts](../../packages/storybook-addon-designbook/src/scene-model/csf-prep.ts) liefert derzeit direkt das Render-Ergebnis |
| Eingebaute Komponenten | Bild und Platzhalter als native Vue-Ausgabe; aktuell liefern [built-in-components.ts](../../packages/storybook-addon-designbook/src/scene-model/built-in-components.ts) und ungelöste Slot-Platzhalter HTML |
| Preview und interne Seiten | [preview.ts](../../packages/storybook-addon-designbook/src/addon/preview.ts) darf Vue nicht in einen React-ThemeProvider stecken; DOM-Ausgaben der internen React-Seiten brauchen eine Vue-Mount-/Unmount-Brücke |
| Inspect | Vue-Ausgabe braucht Komponenten-Grenzen für den [Inspect-Decorator](../../packages/storybook-addon-designbook/src/addon/decorators/inspect-overlay.ts); aktuelle Marker entstehen nur bei HTML-Strings |
| Drupal-Export | Twig-Presenter/UI-Patterns-Displays auf passende Render-Ziele begrenzen; sie dürfen nicht allein wegen `backend: drupal` für Vue ausgewählt werden |

Vorschlag für den ersten Schritt: **normale Vue-3-Komponenten in Vue-Storybook**,
ohne Nuxt-Laufzeit in Designbook. Präsentationskomponenten erhalten Daten über Props
und Slots. Eine Nuxt-Seite kann dieselben Komponenten verwenden und Datenbeschaffung
übernehmen. Komponenten, die Nuxt-Composables oder Auto-Imports voraussetzen, brauchen
dagegen Nuxt-Kontext oder explizite Storybook-Ersatzimplementierungen; dafür besteht
noch kein Laufzeitnachweis.

Keine allgemeine Plugin-Plattform vorab bauen: Die bestehenden Import-/Render-Hooks
nutzen und die oben nachgewiesenen Framework-Annahmen gezielt auflösen.

## Ausgeführter Laufzeitversuch

Isoliert in einem temporären Verzeichnis, ohne Änderung der Projektabhängigkeiten:
Node `22.20.0`, Vue `3.5.43`. Die tatsächlichen TypeScript-Quelldateien des Renderers
und der eingebauten Komponenten wurden mit TypeScript transpiliert und importiert.
Danach wurde der unveränderte Renderer innerhalb von Vue-SSR ausgeführt.

Die einzige Anbindung für die zwei Versuchskomponenten war:

```js
const adapter = (component) => ({
  render: (props, slots) => h(component, props,
    Object.fromEntries(Object.entries(slots).map(
      ([name, value]) => [name, () => value],
    )),
  ),
});
```

Slots als Funktionen entsprechen der [Vue-Render-API](https://vuejs.org/guide/extras/render-function.html#passing-slots).
Das Beispiel ist ein Versuch, keine vollständige Renderer-Implementierung.

| Versuch | Beobachtung |
| --- | --- |
| `site:card` mit Titel-Prop und verschachteltem `site:text` im Default-Slot | `<article><h2>Artikel</h2><!--[--><p>Vue aus Designbook</p><!--]--></article>` |
| Titel im selben Baum ändern und erneut rendern | Überschrift wird `Geändert` |
| Bestehendes `designbook:image` in denselben Slot einsetzen | `&lt;img ...&gt;` statt eines Bildelements; auch Inspect-Kommentare werden escaped |

Alle drei Erwartungen wurden im Versuch mit Assertions bestätigt. Das zweite
Ergebnis prüft einen erneuten SSR-Aufruf, **keine** Browser-Reaktivität oder Storybook
Controls. Das dritte Ergebnis belegt, warum ein Import-Wrapper allein nicht reicht.

Nicht ausgeführt: `.vue`-SFC-Build, Storybook-Browserlauf, HMR, Hydration,
Drupal-/Lupus-Installation, echte API-Abfragen, Inspect und Export-End-to-End.

## Kleinster sinnvoller Implementierungsumfang

1. Vue-Komponenten und Stories über dieselben Designbook-Aufgaben erstellen;
   Inventar und Build auf Vue einstellen.
2. Eine Entity mit zwei Beispieldatensätzen als Card und Detail rendern, daraus
   einen Screen mit verschachtelten Slots bilden. Bild und Platzhalter einschließen.
3. Interne Designbook-Seiten, Theme, Controls, HMR, Inspect und Screenshot-Prüfung
   im selben Vue-Storybook verifizieren; Mounts bei Story-Wechsel sauber abbauen.
4. Dieselbe Vue-Komponente in einer kleinen Website verwenden. Erst wenn reale
   Drupal-Darstellungssynchronisation benötigt wird, deren Ziel konkret wählen.

Abnahme: Derselbe Modell-/Mapping-/Szenen-Vertrag funktioniert mit Vue, und der
Nutzer benötigt keinen zusätzlichen Designbook-Ablauf. Neue Fixtures von Grund auf;
keine Migration alter Artefakte.

**Ergebnis:** Der Ansatz „Vue statt SDC, ansonsten derselbe Ablauf“ ist tragfähig.
Die Arbeit sitzt überwiegend in Komponenten-Erzeugung und Storybook-Anbindung.
Lupus/Druxt gehören nicht als Voraussetzung in den Designbook-Kern.
