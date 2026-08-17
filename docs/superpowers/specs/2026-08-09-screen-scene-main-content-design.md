# DESIGNBOOK-41 — Screen-Scene needs exactly one route-bearing main content

**Ticket:** DESIGNBOOK-41 · **Workflow:** gaia_feature · **State:** spec
**Sub-works:** `work:code`, `work:docs`

## Problem

`design-screen` builds a screen scene without a model for *what the page is*. Today the scene is a
flat, equal-rank list of nodes in the shell's `content` slot — entities, components and listings
sit side by side, and nothing records which of them *is* the page.

A page has exactly **one** main content, and it is not decorative: **it bears the route**. It is
either an **Entity** (the page *is* this article, this community) or a **View** (the page *is* this
listing). Everything else on the page is beiwerk and appears as a **block** or a **view** — it
bears no route.

The current model expresses none of this:

- `design/rules/screen-scene-constraints.md` requires only the shell reference + a `content` slot;
  its own example output shows two equal-rank nodes with no notion of main content or route.
- `scenes/schemas.yml` has no route/main concept anywhere; a View is a name-disguised `EntityNode`
  (`entity: "view.<id>"`); the "don't use `records:` for listings" statement hides in a property
  description of an optional shorthand.
- The intake's structure-preview begins at `scene: design-system:shell` with `content` injection —
  the user approving it cannot see whether the page bears a route.
- The sanctioned listing path (a View) is additionally burdened by a documented validator
  fallstrick (`designbook-drupal/data-mapping/blueprints/views.md:82`, *"No sample records found"*),
  making the correct path the inconvenient one.

## Goal

1. **A** — Each screen scene has exactly one main content in the page `content` slot: an Entity or
   a View. Zero is an error (no route); two is an error (ambiguous route).
2. **B** — The main content bears the route; the model makes the role visible and the intake shows
   it before the build.
3. **C** — Everything else is a block or a view, bears no route, and cannot be a second main.
4. **D** — A listing of multiple contents is a View — the sole exception being a listing that runs
   *under an entity through a reference field*. Multiple equal-rank `entity:` nodes and
   `records: [...]` as a listing substitute are excluded; `records:` stays a demo shorthand.

## Design

### The model (the taxonomy)

A screen scene embeds the shell (`scene: design-system:<shell>` + `with: content:`; the shell
mechanism is untouched). Inside the page `content` slot:

- **Main content** — exactly one, the **route-bearer**. It is a single **Entity** (a route-bearing
  content entity — a node) **or** a **View page display** (a listing that owns a route).
- **Block** — everything else: beiwerk that bears no route. This includes menus, tabs, special
  widgets, `block_content`/`block_plugin` entities, **and a view rendered as a view block**
  (`views_block:*`). The same view can therefore be *main* (as a page display) or *beiwerk* (as a
  view block); its **display type** decides the role.
- A **component** or decorative widget is **never** the main content — it bears no route.

A **listing of multiple contents is a View.** The one exception: a listing that runs *under an
entity through an entity-reference field* — then the parent entity renders its own references
(via the renderable-entity-closure of `entity-reference-rendering.md`) and the listing is part of
the entity, not a standalone listing.

### Core vs. Drupal split

The ticket's Rahmenentscheidung — *core rules in `designbook/`, Drupal specifics in
`designbook-drupal`* — draws the line:

- **Core** (`designbook/`) states the rule **abstractly**: exactly one *route-bearing* main content
  in the page content slot; it is a single **Entity or View**; a component/decorative widget is
  never main; a listing of multiple contents is a **View**, except an entity-reference-field
  listing inside an entity; `records:` is a demo shorthand, not a listing mechanism.
- **`designbook-drupal`** carries the **concrete vocabulary**: node = main-eligible entity; view
  page display = route-bearing view; view block (`views_block:*`) / menu / tabs / widgets /
  `block_content` / `block_plugin` = block; the reference-field detection against the Drupal data
  model; and the view-row sample-data calculation (below).

### The nine open decisions

| # | Decision | Resolution | Rationale |
|---|----------|------------|-----------|
| 1 | How the main content is marked in the YAML | **Determined explicitly in the intake**, labeled in the structure-preview; convention is the first node in `content`. No schema key. | The `content` slot is heterogeneous (a view, a block entity, any config/content entity), so position alone is unreliable — the intake must resolve which node *is* the page. Rule-only (D6) means no persistent schema marker; the intake determination + preview label make it findable (AC #3, #8). |
| 2 | How a View is addressed as a scene node | **`EntityNode` with `entity: "view.<id>"`** — no new `ViewNode`. Documented as *the* listing address. | The renderer already resolves `view.<id>` rows via the views blueprint. Adding a node type would cost schema + renderer + types work for no functional gain under a rule-only model. |
| 3 | Whether the route lives in the scene file | **Implicit** — no `path`/`route` field on `SceneDef`; the route is carried by the single main node. | Target B (role made visible) is met by the intake determination + preview, not a literal URL. A path field would pull in route-vs-datamodel validation the ticket does not ask for. |
| 4 | What a "Block" is | **Everything in `content` that is not the route-bearing main** — including a view block. No Block node type. | Keeps the model minimal; the block-source vocabulary (menu/tabs/widget/`block_content`/`block_plugin`/view block) is Drupal-specific and stays in `designbook-drupal`. |
| 5 | How the reference-exception is detected | **By scoping** — the listing rule applies only to *direct children of the page `content` slot*. Reference listings render inside the main entity's own subtree (`entity-reference-rendering.md`), so they are out of scope by construction. | No new data-model lookup needed in a validator (there is none — D6). The signage case (`paragraph.signage → field_signage_item → paragraph.signage_item`) renders its items inside the entity, never as content-slot siblings. |
| 6 | Who enforces the rule | **Rule-only** — normative prose in `screen-scene-constraints.md`; no scene-validator change. | Matches AC #10's rule-only branch. AC #1/4/5/13 are enforced at **authoring time** (the rule names the forbidden patterns; the intake never offers a second main or a `records:` listing) rather than by an automated validator. |
| 7 | The view-mapping fallstrick (`views.md:82`) | **Fixed in-ticket, in the intake** — the design-screen intake resolves a View to concrete sample rows: it adds the view's **row bundle** to `sample_data_bundles` and picks concrete record indices from that bundle's existing content sample data. The view's rows are then expressed as content-section records the validator already checks, so *"No sample records found"* cannot occur. The `views.md` workaround note is removed. | No separate sample-data workflow, no static-array/hand-done workaround. A mandated path with a documented workaround-Zwang is not shipped (AC #16). |
| 8 | Scope beyond `design-screen` | **Screen-scenes only.** `design-shell` (`$content` placeholder, no main) and `design-entity` (standalone entity, no scene file, no route) are **explicitly exempted** with a one-line note each. | The rule's trigger (`design-screen:create-scene`) already scopes it; the exemption notes make the boundary explicit (AC #14). |
| 9 | Which fixtures/cases cover the rule | Add `design-screen` + `design-verify` cases to the **`drupal-web`** suite: entity-main, view-main (`views.view.landing_teasers`), reference-listing (`paragraph.signage → field_signage_item → paragraph.signage_item`). | `drupal-web` is the Drupal-backed fixture carrying the view + paragraph-reference data the ACs name. It has no `design-screen` case today, so the section chain is scaffolded as part of this work. |

### Enforcement interpretation (AC #13)

Under rule-only there is no automated rejection: a `records:`-listing or a two-main scene would
still render. Per the confirmed decision, AC #1/#4/#5/#13 are satisfied at **authoring time**: the
rule names the forbidden patterns and the intake/structure-preview never offers them; a violation
is *demonstrably refused* by the guardrail, not by a validator error. The automated **RED→GREEN**
evidence for `work:code` is the D7 view-row resolution: RED = a view mapping fails *"No sample
records found"*; GREEN = the intake-resolved row-bundle records are present and the mapping
validates.

## Sub-works

### `work:docs`

- `design/rules/screen-scene-constraints.md` — the normative main-content rule (abstract core
  wording): exactly one route-bearing main (Entity or View); component/widget never main;
  listing ⇒ View except entity-reference-field listing inside an entity; `records:` is a demo
  shorthand (restated here per AC #7).
- `design/tasks/intake--design-screen.md` — the structure-preview names/labels the main content
  before the build (AC #8); the intake resolves the View's row-bundle sample data (D7).
- `scenes/tasks/create-scene.md` — reference the main-content rule (WHAT); no HOW.
- `scenes/schemas.yml` — `EntityNode.records` already states demo-shorthand; clarify the
  `entity: "view.<id>"` listing-address convention (D2).
- `design/rules/shell-scene-constraints.md` + design-entity intake/rule — explicit exemption notes
  (D8).
- `designbook-drupal/data-mapping/blueprints/views.md` — remove the workaround note; state the
  intake row-resolution path; add the concrete node/view/block vocabulary.

### `work:code`

- `drupal-web` fixtures/cases: a `design-screen` case (+ its section chain) and a `design-verify`
  case covering entity-main, view-main and reference-listing (AC #6/#11/#12/#19).
- The addon-TypeScript surface is expected to be **empty** under rule-only + intake-resolved view
  data; if coding finds a small validator/helper tweak is needed, it is already in scope. `pnpm
  check` gates the build regardless (AC #18).

## Testing (neutral test plan — human-confirmed before coding)

| Type | What it observes | Command / path | Expected | Evidence |
|------|------------------|----------------|----------|----------|
| debo-test render (browser) | Entity-main, view-main, reference-listing render correctly in a running Storybook (AC #6/#11/#12/#19) | `debo-test run drupal-web design-screen --validate design-verify` (from inside this worktree) | GREEN: main content in the page `content` slot, view-list from the view, reference items inside the entity, blocks beside | `workflow summary --json` block + Storybook link |
| RED→GREEN (view data) | The D7 fallstrick is gone (AC #16, #20) | The view mapping in the drupal-web case | RED before intake row-resolution (*"No sample records found"*) → GREEN after | tester log |
| Build/unit | Nothing regresses (AC #18) | `pnpm check` (typecheck → lint → test) | green | terminal output |
| Doc checks | `work:docs` translation valid (AC #21) | proportional Markdown/link/frontmatter/workflow/contract checks | pass | check output |
| File read | AC #1–5, 7, 9, 10, 14, 17 | read the changed rule/task/schema files | rule states the constraints; core stays backend-neutral | the files |
| Structure-preview | Main content shown before build (AC #8) | a `design-screen` intake preview output | preview labels the main content | preview output |
| Diff | No shell-mechanism regression (AC #15) | `git diff` vs. base | shell embed unchanged | diff |
| Scenario | Executable click-path into the section story (AC #20, `scenario_required: true`) | the design-verify click-path into the case's section story | reproducible walkthrough | scenario artifact (authored at coding) |

No concrete test, selector binding, screenshot, or `.feature` is authored in spec — those belong to
coding.

## Not in this ticket

- No rebuild of the shell mechanism (`scene: design-system:<shell>` + `with: content:` stays).
- No change to `design-shell` / `design-entity` beyond the explicit exemption.
- No migration of existing scene files; violating fixtures/cases are set to the new form.
- No renderer rebuild beyond what a (not-taken) new node type would require — none is added.
- No new Drupal backend capabilities; view/block config stay as the data model carries them.
- No progress rollup or addon-manager UI.
