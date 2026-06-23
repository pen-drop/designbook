# Screenshot via Element-Isolation statt Bounding-Box-Crop

**Datum:** 2026-06-23
**Status:** Design (genehmigt, bereit für Implementierungsplan)

## Problem

Der aktuelle Screenshot-Pfad für Checks mit CSS-Selektor (`design-verify`) croppt
das **Bounding-Box-Rechteck** des Elements: `playwright-cli snapshot` →
`screenshot <ref>`. Das Rechteck enthält alles, was an dieser Stelle liegt — nicht
nur das Zielelement.

Drei konkrete Schmerzpunkte:

1. **Hintergrund stört den Diff.** Hintergrundpixel im Crop-Rechteck verfälschen den
   Pixel-Diff gegen die Referenz.
2. **Überlappende Elemente.** Das Crop-Rechteck fängt Nachbar-, Sticky- oder
   Overlay-Elemente mit ein, die nicht zum Ziel gehören.
3. **Falsches responsive Verhalten.** Das Element wird in seinem ursprünglichen
   Layout-Kontext gecroppt. Seine effektive Breite kommt vom umgebenden Container,
   nicht vom Breakpoint — Media-/Container-Queries reagieren auf die falsche Breite.

## Lösung

Selektor nicht mehr zum Croppen verwenden, sondern zum **Freistellen**: das **erste
gematchte Element** ans `body`-Root heben, alles andere entfernen, dann den ganzen
Viewport (full-page, transparent) screenshoten.

### Mechanik: Heben ans Body-Root

Der DOM-Knoten wird real ans `body`-Root verschoben (`body.replaceChildren(el)`).
Begründung: Eine Storybook-Komponente kennt ihren Vater ohnehin nicht — sie ist
standalone. Wenn ein Eltern-Container das CSS einer Komponente beeinflusst, ist
**das der Designfehler**, den `design-verify` aufdecken soll, nicht verstecken.

Konsequenz und Intention:

- Stylesheets in `<head>` bleiben erhalten → eigene Klassen-/Tag-Regeln greifen
  weiter.
- Ancestor-Kombinatoren (`.parent .target { … }`) und von Vorfahren vererbte
  Custom-Properties brechen — **gewollt**. Bricht die Referenz dadurch sichtbar,
  ist das ein echter Befund.

### Breite: Self-Sizing am Breakpoint

Dem Element wird **keine** Breite aufgezwungen. Viewport = Breakpoint-Breite; das
Element rendert mit seiner eigenen CSS-Breite. Header spannt 100% weil sein CSS das
sagt, ein Button bleibt button-groß. Media-/Container-Queries reagieren auf den
Breakpoint-Viewport — genau das behebt Schmerzpunkt 3.

### Hintergrund: Transparent

`html`/`body`-Hintergrund auf transparent + `omitBackground: true` beim Screenshot.
Leerraum neben einem schmaleren Element ist transparent und fällt im Diff beidseitig
identisch heraus. Behebt Schmerzpunkt 1.

## Scope

Betroffen ist **ausschließlich der Selector-Pfad** ("Element capture"). Symmetrisch
auf beiden Seiten:

- **Story** nutzt `check.selector`.
- **Referenz** nutzt `check.reference_selector`.

**Unberührt:**

- Leerer Selektor → Story = `#storybook-root` Element-Capture, Referenz =
  `--full-page` (wie bisher).
- Staged-File-Flow, Viewport-Höhe 1600px, Settle-Timeouts (3s), Session-Pinning
  (`-s=<workspace>`), Consent-Overlay-Dismissal, Storybook-Restart vor Recapture.

## Neuer Capture-Ablauf (Selektor vorhanden)

```
open
goto <url>
resize <breakpoint> × 1600
settle 3s
check.steps ausführen        ← falls vorhanden, im VOLLEN Layout (Reihenfolge wichtig)
eval: ISOLATE(selector)      ← erstes Match freistellen
settle                       ← Container-/Media-Queries reagieren neu
run-code: page.screenshot({ fullPage: true, omitBackground: true, path: STAGED })
close
```

**Reihenfolge:** `check.steps` laufen **vor** dem Freistellen. So funktionieren auch
Interaktionen, die ein Element außerhalb des Ziels antippen (z.B. ein Toggle). Der
resultierende DOM-State bleibt nach dem Heben erhalten.

### ISOLATE-Funktion (browser-context `eval`)

```js
(sel) => {
  const el = document.querySelector(sel);   // erstes Match
  if (!el) return false;                      // kein Treffer → Aufrufer: full-page-Fallback + Warnung
  document.body.replaceChildren(el);          // body enthält nur noch das Ziel
  el.style.margin = '0';                       // Offset-Reste neutralisieren
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  document.body.style.margin = '0';
  return true;
}
```

Die Höhe des Full-Page-Screenshots = natürliche Höhe des freigestellten Elements
(body enthält nur noch dieses); die Breite = Viewport (Breakpoint). Overflow
(Schatten, Dropdowns) wird damit vollständig erfasst.

## Nebeneffekt-Gewinn

Der Wechsel auf `--full-page`/`page.screenshot` im Selector-Pfad **eliminiert den
Ref-Footgun**: heute invalidiert jedes `resize` die `snapshot`-Refs, und ein
`screenshot <ref>` gegen einen stale Ref fällt still auf full-page zurück. Ohne
`snapshot`/`<ref>` im Selector-Pfad verschwindet diese ganze Fehlerklasse samt der
zugehörigen Constraint.

## Edge Cases

- **Kein Treffer:** `document.querySelector(sel)` liefert `null` → full-page-Fallback
  + Warnung. Skip-with-warning, **nie fail** (wie heute).
- **States:** `rest` = keine Steps, as-rendered. State-Checks laden die Session frisch
  pro State (Steps mutieren Page-State).
- **Element mit `position: absolute/fixed` oder Offsets:** `margin: 0` neutralisiert
  Margin-Reste; nach dem Heben ans Root sitzt das Element am Ursprung.

## Geänderte Dateien

- `.agents/skills/designbook/design/rules/playwright-capture.md`
  — "Element capture"-Sektion neu: ISOLATE-Protokoll statt `snapshot`→`screenshot
  <ref>`. Die Stale-Ref-Constraint streichen (nur noch im — entfallenden —
  Ref-Pfad relevant).
- `.agents/skills/designbook/design/tasks/capture-storybook.md`
  — Schritt 2b auf den Isolations-Modus umformulieren.
- `.agents/skills/designbook/design/tasks/capture-reference.md`
  — Schritt 2 auf den Isolations-Modus umformulieren.
- `.agents/skills/designbook/resources/cli-playwright.md`
  — Pattern "isolate-and-capture" ergänzen (eval ISOLATE + run-code
  `page.screenshot({ fullPage, omitBackground })`).

## Testing

Testen passiert from-scratch über einen design-verify-Lauf gegen eine reale
Storybook-Instanz + Referenz-URL (kein Migrations-/Kompat-Code, bestehende
Screenshots sind disposable). Verifikation: freigestellte Captures haben
transparenten Leerraum, kein überlappendes Fremd-Element, und reagieren bei
unterschiedlichen Breakpoints sichtbar auf die jeweilige Breite.
