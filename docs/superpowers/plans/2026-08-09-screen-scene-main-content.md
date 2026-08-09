# Screen-Scene Main-Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Designbook screen scene a single route-bearing main content (an Entity or a View) in the page `content` slot, enforced as an authoring rule + visible in the intake, with the View listing path made real (no sample-data fallstrick).

**Architecture:** Rule-only enforcement — the constraint lives as normative prose in the core `screen-scene-constraints.md` and is surfaced in the `design-screen` intake's structure-preview; no scene-validator change and no new scene-node type. A View stays `entity: "view.<id>"`. The concrete node/view/block vocabulary and the view-row sample-data resolution live in `designbook-drupal`. Coverage is proven by new `drupal-web` `design-screen` + `design-verify` cases.

**Tech Stack:** Designbook skills (Markdown tasks/rules/blueprints, `schemas.yml`), the `storybook-addon-designbook` build (`pnpm check`), `debo-test` (suite `drupal-web`), Storybook.

## Global Constraints

- **Skill-authoring guardrail:** Before creating or editing ANY `task/rule/blueprint/workflow/schemas.yml` under `.agents/skills/designbook/**` or `.agents/skills/designbook-*/**`, load `designbook-skill-creator` first and read the matching per-file-type rule (`rules/rule-files.md`, `rules/task-files.md`, `rules/blueprint-files.md`, `rules/schema-files.md`) plus `rules/common-rules.md`. Non-negotiable — skipping it regularly produces invalid files.
- **Tasks say WHAT, not HOW.** Rules are hard constraints; blueprints are overridable starting points. Do not mix HOW into a task.
- **Core stays backend-neutral.** `designbook/` rules use abstract wording (Entity / View / route-bearing main / block); the concrete Drupal vocabulary (node, view page display, view block `views_block:*`, menu, tabs, widgets, `block_content`, `block_plugin`) lives ONLY in `designbook-drupal`.
- **Rule-only enforcement.** No change to `src/validators/scene.ts` or `validation-registry.ts`. AC #1/4/5/13 are authoring-time guardrails.
- **No migration / no backwards-compat.** Violating fixtures/cases are rewritten to the new form; existing on-disk artifacts are disposable.
- **Run `debo-test` from inside this worktree** (`/home/cw/projects/designbook/.gaia-worktrees/feat/designbook-41-screen-scen`) — isolated `workspaces/` per worktree.
- **`pnpm check` (typecheck → lint → test) must be green** before the final commit.

---

### Task 1: Core main-content rule

**Files:**
- Modify: `.agents/skills/designbook/design/rules/screen-scene-constraints.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the normative statements that `create-scene.md` (Task 3) and the intake (Task 4) reference by name: *"exactly one route-bearing main content"*, *"main content is a single Entity or View"*, *"listing ⇒ View, except an entity-reference-field listing inside an entity"*, *"`records:` is a demo shorthand, not a listing mechanism"*.

- [ ] **Step 1: Load the guardrail.** Invoke `designbook-skill-creator`; read `rules/rule-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Add the main-content rule (abstract, core wording).** Extend `screen-scene-constraints.md` with normative statements, no Drupal vocabulary:
  - The page `content` slot MUST contain **exactly one** route-bearing **main content**. Zero is an error (the page has no route); two is an error (the route is ambiguous).
  - The main content is a single **Entity** (a route-bearing content entity) **or** a **View** (a listing that owns a route). A component or decorative widget is **never** the main content.
  - Everything else in `content` is a **block** — beiwerk that bears no route and cannot be a second main.
  - A listing of multiple contents MUST be a **View**. The sole exception: a listing that runs *under an entity through an entity-reference field* (the entity renders its own references — see `entity-reference-rendering.md`). Multiple equal-rank `entity:` nodes as a listing, and `records: [...]` as a listing substitute, are forbidden.
  - `records:` is a **demo shorthand**, not a listing mechanism (restated here per AC #7; the schema description says the same).
  - State that the intake's structure-preview identifies the main content before the build.
- [ ] **Step 3: Validate the skill loads.** Run the skill-loader/contract check the project configures for rule files (per `designbook-skill-creator`), e.g. `pnpm --filter storybook-addon-designbook test` for the loader suite, or the repo's `validateLoad` path.
  Expected: PASS — the rule file parses and loads.
- [ ] **Step 4: Read-back check (AC #1–5, #7, #10).** Re-read the rule; confirm each of AC #1,2,4,5,7 has a matching normative sentence and that the wording is abstract (no `node`/`views_block`/`menu`).
- [ ] **Step 5: Commit.**
```bash
git add .agents/skills/designbook/design/rules/screen-scene-constraints.md
git commit -m "DESIGNBOOK-41: core screen-scene main-content rule"
```

---

### Task 2: Schema clarifications (records + view address)

**Files:**
- Modify: `.agents/skills/designbook/scenes/schemas.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: `EntityNode.entity` documents the `view.<id>` listing-address convention; `EntityNode.records` keeps the demo-shorthand statement.

- [ ] **Step 1: Load the guardrail.** `designbook-skill-creator` → `rules/schema-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Clarify `EntityNode`.** In `scenes/schemas.yml`:
  - `EntityNode.entity.description`: state that `view.<id>` is the address for a View (a listing) — the same node type, distinguished by the `view.` prefix; a single entity uses `entity_type.bundle`.
  - Confirm `EntityNode.records.description` still reads as demo-only shorthand and *"Do NOT use for listing pages — use `view.*` entities instead."* (leave as-is if already correct).
  - Do **not** add a `main:`/route key or a `ViewNode` (D1/D2/D3: rule-only, no schema marker, no new node type).
- [ ] **Step 3: Verify the addon types still mirror.** `scenes/schemas.yml` mirrors `packages/storybook-addon-designbook/src/renderer/types.ts`; since only descriptions change, no type edit is needed — confirm no structural drift.
- [ ] **Step 4: Run `pnpm check`.**
  Run: `pnpm check`
  Expected: green (typecheck → lint → test).
- [ ] **Step 5: Commit.**
```bash
git add .agents/skills/designbook/scenes/schemas.yml
git commit -m "DESIGNBOOK-41: document view.<id> listing address + records shorthand"
```

---

### Task 3: create-scene references the rule

**Files:**
- Modify: `.agents/skills/designbook/scenes/tasks/create-scene.md`

**Interfaces:**
- Consumes: the rule from Task 1.
- Produces: nothing new; the task now points screen-scene builders at the main-content rule (WHAT only).

- [ ] **Step 1: Load the guardrail.** `designbook-skill-creator` → `rules/task-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Reference the rule.** In `create-scene.md`, where it already points screen scenes at `screen-scene-constraints.md`, add a one-line pointer that the screen `content` slot carries exactly one route-bearing main content per that rule. Keep it WHAT-level; no HOW, no Drupal vocabulary. Do not touch `validators: [scene]` (unchanged — rule-only).
- [ ] **Step 3: Loader/contract check.** Run the task-file loader check per `designbook-skill-creator`.
  Expected: PASS.
- [ ] **Step 4: Commit.**
```bash
git add .agents/skills/designbook/scenes/tasks/create-scene.md
git commit -m "DESIGNBOOK-41: create-scene points at the main-content rule"
```

---

### Task 4: Intake — preview label + view row-bundle sample data

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md`

**Interfaces:**
- Consumes: the rule from Task 1; the existing intake result fields (`entity_mappings`, `sample_data_bundles`, `scenes`).
- Produces: a structure-preview that labels the main content; `sample_data_bundles` that, for any `view.<id>` node, include the view's **row bundle** with concrete record indices resolved from that bundle's content sample data.

- [ ] **Step 1: Load the guardrail.** `designbook-skill-creator` → `rules/task-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Structure-preview labels the main content (AC #8).** In the Structure-preview step (~line 72), require the preview to mark exactly one node in `content` as the route-bearing **main content** (Entity or View) so the user approves it before the build. If the reference/plan yields zero or two main candidates, the intake resolves it with the user (never silently) — this is where AC #1/#4/#13 are enforced at authoring time.
- [ ] **Step 3: Intake resolves View row-bundle sample data (D7 / AC #16).** Where the intake emits `sample_data_bundles`/`entity_mappings`: when a `content` node is a View (`entity: "view.<id>"`), the intake MUST add the view's **row bundle** (e.g. the view record's `row.entity_type`/`row.bundle`/`row.view_mode`) to `sample_data_bundles` and select concrete record indices from that bundle's existing content sample data, so the view's rows are expressed as content-section records. State that this is what removes the *"No sample records found"* failure — the view's rows come from real content records, no static-array workaround.
- [ ] **Step 4: Loader/contract check.** Run the task-file loader check.
  Expected: PASS.
- [ ] **Step 5: Commit.**
```bash
git add .agents/skills/designbook/design/tasks/intake--design-screen.md
git commit -m "DESIGNBOOK-41: intake labels main content + resolves view row sample data"
```

---

### Task 5: Explicit exemptions for design-shell and design-entity

**Files:**
- Modify: `.agents/skills/designbook/design/rules/shell-scene-constraints.md`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-entity.md`

**Interfaces:**
- Consumes: the rule from Task 1.
- Produces: one-line statements that the main-content rule does NOT apply to shell scenes or standalone entity renders.

- [ ] **Step 1: Load the guardrail.** `designbook-skill-creator` → `rules/rule-files.md` + `rules/task-files.md` + `rules/common-rules.md`.
- [ ] **Step 2: Shell exemption.** In `shell-scene-constraints.md`, add a note: the shell scene uses the `$content` placeholder and has **no** main content; the screen-scene main-content rule does not apply to it.
- [ ] **Step 3: Entity exemption.** In `intake--design-entity.md`, add a note: `design-entity` renders a standalone entity without a route/scene file; the screen-scene main-content rule does not apply.
- [ ] **Step 4: Loader/contract check.** Run the loader checks for the changed files.
  Expected: PASS.
- [ ] **Step 5: Commit.**
```bash
git add .agents/skills/designbook/design/rules/shell-scene-constraints.md .agents/skills/designbook/design/tasks/intake--design-entity.md
git commit -m "DESIGNBOOK-41: exempt design-shell and design-entity from the main-content rule"
```

---

### Task 6: Drupal vocabulary + views.md fallstrick removal

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-mapping/blueprints/views.md`
- Create (if no suitable host exists): a `designbook-drupal` rule/blueprint carrying the concrete node/view/block taxonomy — place per `designbook-skill-creator` guidance (a `data-mapping` or `design` blueprint/rule under `.agents/skills/designbook-drupal/`).

**Interfaces:**
- Consumes: the abstract rule from Task 1.
- Produces: the concrete mapping of abstract terms to Drupal — node = main-eligible entity; view **page display** = route-bearing main; **view block (`views_block:*`)** / menu / tabs / widgets / `block_content` / `block_plugin` = block; a view's **display type** decides its role.

- [ ] **Step 1: Load the guardrail.** `designbook-skill-creator` → `rules/blueprint-files.md` (and `rules/rule-files.md` if a rule) + `rules/common-rules.md`.
- [ ] **Step 2: Remove the fallstrick note.** In `views.md`, delete the "Validator Limitation / No sample records found / Workaround" block (lines ~80–82). Replace it with: the `design-screen` intake resolves the view's rows to its row-bundle content records (Task 4), so a view mapping validates against real records — no static-array or hand-done workaround.
- [ ] **Step 3: Add the concrete taxonomy.** State: main content = a node **or** a view **page display**; a **view block** (`views_block:*`) is a block; menus, tabs, widgets, `block_content`, `block_plugin` are blocks; blocks bear no route. Keep this in `designbook-drupal` only (core stays abstract).
- [ ] **Step 4: Loader/contract check.** Run the loader check for the changed/new files.
  Expected: PASS.
- [ ] **Step 5: Commit.**
```bash
git add .agents/skills/designbook-drupal/data-mapping/blueprints/views.md
git commit -m "DESIGNBOOK-41: drupal node/view/block taxonomy + remove view-mapping workaround"
```

---

### Task 7: drupal-web fixture — data model + design-screen case (RED→GREEN for view data)

**Files:**
- Modify: `fixtures/drupal-web/data-model/designbook/data-model.yml` (add `view_modes` to `paragraph.signage`/`paragraph.signage_item` so they render as content; confirm `views.view.landing_teasers` + `node.landing_page` teaser are renderable)
- Create: `fixtures/drupal-web/cases/design-screen.yaml` (+ any section-chain fixtures the case depends on: `sections`/`shape-section`/`design-shell` prerequisites, mirroring the drupal-stitch/petshop chains)
- Modify/create: the drupal-web section scaffolding needed for a `design-screen` run

**Interfaces:**
- Consumes: the rule (Task 1), intake changes (Task 4), views.md changes (Task 6).
- Produces: a `drupal-web` `design-screen` case covering **entity-main** (a `node` main + a block beside it), **view-main** (`views.view.landing_teasers` as the route-bearing listing), and **reference-listing** (`paragraph.signage` main whose `field_signage_item` renders `paragraph.signage_item` children inside the entity — NOT as content-slot siblings).

- [ ] **Step 1: RED — confirm the fallstrick before the fix is exercised.** Build the view-main scene against a view mapping WITHOUT intake row-resolution (or note the pre-fix state): the view mapping fails with *"No sample records found."* Capture this as the RED baseline (AC #13/#16/#20).
  Run: `debo-test run drupal-web design-screen` (view-main sub-case)
  Expected: RED — *"No sample records found"* (pre-fix) — records the failure the intake resolution removes.
- [ ] **Step 2: Add fixture data.** Add `view_modes` to `paragraph.signage` (+ `signage_item`) so they render; ensure `landing_teasers` and `node.landing_page` teaser are wired. Author the section chain + `design-screen.yaml` case with the three sub-cases above; each screen scene has exactly one route-bearing main content per the rule.
- [ ] **Step 3: GREEN — run the case.**
  Run: `debo-test run drupal-web design-screen`
  Expected: GREEN — all three sub-cases build; the view-main list resolves from real row-bundle records (no *"No sample records found"*); the reference-listing renders inside the entity and is not flagged.
- [ ] **Step 4: Capture the tester output.** Save the `workflow summary --json` block as evidence.
- [ ] **Step 5: Commit.**
```bash
git add fixtures/drupal-web/data-model/designbook/data-model.yml fixtures/drupal-web/cases/design-screen.yaml fixtures/drupal-web/
git commit -m "DESIGNBOOK-41: drupal-web design-screen case (entity-main, view-main, reference-listing)"
```

---

### Task 8: drupal-web design-verify case + scenario click-path

**Files:**
- Create: `fixtures/drupal-web/cases/design-verify-screen.yaml`
- Create: the executable scenario click-path artifact into the case's section story (AC #20, `scenario_required: true`)

**Interfaces:**
- Consumes: the `design-screen` case from Task 7.
- Produces: a running-Storybook verification of entity-main / view-main / reference-listing (AC #6/#11/#12/#19) and a reproducible click-path.

- [ ] **Step 1: Author the design-verify case + scenario.** Create `design-verify-screen.yaml` chaining onto the `design-screen` fixture; author the click-path into the section story for an entity-main case and a view-main case (the abstract Gherkin/click-path the qualification handoff requires).
- [ ] **Step 2: Run the verify tester in a running Storybook.**
  Run: `debo-test run drupal-web design-screen --validate design-verify`
  Expected: GREEN — the section story renders: main content in the page `content` slot, view-list from the view (not multiple entity nodes), reference items inside the entity, blocks beside.
- [ ] **Step 3: Capture evidence.** Save the `workflow summary --json` + the Storybook link.
- [ ] **Step 4: Commit.**
```bash
git add fixtures/drupal-web/cases/design-verify-screen.yaml
git commit -m "DESIGNBOOK-41: drupal-web design-verify screen case + scenario click-path"
```

---

### Task 9: Final verification

**Files:** none (verification only).

- [ ] **Step 1: `pnpm check` green (AC #18).**
  Run: `pnpm check`
  Expected: typecheck → lint → test all pass.
- [ ] **Step 2: Doc checks for work:docs (AC #21).** Run the proportional documentation checks (Markdown/link lint if configured, skill-frontmatter + plugin-manifest validation, workflow-loader/contract suite).
  Expected: pass.
- [ ] **Step 3: Shell-mechanism no-regression (AC #15).**
  Run: `git diff <base>..HEAD -- .agents/skills/designbook/design/rules/shell-scene-constraints.md packages/storybook-addon-designbook/src/renderer/`
  Expected: the shell embed (`scene: design-system:<shell>` + `with: content:`) semantics unchanged; no renderer node-type addition.
- [ ] **Step 4: AC read-back.** Walk AC #1–#21; confirm each has a task/evidence. Note explicitly that AC #1/4/5/13 are authoring-time (rule + intake), not validator errors (D6 decision).
- [ ] **Step 5: Final commit if anything was touched.**
```bash
git commit -am "DESIGNBOOK-41: final verification adjustments" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage** — every spec section maps to a task:
- Goal A (one main) → Task 1 (rule) + Task 4 (intake). Goal B (route visible) → Task 4. Goal C (blocks) → Task 1 + Task 6. Goal D (listing ⇒ view) → Task 1 + Task 7.
- D1 → Task 4 (intake determines/labels). D2 → Task 2 (view.<id>, no ViewNode). D3 → Task 2 (no route field). D4 → Task 6 (block taxonomy). D5 → Task 1 + Task 7 (reference-listing case). D6 → Task 1 (rule-only). D7 → Task 4 + Task 6 + Task 7 (intake row-resolution). D8 → Task 5 (exemptions). D9 → Task 7 + Task 8 (fixtures).
- ACs: #1–5,7 → Task 1; #8 → Task 4; #9 → the spec doc; #10 → Task 1 (rule-only branch); #11/#12/#19 → Task 8; #6 → Task 7/8; #13 → Task 7 RED + authoring interpretation; #14 → Task 5; #15 → Task 9; #16 → Task 6/7; #17 → global constraint + Task 1/6 split; #18 → Task 9; #20 → Task 7/8; #21 → Task 9.

**Placeholder scan** — file/skill loader check commands are named generically ("the loader check per designbook-skill-creator") because the exact command is resolved at coding time from the guardrail skill; every fixture/rule deliverable is concretely described. No TBD/TODO.

**Type consistency** — no new types/signatures introduced (rule-only, no ViewNode, no schema key); `entity: "view.<id>"` used consistently across Tasks 2/4/6/7.

**Note on ordering** — Task 7 Step 1 (RED) documents the pre-fix fallstrick; because Task 4 (intake fix) lands before Task 7, the RED is captured as the baseline behavior the fix removes, then re-run GREEN.
