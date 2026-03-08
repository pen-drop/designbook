# Promptfoo Evaluation Report

**Date:** 2026-03-08 19:40
**Run:** #6 — Normal mode, per-test workspace isolation
**Tests:** 10 total, 7 passed, 3 failed (70%)
**Provider:** gemini-3-pro
**Duration:** 23m 16s
**Total Tokens:** 121,972 (35k eval, 87k grading)
**Workspace:** `promptfoo/workspaces/debo-*/` (10 isolated workspaces)

## Progress Across Runs

| Run | Tests | Passed | Rate | Duration | Changes |
|-----|-------|--------|------|----------|---------|
| 1 | 12 | 6 | 50% | 23m | --spec mode |
| 2 | 12 | 7 | 58% | 22m | Normal mode |
| 3 | 10 | 7 | 70% | 41s | Removed addon tests |
| 4 | 10 | 7 | 70% | — | Deep analysis |
| 5 | 10 | 8 | 80% | 1m29s | Fixed product-vision prompt |
| 6 | 10 | 7 | 70% | 23m | **Per-test workspace isolation** |

## Summary

| # | Test | Status | Score | Category |
|---|------|--------|-------|----------|
| 1 | product-vision | ❌ fail | 0 | assertion-too-strict |
| 2 | product-sections | ✅ pass | 1.0 | — |
| 3 | design-tokens | ✅ pass | 1.0 | — |
| 4 | data-model | ❌ fail | 0 | assertion-too-strict |
| 5 | css-generate | ✅ pass | 1.0 | — |
| 6 | shape-section | ✅ pass | 1.0 | — |
| 7 | design-component | ✅ pass | 1.0 | — |
| 8 | sample-data | ❌ fail | 0 | assertion-too-strict |
| 9 | design-screen | ✅ pass | 1.0 | — |
| 10 | design-shell | ✅ pass | 1.0 | — |

## Key Observation

With workspace isolation, agents now **actually create files** (23min runtime vs 1.5min). This exposed that rubrics which check for file-internal details (headings, entity names, id fields) fail — because the agent doesn't echo file contents in conversation output.

**design-screen now passes** because the agent properly mentions screen definitions.

## Failures

### product-vision (assertion-too-strict)
**Rubric:** Checks for ## Description, ## Problems, ## Key Features headings
**Agent:** "I've saved your product vision to designbook/product/product-overview.md"
**Root cause:** Rubric checks file content details not visible in conversation
**Fix:** → see [fix-proposals.md](file:///home/cw/projects/designbook/promptfoo/reports/fix-proposals.md)

### data-model (assertion-too-strict)
**Rubric:** Checks for entity type names (pets, shelters) and fields
**Agent:** "I've updated the data model based on PetMatch requirements"
**Root cause:** Same — rubric checks details the agent summarizes rather than echoes
**Fix:** → see fix-proposals.md

### sample-data (assertion-too-strict)
**Rubric:** Checks for "each record has an id field"
**Agent:** "5 Pet records, 2 Shelter records, 3 Category records"
**Root cause:** Same — id fields exist in the file but aren't mentioned in conversation
**Fix:** → see fix-proposals.md

## Lessons Learned

1. **Workspace isolation works correctly.** All 10 tests created files in their isolated workspaces.
2. **llm-rubric can only verify conversation output, not file contents.** All 3 failures are rubrics checking file-internal structure.
3. **Rubrics must match what agents actually say.** Agents confirm completion summarily; they don't echo full file contents.
4. **Duration is a proxy for realism.** 23min = agents actually running. 1.5min = agents only responding from memory.
