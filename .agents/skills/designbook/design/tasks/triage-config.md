---
name: designbook:design:triage-config
title: "Triage Config: {{ story_id }}"
trigger:
  steps: [triage-config]
domain: [sync-verify]
priority: 10
params:
  type: object
  required: [story_id, issues]
  properties:
    story_id:
      $ref: ../../scenes/schemas.yml#/StoryId
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

# Triage Config

Sync-verify triage: reads all draft issues from the compare stage, consolidates duplicates
and overlapping issues, rewrites descriptions as work instructions, and passes the
consolidated `issues` array as workflow params for the polish stage.

This is design-verify's triage with the fix axis flipped. The candidate is the **backend
render**; the reference is the live **Storybook render**. Every consolidated issue names the
**backend surface** (config for a `config` kind; the synced page's config **and** content for
a `scene` kind) as its fix surface, so the single `polish-config` pass adjusts what produced
the render — never the reference component.

> ⛔ The Storybook component, scene, and story are the **reference**. Never name a
> component/scene/story file as an issue's fix surface — the only fix surface is the backend
> config/content. The loaded subject-mapping and backend-integration rules define which backend
> surface maps to the rendered subject.

## Step 1: Read All Draft Issues

Read the `issues` array from scope — it contains all issues collected from the compare tasks via
their `result: issues` declarations.

If the `issues` array is empty, complete the task (no issues to consolidate).

## Step 2: Consolidate and Rewrite

Review the full issue list across all checks and breakpoints:

1. **Merge duplicates** — same subject + same property across different breakpoints or check
   types (e.g., markup extraction and screenshot both flag the same font-size). Keep the most
   specific description, note affected breakpoints.

2. **Group related issues** — multiple property deviations on the same subject become ONE issue
   with a combined description. This prevents several polish tasks for one config change.

   **Separation rule:** Each distinct actionable fix SHALL be a separate issue. If closing one
   deviation does not close the other, they are separate issues — even if both appear on the
   same rendered subject.

3. **Assign an ID** — each consolidated issue gets a short, stable ID: `issue-<NNN>` (zero-padded,
   sequential). Example: `issue-001`, `issue-002`. The ID is used as task identifier in the
   polish stage.

4. **Rewrite descriptions as work instructions** — each issue description is rewritten so the
   `polish-config` task can execute it without additional context:

   **Format:**
   ```
   <Subject>: <Property1> FROM → TO, <Property2> FROM → TO. Config: <config surface>. [Breakpoints: sm, xl.]
   ```

   Rules for rewriting:
   - Start with the rendered subject (from `label` or inferred from description)
   - List ALL properties with concrete FROM → TO values
   - Name the **config surface** to edit (the backend config that produced the render), never a
     component/scene/story file
   - If the issue spans multiple breakpoints, list them
   - Keep it to one line — no markdown, no bullet lists

5. **Assign priority** — `critical` before `major`. Within same severity, group by config surface
   (so one polish task can close multiple deviations on one config).

## Step 3: Report Consolidated Issues

The polish stage uses `each: issues`. Report the consolidated issues array as a task result so the
engine can expand them. Each issue object carries `id`, `severity`, `description`, and the config
surface the `polish-config` task needs; `file_hint` (when present) names the **backend config
surface**, not a component file.

The workflow engine expands `polish-config` tasks from the `issues` result via `each: issues`.
