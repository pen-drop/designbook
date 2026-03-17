---
name: designbook-skills
description: Meta-skill for creating and maintaining Designbook skills. Defines conventions for skill structure, schema validation, and dependencies.
---

# Designbook Skills

This meta-skill documents the conventions and standards for creating Designbook skills. Use it when building new skills or updating existing ones.

## Skill Directory Structure

Every skill lives under `.agent/skills/[skill-name]/` and follows this structure:

```
.agent/skills/[skill-name]/
├── SKILL.md              # Main skill instruction file (required)
├── resources/            # Reference documentation, split by concern
│   ├── [topic-a].md
│   └── [topic-b].md
├── scripts/              # Helper scripts and utilities
│   └── [script].sh
├── examples/             # Reference implementations
│   └── [example].yml
└── *.schema.json         # JSON Schemas for validation (if applicable)
```

## Naming Conventions

| Scope | Convention | Example |
|-------|-----------|---------|
| Component skills | `designbook-[concern]-[component-framework]` | `designbook-components-sdc` |
| CSS skills | `designbook-css-[css-framework]` | `designbook-css-daisyui` |
| Backend skills | `designbook-[concern]-[backend]` | `designbook-data-model-drupal` |
| Figma pipeline | `designbook-figma-[concern]-[component-framework]` | `designbook-figma-components-sdc` |
| Addon skills | `designbook-addon-[concern]` | `designbook-addon-components` |
| Workflow files | `debo-[action]` | `debo-design-component` |

> [!IMPORTANT]
> **Concern-first, framework-last.** The framework/backend identifier always comes last in the skill name. This enables convention-based skill selection — swap the suffix to switch implementations:
>
> | `frameworks.component` | Component Skill | Figma Skill |
> |---|---|---|
> | `sdc` | `designbook-components-sdc` | `designbook-figma-components-sdc` |
> | `react` | `designbook-components-react` | `designbook-figma-components-react` |
>
> | `frameworks.css` | CSS Skill |
> |---|---|
> | `daisyui` | `designbook-css-daisyui` |
> | `tailwind` | `designbook-css-tailwind` |
>
> | `backend` | Backend Skill |
> |---|---|
> | `drupal` | `designbook-data-model-drupal` |
>
> Skills are loaded based on `DESIGNBOOK_FRAMEWORK_COMPONENT`, `DESIGNBOOK_FRAMEWORK_CSS`, and `DESIGNBOOK_BACKEND`.

## Schema Validation

### Dependencies

For JSON Schema validation, use **ajv v6** (supports Draft-04) with **ajv-cli v3**:

```bash
npm install ajv-cli@3 ajv@6
```

> ⚠️ **Do NOT use `npx -y ajv-cli`** — the latest version (v5+) uses ajv v8 which does not support JSON Schema Draft-04. Many Drupal schemas use Draft-04.

### Schema Location

Schemas must be **bundled within the skill directory**, not downloaded at runtime:

```
.agent/skills/designbook-components-sdc/
├── SKILL.md
├── metadata.schema.json    # ✅ Bundled schema
└── resources/
```

> ⛔ **NEVER** download schemas at runtime via `curl` or similar. All schemas must be committed to the repository as part of the skill.

### Validation Command

```bash
npx ajv-cli validate -s .agent/skills/[skill-name]/[schema].json -d /tmp/[data].json
```

### YAML-to-JSON Conversion

Since ajv only validates JSON, convert YAML before validation:

```bash
node -e "
const fs = require('fs');
const yaml = require('yaml');
const content = fs.readFileSync('[path-to-yaml]', 'utf8');
const parsed = yaml.parse(content);
fs.writeFileSync('/tmp/validate.json', JSON.stringify(parsed, null, 2));
"
```

## Data Transformation (Preferred)

When a skill needs to **transform YAML/JSON into another format** (CSS, YAML, config files, etc.), use [`jsonata-w`](https://github.com/christianwiedemann/jsonata-w) — a CLI optimized for AI-agent workflows with full YAML support.

### Usage

```bash
npx jsonata-w transform <expression-file.jsonata>
```

### JSONata File Structure

Each `.jsonata` file is self-contained with an embedded config block. All paths support both JSON and YAML (auto-detected from extension):

```jsonata
/**
 * @config {
 *   "input": "./path/to/input.yml",
 *   "output": "./path/to/output.css",
 *   "schema": "./optional/schema.yml",
 *   "examples": "./path/to/expected-output.yml"
 * }
 */
(
  /* Your JSONata expression here */
  $
)
```

- **input**: Path to the source file — supports `.json`, `.yml`, `.yaml` (relative to the `.jsonata` file)
- **output**: Path where the result will be saved — format auto-detected from extension (`.yml`/`.yaml` → YAML, `.json` → JSON, other → raw string)
- **schema**: (Optional) JSON or YAML schema for validation of the output
- **examples**: (Optional) JSON or YAML file with expected output subset for validation

### Features

- **Full YAML Support** — Input, output, schema, and example files all support YAML format (auto-detected from `.yml`/`.yaml` extension)
- **Embedded Config** — No CLI arguments needed for input/output paths
- **Auto-Unflattening** — Dot-notation keys (`{"a.b": 1}`) are automatically expanded into nested objects (`{"a": {"b": 1}}`)
- **Inspect mode** — Use `npx jsonata-w inspect <file> --summary` to explore structure of JSON or YAML files

### When to Use

| Scenario | Tool |
|----------|------|
| Transform YAML/JSON → CSS, YAML, or other formats | `npx jsonata-w transform` ✅ |
| Inspect YAML/JSON structure | `npx jsonata-w inspect --summary` ✅ |
| Validate JSON against a schema | `npx ajv-cli validate` |

### Skill Convention

Place `.jsonata` expression files under `$DESIGNBOOK_DIST/[skill-name]/`:

```
$DESIGNBOOK_DIST/
└── designbook-css-daisyui/
    ├── generate-colors.jsonata
    └── generate-spacing.jsonata
```

> Skills define the **instructions** (in `.agent/skills/`), while `.jsonata` transformation files live in `$DESIGNBOOK_DIST` alongside other generated/runtime artifacts.

## SKILL.md Structure

Every `SKILL.md` must follow this template:

```markdown
---
name: [skill-name]
description: [one-line description]
---

# [Skill Title]

[Brief overview of what this skill does.]

## Prerequisites

[What must be configured before using this skill.]

## Input Parameters

[Expected input as JSON with required/optional fields.]

## Output Structure

[Directory/file structure this skill generates.]

## Execution Steps

[Numbered steps the agent follows.]

## Error Handling

[How errors are reported and recovered from.]

## Design Principles

[Key design decisions and conventions.]
```

### Splitting Large Skills

When a skill generates multiple file types, split the detailed rules into `resources/`:

```markdown
### Step 5: Generate .component.yml

→ Follow instructions in [`resources/component-yml.md`](resources/component-yml.md)
```

Each resource file is self-contained with its own rules, examples, and validation steps.

### Referencing Skill Resources from Workflows

Use the **`@skillname/`** shorthand to reference files inside a skill directory:

```
@designbook-components-sdc/resources/shell-generation.md
```

Resolves to:

```
.agent/skills/designbook-components-sdc/resources/shell-generation.md
```

**Convention:** `@skillname/path` → `.agent/skills/skillname/path`

This keeps workflow files readable and decouples them from the physical skill directory structure. Use this notation in workflow `.md` files when referencing skill resources that must be read before executing a step.

## Configuration Integration

Skills that need project configuration should use the `designbook-configuration` skill:

```bash
eval "$(npx storybook-addon-designbook config)"
echo $DESIGNBOOK_BACKEND
echo $DESIGNBOOK_DRUPAL_THEME
```

All config keys from `designbook.config.yml` are automatically exported as `DESIGNBOOK_*` environment variables. Nested keys use underscores:
- `backend` → `DESIGNBOOK_BACKEND`
- `drupal.theme` → `DESIGNBOOK_DRUPAL_THEME`

## Workflow Integration

Skills are the **implementation**. Workflows are the **user-facing interface**.

```
Workflow (debo-design-component)     →  Skill (designbook-components-sdc)
  ↳ Gathers input conversationally       ↳ Generates files, validates, verifies
```

Workflows should be thin wrappers that:
1. Gather user input
2. Call the skill with structured parameters
3. Report results

## Checklist for New Skills

- [ ] `SKILL.md` with correct frontmatter (name, description)
- [ ] Input parameters documented with JSON example
- [ ] Output structure documented
- [ ] Numbered execution steps
- [ ] Error handling defined
- [ ] Schemas bundled in skill directory (not downloaded)
- [ ] `ajv-cli@3` + `ajv@6` used for JSON Schema Draft-04 validation
- [ ] Configuration loaded via `designbook-configuration` skill
- [ ] Corresponding workflow created in `.agent/workflows/` if user-facing
