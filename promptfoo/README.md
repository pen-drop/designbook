# Promptfoo — AI Workflow Evaluations

Evaluates Designbook AI skills and workflows using [promptfoo](https://promptfoo.dev/) with `llm-rubric` (LLM-as-Judge) assertions.

## Structure

```
promptfoo/
├── reports/                              # Eval results (gitignored)
├── skills/                               # Skill-level tests (single skill)
│   └── <skill-name>/
│       ├── promptfooconfig.yaml
│       └── prompts/
└── workflows/                            # Workflow-level tests (multi-skill)
    └── debo-design-screen/
        ├── promptfooconfig.yaml
        └── prompts/
            └── blog-spec.txt
```

## Skills vs Workflows

| | **Skills** | **Workflows** |
|---|---|---|
| Scope | Single skill execution | Multi-skill orchestration |
| Example | `drupal-components-ui` | `debo-design-screen` |
| Speed | Fast | Slow |
| Rubric | File format, schema | End-to-end result |

## Usage

```bash
# Workflow test
promptfoo eval -c promptfoo/workflows/debo-design-screen/promptfooconfig.yaml

# All skill tests
promptfoo eval -c promptfoo/skills/*/promptfooconfig.yaml

# Everything
promptfoo eval -c promptfoo/**/promptfooconfig.yaml
```

## Adding a Test Case

1. Add a prompt file: `promptfoo/<type>/<name>/prompts/<case>.txt`
2. Add a `tests:` entry in the config's `promptfooconfig.yaml`
3. Use `llm-rubric` assertion with natural language criteria
