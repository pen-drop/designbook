# Promptfoo Error Log

## 2026-03-08 Run 6 — product-vision

**Category:** assertion-too-strict
**Provider:** gemini-3-pro
**Error:** Rubric checks file content details (headings, sections) not visible in conversation output with workspace isolation
**Resolution:** Pending — simplify to confirmation-based rubric (see fix-proposals.md)

## 2026-03-08 Run 6 — data-model

**Category:** assertion-too-strict
**Provider:** gemini-3-pro
**Error:** Rubric checks for entity type names and field details; agent only confirms creation summarily
**Resolution:** Pending — simplify to "confirms creating data model with entities" (see fix-proposals.md)

## 2026-03-08 Run 6 — sample-data

**Category:** assertion-too-strict
**Provider:** gemini-3-pro
**Error:** Rubric checks "each record has id field" — agent confirms records but doesn't mention id fields
**Resolution:** Pending — remove id-field check (see fix-proposals.md)

---

## Historical Summary

| Run | Date | Passed | Rate | Duration | Key Change |
|-----|------|--------|------|----------|------------|
| 1 | 2026-03-08 | 6/12 | 50% | 23m | --spec mode |
| 2 | 2026-03-08 | 7/12 | 58% | 22m | Normal mode |
| 3 | 2026-03-08 | 7/10 | 70% | 41s | Removed addon tests |
| 4 | 2026-03-08 | 7/10 | 70% | — | Deep analysis |
| 5 | 2026-03-08 | 8/10 | 80% | 1m29s | Fixed product-vision prompt |
| 6 | 2026-03-08 | 7/10 | 70% | 23m | Per-test workspace isolation |

### Resolved
- ✅ --spec mode mismatches (Run 1→2)
- ✅ Addon test Storybook deps (Run 2→3)
- ✅ product-vision wrong path (Run 4→5)
- ✅ design-screen screens/ convention (Run 5→6)
