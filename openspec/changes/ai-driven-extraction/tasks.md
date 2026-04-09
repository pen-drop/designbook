## 1. Rewrite compare-markup Task

- [ ] 1.1 Rewrite `.agents/skills/designbook/design/tasks/compare-markup.md` — replace the current monolithic inspection with the three-phase model: Phase 1 (AI generates extraction-spec.yml), Phase 2 (Playwright executes spec on both URLs), Phase 3 (diff + AI evaluation + _debo story check)
- [ ] 1.2 Phase 1 instructions: AI opens Playwright on reference URL, retrieves DOM summary (tag names, class names, landmark roles), inspects reference screenshot, then writes `extraction-spec.yml` with elements/selectors/labels/categories/extract properties
- [ ] 1.3 Phase 2 instructions: for each element in extraction-spec.yml, run `querySelectorAll(selector)` and `getComputedStyle()` on both reference and Storybook URLs via Playwright session, write `extraction-reference.json` and `extraction-storybook.json`
- [ ] 1.4 Phase 3 instructions: compute deterministic diff → `extraction-diff.json`, AI evaluates severity (critical/major/minor/info), persist result via `_debo story check --scene ${scene} --json '{"breakpoint":"<bp>","region":"markup","status":"pass|fail","issues":[...]}'`
- [ ] 1.5 Add extraction-spec.yml format documentation to the task (selector, label, category, extract, content_check, match_children fields)
- [ ] 1.6 Add extraction JSON output format to the task (url, viewport, elements with label/selector/category/matches/styles/content)
- [ ] 1.7 Add diff JSON format to the task (summary counts, elements with status/diffs per property)
- [ ] 1.8 Add severity classification table to the task (critical/major → fail, minor/info → pass)
- [ ] 1.9 Add iterative refinement section: AI may generate supplementary spec for problem areas, max 2 rounds
- [ ] 1.10 Add spec reuse section: on re-run, AI may reuse/refine existing extraction-spec.yml

## 2. Update polish Task

- [ ] 2.1 Update `.agents/skills/designbook/design/tasks/polish.md` — add instruction to read `extraction-diff.json` alongside screenshot comparison results; diff contains labeled elements with concrete values (e.g., "Hero Heading fontSize: expected 3rem, got 2.5rem")

## 3. Verification

- [ ] 3.1 Run `./scripts/setup-workspace.sh drupal-stitch` from repo root, then manually trigger a `design-verify` workflow on a scene with a reference URL — verify that extraction-spec.yml is generated, both extraction JSONs are written, diff is computed, and _debo story check receives structured markup result
