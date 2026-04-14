---
name: designbook:design:configure-meta
title: Configure Meta
when:
  steps: [configure-meta]
each: story
params:
  storyId: { type: string }
result:
  meta:
    path: designbook/stories/{storyId}/meta.yml
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
---

# Configure Meta

Create or update `meta.yml` for each scene after scene creation. This step ensures reference configuration is in place before the test stage runs capture and compare.

## Execution

1. **Resolve storyId** (if not provided as param):
   ```bash
   _debo story --scene ${scene}
   ```
   Parse the JSON output to get `storyId`.

2. **Check if `meta.yml` exists** at `designbook/stories/{storyId}/meta.yml`.

### If meta.yml exists:

Show the current configuration:

> "Scene **{storyId}** already has reference configuration:
>
> | Breakpoint | Threshold | Last Result |
> |-----------|-----------|-------------|
> | sm | 3% | — |
>
> Source: [origin] — [url]
>
> Keep as-is? (y/n)"

If keep: done. If update: continue as if it doesn't exist.

### If meta.yml does not exist:

2. **Determine reference source** from intake context:
   - If a Stitch screen ID was provided during intake → use it as source with `origin: stitch`
   - If a design reference URL was resolved during intake → use it with `origin: manual`
   - If no reference available → skip this scene:
     > "No reference for **{storyId}** — skipping meta configuration."

3. **Select breakpoints** — read `design-tokens.yml` for available breakpoints with pixel widths:

   > "Which breakpoints should be tested for **{storyId}**?
   >
   > Available:
   > - **sm** (640px)
   > - **md** (768px)
   > - **lg** (1024px)
   > - **xl** (1280px)
   >
   > Enter breakpoint names (default: sm):"

   For each selected breakpoint, ask threshold (default 3%).

4. **Determine regions** — read the scene definition from `*.scenes.yml`:

   - **Shell scenes** (scene has slots like `header`, `content`, `footer`): Create regions for all slots except `content` (placeholder). Each region uses the slot name as both region name and CSS selector (e.g. `header` → `selector: "header"`).
   - **Screen scenes** (scene fills a shell with content): Use a single `full` region with empty selector (full-page capture).
   - If the scene structure is unclear, ask the user.

   Every breakpoint always has at least one region.

5. **Write `meta.yml`:**

   **Shell scene (element regions):**
   ```yaml
   reference:
     source:
       url: "<resolved-url>"
       origin: "<origin>"
       screenId: "<screen-id>"
       hasMarkup: true/false
     breakpoints:
       sm:
         threshold: 3
         regions:
           header:
             selector: "header"
             lastDiff: null
             lastResult: null
           footer:
             selector: "footer"
             lastDiff: null
             lastResult: null
   ```

   **Screen scene (full-page region):**
   ```yaml
   reference:
     source:
       url: "<resolved-url>"
       origin: "<origin>"
       screenId: "<screen-id>"
       hasMarkup: true/false
     breakpoints:
       sm:
         threshold: 3
         regions:
           full:
             selector: ""
             lastDiff: null
             lastResult: null
   ```

6. **Ensure `.gitignore` entries** exist in workspace root:
   ```
   designbook/stories/*/screenshots/current/
   designbook/stories/*/screenshots/diff/
   ```

## Read Matched Rules

Read any matched rules for this step. Origin-specific rules (e.g., `provide-stitch-url`) may update `meta.yml` — for example, resolving a Stitch screen ID to a preview URL and setting `hasMarkup: true`.
