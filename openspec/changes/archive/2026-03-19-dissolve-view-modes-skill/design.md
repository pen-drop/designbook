## Context

`designbook-view-modes` and `designbook-scenes` are always used together — a scene references entities, and a view-mode file defines how each entity renders. Currently agents must load both skills. The view-modes skill has 1 task file and 3 resource files. All of it belongs in the scenes skill.

## Goals / Non-Goals

**Goals:**
- Merge all view-modes skill content into designbook-scenes
- Remove the designbook-view-modes skill directory entirely
- Update the scenes SKILL.md to reflect the expanded scope

**Non-Goals:**
- No content changes to the moved files (pure relocation)
- No changes to actual JSONata files or runtime code
- `list-view-modes.md` is now superseded by `view-entity.md` — evaluate on move

## Decisions

**Move all files, delete the source skill.**
The view-modes content (jsonata-reference, field-mapping, create-view-modes task) integrates cleanly into designbook-scenes. No wrapping or restructuring needed.

**`list-view-modes.md` → delete.**
This resource described the old `config: list.*` pattern's view-mode format. With view-entity-unification, `view-entity.md` covers the replacement. The file is obsolete.

**SKILL.md description stays focused on scenes.**
The merged SKILL.md should reflect that scenes now includes view-mode authoring, not split into two separate concepts.

## Risks / Trade-offs

- Agents that explicitly load `designbook-view-modes` by name will find nothing → Mitigation: the skill description in the catalog drives loading, so removal is clean
- Any links to `designbook-view-modes` resources from other skills need updating → Check all skill files for cross-references

## Open Questions

- Are there any other skills that cross-reference `designbook-view-modes`? Check before deletion.
