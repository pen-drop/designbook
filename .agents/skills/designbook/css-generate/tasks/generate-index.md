---
files:
  - file: $DESIGNBOOK_DIRS_CSS/index.src.css
    key: index-css
    validators: []
---

# Generate CSS Token Index

Generates `$DESIGNBOOK_DIRS_CSS/index.src.css` — a barrel file with one `@import` per generated token CSS file.

## Step 1: List token files

Read all `*.src.css` files in `$DESIGNBOOK_DIRS_CSS/`, sorted alphabetically. Exclude `index.src.css` itself.

## Step 2: Write index.src.css

Write `$DESIGNBOOK_DIRS_CSS/index.src.css` with one `@import` per file:

```css
@import "./color.src.css";
@import "./grid.src.css";
/* ... */
```

Write via stdin:
```
designbook workflow write-file $WORKFLOW_NAME $TASK_ID --key index-css
```

## Step 3: Verify

Confirm `index.src.css` was written and contains at least one `@import`. Report the count:

```
✅ tokens/index.src.css — 6 imports
```
