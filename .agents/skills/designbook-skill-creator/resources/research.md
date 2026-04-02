---
name: research
description: Documentation for the --research flag — post-run review that asks if something was missing or wrong, then suggests skill changes
---

# Research Flag

## What It Does

`--research` switches a `_debo` command into **research mode**. The workflow runs normally first. Afterwards, a structured review asks you whether the result was correct or whether something was missing. Based on your feedback, research mode proposes concrete changes to tasks, rules, or blueprints.

## How It Works

**Step 1 — Execute the workflow normally**

The workflow runs as usual — all stages, tasks, rules, blueprints apply. The output is produced.

**Step 2 — Discover what was loaded**

Research mode reads the **workflow definition file** from the skill directory (`designbook/<concern>/workflows/<workflow-id>.md`). From the stages declared there, it identifies which task files, rules, blueprints, and `reads:` context files were involved in this run.

**Step 3 — Audit every loaded file**

Read every file that was loaded during the run (tasks, rules, blueprints, context files) and verify each one against the 4-level skill model principles. This is a systematic audit — do not skip files.

For **each file**, check:

#### 3a. Type correctness

| File type | Must contain | Must NOT contain |
|-----------|-------------|-----------------|
| **Task** | Output declarations (`files:`, `params:`, `reads:`) | Style guidance, implementation details, framework-specific logic |
| **Rule** | Hard constraints, `when:` conditions | Overridable suggestions, examples that could vary by integration |
| **Blueprint** | Overridable starting points, examples, `required_tokens` | Absolute constraints that should be rules |

Flag any file that crosses its type boundary (e.g., a task containing implementation instructions, a rule containing overridable suggestions).

#### 3b. Domain responsibility

Each file must stay within its domain. Check:

- **Core skill files** (`designbook/`) — Must be integration-agnostic. Flag if they contain framework-specific logic (Tailwind classes, Drupal schemas, Stitch API calls).
- **Integration skill files** (`designbook-drupal/`, `designbook-css-tailwind/`, `designbook-stitch/`) — Must handle their specific concern. Flag if they duplicate core logic or reach into another integration's domain.
- **Cross-cutting references** — If a core task references external data (e.g., `design_reference` from guidelines.yml), verify that the integration skill responsible for that data source has a matching rule loaded. If not, flag it as a missing dependency.

#### 3c. Loading correctness

For each stage, verify:

- Were all relevant integration rules loaded? Cross-reference `when:` conditions (steps, backend, frameworks, extensions) against the active config (`DESIGNBOOK_*` variables).
- Were rules that **should** have been loaded actually loaded? Check if context implies a dependency (e.g., guidelines.yml references Stitch → stitch extension rules should be active).
- Were rules loaded that **shouldn't** have been? (wrong `when` scope, outdated step names)

#### 3d. Duplication

Check for duplicated logic across loaded files:

- **Cross-file duplication** — Do two or more files describe the same constraint, instruction, or mapping? (e.g., a core task and an integration rule both specifying how to filter colors)
- **Cross-layer duplication** — Does a task repeat what a rule already enforces? Does a blueprint duplicate a rule's constraint?
- **Cross-skill duplication** — Do two integration skills (e.g., `designbook-stitch` and `designbook-css-tailwind`) both handle the same concern?

Flag every duplication with the two source files and which one should own the logic.

#### 3e. Content coherence

For each file, check that its instructions match the actual workflow execution:

- Does the file reference CLI commands or params that exist?
- Does it describe manual steps that the CLI already handles automatically?
- Does it reference other files (blueprints, rules) that are actually loaded for this stage?
- Are `when.steps` values current? (no stale step names from renamed stages)

Output the audit as a table:

```
File Audit:
| File | Type | Domain | Issues |
|------|------|--------|--------|
| intake--tokens.md | task | core | ⚠ Step 4 describes manual blueprint scanning (CLI handles this) |
| css-naming.md | blueprint | tailwind | ⚠ Missing from create-tokens stage (when.steps incomplete) |
| stitch-tokens.md | rule | stitch | ❌ NOT LOADED — extensions config missing stitch, but design_reference is Stitch |
| renderer-hints.md | rule | core | ✓ OK |
```

**Step 4 — Review with user**

Present the audit table and the loaded-file summary, then ask:

```
→ Was the output correct?
→ Was something missing or wrong?
→ Do the audit findings match your experience?
```

The user responds with confirmation or additional issues.

**Step 5 — Suggest changes**

Based on your feedback, research mode proposes specific skill changes:

```
Based on your feedback, I'd suggest:

1. [NEW RULE] Add `rules/required-slots.md` to `designbook-drupal`
   → when: { steps: [create-component] }
   → Enforce that every component declares at least one slot

2. [UPDATE BLUEPRINT] Modify `blueprints/card.md`
   → Add token mapping section for design-tokens.yml references

3. [UPDATE TASK] Add `reads:` entry to `create-component.md`
   → design-tokens.yml is not declared as a dependency

Apply these changes? Or refine?
```

You can accept, refine, or reject each suggestion. Accepted changes are applied directly.

## Convention: Larger Fixes via OpenSpec

If the suggested changes affect multiple files (2+), introduce new stages, or require architectural changes:

1. Research mode MUST proactively recommend creating an OpenSpec change — do not wait for the user to ask
2. Present the recommendation immediately after proposing changes:
   > "Die Änderungen betreffen N Dateien — soll ich einen OpenSpec-Change anlegen mit `/opsx:ff designbook-<workflow>-<change-summary>`?"
3. If accepted, run `/opsx:ff designbook-<workflow>-<change-summary>` to open a structured change scoped to the issues found

```
# Research on _debo design-component suggests missing slot rules
# → Affects 3 files — too large for inline fixes

/opsx:ff designbook-design-component-slot-rules
```

The change name follows the pattern `designbook-<workflow>-<change-summary>` — workflow name + short summary of what needs fixing.

**Important:** The agent must not passively wait for the user to request an OpenSpec change. If the diagnostic identifies multi-file fixes, the OpenSpec recommendation is a required part of the research output.
