## Context

The `design-verify` workflow has a 6-stage pipeline: intake → capture → compare → triage → polish → outtake. A research audit after an end-to-end test run revealed contradictions, stale references, and missing consolidation rules across 5 skill task/rule files. All issues are in skill markdown files (AI instructions), not in TypeScript code.

## Goals / Non-Goals

**Goals:**
- Fix contradictory meta-publishing in compare-screenshots (drafts only, triage publishes)
- Fix stale `npx playwright-cli` reference in compare-markup
- Fix polish title interpolation (use separate `description` field correctly)
- Add explicit CLI command documentation for triage Step 4
- Add triage consolidation rule: one issue per distinct element/action
- Remove vestigial `verify` step from playwright-capture rule

**Non-Goals:**
- No TypeScript/CLI code changes
- No new workflow stages or architectural changes
- No changes to the `description` field implementation (already working in TypeScript)

## Decisions

1. **Draft-only publishing in compare tasks**: Compare tasks write draft JSON files only. All meta-publishing goes through triage. This is the intended architecture — compare-screenshots.md Phase 2 CLI calls are leftover from a pre-triage design.

2. **Polish title format**: Change from `"Polish Issue {id}: "` to `"Polish {id}"`. The description is already a separate frontmatter field that renders in the panel. The trailing colon-space was a remnant from when description was appended to title.

3. **Triage consolidation rule**: Add explicit instruction that each distinct actionable fix SHALL be a separate issue. Do not merge "Logo icon missing" with "Search button missing" just because they're in the same component region. The heuristic: if fixing one does not fix the other, they are separate issues.

4. **`--update` by ID**: Document that `--update` accepts either a numeric index or an issue `id` string. The CLI already supports both — the task file just didn't document it.

## Risks / Trade-offs

- [Risk] Changing compare-screenshots instructions may confuse agents that have cached the old pattern → Mitigation: The old Phase 2 was already being skipped in practice; removing it aligns docs with actual behavior
- [Risk] Triage consolidation rule adds complexity to an already complex task → Mitigation: Rule is a single sentence ("one fix = one issue"), not a new algorithm
