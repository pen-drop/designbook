---
name: research
description: Pointer to the autonomous research-mode loop and audit criteria. The user-facing loop lives in designbook-test; skill-creator users consult the audit criteria when authoring tasks/rules/blueprints.
---

# Research (relocated)

The `--research` flag was removed from the `debo` skill and replaced by the autonomous loop on `debo-test`:

```
debo-test <suite> <case> --research
```

See:
- `.agents/skills/designbook-test/workflows/research.md` — the loop protocol
- `.agents/skills/designbook-test/resources/audit-criteria.md` — audit criteria (used by the loop and as a checklist when authoring skill files)

When authoring or reviewing a task/rule/blueprint, the audit dimensions are useful even outside a research run:
- Type correctness (task vs rule vs blueprint)
- Domain responsibility (core vs integration)
- Duplication (cross-file, cross-layer, cross-skill)
- Content coherence (CLI commands exist, schemas match)
