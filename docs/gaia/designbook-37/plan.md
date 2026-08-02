# DESIGNBOOK-37 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the design reference visible in the ticket at `spec` and make the Storybook/Drupal preview links at `coding` conditional — by moving reference-screenshot capture into `extract-reference`, reducing `ensure-baseline` to a check, and linking the results from both `designbook-gaia` step-skills.

**Architecture:** `@designbook/design` gains the capture responsibility: `extract-reference` captures the reference baseline matrix (`_debo capture matrix`) plus a guaranteed mobile/desktop overview into the committed `reference_folder`; `ensure-baseline` is reduced to verifying those PNGs exist, capturing only as a self-healing fallback. The two `designbook-gaia` GAIA step-skills gain an overridable `reference_capture` input that links the reference PNGs at `spec`, and turn the `coding` Storybook/Drupal preview links from unconditional to conditional.

**Tech Stack:** debo task markdown (`.agents/skills/designbook/design/tasks/*.md`), GAIA workflow-step `SKILL.md` (`.agents/skills/designbook-gaia/skills/*/SKILL.md`), the existing `_debo capture matrix` / `_debo capture screenshot` CLI. No addon TypeScript.

## Global Constraints

- **Canonical edit location:** `.agents/skills/…` only; `.claude/skills/` is a symlink — never edit it.
- **Load `designbook-skill-creator` before editing ANY `design/tasks/*.md`** (task files): follow `rules/task-files.md` + `rules/common-rules.md` — WHAT not HOW, no task-local params outside the `params:` block, `design/schemas.yml` is the SSOT.
- **`designbook-gaia` step-skills follow `@gaia/workflow-step`** — `when:` triples are immutable; every `inputs` value carries `description` **and** `default` (effective = override ?? default); prose-per-step incl. routing; `gaia_rich` markdown.
- **Prose language: English** (both `SKILL.md` and the task files are English).
- **Do NOT touch:** `when:` triples, `design_verify`/`config_verify` measurement recording (step 4 of each `## coding`), RED/GREEN gates, transition destinations, `@gaia/merge-mr` gate, `## diagnose`/`## review`/`## Multi-work` sections, `compare`, `capture`, `ensure-baseline-live`, the `designbook-gaia` index `SKILL.md`, and any gaia helper skill.
- **No addon code.** `_debo capture matrix` and `_debo capture screenshot` already exist.
- **Matrix PNG naming is fixed:** `<breakpoint>--<element>--<state>.png` (consumed by `compare`); the overview naming is `overview--<viewport>--<bp>.png`.
- **Viewport mapping:** mobile = narrowest defined breakpoint, desktop = widest defined breakpoint; pixel widths via the existing breakpoint→width resolution (token values in `design-system/design-tokens.yml` win over Tailwind defaults).

---

## File Structure

| File | Responsibility after this plan |
|---|---|
| `.agents/skills/designbook/design/tasks/extract-reference.md` | extracts the reference **and** captures the baseline matrix + guaranteed mobile/desktop overview into `reference_folder` |
| `.agents/skills/designbook/design/tasks/ensure-baseline.md` | verifies the planned baseline PNGs exist (image validator); captures only as a fallback |
| `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md` | `spec` links the reference; `coding` Storybook + Drupal preview links conditional |
| `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md` | `spec` links the reference (always `not_required` — no `reference_url`); `coding` links conditional |

Tasks 1→2 are the design-family change (capture producer, then check consumer); Tasks 3 and 4 are the two independent GAIA step-skills; Task 5 verifies all four together.

---

## Task 1: `extract-reference` captures the reference baseline + overviews

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md`

**Interfaces:**
- Consumes: existing params `reference_folder`, `breakpoints`, `elements`, `vision`; existing `_debo extract`, `_debo capture matrix <meta.yml> --url <url> --out <dir>`, `_debo capture screenshot --url <url> --out <png> --width <px> --full-page`; `resolveBreakpointWidths` behavior (token widths win, ascending).
- Produces: reference PNGs in `reference_folder` — the matrix `<breakpoint>--<element>--<state>.png` (consumed by Task 2's check and by `compare`) and two overviews `overview--mobile--<bp>.png` / `overview--desktop--<bp>.png` (consumed by Tasks 3 & 4's link surface). `result.reference_screenshots` unchanged in shape; the overviews are additionally listed.

- [ ] **Step 1: Load the authoring skill.** Invoke `designbook-skill-creator` and read `rules/task-files.md` + `rules/common-rules.md`. This task file must stay WHAT-not-HOW and carry no new params.

- [ ] **Step 2: Read the current file and the schema.** Read `extract-reference.md` in full and `design/schemas.yml` `#/Screenshot` + `#/ReferenceFolder`. Confirm `Screenshot` can represent an overview (element = `full` / empty selector at the mobile/desktop breakpoint); if a distinct overview marker is genuinely needed, add it to the schema (SSOT) — do **not** encode it only in prose.

- [ ] **Step 3: Add the capture step to the extraction flow.** After the `## Extract mechanics` section, add a `## Capture the reference baseline` section with this content (adjust wording to the file's voice, keep it WHAT-level):

  > ## Capture the reference baseline
  >
  > After `_debo extract` has written `meta.yml`, capture the reference PNGs into `{{ reference_dir }}` so a rendered baseline exists immediately (downstream `ensure-baseline` then only verifies them):
  >
  > 1. **Baseline matrix** — `_debo capture matrix {{ reference_dir }}/meta.yml --url <reference-url> --out {{ reference_dir }}`: one browser pass that expands every `elements[] × state × breakpoint` from `meta.yml`, reuses frozen PNGs, and names each `<breakpoint>--<element>--<state>.png`.
  > 2. **Mobile + desktop overview** — always capture one full-page overview at the narrowest and one at the widest defined breakpoint, so the reference has a human-facing at-a-glance view even when no `full` element is defined. Resolve the two pixel widths through the breakpoint→width mapping (token widths win) and run `_debo capture screenshot --url <reference-url> --out {{ reference_dir }}/overview--<viewport>--<bp>.png --width <px> --full-page` for `<viewport>` ∈ {`mobile`, `desktop`}. When a `full`/empty-selector element already covers those breakpoints in the matrix, that capture doubles as the overview — do not capture twice.

- [ ] **Step 4: Move `--refresh-reference` + preserve "No reference".** Relocate the `--refresh-reference` semantics (delete `*.png` then re-capture) into the new capture section so it governs capture here. Keep the existing `## No reference` rule verbatim (empty `reference_folder` ⇒ `reference_dir: ""`, empty `reference_screenshots`, no files, no capture). Keep the `## Stable baseline — reuse or accumulate` reuse behavior.

- [ ] **Step 5: Surface the overviews in the result.** In `## Result: reference_screenshots`, state that the two overviews are included in the materialized list (or the added schema field), so `result` reflects them.

- [ ] **Step 6: Verify authoring validity.** Run the `designbook-skill-creator` validation the skill prescribes for a task file (frontmatter/schema/ref checks). Expected: passes. Confirm by grep:

  Run: `grep -n "_debo capture matrix\|_debo capture screenshot\|overview--\|--refresh-reference\|No reference" .agents/skills/designbook/design/tasks/extract-reference.md`
  Expected: capture-matrix + capture-screenshot + `overview--` naming + refresh + No-reference all present.

- [ ] **Step 7: Confirm no unrelated change.**

  Run: `git diff -- .agents/skills/designbook/design/tasks/extract-reference.md`
  Expected: only the capture section, refresh relocation, and result note; `params:` block unchanged (no new param); `## No reference` intact.

- [ ] **Step 8: Commit.**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(designbook-37): extract-reference captures reference baseline + overviews"
```

---

## Task 2: `ensure-baseline` reduced to verify-with-capture-fallback

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/ensure-baseline.md`

**Interfaces:**
- Consumes: the reference PNGs produced by Task 1 (naming `<breakpoint>--<element>--<state>.png`); existing params `screenshot`, `reference_dir`; existing `_debo capture matrix` / `_debo capture screenshot` (fallback only).
- Produces: `result.screenshot_file` at the unchanged path `{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png` (so `compare` stays unchanged). Behavior changes from capture-first to verify-first.

- [ ] **Step 1: Load the authoring skill.** Invoke `designbook-skill-creator`, read `rules/task-files.md` + `rules/common-rules.md`.

- [ ] **Step 2: Read the current file.** Read `ensure-baseline.md` in full. Note the `result` schema path and `each.screenshot` expansion must stay unchanged.

- [ ] **Step 3: Rewrite the body to verify-first.** Replace the `# Ensure Baseline` body (the `**Capture the whole baseline matrix…**` paragraph + the 3 numbered steps) with:

  > # Ensure Baseline
  >
  > Verify the frozen reference baseline is present. `extract-reference` captured it during extraction; this step only confirms it and reads it back. For this `screenshot`:
  >
  > 1. **Verify present.** If the result PNG `{{ reference_dir }}/{{ screenshot.breakpoint }}--{{ screenshot.element }}--{{ screenshot.state }}.png` exists, register it as the result and read it (image validator). The baseline is stable and never re-captured.
  > 2. **Fallback capture (missing baseline).** If the PNG is absent — e.g. `design-verify` run standalone without a prior `extract-reference` capture — capture it with `_debo capture matrix {{ reference_dir }}/meta.yml --url <reference-url> --out {{ reference_dir }}` (or `_debo capture screenshot --url <url> --selector <sel> --width <px> --out <png>` for a single cell), applying the `playwright-capture` isolate-and-capture mode. This keeps `design-verify` self-healing.
  > 3. **Read** the (verified or freshly captured) image before returning.

- [ ] **Step 4: Keep frontmatter untouched.** Confirm the frontmatter `params`, `result` (path + `image` validator), and `each` blocks are byte-for-byte unchanged.

- [ ] **Step 5: Verify.**

  Run: `grep -n "Verify present\|Fallback capture\|_debo capture matrix\|self-healing" .agents/skills/designbook/design/tasks/ensure-baseline.md`
  Expected: verify-first wording + fallback present.

  Run: `git diff -- .agents/skills/designbook/design/tasks/ensure-baseline.md`
  Expected: only the body prose changed; frontmatter (`result` path, `image` validator, `each`) unchanged.

- [ ] **Step 6: Commit.**

```bash
git add .agents/skills/designbook/design/tasks/ensure-baseline.md
git commit -m "feat(designbook-37): ensure-baseline verifies baseline, captures only as fallback"
```

---

## Task 3: `debo-designbook-design` — link reference at spec, conditional coding links

**Files:**
- Modify: `.agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`

**Interfaces:**
- Consumes: the `reference_folder` overview PNGs + assets from Task 1 (available after the design `--plan` run); `@gaia/run-outtake`, `@gaia/transition-ticket` (existing).
- Produces: `inputs.reference_capture` (description + default); a `## spec` step that passes `kind: reference` links to run-outtake **and** transition-ticket; conditional `kind: storybook` + `kind: drupal-preview` links in `## coding`.

- [ ] **Step 1: Read the current file.** Read `debo-designbook-design/SKILL.md` in full; locate the `inputs:` block, `## spec` steps 3–4 + 6, and `## coding` steps 5 + 7.

- [ ] **Step 2: Add the `reference_capture` input.** Under `inputs:`, add:

```yaml
  reference_capture:
    description: how the spec step surfaces the design reference in the ticket — which reference images/screenshots to list and link
    default: |
      After the design `--plan` run, `@designbook/design`'s `extract-reference` has captured the
      reference into the resolved `reference_folder`: the mobile/desktop overview PNGs
      (`overview--mobile--<bp>.png`, `overview--desktop--<bp>.png`) plus any downloaded reference
      assets. List them and pass each as a resolved link with `options.gaia.kind: reference` and a
      self-describing `title` (e.g. `Reference (mobile) — <breakpoint>`) — both to `@gaia/run-outtake`
      for display and to `@gaia/transition-ticket` so they land in `gaia_ticket.links[]`. When there
      is no `reference_url`/`reference_folder` (nothing was captured), name the reference surface
      explicitly `not_required` and link nothing.
```

- [ ] **Step 3: Add the reference-link step to `## spec`.** Insert a new step between the current step 3 (publish spec+test handoff) and the current step 4 (`run-outtake`), renumbering the rest:

  > 4. **Surface the design reference** by running `reference_capture`: the `spec` `--plan` run already executed the `reference` stage (`extract-reference`), so the reference PNGs + assets exist in the `reference_folder`. List them and carry them as `options.gaia.kind: reference` resolved links — shown in the `@gaia/run-outtake` below **and** passed to `@gaia/transition-ticket` in step 6 so they persist in `gaia_ticket.links[]`. When no reference exists, record the reference surface as `not_required`.

  Ensure the (now step 7) `@gaia/transition-ticket` call is described as receiving these reference links alongside the destination `coding`.

- [ ] **Step 4: Make `## coding` step 5 (`run-outtake`) links conditional.** Replace the unconditional "final Storybook link" wording with:

  > 5. Invoke `@gaia/run-outtake`, leading with the `@designbook/design-verify` verdict and its statistics. Lead the **Storybook preview link** (`kind: storybook`) **only when the build changed Designbook artifacts** (scene/component files); if it did not, omit it with a one-line documented reason. Lead the **Drupal preview link** (`kind: drupal-preview`) **only when the build changed Drupal config**; a `work:design-to-designbook` build normally changes no config, so record it explicitly as `not_applicable` with a one-line reason otherwise.

- [ ] **Step 5: Make `## coding` step 7 (`transition-ticket`) match.** Replace the "final Storybook link (mandatory for this sub-work)" wording with:

  > 7. After confirmation, invoke `@gaia/transition-ticket` with destination `review` and resolved links — the **Storybook preview link** (when Designbook artifacts changed) and the **Drupal preview link** (when Drupal config changed; else omitted as `not_applicable`), each carrying its `options.gaia.kind`, plus Designbook, MR, pipeline, and report links. Both preview links appear here **and** in the `run-outtake` (step 5).

- [ ] **Step 6: Verify — new behavior present.**

  Run: `grep -n "reference_capture\|kind: reference\|kind: storybook\|kind: drupal-preview\|not_applicable\|only when the build changed" .agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`
  Expected: input + spec link step + conditional storybook + conditional drupal all present.

- [ ] **Step 7: Verify — invariants untouched.**

  Run: `git diff -- .agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md`
  Expected: NO change in the `when:` block, in `## coding` step 4 (the `design_verify` measurement/session PATCH), in the RED/GREEN gate wording, in transition **destinations** (`coding`/`review`/`done`), in the `@gaia/merge-mr` gate, or in `## diagnose`/`## review`/`## Multi-work`.

- [ ] **Step 8: Commit.**

```bash
git add .agents/skills/designbook-gaia/skills/debo-designbook-design/SKILL.md
git commit -m "feat(designbook-37): design step-skill links reference at spec, conditional coding links"
```

---

## Task 4: `debo-config-sync` — same reference surface + conditional coding links

**Files:**
- Modify: `.agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md`

**Interfaces:**
- Consumes: same `@gaia/run-outtake` / `@gaia/transition-ticket`. Note `sync-to` has **no** `reference_url`/`reference` stage, so `reference_capture` resolves to `not_required` at runtime.
- Produces: identical `inputs.reference_capture`; `## spec` reference step (always `not_required`); `## coding` step 5+7 Storybook + Drupal links changed from unconditional ("both mandatory") to conditional.

- [ ] **Step 1: Read the current file.** Read `debo-config-sync/SKILL.md` in full; locate `inputs:`, `## spec` steps 3–4 + 6, `## coding` steps 5 + 7.

- [ ] **Step 2: Add the `reference_capture` input.** Add the **identical** block from Task 3 Step 2 under `inputs:`.

- [ ] **Step 3: Add the reference step to `## spec`.** Insert between current step 3 and step 4 (renumbering):

  > 4. **Surface the design reference** by running `reference_capture`. A `work:designbook-to-config` sub-work (`sync-to`) has no `reference_url`/reference stage, so there is normally nothing captured: record the reference surface as `not_required` and link nothing. When a `reference_folder` with overview PNGs does exist (e.g. carried over from an upstream design), list and link them as `options.gaia.kind: reference` in both `@gaia/run-outtake` and `@gaia/transition-ticket` (step 6).

- [ ] **Step 4: Make `## coding` step 5 conditional.** Replace the unconditional Storybook + Drupal wording with:

  > 5. Invoke `@gaia/run-outtake`, leading with the `@designbook/config-verify` verdict and its statistics and the config diff. Lead the **Storybook preview link** (`kind: storybook`, the baseline the render was reconciled against) **only when the build changed Designbook artifacts**; else omit with a one-line reason. Lead the **Drupal preview link** (`kind: drupal-preview`, the backend render of the synced config) **only when the build changed Drupal config**; else record `not_applicable` with a one-line reason.

- [ ] **Step 5: Make `## coding` step 7 match.** Replace "the Storybook link and the Drupal preview-module link (both mandatory for this sub-work)" with:

  > 7. After confirmation, invoke `@gaia/transition-ticket` with destination `review` and resolved links — the **Storybook preview link** (when Designbook artifacts changed) and the **Drupal preview link** (when Drupal config changed; else omitted as `not_applicable`), each carrying its `options.gaia.kind`, plus MR, pipeline, config-diff, and report links. Both preview links appear here **and** in the `run-outtake` (step 5).

- [ ] **Step 6: Verify — new behavior present.**

  Run: `grep -n "reference_capture\|kind: reference\|kind: storybook\|kind: drupal-preview\|not_applicable\|only when the build changed\|not_required" .agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md`
  Expected: input + spec step (`not_required`) + conditional storybook + conditional drupal present.

- [ ] **Step 7: Verify — invariants untouched.**

  Run: `git diff -- .agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md`
  Expected: NO change in `when:`, in `## coding` step 4 (`config_verify` measurement), gate wording, transition destinations, `@gaia/merge-mr`, or `## diagnose`/`## review`/`## Multi-work`.

- [ ] **Step 8: Commit.**

```bash
git add .agents/skills/designbook-gaia/skills/debo-config-sync/SKILL.md
git commit -m "feat(designbook-37): config-sync step-skill links reference at spec, conditional coding links"
```

---

## Task 5: Verify the whole change (doc-structural + design-verify sanity)

**Files:**
- Test/verify only (no new files).

**Interfaces:**
- Consumes: all four modified files; the acceptance criteria (comment) AC-1…AC-11; `@gaia/workflow-step` as the contract yardstick.

- [ ] **Step 1: AC ↔ evidence read-through.** Read `extract-reference.md`, `ensure-baseline.md`, and both `SKILL.md` (`inputs` + `## spec` + `## coding`) against AC-1…AC-11 and the `test`-comment matrix. Expected: every AC has a pointer; AC-2/3 satisfied at the `extract-reference` layer (names `_debo capture …`) + the gaia link layer (amendment R3).

- [ ] **Step 2: Invariant diff (AC-10).**

  Run: `git diff <spec-base>..HEAD -- .agents/skills/designbook-gaia/ .agents/skills/designbook/design/tasks/`
  Expected: no hunks touching `when:` triples, `design_verify`/`config_verify` measurement lines, gate wording, transition destinations, or the merge gate.

- [ ] **Step 3: Contract check (AC-11).** Compare both `SKILL.md` against `@gaia/workflow-step`: `when:` unchanged; every `inputs` value (incl. new `reference_capture`) has `description` **and** `default`; prose-per-step incl. routing intact. Expected: conformant.

- [ ] **Step 4: `design-verify` sanity run (R2).** From inside the ticket worktree, run a Design-family `debo-test` case (or `debo design-verify` on a fixture) and confirm the `extract-reference` capture + `ensure-baseline` check produce a green compare — i.e. no regression from moving capture. Capture the tester/workflow summary as evidence. If a fixture that exercises the reference path does not exist, note it honestly.

- [ ] **Step 5: Optional `pnpm check`.** Only if a manifest/loader/schema test covers the changed `.md`/`schemas.yml`. There is no TS change otherwise; say so.

- [ ] **Step 6: Commit any fixes** discovered in steps 1–5 (else no-op).

```bash
git add -A
git commit -m "test(designbook-37): verify reference-link + conditional-link change (doc-structural + design-verify sanity)"
```

---

## Self-Review

**Spec coverage:** D1 (viewport) → Task 1 Step 3.2 + Global Constraints. D2 (committed storage/naming) → Task 1 Steps 3–5 + Global Constraints. D3 (capture in extract-reference, ensure-baseline check+fallback) → Tasks 1 & 2. D4 (Drupal conditional-symmetric) → Tasks 3 & 4 Steps 4–5. D5 (kind values) → Tasks 3 & 4 (input + coding steps). D6 (empty ref / config-sync always not_required) → Task 1 Step 4 + Task 4 Step 3. D7 (reference_capture input; tasks param-free; coding coupling fixed prose) → Tasks 1–4. AC-1…11 → Task 5. All spec sections have a task.

**Placeholder scan:** No TBD/TODO; every prose insertion is given verbatim; grep/diff commands are concrete. The only deliberately deferred detail — whether the overview reuses a `full` matrix element or is a dedicated shot — is a bounded runtime branch, both sides specified in Task 1 Step 3.2.

**Type/name consistency:** PNG naming `<breakpoint>--<element>--<state>.png` (matrix) and `overview--<viewport>--<bp>.png` (overview) used identically in Tasks 1, 2, 3, 4. `options.gaia.kind` values `reference`/`storybook`/`drupal-preview` consistent across Tasks 3 & 4. `reference_capture` input identical in Tasks 3 & 4.
