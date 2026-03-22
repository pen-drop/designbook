---
name: designbook-vision
description: Creates and stores the product vision document. Used during the debo-vision workflow to capture product name, description, problems/solutions, and key features.
---

> **Internal skill** — Do not invoke directly. Use the `/debo-vision` workflow instead.

# Designbook Vision

Creates `$DESIGNBOOK_DIST/product/vision.md` from the approved product vision gathered during dialog.

## Task Files

- [create-vision.md](tasks/create-vision.md) — Write `product/vision.md` from dialog results

## Rules

- [vision-format.md](rules/vision-format.md) — File format and heading requirements
