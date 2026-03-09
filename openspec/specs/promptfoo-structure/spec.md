# promptfoo-structure Specification

## Purpose
TBD - created by archiving change promptfoo-restructure. Update Purpose after archive.
## Requirements
### Requirement: Categorized directory layout
All promptfoo configuration files SHALL reside under a top-level `promptfoo/` directory. Workflow tests SHALL use a **single unified** `promptfoo/workflows/promptfooconfig.yaml` with all workflow test cases as `tests:` entries. Prompt files SHALL be in `promptfoo/workflows/prompts/`. Skill tests SHALL be in `promptfoo/skills/`. Additionally, the `promptfoo/` directory SHALL contain `fixtures/` (per-workflow input files), `workspaces/` (test execution output, gitignored), and `scripts/` (utility scripts).

#### Scenario: Directory structure exists
- **WHEN** the restructuring is complete
- **THEN** `promptfoo/workflows/promptfooconfig.yaml` SHALL exist as the single unified workflow test config
- **AND** `promptfoo/workflows/prompts/` SHALL contain one prompt file per workflow
- **AND** the directory `promptfoo/skills/` SHALL exist for skill-level tests
- **AND** the directory `promptfoo/fixtures/` SHALL exist with per-workflow fixture directories
- **AND** the directory `promptfoo/scripts/` SHALL exist with `clean.sh`

#### Scenario: No promptfoo files in root
- **WHEN** the restructuring is complete
- **THEN** `promptfooconfig.yaml`, `promptfoo-test-blog.yaml`, `blog_prompt.txt`, `verify_blog_spec.py`, and `README_promptfoo.md` SHALL NOT exist in the project root

### Requirement: Declarative LLM-as-Judge assertions
All test assertions SHALL use promptfoo's `llm-rubric` assertion type. Custom Python or JavaScript assertion scripts SHALL NOT be used.

#### Scenario: Blog spec test uses llm-rubric
- **WHEN** the blog-spec test case is defined
- **THEN** the assert block SHALL use `type: llm-rubric` with a natural language rubric
- **AND** no `type: python` or `type: javascript` assertions SHALL be present

### Requirement: Centralized report output
The unified config SHALL write eval results to `promptfoo/reports/` via the `outputPath` config key.

#### Scenario: Report output location
- **WHEN** `promptfoo eval -c promptfoo/workflows/promptfooconfig.yaml` is run
- **THEN** the eval results SHALL be written to `promptfoo/reports/workflows.json`

#### Scenario: Filtered execution
- **WHEN** a single workflow test is run via `npx promptfoo eval --filter-description "debo-product-vision"`
- **THEN** only the matching test SHALL execute

### Requirement: Test case scalability
Adding a new test case to an existing suite SHALL require only adding a prompt file and a `tests:` entry. No new directories, scripts, or config files SHALL be needed.

#### Scenario: Adding a second test case
- **WHEN** a developer wants to test the services section design
- **THEN** they create `prompts/services-spec.txt` and add a `tests:` entry with `llm-rubric` assertion
- **AND** no other files need to be created or modified
