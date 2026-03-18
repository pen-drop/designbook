---
params:
  filter: ""   # optional filter pattern from dialog; empty = full suite
files:
  - promptfoo/reports/latest.json
---

## Clean Previous Workspaces

```bash
bash promptfoo/scripts/clean.sh
```

## Run Promptfoo Eval

**Full suite** (when `filter` is empty):
```bash
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --max-concurrency 1 --output promptfoo/reports/latest.json
```

**Filtered** (when `filter` is set):
```bash
npx promptfoo eval -c promptfoo/promptfooconfig.yaml --filter-pattern "{{ filter }}" --max-concurrency 1 --output promptfoo/reports/latest.json
```

Wait for completion (5–30 minutes). Log the workspace path:
```bash
ls -d promptfoo/workspaces/*/designbook 2>/dev/null || echo "No workspace created"
```
