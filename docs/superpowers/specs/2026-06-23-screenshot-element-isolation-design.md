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
sagt, ein Button bleibt button-groß. **Media-Queries** (viewport-basiert) reagieren
auf den Breakpoint-Viewport — genau das behebt Schmerzpunkt 3. Für
**Container-Queries** siehe Limitations.

### Hintergrund: Transparent

`html`/`body`-Hintergrund auf transparent + `omitBackground: true` beim Screenshot.
Leerraum neben einem schmaleren Element ist transparent und fällt im Diff beidseitig
identisch heraus. Behebt Schmerzpunkt 1.

## Scope

Der Selector-Pfad ("Element capture") wird umgestellt. Symmetrisch auf beiden Seiten:

- **Story** nutzt `check.selector`.
- **Referenz** nutzt `check.reference_selector`.

**Empty-Selector:** Der Ref-basierte Element-Crop (`snapshot`→`screenshot <ref>`)
entfällt **vollständig** — es gibt keinen Pfad mehr, der mit Element-Refs arbeitet.

- Leerer Story-Selektor → `#storybook-root` wird **ebenfalls isoliert** (ans
  body-Root gehoben + full-page transparent), nicht mehr per Ref gecroppt. Ein
  einheitlicher Isolations-Modus für alle Story-Captures.
- Leerer Referenz-Selektor → `--full-page` der Seite (wie bisher; keine Isolation,
  da kein einzelnes Ziel benannt ist).

**Unberührt:**

- Staged-File-Flow, Viewport-Höhe 1600px, Settle-Timeouts (3s), Session-Pinning
  (`-s=<workspace>`), Consent-Overlay-Dismissal, Storybook-Restart vor Recapture.

## Neuer Capture-Ablauf (Selektor vorhanden)

```
open
goto <url>
resize <breakpoint> × 1600
settle 3s
check.steps ausführen        ← falls vorhanden, im VOLLEN Layout (Reihenfolge wichtig)
eval: COUNT = querySelectorAll(selector).length
  ├─ COUNT == 0 → full-page-Fallback + Warnung, fertig   ← expliziter Branch, nie fail
  └─ COUNT  > 0 → weiter:
       run-code: ISOLATE(selector)   ← erstes Match freistellen
       settle                         ← Media-/Container-Queries reagieren neu
       run-code: page.screenshot({ fullPage: true, omitBackground: true, path: STAGED })
close
```

**Reihenfolge:** `check.steps` laufen **vor** dem Freistellen. So funktionieren auch
Interaktionen, die ein Element außerhalb des Ziels antippen (z.B. ein Toggle). Der
resultierende DOM-State bleibt nach dem Heben erhalten.

**Treffer-Erkennung getrennt vom Freistellen:** Erst per `eval` die Trefferzahl
abfragen (gibt einen Wert auf stdout, branchbar in der Shell), dann nur bei
COUNT > 0 isolieren + screenshoten. So kann der Befehlsablauf nicht versehentlich
die unveränderte Seite ablichten.

### ISOLATE-Funktion (via `run-code` → `page.evaluate`)

Die Selektor-Zeichenkette wird in den `run-code`-String eingebettet (der zweite
`eval`-Parameter von `playwright-cli` ist ein **Element-Ref**, kein Wert — daher
nicht für eine Selektor-Übergabe nutzbar; deshalb `run-code` + `page.evaluate`):

```js
async (page) => {
  await page.evaluate(() => {
    const el = document.querySelector('<selector>');  // erstes Match (inlined)
    document.body.replaceChildren(el);                 // body enthält nur noch das Ziel
    el.style.margin = '0';                              // Margin-Reste neutralisieren
    el.style.inset = 'auto';                            // top/left/right/bottom zurücksetzen
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    document.body.style.margin = '0';
  });
}
```

Die Höhe des Full-Page-Screenshots = Scroll-Höhe des freigestellten Elements (body
enthält nur noch dieses); die Breite = Viewport (Breakpoint). In-Flow-Overflow
(z.B. Dropdowns im Fluss, lange Inhalte) wird damit erfasst. **Caveat:**
out-of-flow Descendants (`position: absolute/fixed`) tragen u.U. nicht zur
Scroll-Höhe bei und können trotz full-page abgeschnitten werden — siehe Limitations.

## Nebeneffekt-Gewinn

Der Wechsel auf `page.screenshot` **eliminiert den Ref-Footgun**: heute invalidiert
jedes `resize` die `snapshot`-Refs, und ein `screenshot <ref>` gegen einen stale Ref
fällt still auf full-page zurück. Da nach der Umstellung **kein** Capture-Pfad mehr
mit Element-Refs arbeitet (auch der empty-selector Story-Pfad isoliert jetzt
`#storybook-root` statt zu croppen), verschwindet diese ganze Fehlerklasse samt der
zugehörigen Constraint vollständig.

## Edge Cases

- **Kein Treffer:** `querySelectorAll(sel).length == 0` → full-page-Fallback
  + Warnung. Skip-with-warning, **nie fail** (wie heute).
- **States:** `rest` = keine Steps, as-rendered. State-Checks laden die Session frisch
  pro State (Steps mutieren Page-State).
- **Element mit Offsets:** `margin: 0` + `inset: auto` neutralisieren Margin- und
  Top/Left-Reste. Das deckt den Normalfall ab; `transform`, `position: fixed` und
  positionierte Containing-Blocks können Offsets unabhängig davon behalten — siehe
  Limitations.

## Limitations

Bewusst akzeptierte Grenzen des Isolations-Ansatzes:

- **Container-Queries:** `body.replaceChildren(el)` entfernt den Container-Ancestor.
  Container-Query-Regeln (`@container`), die auf einen entfernten Ancestor zielen,
  greifen nach dem Heben ggf. nicht mehr. Akzeptiert: eine standalone-Komponente
  sollte ihren Query-Container selbst mitbringen; tut sie das nicht, ist die
  Abweichung ein realer Befund.
- **Shadow DOM:** `document.querySelector` pierct nicht in Shadow-Roots. Selektoren,
  die auf Inhalt innerhalb einer Web-Component (open/closed shadow root) zielen,
  matchen nicht → full-page-Fallback. Für Referenzen mit Web-Components ist ein
  Light-DOM-Selektor (Host-Element) zu wählen.
- **Iframes:** `document.querySelector` läuft nur im Top-Page-Kontext. Ziel-Inhalt
  in einem `<iframe>` der Referenzseite matcht nicht → full-page-Fallback.
- **Out-of-flow Overflow:** `position: absolute/fixed` Descendants tragen u.U. nicht
  zur Scroll-Höhe bei und können trotz full-page abgeschnitten werden.

## Geänderte Dateien

- `.agents/skills/designbook/design/rules/playwright-capture.md`
  — "Element capture"-Sektion neu: ISOLATE-Protokoll (eval-Trefferzahl-Branch →
  `run-code` `page.evaluate` Hoist → `run-code` `page.screenshot`) statt
  `snapshot`→`screenshot <ref>`. Stale-Ref-Constraint streichen (kein Ref-Pfad mehr).
- `.agents/skills/designbook/design/tasks/capture-storybook.md`
  — Schritt 2 auf Isolations-Modus; empty-selector → `#storybook-root` isolieren.
- `.agents/skills/designbook/design/tasks/capture-reference.md`
  — Schritt 2 auf den Isolations-Modus umformulieren.
- `.agents/skills/designbook/resources/cli-playwright.md`
  — Pattern "isolate-and-capture" ergänzen (`run-code` `page.evaluate` Hoist +
  `run-code` `page.screenshot({ fullPage, omitBackground })`).

## Testing

Testen passiert from-scratch über einen design-verify-Lauf gegen eine reale
Storybook-Instanz + Referenz-URL (kein Migrations-/Kompat-Code, bestehende
Screenshots sind disposable). Verifikation: freigestellte Captures haben
transparenten Leerraum, kein überlappendes Fremd-Element, und reagieren bei
unterschiedlichen Breakpoints sichtbar auf die jeweilige Breite.
