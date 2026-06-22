# Design-Verify Region Selector Unification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `design-verify` crops the reference to the verified region via a unified per-check `selector`, so entity (`app-signage`) and shell (header/footer) verification compare region-to-region instead of region-to-whole-page.

**Architecture:** Skill-only edits (workflow + 2 tasks + 1 rule + 1 schema description). Capture is agent-driven via `playwright-cli`; the element-capture mode already exists — it just has to be applied to the reference, keyed on `check.selector`, which `setup-compare` now fills per region.

**Tech Stack:** Markdown skill files under `.agents/skills/designbook/` (canonical). Verified by `/debo test drupal-web design-verify-entity-signage` + a shell verify case.

## Global Constraints

- Load `designbook-skill-creator` + the matching rule file before editing ANY skill file.
- Edit only `.agents/skills/...` (canonical), never `.claude/skills/...` (symlink).
- No migration / back-compat code.
- region→selector map (verbatim): `full` → workflow `selector` (empty ⇒ no crop); `header` → `header, [role=banner]`; `footer` → `footer, [role=contentinfo]`.
- The selector targets BOTH story and reference capture; a selector that matches no elements falls back (skip-with-warning), which keeps the entity story at full viewport while the reference crops.

---

### Task 1: design-verify gains a `selector` param

**Files:**
- Modify: `.agents/skills/designbook/design/workflows/design-verify.md`

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/workflow-files.md`. Re-read `design-verify.md`.
- [ ] **Step 2:** Add the param under `params:` (after `reference_folder`):

```yaml
  selector: { type: string, default: "" }
```

- [ ] **Step 3: Verify**: `grep -n "selector" .agents/skills/designbook/design/workflows/design-verify.md` → the new param present.
- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/workflows/design-verify.md
git commit -m "feat(design-verify): add selector param for region-targeted reference crop"
```

---

### Task 2: setup-compare fills each check's selector from a region→selector map

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/setup-compare.md`

**Interfaces:**
- Consumes: the workflow `selector` param (Task 1).
- Produces: `checks[]` where each check carries a `selector` resolved per region.

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/task-files.md`. Re-read `setup-compare.md`.
- [ ] **Step 2:** Add `selector` to the params block (after `regions`):

```yaml
    selector: { type: string, default: "" }
```

- [ ] **Step 3:** Add a "Region selector" section to the task body (after the "States" section):

```markdown
## Region selector

Each emitted check carries a `selector` — the crop target applied to both the story and
the reference capture. Resolve it per region:

| Region | `check.selector` |
|--------|------------------|
| `full` | the workflow `selector` param (e.g. `app-signage`); empty ⇒ no crop (full page) |
| `header` | `header, [role=banner]` |
| `footer` | `footer, [role=contentinfo]` |

The selector targets the region in both DOMs. A selector that matches nothing on one side
falls back to that side's full capture (see `playwright-capture`) — so an entity selector
that exists only on the reference crops the reference while the story (already just the
component) stays full.
```

- [ ] **Step 4: Verify**: `grep -n "Region selector\|role=banner\|role=contentinfo" .agents/skills/designbook/design/tasks/setup-compare.md` → hits.
- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/tasks/setup-compare.md
git commit -m "feat(design-verify): setup-compare sets per-region check.selector (header/footer/full)"
```

---

### Task 3: capture-reference honors check.selector (element-capture the reference)

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/capture-reference.md`

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/task-files.md`. Re-read `capture-reference.md`.
- [ ] **Step 2:** Replace Execution step 2 ("**Capture screenshot** for this breakpoint/region combination using the `playwright-capture` rule. Follow the capture protocol defined in `playwright-capture.md` …") with:

```markdown
2. **Capture screenshot** for this breakpoint/region using the `playwright-capture` rule.

   - When `check.selector` is non-empty, use **element-capture** mode — crop the reference
     to that selector (same as `capture-storybook` does for the story). If the selector
     matches no element on the reference page, fall back to full-page and warn (per
     `playwright-capture`); do not fail.
   - When `check.selector` is empty, full-page capture (region `full`).

   Follow `playwright-capture.md` for viewport resolution, the element-capture protocol
   (`snapshot` → `screenshot <ref>`), and the staged file flow.
```

- [ ] **Step 3: Verify**: `grep -n "check.selector\|element-capture" .agents/skills/designbook/design/tasks/capture-reference.md` → hits.
- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/capture-reference.md
git commit -m "feat(design-verify): capture-reference crops reference by check.selector"
```

---

### Task 4: playwright-capture rule + Check schema clarify selector applies to reference

**Files:**
- Modify: `.agents/skills/designbook/design/rules/playwright-capture.md`
- Modify: `.agents/skills/designbook/design/schemas.yml` (`Check.selector` description)

- [ ] **Step 1:** Load `designbook-skill-creator` + `rules/rule-files.md` + `rules/schema-files.md`. Re-read both files.
- [ ] **Step 2:** In `playwright-capture.md`, under "### Element capture (region with CSS selector)", append after the code block:

```markdown
This mode applies to **both** the reference and the Storybook story, keyed on
`check.selector`. The reference and the story are captured from different DOMs, so a
selector may match one and not the other — when it matches nothing, fall back to full-page
(skip-with-warning), never fail. This is what lets an entity selector (present only on the
reference) crop the reference while the isolated component story stays full-viewport.
```

- [ ] **Step 3:** In `schemas.yml`, change the `Check.selector` description from "Optional CSS selector — limits the capture to a subregion of the story render. When empty, the full story viewport area is used." to:

```yaml
      description: >
        Optional CSS selector — the region crop target applied to BOTH the story
        and the reference capture (element-capture mode). When empty, the full
        viewport / full page is used. A selector that matches no element on one
        side falls back to that side's full capture (never fails).
```

- [ ] **Step 4: Verify**: `grep -n "both the reference and the Storybook\|BOTH the story" .agents/skills/designbook/design/rules/playwright-capture.md .agents/skills/designbook/design/schemas.yml` → a hit in each.
- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/rules/playwright-capture.md .agents/skills/designbook/design/schemas.yml
git commit -m "docs(design-verify): selector crops reference + story; schema description"
```

---

### Task 5: e2e re-test (entity + shell)

- [ ] **Step 1: `pnpm check`** from worktree root — expect green (no addon code changed).
- [ ] **Step 2: Entity verify** — run `/debo test drupal-web design-verify-entity-signage` via debo-test (stop storybook, rebuild workspace, start storybook, dispatch ONE driver). Pass `selector=app-signage` to the design-verify `workflow create`.
- [ ] **Step 3: Assert** the reference screenshot under `designbook/references/174cdaac3562/xl--full.png` is now **cropped to the signage region** (height ≈ the app-signage element ~443px, not 4872px full page), and the `compare` diff_percent is a meaningful region-vs-region value (dimensions comparable), not 78% full-page mismatch.
- [ ] **Step 4: Shell verify regression** — run `/debo test drupal-web design-verify-shell` via debo-test. Assert it still completes; header/footer reference captures crop to `header, [role=banner]` / `footer, [role=contentinfo]`; no regression.
- [ ] **Step 5:** Report both runs' scores; commit any fixture refinements (none expected).

## Notes for the implementer
- No addon/TypeScript changes. If a step tempts you to edit `packages/...`, stop — the capture is agent-driven via `playwright-cli`.
- The entity story has no `app-signage` element (Storybook renders the SDC `signage` component as a `<section>`); the selector is expected to NOT match the story → story stays full. That is correct, not a bug.
