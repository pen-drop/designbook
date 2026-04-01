---
files:
  - $DESIGNBOOK_DIRS_CSS/tokens/index.src.css
---

# Generate CSS Token Index

Generiert `css/tokens/index.src.css` — eine Sammeldatei mit einem `@import`-Eintrag pro vorhandener Token-CSS-Datei.

## Schritt 1: Token-Dateien ermitteln

Lese alle `*.src.css`-Dateien aus `$DESIGNBOOK_DIRS_CSS/tokens/`, alphabetisch sortiert. Schließe `index.src.css` selbst aus.

## Schritt 2: index.src.css schreiben

Schreibe `$DESIGNBOOK_DIRS_CSS/tokens/index.src.css` mit je einem `@import`-Eintrag pro Datei:

```css
@import "./color.src.css";
@import "./grid.src.css";
/* ... */
```

Schreibe die Datei via stdin:
```
designbook workflow write-file $WORKFLOW_NAME $TASK_ID
```

## Schritt 3: Verifizieren

Prüfe dass `index.src.css` geschrieben wurde und mindestens einen `@import`-Eintrag enthält. Berichte die Anzahl der Imports:

```
✅ tokens/index.src.css — 10 imports
```
