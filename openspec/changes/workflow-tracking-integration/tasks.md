## 1. CLI Commands

- [x] 1.1 Implement `designbook workflow create` command (unique name generation, tasks.yml creation, stdout output)
- [x] 1.2 Implement `designbook workflow update` command (status updates, timestamps, auto-archive on completion)

## 2. Update designbook-workflow skill

- [x] 2.1 Update `.agent/skills/designbook-workflow/SKILL.md` to reference CLI commands instead of prompt-driven YAML manipulation

## 3. Add tracking to single-task workflows

- [x] 3.1 Add tracking to `debo-vision.md` (1 task: create-vision)
- [x] 3.2 Add tracking to `debo-sections.md` (1 task: create-sections)
- [x] 3.3 Add tracking to `debo-design-tokens.md` (1 task: create-tokens)
- [x] 3.4 Add tracking to `debo-css-generate.md` (1 task: generate-css)
- [x] 3.5 Add tracking to `debo-data-model.md` (1 task: create-data-model)
- [x] 3.6 Add tracking to `debo-export-product.md` (1 task: create-export)

## 4. Add tracking to multi-step workflows

- [x] 4.1 Add tracking to `debo-shape-section.md` (1 task: shape-section)
- [x] 4.2 Add tracking to `debo-sample-data.md` (1 task: create-sample-data)
- [x] 4.3 Add tracking to `debo-design-shell.md` (tasks: create-spec, create-component, create-scene)
- [x] 4.4 Add tracking to `debo-design-component.md` (tasks: create-component, create-story, create-twig)
- [x] 4.5 Add tracking to `debo-design-screen.md` (tasks per component created)
- [x] 4.6 Add tracking to `debo-screenshot-design.md` (1 task: capture-screenshots)

## 5. Test

- [x] 5.1 Run `/debo-vision` with She-Ra update and verify tasks.yml is created, updated, and archived
