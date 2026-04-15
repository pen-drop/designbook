# Domain-Based Rule/Blueprint Loading

## Problem

Rules and blueprints declare `when.steps: [stepA, stepB, stepC]` to control when they are loaded. This creates three problems:

1. **Tight coupling** — every rule must enumerate all steps where it applies. Adding a new workflow or step requires editing rules across multiple integration skills.
2. **Combinatorial explosion** — rules like `scenes-constraints.md` list `[design-shell:create-scene, design-screen:create-scene, map-entity]`. Each new scene-producing step means another entry in multiple files.
3. **Wrong loading direction** — rules declare "load me at steps X, Y, Z" (pull). Integration authors must know workflow internals to wire their rules correctly.

## Solution

Replace `when.steps` in rules and blueprints with a **domain** tag system. Tasks and workflow stages declare which knowledge domains they need; rules and blueprints declare which domain they belong to. The CLI matches domain-to-domain, filtered by config conditions.

### Scope

- **Rules and blueprints only.** Task file resolution stays step-based (`when.steps`).
- **If an integration needs different task behavior**, it should provide its own workflow — not override individual tasks.

## Design

### Domain Declaration

**On rules/blueprints** (supply side) — "I am knowledge about X":

```yaml
# .agents/skills/designbook-drupal/scenes/rules/scenes-constraints.md
domain: scenes
when:
  backend: drupal
```

**On tasks** (demand side) — "I need knowledge about X":

```yaml
# .agents/skills/designbook/design/tasks/create-scene.md
when:
  steps: [create-scene]
domain: [components, scenes]
```

**On workflow stages** (additive demand) — optional extra domains beyond what the task declares:

```yaml
# .agents/skills/designbook/design/workflows/design-shell.md
stages:
  scene:
    steps: [create-scene]
    domain: [data-model]
```

The effective domain set for a step is the **union** of the task's `domain` and the stage's `domain`.

### Subcontexts (Dot-Notation)

Domains support hierarchical subcontexts via dot notation:

```
components              # broad: all component knowledge
components.layout       # specific: layout-related component knowledge
scenes                  # broad: all scene knowledge  
scenes.shell            # specific: shell scene knowledge
```

**Matching rules:**

| Task domain | Loads rules with domain | Skips rules with domain |
|---|---|---|
| `components` | `components`, `components.*` (all sub) | — |
| `components.layout` | `components` (parent), `components.layout` (exact) | `components.discovery` (sibling) |
| `scenes.shell` | `scenes` (parent), `scenes.shell` (exact) | `scenes.screen` (sibling) |

The principle: a specific need loads general + matching specific knowledge. A broad need loads everything underneath.

### Config Conditions Stay

The `when:` block keeps its config-based conditions. Only `steps:` is removed from rules/blueprints:

```yaml
# Before
when:
  steps: [create-component, design-shell:intake, design-screen:intake]
  backend: drupal

# After  
domain: components
when:
  backend: drupal
```

If a rule has no config conditions, the `when:` block is omitted entirely:

```yaml
# Before
when:
  steps: [create-scene]

# After
domain: scenes
```

### Resolution Algorithm

At `workflow create` time, for each step:

1. Compute effective domains: `union(task.domain, stage.domain)`
2. Glob all rule files: `.agents/skills/**/rules/*.md`
3. For each rule file:
   a. Read `domain:` from frontmatter
   b. Check if rule's domain matches any effective domain (using subcontext rules)
   c. Check if rule's `when:` config conditions match project config
   d. If both pass → include
4. Same process for blueprint files (with existing type+name deduplication)

**Match function:**

```
matchDomain(ruleDomain, effectiveDomains):
  for each need in effectiveDomains:
    if ruleDomain == need → match                # exact
    if ruleDomain startsWith need + "." → match  # rule is sub of broad need
    if need startsWith ruleDomain + "." → match  # rule is parent of specific need
  return no match
```

A match occurs when one is a dot-delimited prefix of the other, or they are equal. No partial segment matching — `components` matches `components.layout` but not `components-extra`.

### Domain Taxonomy

Derived from the current `when.steps` inventory:

| Domain | Subcontexts | Description |
|---|---|---|
| `components` | `components.layout`, `components.discovery` | Component structure, conventions, SDC, layout rules |
| `scenes` | `scenes.shell`, `scenes.screen` | Scene file authoring constraints |
| `data-model` | — | Entity types, field conventions, views |
| `data-mapping` | — | Entity-to-component mapping, field maps |
| `tokens` | — | Design token structure and conventions |
| `sample-data` | — | Sample data generation rules |
| `css` | — | CSS generation, font handling |
| `design` | `design.intake`, `design.verify` | Design workflow rules (references, capture) |

### Migration Map

Every existing rule/blueprint mapped to its new domain:

#### Rules

| File | Old `when.steps` | New `domain` |
|---|---|---|
| `drupal/components/rules/component-discovery.md` | `[design-shell:intake, design-screen:intake, design-component:intake]` | `components.discovery` |
| `drupal/components/rules/sdc-conventions.md` | `[create-component]` | `components` |
| `drupal/components/rules/layout-constraints.md` | `[create-component, design-shell:intake, design-screen:intake]` | `components.layout` |
| `tailwind/rules/component-source.md` | `[create-component]` | `components` |
| `drupal/scenes/rules/scenes-constraints.md` | `[design-shell:create-scene, design-screen:create-scene, map-entity]` | `scenes` |
| `tailwind/rules/scenes-constraints.md` | `[design-shell:create-scene, design-screen:create-scene]` | `scenes` |
| `drupal/data-mapping/rules/image-fields.md` | `[map-entity]` | `data-mapping` |
| `drupal/data-model/rules/media-image-styles.md` | `[create-data-model]` | `data-model` |
| `drupal/data-model/rules/layout-builder.md` | `[create-data-model]` | `data-model` |
| `drupal/data-model/rules/canvas.md` | `[create-data-model]` | `data-model` |
| `drupal/data-model/rules/drupal-views.md` | `[create-data-model]` | `data-model` |
| `drupal/sample-data/rules/image.md` | `[create-sample-data]` | `sample-data` |
| `drupal/sample-data/rules/layout-builder.md` | `[create-sample-data]` | `sample-data` |
| `drupal/sample-data/rules/canvas.md` | `[create-sample-data]` | `sample-data` |
| `drupal/shell/rules/navigation.md` | `[design-shell:intake, design-screen:intake]` | `components.layout` |
| `stitch/rules/stitch-tokens.md` | `[create-tokens]` | `tokens` |
| `stitch/rules/stitch-import.md` | `[import:intake]` | `design.intake` |
| `stitch/rules/provide-stitch-url.md` | `[design-verify:intake, design-screen:intake, design-shell:intake]` | `design.intake` |
| `css-generate/fonts/google/rules/font-url-construction.md` | `[prepare-fonts]` | `css` |

#### Blueprints

| File | Old `when.steps` | New `domain` |
|---|---|---|
| `drupal/components/blueprints/header.md` | `[design-shell:intake]` | `components.shell` |
| `drupal/components/blueprints/footer.md` | `[design-shell:intake]` | `components.shell` |
| `drupal/components/blueprints/page.md` | `[design-shell:intake]` | `components.shell` |
| `drupal/components/blueprints/form.md` | `[design-shell:intake, design-component:intake, design-screen:intake]` | `components` |
| `drupal/components/blueprints/navigation.md` | `[design-shell:intake, design-screen:intake]` | `components` |
| `drupal/components/blueprints/container.md` | `[design-shell:intake, design-screen:intake, tokens:intake]` | `components.layout` |
| `drupal/components/blueprints/section.md` | `[design-screen:intake, tokens:intake]` | `components.layout` |
| `drupal/components/blueprints/grid.md` | `[design-screen:intake, tokens:intake]` | `components.layout` |
| `drupal/data-mapping/blueprints/views.md` | `[map-entity]` | `data-mapping` |
| `drupal/data-mapping/blueprints/layout-builder.md` | `[map-entity]` | `data-mapping` |
| `drupal/data-mapping/blueprints/field-map.md` | `[map-entity]` | `data-mapping` |
| `drupal/data-mapping/blueprints/canvas.md` | `[map-entity]` | `data-mapping` |
| `drupal/data-model/blueprints/node.md` | `[design-token:intake, create-data-model]` | `data-model` |
| `drupal/data-model/blueprints/taxonomy_term.md` | `[design-token:intake, create-data-model]` | `data-model` |
| `drupal/data-model/blueprints/media.md` | `[design-token:intake, create-data-model]` | `data-model` |
| `drupal/data-model/blueprints/block_content.md` | `[design-token:intake, create-data-model]` | `data-model` |
| `drupal/data-model/blueprints/canvas_page.md` | `[design-token:intake, create-data-model]` | `data-model` |
| `drupal/data-model/blueprints/view.md` | `[design-token:intake, create-data-model]` | `data-model` |
| `designbook/data-model/blueprints/image_style.md` | `[design-token:intake]` | `data-model` |
| `tailwind/blueprints/css-mapping.md` | — | `css` |

### Task Domain Assignments

Each core task gets a `domain:` declaration:

| Task | Domain |
|---|---|
| `intake--design-component.md` | `[components]` |
| `intake--design-shell.md` | `[components, components.shell]` |
| `intake--design-screen.md` | `[components, components.layout]` |
| `intake--design-verify.md` | `[design.verify]` |
| `create-component.md` (core task, not Drupal override) | `[components]` |
| `create-scene.md` | `[components, scenes]` |
| `create-data-model.md` | `[data-model]` |
| `create-tokens.md` | `[tokens]` |
| `create-sample-data.md` | `[sample-data]` |
| `map-entity--design-screen.md` | `[data-mapping, scenes]` |
| `intake--css-generate.md` | `[css]` |
| `generate-css.md` | `[css]` |
| `generate-jsonata.md` | `[css]` |
| `prepare-fonts.md` | `[css]` |
| `intake--import.md` | `[design.intake]` |

### Workflow Stage Domain Overrides

Some workflows add domains at the stage level:

```yaml
# design-shell.md
stages:
  intake:
    steps: [intake]
    domain: [data-model]       # blueprints need data-model knowledge at intake
  scene:
    steps: [create-scene]
    domain: [data-model]       # scene creation needs data-model context
```

```yaml
# design-screen.md
stages:
  intake:
    steps: [intake]
    domain: [data-model]
  scene:
    steps: [create-scene]
    domain: [data-model]
```

### Special Case: `provide-stitch-url.md`

This rule currently targets `[design-verify:intake, design-screen:intake, design-shell:intake]` — three different workflow intakes. With domains it becomes `domain: design.intake`. Any task with `domain: [design.intake]` or `domain: [design]` loads it. The `when: extensions: stitch` config filter ensures it only activates when Stitch is configured.

## CLI Changes

### `workflow-resolve.ts`

1. **New function: `matchDomain(ruleDomain, effectiveDomains)`** — returns true if the rule's domain matches any of the effective domains using the subcontext prefix rules.

2. **Modified: `resolveFiles()`** — currently filters by `when.steps` against runtime context. New behavior:
   - If file has `domain:` → use domain matching against effective domains
   - If file has `when.steps:` → use legacy step matching (backwards compat during migration)
   - If file has both → domain takes precedence, `when.steps` ignored
   - Config conditions (`when.backend`, `when.frameworks.*`, `when.extensions`) evaluated as before

3. **Modified: `resolveAllSteps()`** — when resolving rules/blueprints for a step:
   - Read task file's `domain:` field
   - Read workflow stage's `domain:` field
   - Compute union → pass as `effectiveDomains` to `resolveFiles()`

4. **`buildRuntimeContext()`** — add `domain` key alongside existing `steps`/`stages` keys.

### Backwards Compatibility

During migration, both systems coexist:
- Files with `domain:` use the new matching
- Files with only `when.steps:` use the old matching
- Once all files are migrated, the `when.steps` path in rule/blueprint resolution can be removed
- `when.steps` in **task files** is unaffected — it stays permanently

## Integration Author Experience

### Before (today)

```yaml
# Integration author must know:
# - which workflows exist
# - which steps are in each workflow  
# - the qualified step name format
when:
  steps: [designbook-design-shell:intake, designbook-design-screen:intake, designbook-design-component:intake]
  frameworks.component: sdc
```

### After

```yaml
# Integration author only needs to know:
# - what knowledge domain their rule belongs to
# - what config condition scopes it
domain: components.discovery
when:
  frameworks.component: sdc
```

New workflows that need component discovery automatically pick up the rule — no changes to integration skills required.

## Skill Creator Documentation Impact

The `designbook-skill-creator` skill's `rules/structure.md` and `rules/principles.md` contain examples using `when.steps`. These need updating to show the domain-based approach. The `resources/schema-composition.md` examples also reference `when.steps` for rules.

## Not In Scope

- **Task file resolution** — stays step-based (`when.steps` + config)
- **Task overrides (`as:`)** — stays step-based
- **`when` config conditions** (`backend`, `frameworks.*`, `extensions`) — unchanged
- **Blueprint deduplication** (`type` + `name` + `priority`) — unchanged
- **`provides:` field on rules** (schema composition) — unchanged, orthogonal to domain
