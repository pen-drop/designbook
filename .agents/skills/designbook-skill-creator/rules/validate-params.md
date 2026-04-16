---
when:
  steps: [validate]
priority: 10
---

# Validate Param Declarations

Check all task files for param/body consistency violations:

1. **Hardcoded paths in body** — Search markdown body (below frontmatter) for patterns: `$DESIGNBOOK_DATA`, `.yml` filename references, `Read ... .yml`, `If ... .yml exists`. Warn if a file reference is found that is not a runtime path (runtime paths contain `{{ }}`, `{var}`, or `$reference_dir`).

2. **Missing params** — If a file is referenced in the body but not declared in `params.properties`, report as error with suggested param declaration.

3. **Missing `$ref`** — If a result entry has `path:` but no `$ref:` to a schema, report as warning. Every file result should reference a schema.

4. **Redundant body references** — If a filename in the body matches the basename of an existing param's `path:`, report as warning. The param makes the body reference redundant.

5. **Flat map format** — If `params:` or `result:` lack `type: object` and `properties:`, report as error. Wrapper format is required.

Output findings as a numbered list with severity (error/warn) and suggested fix.
