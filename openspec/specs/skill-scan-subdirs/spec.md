# Skill Structure Specification

## Purpose
Defines skill structure: file discovery globs, SKILL.md conventions, and rule/blueprint/task content requirements.

---

## Requirement: Rule file scanning — flat glob with when-condition matching

`matchRuleFiles` scans `skills/**/rules/*.md` (single `*` after `rules/` — direct children only) and filters by `when` frontmatter.

Discovery examples:
- `.agents/skills/designbook/design/rules/playwright-session.md` — concern-level
- `.agents/skills/designbook/css-generate/fonts/google/rules/font-url-construction.md` — sub-concern via `**`
- `.agents/skills/designbook-drupal/rules/some-rule.md` — extension skill

All discovered files have `when` conditions evaluated against context and config.

---

## Requirement: Task file scanning — broad glob with when.steps matching

`resolveTaskFiles` scans `skills/**/tasks/*.md` (direct children of `tasks/`) and filters by `when.steps` matching the stage name.

- `when: { steps: [create-component] }` → matches stage `create-component`
- `when: { steps: [design-screen:intake] }` → matches qualified stage
- Generic stages return all matching tasks across skills (multiple skills can contribute)
- No `when.steps` match → fallback to `skills/**/tasks/<stage>.md` by filename with deprecation warning

---

## Requirement: Name/as deduplication and priority sorting

Files with `as:` frontmatter override target file; `priority:` determines winner.

- `designbook-drupal/tasks/create-component.md` with `as: design:create-component`, `priority: 10` → replaces core task
- No `as:` on either → both returned, sorted by priority (lowest first)

---

## Requirement: SKILL.md is index-only

Every `designbook-*/SKILL.md` contains only: frontmatter (`name`, `description`), brief overview, links to task/rule/resource files, optional reference material (schemas, format diagrams, valid value lists). Body target ~40 lines.

SHALL NOT contain: execution instructions, procedural steps, "load X skill" directives, CLI commands.

Test: if removing a section would prevent execution, it belongs in a task or rule file. Pure reference (schema diagram, valid value table) MAY stay.

---

## Requirement: Core designbook SKILL.md exception

The core `designbook/SKILL.md` (registered as `debo`) MUST contain dispatch logic (sub-command routing, file-to-workflow mapping) and flag parsing, as these are required at skill load time before any workflow/task selection.

- Dispatch section routes `$ARGUMENTS[0]` to `<concern>/workflows/<id>.md`
- Global flags table (e.g. `--optimize`, `--research`) parsed from `$ARGUMENTS`
- Still links to `resources/workflow-execution.md`, `resources/cli-reference.md`, etc.

---

## Requirement: designbook-addon-skills documents the SKILL.md contract

The `designbook-addon-skills` meta-skill documents what belongs in SKILL.md vs. task/rule/resource files, referencing the skill-creator progressive disclosure model.

---

## Requirement: Rule and blueprint examples use real patterns

Examples SHALL NOT use fictional component names. Use `COMPONENT_NAMESPACE:` variable references or actual component names. Blueprints use `slots` key (not `children`).

---

## Requirement: Blueprints contain only overridable guidance

No absolute constraints (RULE, NEVER, MUST NOT) in blueprints — those belong in rule files. Blueprints retain only overridable starting points.

---

## Requirement: No duplicate when.steps entries

Blueprint and rule `when.steps` arrays SHALL NOT contain duplicate step names.

---

## Requirement: Blueprint titles match their type

Data-mapping blueprints SHALL NOT use "Rule:" prefix. Use descriptive titles (e.g. "Blueprint: Canvas").

---

## Requirement: Link rule coherence

The `link.md` rule's description and example SHALL show the same data structure consistently.

---

## Requirement: DevTools rule — constraints not procedures

`devtools-context.md` states WHEN/WHAT to collect (computed styles, DOM snapshot, accessibility data alongside screenshots), not full implementation. JS code reduced to pseudocode or moved to reference. When DevTools MCP unavailable → visible warning to user (not silent skip).

---

## Requirement: Tasks declare WHAT not HOW

Task files contain output declarations and constraints, not implementation instructions. Imperative guidance (e.g. "MANDATORY: Change the app css") rephrased as `files:` entries or moved to rules.
