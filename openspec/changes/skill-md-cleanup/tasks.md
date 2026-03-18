## 1. designbook-css-tailwind

- [x] 1.1 Remove "Generate Expression Files", "Group-to-File Mapping", and "CSS Output Structure" sections from SKILL.md — this content already exists in `tasks/generate-jsonata.md`
- [x] 1.2 Add `## Task Files` and `## Rules` index sections to SKILL.md pointing to `tasks/generate-jsonata.md`, `tasks/create-tokens.md`, and `rules/tailwind-naming.md`

## 2. designbook-css-daisyui

- [x] 2.1 Remove the first `## Prerequisites` block (lines ~14-16: "MANDATORY: Load @designbook-css-tailwind FIRST") — this was execution logic, task file handles it
- [x] 2.2 Remove the second `## Prerequisites` section, `## Capability / Generate Expression Files` (including Steps 1-4), `## Group-to-File Mapping`, `## Expected Expression Files`, `## CSS Output Structure`, and `## Technical Notes` — all already covered in `tasks/generate-jsonata.md`
- [x] 2.3 Add `## Task Files` and `## Rules` index sections to SKILL.md

## 3. designbook-view-modes

- [x] 3.1 Create `resources/jsonata-reference.md` — move Expression Format, ComponentNode Structure, JSONata Syntax Quick Reference, Conditional Components, Nested Entity References, and Composition-aware patterns from SKILL.md
- [x] 3.2 Create `resources/field-mapping.md` — move the Field-to-Component Mapping Guide from SKILL.md
- [x] 3.3 Create `resources/list-view-modes.md` — move the List View Modes section (with input variables, naming, expression format) from SKILL.md
- [x] 3.4 Remove from SKILL.md: `## Prerequisites` (lines ~19-33), `## Steps` (line ~288-290), `## Error Handling` (lines ~292-302), and the `!WORKFLOW_FILE` marker (last line)
- [x] 3.5 Replace removed sections with `## Task Files` and `## Resources` index sections linking to the new resource files

## 4. designbook-scenes

- [x] 4.1 Create `tasks/create-scene.md` for the `create-scene` stage — generates `sections/{section-id}/{section-id}.section.scenes.yml`. Include: params (section_id, entities, nav_items), files declaration, format, and key rules (provider prefix, `type: scene` + `ref`, no type:element). Reference `@designbook-scenes/resources/scene-reference.md` for full YAML examples.
- [x] 4.2 Create `resources/scene-reference.md` — move the large shell scene YAML example (lines ~79-149) and section scene YAML example (lines ~155-187) from SKILL.md here
- [x] 4.3 Remove from SKILL.md: `## Prerequisites` (lines ~19-26), `## Execution Steps` (lines ~257-329), `## Error Handling` (lines ~340-352), and the `!WORKFLOW_FILE` marker (last line)
- [x] 4.4 Add `## Task Files` and `## Resources` index sections to SKILL.md

## 5. designbook-sample-data

- [x] 5.1 Move the Validation Rules section (hard errors + warnings + scope note, lines ~59-84) from SKILL.md to `tasks/create-sample-data.md` as a `## Validation` section — these guide the creating agent
- [x] 5.2 Remove from SKILL.md: `## Prerequisites` (lines ~10-13), `## Steps` (lines ~55-57), `## Validation Rules` (lines ~59-84), and the `!WORKFLOW_FILE` marker (last line)
- [x] 5.3 Add `## Task Files` index section to SKILL.md
