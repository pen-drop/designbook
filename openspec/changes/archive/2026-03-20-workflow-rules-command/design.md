## Context

The AI workflow system relies on skill-provided rule files (`when.stages: [...]`) to inject constraints at dialog and task stages. Currently Rule 2 in `workflow-execution.md` instructs the AI to scan and filter these files manually — a prose-based instruction that is silently skippable. The CLI already handles config loading, variable resolution, and task discovery; rule discovery is the missing piece.

## Goals / Non-Goals

**Goals:**
- CLI command that returns ready-to-apply rule content for a given stage
- Recursive scan across all installed skills
- `when.stages` + `when.<config-key>` filtering using resolved config values
- Recursive `${VARIABLE}` resolution in output content
- Config-level rules from `workflow.rules[<stage>]` appended to output
- Rule 2 simplified to a single mandatory CLI invocation

**Non-Goals:**
- Applying or enforcing rules (still the AI's responsibility after reading output)
- Caching rule content between invocations
- Ordering rules beyond skill directory order

## Decisions

### Output format: plain concatenated text
Rule content is output as concatenated markdown blocks separated by `---`, not JSON.

**Why:** The AI reads and applies rule content directly — structured JSON would require the AI to parse and reassemble it before reading. Plain text is immediately consumable.

**Alternative considered:** JSON `[{ file, content }]` — allows the AI to attribute rules to files, but adds parsing overhead with no practical benefit.

### Matching: `when.stages` array-contains + flat config key equality
`when.stages` must include the requested stage. Additional `when.*` keys (e.g. `when.backend: drupal`) are matched against resolved config values (`DESIGNBOOK_BACKEND`, `DESIGNBOOK_FRAMEWORK_CSS`, etc.) using the same key-to-env mapping as the `config` subcommand.

**Why:** Reuses existing config resolution logic. Keeps rule file authoring simple — authors only declare what they need.

**Alternative considered:** Glob-pattern matching for stage names — adds complexity with no current use case.

### Variable resolution: recursive substitution using resolved env map
All `${VAR}` and `$VAR` references in rule content are substituted using the fully resolved config env map (same values as `workflow config` output). Resolution is repeated until no substitutions remain (handles `${DESIGNBOOK_DIST}` → path containing no further vars).

**Why:** Rules reference paths like `$DESIGNBOOK_DIST/design-system/guidelines.yml` that must be absolute for the AI to act on them.

### Scan path: recursive glob `.agents/skills/**/rules/**/*.md`
Covers nested skills and sub-directories without requiring a flat rules structure.

## Risks / Trade-offs

- [Risk] Rule files with malformed frontmatter are silently skipped → Mitigation: emit a warning line to stderr per skipped file
- [Risk] Large numbers of rule files slow the command → Mitigation: acceptable at current scale; add caching if needed
- [Risk] AI still needs to read and apply the output → Mitigation: Rule 2 is a hard `⛔` gate in `workflow-execution.md`, making skipping more visible
