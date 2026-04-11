---
name: designbook:design:triage--design-verify
title: "Triage: {scene}"
when:
  steps: [design-verify:triage]
priority: 10
params:
  scene: ~
  storyId: ~
files: []
---

# Triage

Reads all draft issues from the compare stage, consolidates duplicates and overlapping issues, improves descriptions, publishes the final list to meta, and writes the `issues` array into workflow params for the polish stage.

## Step 1: Read All Draft Issues

Glob all draft files:
```
designbook/stories/${storyId}/issues/draft/*.json
```

Parse each file and collect all issues into a flat list. Tag each issue with its source file for traceability.

If no draft files exist or all are empty arrays, skip to Step 5 (no issues).

## Step 2: Consolidate and Rewrite

Review the full issue list across all checks and breakpoints:

1. **Merge duplicates** — same element + same property across different breakpoints or check types (e.g., markup extraction and screenshot both flag the same font-size). Keep the most specific description, note affected breakpoints.

2. **Group related issues** — multiple property deviations on the same element (e.g., Hero Heading has wrong fontSize AND fontFamily AND color) become ONE issue with a combined description. This prevents 6 separate polish tasks for one CSS fix.

   **Separation rule:** Each distinct actionable fix SHALL be a separate issue. If fixing one problem does not fix the other, they are separate issues — even if both appear in the same region or component. Example: "Logo icon missing" and "Search button missing" are two issues, not one.

3. **Assign an ID** — each consolidated issue gets a short, stable ID: `issue-<NNN>` (zero-padded, sequential). Example: `issue-001`, `issue-002`. The ID is used as task identifier in the polish stage.

4. **Rewrite descriptions as work instructions** — each issue description is rewritten so the polish task can execute it without additional context:

   **Format:**
   ```
   <Element>: <Property1> VON → NACH, <Property2> VON → NACH. Datei: <file_hint>. [Breakpoints: sm, xl.]
   ```

   **Example:**
   ```
   Hero Heading: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter', color #1D1B20 → #FFFFFF. Datei: components/hero/hero.twig. Breakpoints: sm, xl.
   ```

   Rules for rewriting:
   - Start with the element name (from `label` or inferred from description)
   - List ALL properties with concrete VON → NACH values
   - Always include `Datei:` with the file path
   - If the issue spans multiple breakpoints, list them
   - Keep it to one line — no markdown, no bullet lists

5. **Assign priority** — `critical` before `major`. Within same severity, group by file (so one polish task can fix multiple properties in one file).

## Step 3: Publish to Meta

Triage publishes all consolidated issues to meta, then closes duplicates that were merged.

1. **Add consolidated issues** — the CLI auto-assigns an `id` (issue-001, issue-002, …):
   ```bash
   _debo story issues --scene ${scene} --check ${checkKey} --add --json '[
     {"source":"…","severity":"…","description":"…rewritten actionable description…"}
   ]'
   ```
   The CLI response includes the assigned `id` for each issue — use these for the workflow params.

2. **Close duplicates** — draft issues that were merged into a consolidated issue are duplicates. Close them in meta so they don't appear as open:
   ```bash
   _debo story issues --scene ${scene} --check ${checkKey} --update ${index} --json '{"status":"done","result":"duplicate"}'
   ```
   Only close issues that are covered by a consolidated issue. Never create new issues beyond the consolidated set.

## Step 4: Write Issues to Workflow Params

The polish stage uses `each: issues`. Write the consolidated issues array into the workflow params so the engine can expand them.

Each issue object must contain `id` and the params that `polish.md` needs:

```json
{
  "id": "issue-001",
  "scene": "design-system:shell",
  "storyId": "designbook-design-system-scenes--shell",
  "checkKey": "sm--header",
  "severity": "critical",
  "description": "Hero Heading: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter', color #1D1B20 → #FFFFFF. Datei: components/hero/hero.twig. Breakpoints: sm, xl.",
  "file_hint": "components/hero/hero.twig",
  "properties": [
    {"property": "fontSize", "expected": "48px", "actual": "14px"},
    {"property": "fontFamily", "expected": "Inter", "actual": "Nunito Sans"}
  ]
}
```

Pass the `issues` array as params when marking this task done. The workflow engine expands polish tasks from it via `each: issues`.

## Step 5: Clean Up

Delete the draft directory:
```
designbook/stories/${storyId}/issues/draft/
```

## Output

```
## Triage: {scene}

Read 12 draft issues from 6 checks.
Consolidated to 4 issues:

1. issue-001 [critical] Hero Heading: fontSize 14px → 48px, fontFamily → Inter, color → white. Datei: hero.twig. Breakpoints: sm, xl.
2. issue-002 [major] Navigation: gap 8px → 16px, fontSize 14px → 16px. Datei: navigation.twig. Breakpoints: sm, xl.
3. issue-003 [major] Footer Copyright: color #1D1B20 → #49454F. Datei: footer.twig. Breakpoints: sm, xl.
4. issue-004 [major] Header: background-color #FFFFFF → transparent. Datei: header.twig. Breakpoints: sm, xl.

Published 4 issues to meta. Polish stage will create 4 fix tasks.
```
