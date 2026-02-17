## Why

Promptfoo test files are scattered across the project root (`promptfooconfig.yaml`, `promptfoo-test-blog.yaml`, `blog_prompt.txt`, `verify_blog_spec.py`). This doesn't scale as we add more workflow tests. Additionally, the blog-spec test uses a brittle `exec:` shell hack and custom Python verification scripts instead of declarative assertions.

## What Changes

- Move all promptfoo files into a structured `promptfoo/` directory
- Organize by workflow: one folder per workflow being tested (e.g., `debo-design-screen/`)
- Replace custom Python/JS assertion scripts with `llm-rubric` (LLM-as-Judge) — purely declarative YAML
- Add centralized `promptfoo/reports/` for eval output
- Clean up shell-hack provider (keep `exec:` but structured)
- Delete old root-level files

## Capabilities

### New Capabilities

- `promptfoo-structure`: Workflow-based directory layout under `promptfoo/`, per-workflow configs, centralized reports, and llm-rubric assertions replacing custom scripts.

### Modified Capabilities

_(none — no existing specs affected)_

## Impact

- **Files moved**: `promptfooconfig.yaml`, `promptfoo-test-blog.yaml`, `blog_prompt.txt`, `verify_blog_spec.py`, `README_promptfoo.md` → all into `promptfoo/`
- **Files deleted**: Root-level promptfoo files after migration
- **Dependencies**: None changed. Promptfoo and opencode remain as-is.
- **Breaking**: None. These are test configs only, not production code.
