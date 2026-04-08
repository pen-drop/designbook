---
name: designbook:design:polish
title: "Polish: {scene} ({breakpoint}/{region})"
when:
  steps: [polish]
priority: 50
params:
  scene: ~
  storyId: ~
  breakpoint: ~
  region: ~
files: []
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    optional: true
  - path: $DESIGNBOOK_DATA/design-system/guidelines.yml
    optional: true
---

# Polishdas 

Reads the compare reports and fixes code issues. Re-capture and re-compare are handled by the separate `recapture` and `verify` steps in the polish stage. Uses `DeboStory` entity for check data.

## Params (from DeboStoryCheck test item)

| Param | Source | Description |
|---|---|---|
| `scene` | test item | Scene reference |
| `storyId` | test item | Story identifier |
| `breakpoint` | test item | Breakpoint name |
| `region` | test item | Region name |

## Step 1: Read Compare Reports

Load the story entity to get the current check result:
```bash
_debo story --scene ${scene}
```

Read this breakpoint/region's `lastDiff` and `lastResult` from the entity. Read the compare report from the previous step. If no issues were found (`lastResult: pass`), complete immediately:

> "No visual issues found — skipping polish."

## Change Scope

| In scope | Out of scope |
|----------|-------------|
| Component templates (resolved via framework blueprint) | `design-tokens.yml` (requires tokens workflow) |
| Scene definitions (`*.scenes.yml`) | Workflow configuration |
| Story files (`*.story.yml`) | Component schema structure |
| CSS framework output files (resolved via CSS blueprint) | |

When CSS output values are changed to match the reference, the polish report MUST include a reconciliation note: "CSS output values adjusted — reconcile with `design-tokens.yml` via tokens workflow."

## Step 2: Analyze Issues

Prioritize by severity: Critical → Major → Minor. Focus on the highest-severity issues first.

## Step 3: Rule Compliance Check

Before applying any fix, verify it does not contradict any loaded rules for the current stage. Re-read active rules and check the proposed change against each constraint.

## Step 4: Fix Code

Edit the component files, scene definitions, or CSS to address the issues. Keep changes minimal and focused on the reported issues.

## Output

Report what was fixed:

```
## Polish Report

- Fixed: Layout alignment on sm breakpoint (Critical)
- Fixed: Font size mismatch on xl breakpoint (Major)
```
