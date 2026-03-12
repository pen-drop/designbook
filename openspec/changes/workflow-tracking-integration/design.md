## Context

Designbook has two layers of AI-driven configuration:
- **Workflows** (`.agent/workflows/debo-*.md`) — user-facing slash commands with step-by-step prompts
- **Skills** (`.agent/skills/*/SKILL.md`) — reusable internal skill definitions loaded via `@skillname` convention

The `designbook-workflow` skill in `.agent/skills/designbook-workflow/SKILL.md` defines infrastructure for tracking workflow progress via `tasks.yml` files. Storybook's panel polls these files and shows notifications on completion. But no workflow currently references this skill.

## Goals / Non-Goals

**Goals:**
- Two CLI commands (`workflow create`, `workflow update`) handle all tracking logic deterministically
- Every `debo-*` workflow uses these CLI commands instead of prompt-driven YAML manipulation
- Users see workflow progress in Storybook's panel and get notified when done
- Single-task workflows (like `/debo-vision`) are included — consistency over minimalism

**Non-Goals:**
- No changes to Storybook panel code — it already polls for `tasks.yml`
- Figma workflows (`debo-figma-*`) and `debo-run-promptfoo-test` are excluded — internal/testing workflows

## Decisions

### 1. Two CLI commands replace all prompt-driven tracking logic

```
designbook workflow create --workflow <id> --title <title> \
  --task <id> <title> <type> [--task ...]

→ debo-vision-2026-03-12-a3f7    # returns unique name

designbook workflow update <name> <task-id> --status <in-progress|done>
```

**`create`:**
- Generates unique name: `<workflow-id>-<date>-<short-uuid>` (4 char hex)
- Creates `$DESIGNBOOK_DIST/workflows/changes/<name>/tasks.yml`
- All tasks start as `pending`, sets `started_at` timestamp
- Prints the generated name to stdout (workflow captures it for subsequent `update` calls)

**`update`:**
- Sets task status + timestamps (`started_at` for in-progress, `completed_at` for done)
- After each update: checks if all tasks are `done`
- If all done → sets top-level `completed_at`, moves directory to `workflows/archive/`
- Validates: task exists, status transition is valid

**Why CLI over prompt logic?** Atomic writes, timestamps, archive logic, and validation are deterministic operations. Doing them in code eliminates prompt-based errors and reduces token usage per workflow run.

### 2. Workflows use --spec to show plan including tasks, then execute

The existing `--spec` flag in workflows already outputs a plan of what would be created. With tracking:
- `--spec` mode: runs `workflow create`, outputs the plan with tasks, stops
- Default mode: runs `workflow create`, outputs plan, then executes all steps with `workflow update` calls

### 3. Workflow files get minimal tracking instructions

Each `.agent/workflows/debo-*.md` gets a compact `## Workflow Tracking` section:

```markdown
## Workflow Tracking

At start, create the workflow:
\`\`\`
WORKFLOW_NAME=$(designbook workflow create --workflow debo-vision --title "Define Product Vision" \
  --task create-vision "Create product vision" data)
\`\`\`

If `--spec`: output the plan and stop.

After completing each step:
\`\`\`
designbook workflow update $WORKFLOW_NAME create-vision --status done
\`\`\`
```

### 4. One task per major file output

Each workflow task maps to a concrete file output:
- `/debo-vision` → 1 task: `create-vision` (writes `product/vision.md`)
- `/debo-design-shell` → 3 tasks: `create-spec`, `create-component`, `create-scene`
- `/debo-design-screen` → variable tasks based on components created

## Risks / Trade-offs

- **Two commands to maintain** → Minimal surface area, straightforward YAML read/write logic
- **Workflow already has tasks.yml from prior run** → `create` always generates a new unique name, so no conflicts
