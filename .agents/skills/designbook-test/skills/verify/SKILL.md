---
name: debo-test-verify
user-invocable: true
description: Verify the actual output of a debo-test design run through a separate Promptfoo design-verify evaluation, preserving its workspace and recording verification tokens and score.
metadata:
  internal: true
---

Parse `verify <suite> <case> --workspace <path> --run-dir <path>` and follow
[verification procedure](resources/verify.md).

`debo-test run` already executes design-verify automatically through its Promptfoo
pipeline. Use this sub-skill for a standalone check or a new check after repair.
Return its measured score, verification usage, report paths and verdict.
