## ADDED Requirements

### Requirement: Categorized directory layout
All promptfoo configuration files SHALL reside under a top-level `promptfoo/` directory. Test suites SHALL be organized into `skills/` (single skill tests) and `workflows/` (multi-skill orchestration tests) subdirectories. Each test suite SHALL contain a `promptfooconfig.yaml` and a `prompts/` folder.

#### Scenario: Directory structure exists
- **WHEN** the restructuring is complete
- **THEN** the directory `promptfoo/workflows/debo-design-screen/` SHALL exist with `promptfooconfig.yaml` and `prompts/` subdirectory
- **AND** the directory `promptfoo/skills/` SHALL exist for skill-level tests

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
All suite configs SHALL write eval results to `promptfoo/reports/` via the `outputPath` config key.

#### Scenario: Report output location
- **WHEN** `promptfoo eval -c promptfoo/workflows/debo-design-screen/promptfooconfig.yaml` is run
- **THEN** the eval results SHALL be written to `promptfoo/reports/debo-design-screen.json`

### Requirement: Test case scalability
Adding a new test case to an existing suite SHALL require only adding a prompt file and a `tests:` entry. No new directories, scripts, or config files SHALL be needed.

#### Scenario: Adding a second test case
- **WHEN** a developer wants to test the services section design
- **THEN** they create `prompts/services-spec.txt` and add a `tests:` entry with `llm-rubric` assertion
- **AND** no other files need to be created or modified
