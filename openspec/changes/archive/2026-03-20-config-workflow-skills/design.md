## Context

The designbook-workflow skill has three existing config hooks: `workflow.rules`, `workflow.tasks`, and now needs `workflow.skills`. Skills (like `frontend-design`) are loaded via the Skill tool — an AI-side action. There is currently no way to declare "load skill X when stage Y runs" outside of hard-coding it into project task/rule files.

The external skill separation is intentional: project-local skills (in `.claude/skills/`) are project-owned, while skills like `frontend-design` or `openspec-*` are external/shared and should not be copied into the project directory.

## Goals / Non-Goals

**Goals:**
- Add `workflow.skills` to `designbook.config.yml` — maps stage keys to skill name arrays
- Extend Rule 4 in `designbook-workflow` to load listed skills via the Skill tool at stage boundaries
- Support the same scoped key format already used by `workflow.rules` (e.g. `debo-design-tokens:dialog`)
- Fully backwards-compatible — config files without `workflow.skills` are unaffected

**Non-Goals:**
- CLI changes — skill loading is AI-side only, no new CLI commands
- Conditional skill loading (e.g. `when: backend: drupal`) — keep it simple, always load if listed
- Skill validation — if a listed skill name doesn't exist, it silently fails (Skill tool handles this)

## Decisions

**Config key is `workflow.skills`, parallel to `workflow.rules` and `workflow.tasks`**
Rationale: consistent with existing schema, discoverable by anyone already familiar with the config. Alternative (`workflow.load`, `workflow.external-skills`) is less obvious.

**Loading happens at stage start, before task/rule scanning**
Rationale: external skills may provide context needed during rule evaluation. Loading after would be too late. Risk: slight overhead if a skill is listed for a frequently-run stage — acceptable.

**Skill list is additive; duplicates are ignored**
If the same skill is listed for multiple stages and both run in the same session, the Skill tool is only called once per skill per conversation (it's already loaded). No special dedup logic needed — the Skill tool handles this gracefully.

## Risks / Trade-offs

- **Skill name typos** → silent failure (Skill tool returns nothing). Mitigation: user sees no loaded skill — easy to debug.
- **Stage key sprawl** → `workflow.skills` could grow large. Mitigation: document that it's for external skills only; local logic belongs in task/rule files.

## Open Questions

None — scope is well-defined and mirrors existing `workflow.rules` behavior.
