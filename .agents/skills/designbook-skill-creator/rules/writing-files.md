---
name: writing-files
description: Writing-layer authoring + validation rules for every agent-read document in this repo — SKILL.md descriptions and pointers, always-loaded CLAUDE.md, and the bodies of tasks/rules/blueprints/workflows. Load before writing any such prose; complements the structural file-type rules.
applies-to:
  - CLAUDE.md
  - SKILL.md
  - "**/SKILL.md"
  - tasks/*.md
  - "**/tasks/*.md"
  - rules/*.md
  - "**/rules/*.md"
  - blueprints/*.md
  - "**/blueprints/*.md"
  - workflows/*.md
  - "**/workflows/*.md"
---

# Writing-Layer Rules

Load together with [common-rules.md](common-rules.md) and the matching file-type rule.

Where `common-rules.md` and the file-type rules govern **structure** (which frontmatter a file
carries, WHAT-not-HOW, schema enforcement, the 4-level model), these rules govern the **writing
layer above structure**: what material stays permanently in context and what that costs, how a
pointer must be worded to fire reliably, where a piece of material sits on the information
hierarchy, when a document is split, and how to spot sediment, no-ops, duplication, and
negation-phrased steering.

The five levers below are restated **in this project's own terms and against its own artifacts**.
The vocabulary (context pointer, the two loads, information hierarchy, completion criteria, leading
words, pruning) originates in Matt Pocock's `writing-for-agents` (Claude plugin
`mattpocock-skills`); the source is machine-local and versioned, so nothing here is copied or
linked to it — the principles are re-derived for Designbook.

## Designbook artifacts on the information hierarchy

Every Designbook document type occupies a fixed rung, and each is either a **pointer** (names
out-of-context material and encodes when to reach it) or **material** (the thing reached). Author
each type for the role it plays:

| Artifact | Pointer or material | Rung / role |
|---|---|---|
| `SKILL.md` `description:` (frontmatter) | **Pointer** — the skill's top-level context pointer | Always loaded when model-invocable; its wording alone decides when the skill fires. Spend its tokens on trigger branches, not on identity. |
| `SKILL.md` body | **Pointer** — an index of links | Disclosed-reference pointers into `resources/`, `rules/`, `tasks/`; carries no implementation detail (see `common-rules.md` › `SKILL.md` — Index Only). |
| `trigger:` / `filter:` (rule + blueprint frontmatter) | **Pointer** — a structured, non-prose pointer | Selects WHEN a rule fires / WHERE a blueprint applies. One branch per trigger; keys are `steps`/`domain` (trigger) and `backend`/`frameworks.*`/`extensions`/`type` (filter), not free-text synonyms. |
| `tasks/<stage>.md` | **Material** — in-file steps | The primary tier: the ordered actions of a stage, each ending on a completion criterion. |
| `rules/<name>.md` | **Material** — in-file reference | Hard constraints consulted on demand when a trigger matches; a legitimately flat peer-set. |
| `blueprints/<name>.md` | **Material** — in-file reference | Overridable starting points consulted when a trigger matches. |
| `resources/<topic>.md` | **Material** — disclosed reference | Reached only through a `SKILL.md` link; loaded when the pointer fires, never by default. This is where Progressive Disclosure lands in the 4-level model. |
| `CLAUDE.md` (`AGENTS.md` symlink) | **Material** — always loaded | In context every turn for every agent; the single most expensive file in the repo. Every line pays on every turn. |

**Progressive disclosure** in the 4-level model is the move from an in-file mention out into
`resources/` behind a `SKILL.md` link: inline what every stage needs, disclose behind a pointer
what only some stages reach. **Co-location** is the within-file companion — keep a concept's
definition, its rule, and its caveats under one heading rather than scattered across the tree.

## Lever 1 — Context pointer

A Designbook context pointer is a `SKILL.md` `description:`, a `trigger:`/`filter:` block, or a
link out of `SKILL.md` into `resources/`. The pointer's **wording**, not its target, decides when
the material is reached. Front-load the leading word, give one trigger per branch, and do not spend
pointer tokens restating the identity the `name:` already carries.

**Correct** (from `designbook/skills/sb/SKILL.md`): the description front-loads the actions and
never restates the name `sb`:

```yaml
description: >
  Start, stop, restart, or inspect the Storybook dev server. Use when the user
  wants to manage the Storybook server for a designbook project.
```

**Wrong** (from `designbook-gaia/SKILL.md`): the opening clause restates the identity the `name:`
(`designbook-gaia`) already carries, spending scarce always-loaded pointer tokens on the skill's
own name instead of on trigger branches:

```yaml
name: designbook-gaia
description: >
  GAIA integration for Designbook — provides the two GAIA workflow-step skills …
```

## Lever 2 — The two loads

Every document and pointer spends one of two budgets:

- **Context load** — always-loaded cost on the agent's window: `CLAUDE.md`, and every model-invocable
  `SKILL.md` `description:`, sits in context every turn whether or not it fires.
- **Cognitive load** — cost on the human, who is the index of which document to reach for when. Not
  a cost to minimise blindly — it is the price of human agency. A user-invocable skill
  (`disable-model-invocation: true`) pays zero context load and spends cognitive load instead.

Material reached only through a `SKILL.md` link escapes context load at the price of that one line;
`resources/` files exist for exactly this. Because `CLAUDE.md` and `SKILL.md` descriptions are
paid every turn, they earn the hardest pruning — material only one stage needs belongs in that
stage's `resources/`, not in an always-loaded file.

**Correct** (from `designbook/skills/sb/SKILL.md`): a one-line description carrying only its
triggers — a small, permanent context-load footprint proportional to how often the skill must
self-fire.

**Wrong** (from `CLAUDE.md`, `## Skill Architecture`): the three-part architecture and the 4-level
model are restated in the always-loaded file, paying context load every turn for material that only
an authoring session needs and that `designbook-skill-creator/SKILL.md` already owns (see Lever 3).

## Lever 3 — Information hierarchy & single source

Each normative fact has **one** authoritative home. A second copy is duplication: it costs
maintenance and tokens and inflates the fact's apparent rank. Point at the single source instead of
restating it.

**Correct** (from `designbook-skill-creator/SKILL.md`): the schema format is not restated — the
index points to its single source:

```markdown
See [`resources/schemas.md`](resources/schemas.md) for `schemas.yml` format, `$ref` syntax, and result conventions.
```

**Wrong** (`CLAUDE.md` `## Skill Architecture` vs. `designbook-skill-creator/SKILL.md`): both files
state the 4-level model (`workflow → stage → task/blueprint/rule`) and the three-part architecture.
Two homes for one normative fact — the meaning drifts when only one is edited. The fix is a pointer
from the cheaper-to-edit file to the authoritative one, not a synchronised copy.

## Lever 4 — Steps & completion criteria

Every step in a `tasks/` file ends on a **completion criterion** — the condition that tells the
agent the step is done. Two properties make it a lever: **clarity** (can the agent tell done from
not-done? a fuzzy bound invites premature completion) and **demand** (how much it requires —
"every modified model accounted for" forces legwork that "produce a change list" does not). The
strongest criteria are both checkable and exhaustive. This lever is deliberately **prose, not a
check** (see below): whether a bound is fuzzy or whether a step demands enough legwork is
model-relative and settled by running the task, not by static inspection.

**Correct** (from `designbook/skills/css-generate/tasks/guard-css.md`): the step names a checkable,
exhaustive bound and what failing it means:

```markdown
`unresolved-placeholders` is empty. Otherwise FAIL the task; do not mark done. Report all three: …
```

**Wrong** (a fuzzy bound that invites premature completion — the anti-pattern this lever guards
against): "Iterate until the layout looks right." — no observable done-state; the agent decides it
is finished by feel.

## Lever 5 — Leading words & pruning

Prefer a **leading word** the model already holds from pretraining, repeated as a token, over a
sentence that paraphrases it. Keep each meaning in a **single source of truth**; let the
**environment** (`designbook.config.yml`, the directory layout, `--help`) be its own source rather
than caching lookups that go stale; check every line for **relevance** so the file does not silt up
with **sediment**; and hunt **no-ops** — instructions the model already obeys by default.

**Negation** is the failure mode: steering by prohibition ("do not reorder") drags the forbidden
behaviour into context and makes it *more* available. Prompt the **positive** target instead. A
bare prohibition earns its place only as a hard guardrail that cannot be phrased positively, and
even then it is paired with the positive target.

**Correct** (from `designbook/SKILL.md`): the guardrail negation is one that cannot be phrased
purely positively, and it is paired with the positive target in the same breath:

```yaml
description: >
  … Use ALWAYS when creating, modifying, or deleting components … Never create
  component files without a designbook skill.
```

**Wrong** (from `designbook/skills/import/tasks/intake--import.md`): a step steered by prohibition
where a positive target would steer better:

```markdown
The workflow order in Step 4 is fixed — do not reorder
```

Positive form: "Run the Step 4 workflows in the order written." — the banned behaviour is never
spoken.

## Check-vs-prose decision (one line per lever)

Per the ticket's schema-first rule, every lever is decided — check where a static predicate exists,
prose where the judgement is model-relative or qualitative:

| Lever | Becomes a check | Stays prose (why) |
|---|---|---|
| Context pointer | `WRITE-01` (pointer repeats identity), `WRITE-02` (synonym triggers for one branch) | Front-loading the leading word — a static scan cannot rank word order against intent |
| The two loads | — (report-only metric `always_loaded_cost`, no deduction) | When material *must* be always-loaded is a judgement, not a predicate |
| Information hierarchy | `WRITE-03` (same meaning in two files) | The rung a piece belongs on; Co-location; Progressive Disclosure (report-only `body_sprawl`) |
| Steps & completion criteria | — | Fuzzy-bound and demand-of-legwork are model-relative — settled by running the task |
| Leading words & pruning | `WRITE-04` (steering by negation) | Leading-word strength and the no-op test are model-relative; relevance/environment are qualitative |

## Always-loaded metrics (report-only)

Two metrics report without deduction (see [`../resources/validate.md`](../resources/validate.md)
Step 4):

- `always_loaded_cost` — for `CLAUDE.md` and every model-invocable `SKILL.md` `description:`:
  description word-count + `body_lines`, the permanent per-turn load.
- `body_sprawl` — an advisory flag when `body_lines` exceeds a soft per-type reference; reported,
  never scored, because a hard line-cap would be arbitrary.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| WRITE-01 | warning | A model-invocable `SKILL.md` `description:` (or a `SKILL.md` pointer) repeats the file's own identity/name from `name:` or the body heading, instead of spending its tokens on firing triggers or the material's role | frontmatter+body |
| WRITE-02 | warning | A `trigger:`/`filter:` block or a `description:` lists two or more synonymous triggers for the **same** branch — redundant trigger words selecting one activation | frontmatter |
| WRITE-03 | warning | The file states the same normative meaning (a definition, rule, or structure description) that authoritatively belongs to **another** spec file, instead of pointing at the single source | body |
| WRITE-04 | warning | An instruction is phrased as a negation/prohibition ("do not X") where a positive target ("do Y") would steer, and is not an unavoidable hard guardrail paired with its positive target | body |
