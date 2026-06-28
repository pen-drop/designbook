# Task 3 Report: Backend command config in the install blueprint

## Skill-creator loaded

`designbook-skill-creator` was invoked via Skill tool before editing any skill file.
Rule files read: `rules/blueprint-files.md`, `rules/common-rules.md`.
Current blueprint read: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`.

## Files changed

- **Modified**: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`

No other files were modified.

## Block added

The `backend_cmd:` block was added inside the emitted YAML code fence (after the `extensions:` list),
with inline comments matching the brief verbatim, plus a prose section `## backend_cmd — data for
sync task interpolation` in the blueprint body explaining the semantics.

**Exact YAML added (inside emitted config fence):**
```yaml
# Backend command strings — interpolated as {{ backend_cmd.* }} by sync tasks.
# Core runs these opaquely; no drush/Drupal knowledge lives in core. Built on
# existing drush + config_inspector. Exact schema_cmd/validate_cmd realization is
# finalized in Plan 3 (still data strings, not authored code).
backend_cmd:
  cmd: "ddev drush"
  schema_cmd: "ddev drush designbook:config-schema"   # prints JSON Schema for a config name (existing typed-config/config_inspector capability)
  validate_cmd: "ddev drush config:inspect --detail"  # non-zero exit on schema violation
```

**Prose added in body:**
The `## backend_cmd — data for sync task interpolation` section explains:
- Values consumed via `{{ backend_cmd.cmd }}`, `{{ backend_cmd.schema_cmd }}`, `{{ backend_cmd.validate_cmd }}` by sync tasks (Plan 3)
- Core runs command strings opaquely; no drush/Drupal knowledge in core
- Built on existing `drush` CLI and `config_inspector` module capability
- Exact realization of `schema_cmd` and `validate_cmd` finalized in Plan 3; strings are data only

## Validator output (manual check against checks tables)

Checks applied to `designbook-config.md` per `blueprint-files.md` + `common-rules.md`:

| ID | Severity | Result | Notes |
|---|---|---|---|
| COMMON-01 | error | PASS | Valid YAML frontmatter present (lines 1–6): `trigger.steps`, `filter.backend` |
| COMMON-02 | warning | N/A | File is in integration skill `designbook-drupal/`, not core `designbook/`; no site-specific content present |
| BLUEPRINT-01 | error | PASS | No `provides:` or `constrains:` in frontmatter; only `trigger:` and `filter:` |
| BLUEPRINT-02 | warning | PASS | No site-specific brand/URL references; `ddev`/`drush`/`config_inspector` are standard Drupal toolchain identifiers, not customer-specific |
| BLUEPRINT-03 | warning | PASS | Prose describes semantics and interpolation convention only; no inline enum/required/type/default values in body prose |
| BLUEPRINT-04 | warning | PASS | No references to rule files in body |
| BLUEPRINT-05 | warning | PASS | No fixed pixel/rem measurements or hardcoded layout counts |

**Errors: 0 | Warnings: 0 — Score: 100/100**

## Concerns

None. The `backend_cmd` values (`ddev drush ...`) are installation-profile defaults for a ddev-based
Drupal environment. Sites not using ddev would override the blueprint — correct blueprint behavior
(overridable starting point, not a hard constraint). The exact realization of `schema_cmd` and
`validate_cmd` is deferred to Plan 3 as specified in the brief.
