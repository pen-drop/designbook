# Promptfoo Evaluation Report

**Date:** 2026-03-09 02:25
**Tests:** 1 total, 1 passed, 0 failed
**Provider:** gemini-3-pro (vertex)
**Duration:** ~3m (eval) + 13s (re-grade)
**Total Tokens:** 18.3k (3.6k eval, 14.7k grading)
**Workspace:** `promptfoo/workspaces/debo-design-screen`

## Summary

| Test | Status | Score | Category |
|------|--------|-------|----------|
| debo-design-screen: PetMatch homepage | ✅ pass | 1.0 | — |

## Run History

### Run 1 — ❌ Failed (score: 0.5)

| Assertion | Status | Issue |
|-----------|--------|-------|
| Workflow rubric | ❌ | Rubric required `.component.yml` contents visible in output |
| Storybook build | ✅ | `pnpm build-storybook` succeeded |

**Root cause:** `assertion-too-strict` — Rubric point 4 required verifying `$schema`, `provider`, `thirdPartySettings` from conversation output, but the agent creates files without dumping their full contents. Also flagged `kebab-case` component names as wrong (`snake_case` required), but kebab-case is correct for SDC filenames.

**Fix applied:** Removed point 4 from rubric. The storybook build assertion already validates component structure (build fails on invalid `.component.yml`).

### Run 2 — ✅ Passed (score: 1.0)

Both assertions pass after rubric fix.

## Lessons Learned

- **Pattern:** Don't assert file contents from conversation output — the agent writes files but doesn't always echo them. Use storybook build or file system checks instead.
- **Pattern:** The storybook build assertion is the strongest validator — it catches esbuild transform errors, missing view-modes, invalid YAML, and broken components.
- **Pattern:** Component naming convention: filenames are `kebab-case`, the `name:` field inside `.component.yml` is `snake_case`. Rubrics should not conflate these.

## Changes Made This Session

### Promptfoo Config
- Updated design-screen prompt to mention view-modes, scenes, and storybook build
- Simplified assertion 1 (workflow rubric) to only check verifiable output
- Added assertion 2 (storybook build) — validates files actually render

### Fixture Setup
- Added `_shared/.storybook/main.js` — discovers components, section scenes, shell scenes
- Added `_shared/package.json` — Storybook + addon dependencies
- Added `pnpm-workspace.yaml` entries for `promptfoo/fixtures/*` and `promptfoo/workspaces/*`

### Workflow/Skill Improvements
- `debo-design-screen.md` Step 3.1 — now interactive (propose → confirm → create)
- `debo-design-component.md` — slimmed from 472 → 143 lines (orchestration only)
- `designbook-components-sdc/resources/component-patterns.md` — new resource with NLP parsing heuristics
- `designbook-components-sdc/SKILL.md` — added component-patterns.md to mandatory reading list

### Bug Fixes Applied Earlier
- `entity-renderer.ts` — flat data key fallback + valid JS fallback
- `vite-plugin.ts` — section inference from file path
