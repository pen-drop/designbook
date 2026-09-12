---
name: debo-test-research
user-invocable: true
description: Improve Designbook skill instructions through a scored train case and optional held-out validation cases.
metadata:
  internal: true
---

Parse `research <suite> <case> [--workspace <path>] [options]` and follow [research procedure](resources/research.md).

Every case uses the shared Promptfoo run procedure. The research procedure owns
the optimizer scope, held-out evaluations and quality-gated keep/discard decision.
