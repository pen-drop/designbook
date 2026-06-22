# Entity Reference Rendering Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the designbook skill so entity reference fields generate `.jsonata` that puts rendered child entities in **slots** (not props), gives each child bundle its own component + mapping, and renders the slot in the parent Twig — eliminating the empty-boxes failure.

**Architecture:** Pure skill-file edits across one shared rule, one blueprint + one task rule line, one drupal component task, and the design-entity intake task. No TypeScript/addon changes. The renderer already resolves entity refs in slots (`resolveEntityRefs`/`resolveSlots` in `packages/storybook-addon-designbook/src/renderer/builder-registry.ts`); the skill just has to emit them there.

**Tech Stack:** Markdown skill files under `.agents/skills/` (canonical; `.claude/skills/` is a symlink — never edit it). YAML front-matter on each file. Verification via the `/debo test drupal_web design-entity` e2e run and `pnpm check`.

## Global Constraints

- **Load `designbook-skill-creator` before editing ANY file under `.agents/skills/designbook*/` — and the matching rule file for the artifact type (`rules/common-rules.md` + the type-specific rule).** Not optional (per CLAUDE.md).
- Edit only `.agents/skills/...` (canonical). Never edit `.claude/skills/...` (symlink).
- No migration / back-compat code; on-disk artifacts are disposable, tested from scratch.
- Tasks say WHAT to produce; blueprints are overridable HOW; rules are hard constraints.
- The shared principle (verbatim): *Rendered content — markup strings, component references, and entity reference nodes — MUST be slot values, never props. Props carry scalar data only. The renderer resolves component/entity references only inside slots (and at top level); a reference placed in props is never resolved and renders empty.*
- Provider prefix in jsonata/scene output is always `$DESIGNBOOK_COMPONENT_NAMESPACE:<name>`.

---

### Task 1: Harden the shared slots-vs-props rule

**Files:**
- Modify: `.agents/skills/designbook/design/rules/scenes-constraints.md` (already triggers on `steps: [create-scene, map-entity]`)

**Interfaces:**
- Produces: a hard ⛔ constraint that Tasks 2–4 reference as the single source of the slots-vs-props principle.

- [ ] **Step 1: Load skill-creator + rule-file rules**

Load `designbook-skill-creator`; read its `rules/common-rules.md` + `rules/rule-files.md`. Re-read `.agents/skills/designbook/design/rules/scenes-constraints.md`.

- [ ] **Step 2: Insert the hard ⛔ constraint** after the existing "Slots accept three value types" block (after the `type: element` example, before the `props.variant` block):

```markdown
> ⛔ **Rendered content belongs in slots — never props.** Markup strings, component
> reference nodes, and entity reference nodes (`{ entity, view_mode, record }`) MUST be
> slot values. `props` carry scalar data only (strings, numbers, booleans, plain data
> objects/arrays) — never markup, never component/entity nodes. The renderer resolves
> component and entity references only inside `slots` (and at the top level of a scene /
> mapping); a reference placed in `props` is passed through verbatim and never resolved,
> so the component receives `{ entity, … }` objects instead of rendered content and
> renders empty. This applies identically to `*.scenes.yml` and to `map-entity` `.jsonata`
> output — a mapping output is a scene node tree.

```yaml
# ✅ Correct — entity ref in a slot → resolved into the parent's rendered output
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:signage"
  props: { overlapping: true }
  slots:
    items:
      - { entity: "paragraph.signage_item", view_mode: "full", record: 0 }

# ❌ Wrong — entity ref in a prop → never resolved, renders empty
- component: "$DESIGNBOOK_COMPONENT_NAMESPACE:signage"
  props:
    items:
      - { entity: "paragraph.signage_item", view_mode: "full", record: 0 }
```
```

- [ ] **Step 3: Reconcile the "Slot HTML" closing line.** Replace the final paragraph (currently: "This applies to all markup strings in scene files — both in `slots:` and in `props:` that accept HTML. Component templates can use utility classes freely since they are in configured source paths.") with:

```markdown
This applies to all markup strings in slot values. Props never carry markup (see the
rendered-content rule above). Component templates can use utility classes freely since
they are in configured source paths.
```

- [ ] **Step 4: Verify** the file: `grep -n "Rendered content belongs in slots\|never resolved\|markup in slot values\|Props never carry markup" .agents/skills/designbook/design/rules/scenes-constraints.md` — expect the new ⛔ heading and the reconciled closing line; confirm front-matter `trigger: steps: [create-scene, map-entity]` is unchanged.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/design/rules/scenes-constraints.md
git commit -m "fix(skill): rendered content (incl. entity refs) is slot-only, never props"
```

---

### Task 2: Make reference-field → slot a hard rule in the mapping guidance

**Files:**
- Modify: `.agents/skills/designbook-drupal/data-mapping/blueprints/field-map.md` (Rules list)
- Modify: `.agents/skills/designbook/design/tasks/map-entity--design-screen.md:49`

**Interfaces:**
- Consumes: the Task 1 principle.
- Produces: the binding instruction that `map-entity` emits reference-field entity refs in a slot.

- [ ] **Step 1: Load skill-creator rules** (`common-rules.md` + `blueprint-files.md` for field-map; + `task-files.md` for map-entity). Re-read both files.

- [ ] **Step 2: Replace the soft reference-field rule in `field-map.md`.** Find the Rules bullet that reads "Reference fields (`type: reference`) emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` — typically as slot values inside a wrapper component. **Exception:** parent entities that orchestrate child sections (e.g. a landing page emitting its paragraph sections) MAY emit entity refs as top-level array items." and replace with:

```markdown
- Reference fields (`type: reference`) emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` nodes **as slot values of the wrapping component — NEVER in `props`** (the renderer resolves refs only inside slots and at top level; a ref in `props` is never resolved and renders empty — see scenes-constraints). The **only** exception is a pure delegation parent that has no wrapping markup of its own (e.g. a landing page stacking its paragraph sections), which MAY emit the refs as top-level array items.
```

- [ ] **Step 3: Harden `map-entity--design-screen.md` line 49.** Replace "Reference fields emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` nodes — resolved recursively at build time" with:

```markdown
- Reference fields emit `{ "entity": "<entity_type>.<bundle>", "view_mode": "...", "record": N }` nodes **in a slot of the wrapping component, never in `props`** — resolved recursively at build time (refs in `props` are never resolved; see scenes-constraints)
```

- [ ] **Step 4: Verify**: `grep -n "NEVER in .props\|never in .props\|never resolved" .agents/skills/designbook-drupal/data-mapping/blueprints/field-map.md .agents/skills/designbook/design/tasks/map-entity--design-screen.md` — expect a hit in each file.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook-drupal/data-mapping/blueprints/field-map.md .agents/skills/designbook/design/tasks/map-entity--design-screen.md
git commit -m "fix(skill): reference fields emit entity refs in a slot, never props"
```

---

### Task 3: create-component renders child-holding slots (no flat-prop iteration)

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-component.md`

**Interfaces:**
- Consumes: the component plan from intake (Task 4), whose slots may hold rendered child components.
- Produces: components whose Twig renders `{{ slot }}` for referenced children.

- [ ] **Step 1: Load skill-creator rules** (`common-rules.md` + `task-files.md`). Re-read `create-component.md`.

- [ ] **Step 2: Add a "Rendered children → slots" instruction** to the `## Steps` section, after step 3 ("Derive `<name>.component.yml` from `component.slots` + `component.design_hint.props`."):

```markdown
4. **Render referenced children via slots, not props.** When `component.slots` includes a slot that holds rendered child entities (a `type: reference` field that targets a renderable bundle, e.g. a Wegweiser's `signage_item` cards), declare it as a **slot** in `<name>.component.yml` and render it in the Twig with `{{ slotName }}` (or `{% block slotName %}{% endblock %}`) — the resolved child component markup is injected there. Do NOT declare referenced children as a flat data prop and do NOT iterate per-child fields in the parent Twig; each child bundle has its own component + mapping that renders those fields.
```

Renumber the existing step 4 ("Generate the default story …") to step 5.

- [ ] **Step 3: Verify**: `grep -n "Render referenced children via slots\|own component + mapping" .agents/skills/designbook-drupal/components/tasks/create-component.md` — expect a hit; confirm the steps are sequentially numbered 1–5.

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-drupal/components/tasks/create-component.md
git commit -m "fix(skill): create-component renders child-holding slots, not flat props"
```

---

### Task 4: intake plans child bundles (component + mapping) and parent slots

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-entity.md`
- Read (parity check): `.agents/skills/designbook/design/tasks/intake--design-screen.md`

**Interfaces:**
- Produces: `entity_mappings` (parent + child bundles, leaf-first), `components` (one per new renderable bundle), with the parent's reference field planned as a slot. These feed the `entity-mapping` stage's `each: mapping` and the `component` stage.

- [ ] **Step 1: Load skill-creator rules** (`common-rules.md` + `task-files.md`). Re-read `intake--design-entity.md`.

- [ ] **Step 2: Rewrite the `Result: entity_mappings` section** (currently "A one-element array containing the single `{ entity_type, bundle, view_mode }` mapping the `entity-mapping` stage will produce.") to:

```markdown
## Result: entity_mappings

One mapping per **renderable** bundle, leaf-first: the chosen bundle plus every bundle
reached by traversing its `type: reference` fields that target a renderable entity
(`paragraph`, `node`, `media`). Each entry is `{ entity_type, bundle, view_mode }`; the
`entity-mapping` stage's `each: mapping` produces one `<entity_type>.<bundle>.<view_mode>.jsonata`
per entry. A child rendered inside a parent slot needs its own mapping or the parent's
slot ref resolves to nothing.
```

- [ ] **Step 3: Rewrite the `Result: components` section** (currently "One entry per **new** component to create. Empty array when all required components already exist.") to:

```markdown
## Result: components

One entry per **new** component the build needs — the parent bundle's component **and** a
component for every referenced child bundle (from `entity_mappings`) that has none yet.
Each child bundle renders as its own component. A `type: reference` field on a parent that
holds rendered children is planned as a **slot** on the parent component (`component.slots`),
never as a flat data prop. Empty array only when every required component already exists.
```

- [ ] **Step 4: Add the traversal to the `## Steps` "Plan components" step.** Replace step 3 ("**Plan components.** Scan existing components; identify which components the chosen view-mode needs that do not yet exist. Present the plan and confirm.") with:

```markdown
3. **Plan components and mappings (leaf-first).** Traverse the chosen bundle's
   `type: reference` fields that target renderable bundles (`paragraph`/`node`/`media`).
   For the chosen bundle and each referenced child bundle: (a) add a `{ entity_type, bundle,
   view_mode }` entry to `entity_mappings`; (b) if no component exists for it, add a
   `components` entry; (c) on the parent, plan each child-holding reference field as a
   **slot** (`component.slots`), not a flat prop. Scan existing components to avoid
   duplicates. Present the plan and confirm.
```

- [ ] **Step 5: design-screen parity check.** Read `intake--design-screen.md`. If its `entity_mappings` result is likewise limited to top-level bundles (no child-bundle traversal), apply the same leaf-first traversal wording there so the shared `map-entity` stage produces child mappings for screens too. If it already traverses, leave it and note so in the commit body.

- [ ] **Step 6: Verify**: `grep -n "leaf-first\|referenced child bundle\|as a .*slot" .agents/skills/designbook/design/tasks/intake--design-entity.md` — expect hits in entity_mappings, components, and the steps section.

- [ ] **Step 7: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-entity.md
# add intake--design-screen.md only if changed in Step 5
git commit -m "fix(skill): intake plans child-bundle components + mappings and parent slots"
```

---

### Task 5: e2e re-test (signage renders filled cards)

**Files:**
- Uses: `fixtures/drupal-web/cases/design-entity.yaml` (already targets `paragraph.signage`, reference `https://leando.de/`, selector `app-signage`)

**Interfaces:**
- Consumes: all skill edits from Tasks 1–4.

- [ ] **Step 1: `pnpm check`** from the worktree root. Expected: typecheck + lint + tests all green (no addon code changed, so this should pass unchanged).

```bash
pnpm check
```

- [ ] **Step 2: Run the e2e** via debo-test `run drupal-web design-entity`: stop any running drupal-web Storybook, rebuild the workspace from scratch (`rm -rf workspaces/drupal-web; ./scripts/setup-workspace.sh drupal-web; ./scripts/setup-test.sh drupal-web design-entity --into workspaces/drupal-web`), start Storybook, then dispatch ONE driver subagent (per `.agents/skills/designbook-test/workflows/run.md`) to drive the full design-entity lifecycle inline.

- [ ] **Step 3: Assert the output** in `workspaces/drupal-web`:
  - `designbook/entity-mapping/paragraph.signage.full.jsonata` exists AND puts `field_signage_item` refs under `slots` (not `props`): `grep -A3 '"slots"' .../paragraph.signage.full.jsonata` shows the `{ "entity": "paragraph.signage_item", … }` map.
  - `designbook/entity-mapping/paragraph.signage_item.full.jsonata` exists.
  - `components/signage/` and `components/signage_item/` both exist; `signage.twig` renders the items slot (`{{ items }}` / `{% block items %}`), not per-child field iteration.
  - `pnpm build-storybook` clean.

- [ ] **Step 4: Visual confirm.** Open the running Storybook `Entities/paragraph/Signage › full` story; the three cards (ausbilden / pruefen / vernetzen) show titles, descriptions, links, and CTA buttons — not empty boxes.

- [ ] **Step 5: Commit** any fixture/data refinements made during the run (none expected for skill files, which were already committed in Tasks 1–4).

---

## Notes for the implementer

- The renderer side is already correct — do not change `builder-registry.ts`, `entity-builder.ts`, or `data-pool.ts`. The fix is entirely in skill guidance so the generator emits refs in slots.
- If the driver subagent in Task 5 still emits refs in `props.items`, that means the hardened rules (Tasks 1–2) or the component plan (Task 4) did not steer it — re-read the produced jsonata + component plan and tighten the wording, do not patch the addon.
- The `Component` schema (`design/schemas.yml#/Component`) already carries `slots`; no schema change is expected. If intake cannot express "this slot holds entity-ref children", check the schema and extend minimally — but the slot only needs a name; `map-entity` fills it.
