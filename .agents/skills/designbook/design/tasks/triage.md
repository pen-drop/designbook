---
name: designbook:design:triage--design-verify
title: "Triage: {scene_id}"
when:
  steps: [triage]
priority: 10
params:
  type: object
  required: [scene_id, story_id, issues]
  properties:
    scene_id: { type: string }
    story_id: { type: string }
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
result:
  type: object
  required: [issues]
  properties:
    issues:
      type: array
      items:
        $ref: ../schemas.yml#/Issue
---

# Triage

Reads all draft issues from the compare stage, consolidates duplicates and overlapping issues, improves descriptions, and passes the consolidated `issues` array as workflow params for the polish stage.

## Step 1: Read All Draft Issues

Read the `issues` array from scope — it contains all issues collected from the compare tasks via their `result: issues` declarations.

If the `issues` array is empty, complete the task (no issues to consolidate).

## Step 2: Consolidate and Rewrite

Review the full issue list across all checks and breakpoints:

1. **Merge duplicates** — same element + same property across different breakpoints or check types (e.g., markup extraction and screenshot both flag the same font-size). Keep the most specific description, note affected breakpoints.

2. **Group related issues** — multiple property deviations on the same element (e.g., Hero Heading has wrong fontSize AND fontFamily AND color) become ONE issue with a combined description. This prevents 6 separate polish tasks for one CSS fix.

   **Separation rule:** Each distinct actionable fix SHALL be a separate issue. If fixing one problem does not fix the other, they are separate issues — even if both appear in the same region or component. Example: "Logo icon missing" and "Search button missing" are two issues, not one.

3. **Assign an ID** — each consolidated issue gets a short, stable ID: `issue-<NNN>` (zero-padded, sequential). Example: `issue-001`, `issue-002`. The ID is used as task identifier in the polish stage.

4. **Rewrite descriptions as work instructions** — each issue description is rewritten so the polish task can execute it without additional context:

   **Format:**
   ```
   <Element>: <Property1> FROM → TO, <Property2> FROM → TO. File: <file_hint>. [Breakpoints: sm, xl.]
   ```

   **Example:**
   ```
   Hero Heading: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter', color #1D1B20 → #FFFFFF. File: components/hero/hero.twig. Breakpoints: sm, xl.
   ```

   Rules for rewriting:
   - Start with the element name (from `label` or inferred from description)
   - List ALL properties with concrete FROM → TO values
   - Always include `File:` with the file path
   - If the issue spans multiple breakpoints, list them
   - Keep it to one line — no markdown, no bullet lists

5. **Assign priority** — `critical` before `major`. Within same severity, group by file (so one polish task can fix multiple properties in one file).

## Step 3: Report Consolidated Issues

The polish stage uses `each: issues`. Report the consolidated issues array as a task result so the engine can expand them.

Each issue object must contain `id` and the params that `polish.md` needs:

```json
{
  "id": "issue-001",
  "scene": "design-system:shell",
  "storyId": "designbook-design-system-scenes--shell",
  "checkKey": "sm--header",
  "severity": "critical",
  "description": "Hero Heading: fontSize 14px → 48px, fontFamily 'Nunito Sans' → 'Inter', color #1D1B20 → #FFFFFF. File: components/hero/hero.twig. Breakpoints: sm, xl.",
  "file_hint": "components/hero/hero.twig",
  "properties": [
    {"property": "fontSize", "expected": "48px", "actual": "14px"},
    {"property": "fontFamily", "expected": "Inter", "actual": "Nunito Sans"}
  ]
}
```

The workflow engine expands polish tasks from the `issues` result via `each: issues`.

## Output

```
## Triage: {scene}

Read 12 draft issues from 6 checks.
Consolidated to 4 issues:

1. issue-001 [critical] Hero Heading: fontSize 14px → 48px, fontFamily → Inter, color → white. File: hero.twig. Breakpoints: sm, xl.
2. issue-002 [major] Navigation: gap 8px → 16px, fontSize 14px → 16px. File: navigation.twig. Breakpoints: sm, xl.
3. issue-003 [major] Footer Copyright: color #1D1B20 → #49454F. File: footer.twig. Breakpoints: sm, xl.
4. issue-004 [major] Header: background-color #FFFFFF → transparent. File: header.twig. Breakpoints: sm, xl.

Consolidated 4 issues. Polish stage will create 4 fix tasks.
```
