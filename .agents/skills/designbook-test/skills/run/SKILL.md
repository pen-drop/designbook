---
name: debo-test-run
user-invocable: true
description: Set up a fresh fixture workspace and execute one Designbook case from a saved workflow document.
metadata:
  internal: true
---

Parse `run <suite> [<case>] [--workspace <path>] [--validate <workflow>]` and follow [run procedure](resources/run.md).

`--workspace` selects the isolated workspace directory to rebuild and use for
this run. Pass a distinct path for each concurrent run; when omitted, the
default is `workspaces/<suite>`.

The case driver performs domain intake, authors the complete immutable definition,
persists it, and delegates only its declared tasks. A validator, when requested,
is a separate saved workflow and its repair handoff stays separate.
