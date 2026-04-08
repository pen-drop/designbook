# Designbook Single Skill

## Purpose
Defines the unified `designbook` skill directory structure: concern directories, standard containers, and nesting rules.

## Requirements

### Requirement: Single skill named `debo`, directory `designbook`
One skill registered as `debo` (SKILL.md `name:` field) in `.agents/skills/designbook/`. User-facing command: `/debo`.

Two-step intent resolution:
1. SKILL.md description triggers `/debo` (broad match for design system domain)
2. Skill scans `**/workflows/*.md` descriptions, dispatches to specific workflow

| Invocation | Behavior |
|------------|----------|
| `/debo vision` | Loads `**/workflows/vision.md` directly |
| "I want to build a screen" | Matches intent to `design-screen` via `description` field |
| `/debo` (no argument) | Scans all workflows, presents list, asks user to choose |

Directory name (`designbook/`) and skill name (`debo`) are independent.

### Requirement: Concern-based directory structure
Content organized into concern directories at skill root. Each contains only standard containers: `tasks/`, `rules/`, `resources/`, `blueprints/`, `workflows/`. Skill root also has `resources/` for execution engine resources.

- Concern dirs: `css-generate/`, `data-model/`, `design/`, `import/`, `sample-data/`, `sb/`, `sections/`, `tokens/`, `vision/`
- No loose files inside concern dirs -- only standard container dirs
- Sub-concern nesting when domain requires it (e.g., `css-generate/fonts/google/` with own `rules/`/`tasks/`)
- Task partials in `partials/` subdirectory (e.g., `design/tasks/partials/structure-preview.md`)
- `workflows/` contains only flat `.md` files, no subdirectories

### Requirement: Workflow definition files
Each workflow defined in `<concern>/workflows/<workflow-id>.md` matching the `/debo <workflow-id>` argument. Grouped workflows share a concern dir and its `tasks/`, `rules/`, `resources/`.

### Requirement: Workflow-specific `--` qualifier
Files in shared `tasks/`/`rules/` for a single workflow use `<name>--<workflow-id>.md`. Files without `--` are shared across all workflows in that concern.

Example: `design/tasks/create-scene--design-screen.md` vs `design/tasks/create-scene--design-shell.md` resolve per workflow. `design/tasks/create-component.md` (no `--`) is shared.

### Requirement: Execution engine resources at skill root
`designbook/resources/` contains `workflow-execution.md`, `cli-reference.md`, `task-format.md`, `architecture.md` -- loaded for every workflow.

### Requirement: Cross-concern task reuse via glob
A workflow MAY reference tasks from another concern's `tasks/` dir as a plain step name, discovered via glob. Step ordering in `stages:` controls execution order -- no `before:` dependency needed.

### Requirement: Rules loaded before tasks
For every step, matching rules from `<concern>/rules/` loaded into context before the task file.
