---
name: debo-test-research
user-invocable: true
description: Improve Designbook skill instructions through a scored train case and optional held-out validation cases.
metadata:
  internal: true
---

Parse `research <suite> <case> [--workspace <path>] [options]` and follow [research procedure](resources/research.md).

`--workspace` selects the isolated directory to rebuild and use for this loop.
Pass a different path for every concurrent loop; when omitted, the default is
`workspaces/<suite>`.

Each score uses a fresh case fixture, a saved workflow path, and the shared
[evaluation scorer](../../resources/eval-score.mjs). Research edits are bounded to
the declared scope and are accepted only when the configured metric improves.
