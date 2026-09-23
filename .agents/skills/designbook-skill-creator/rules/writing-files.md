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
# Designbook writing checks

Apply `writing-for-agents` through the prerequisite in
[the skill creator](../SKILL.md). It owns pointer wording, progressive disclosure,
completion criteria and pruning. This file adds only Designbook-specific checks.

| Artifact | Local responsibility |
|---|---|
| Skill description | Trigger branches for model-invocable skills; a human summary otherwise |
| Skill body | Links to the selected domain intake or reference |
| Task | Outputs and checkable completion; implementation belongs in matched rules/blueprints |
| Rule / blueprint trigger | Activation through `steps` or consumed `domain`; project selection through `filter` |
| Resource | Shared procedures or branch-specific reference reached by a link |

Keep each contract at one authoritative location. Shared write-intake behavior
belongs in `designbook/design/resources/write-planning.md`; backend naming and
markup belong in the backend integration; CSS conventions belong in the CSS
integration. Skill symlinks expose canonical content and are not duplicate prose.

Static review can flag duplicate meaning and weak pointers. Whether an instruction
changes agent behavior or completion is sufficiently demanding needs runtime
observation; record that uncertainty instead of assigning an invented score.

For context-cost reporting, count always-loaded description words separately from
on-invocation body words. Repository instructions are always-loaded body text.
See [validation metrics](../resources/validate.md) for the reporting fields.

## Checks

| ID | Severity | What to verify | Where |
|---|---|---|---|
| WRITE-01 | warning | A model-invocable `SKILL.md` `description:` (or a `SKILL.md` pointer) repeats the file's own identity/name from `name:` or the body heading, instead of spending its tokens on firing triggers or the material's role | frontmatter+body |
| WRITE-02 | warning | A `trigger:`/`filter:` block or a `description:` lists two or more synonymous triggers for the **same** branch — redundant trigger words selecting one activation | frontmatter |
| WRITE-03 | warning | The file states the same normative meaning (a definition, rule, or structure description) that authoritatively belongs to **another** spec file, instead of pointing at the single source | body |
| WRITE-04 | warning | An instruction is phrased as a negation/prohibition ("do not X") where a positive target ("do Y") would steer, and is not an unavoidable hard guardrail paired with its positive target | body |
