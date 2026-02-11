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
| Skill directory | `designbook-[concern]` | `designbook-drupal-components` |
| Addon skills | `designbook-addon-[concern]` | `designbook-addon-components` |
| Technology skills | `designbook-[technology]-[concern]` | `designbook-drupal-components` |
| Workflow files | `debo-[action]` | `debo-design-component` |

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
.agent/skills/designbook-drupal-components/
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

## JSON Transformation (Preferred)

When a skill needs to **transform JSON into another format** (CSS, YAML, config files, etc.), use [`jsonata-w`](https://github.com/pen-drop/jsonata-w) — a CLI optimized for AI-agent workflows.

### Usage

```bash
npx jsonata-w transform <expression-file.jsonata>
```

### JSONata File Structure

Each `.jsonata` file is self-contained with an embedded config block:

```jsonata
/**
 * @config {
 *   "input": "./path/to/input.json",
 *   "output": "./path/to/output.css",
 *   "schema": "./optional/schema.json",
 *   "examples": "./path/to/expected-output.json"
 * }
 */
(
  /* Your JSONata expression here */
  $
)
```

- **input**: Path to the source JSON file (relative to the `.jsonata` file)
- **output**: Path where the transformed result will be saved
- **schema**: (Optional) JSON schema for validation of the output
- **examples**: (Optional) Expected output subset for validation

### Features

- **Embedded Config** — No CLI arguments needed for input/output paths
- **Auto-Unflattening** — Dot-notation keys (`{"a.b": 1}`) are automatically expanded into nested objects (`{"a": {"b": 1}}`)
- **Inspect mode** — Use `npx jsonata-w inspect <file> --summary` to explore input structure before writing expressions

### When to Use

| Scenario | Tool |
|----------|------|
| Transform JSON → CSS, YAML, or other formats | `npx jsonata-w transform` ✅ |
| Validate JSON against a schema | `npx ajv-cli validate` |
| Convert YAML → JSON for validation | `node -e` inline script |

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

## Configuration Integration

Skills that need project configuration should use the `designbook-configuration` skill:

```bash
source .agent/skills/designbook-configuration/scripts/set-env.sh
echo $DESIGNBOOK_TECHNOLOGY
echo $DESIGNBOOK_DRUPAL_THEME
```

All config keys from `designbook.config.yml` are automatically exported as `DESIGNBOOK_*` environment variables. Nested keys use underscores:
- `technology` → `DESIGNBOOK_TECHNOLOGY`
- `drupal.theme` → `DESIGNBOOK_DRUPAL_THEME`

## Workflow Integration

Skills are the **implementation**. Workflows are the **user-facing interface**.

```
Workflow (debo-design-component)     →  Skill (designbook-drupal-components)
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
