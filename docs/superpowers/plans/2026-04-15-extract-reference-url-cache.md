# Extract-Reference URL Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move extract-reference output to a persistent URL-based cache at `$DESIGNBOOK_DATA/references/<hash>/`, enabling reuse across workflows.

**Architecture:** Replace `$CHANGES_DIR`-based screenshot storage and `design_reference` data results with a hash-addressed directory per URL under `$DESIGNBOOK_DATA/references/`. Downstream tasks switch from reading scope data to reading `extract.json` from the reference directory. The `reference_dir` path flows through workflow scope.

**Tech Stack:** Skill task definitions (Markdown with YAML frontmatter). No code changes — all files are under `.agents/skills/`.

**Prerequisite:** Load the `designbook-skill-creator` skill before modifying any file under `.agents/skills/`.

---

### Task 1: Update extract-reference.md — Frontmatter

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md:1-19`

- [ ] **Step 1: Replace the result block in frontmatter**

Change the `result:` block from:

```yaml
result:
  design_reference:
    $ref: ../schemas.yml#/DesignReference
    default: {}
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    type: string
    default: ""
```

To:

```yaml
result:
  reference_dir:
    type: string
  reference:
    type: array
    items:
      $ref: ../schemas.yml#/Reference
  screenshot:
    type: string
    default: ""
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(extract-reference): replace design_reference result with reference_dir"
```

---

### Task 2: Update extract-reference.md — Hash Calculation + Reuse Check

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md:20-38`

- [ ] **Step 1: Replace the intro paragraph and "Resolve $CHANGES_DIR" section**

Replace lines 22-37 (from "Standalone task..." through the `$CHANGES_DIR` section) with:

```markdown
Standalone task that resolves and extracts a design reference. First stage in all design workflows (design-component, design-shell, design-screen, design-verify).

Output is a `DesignReference` JSON object saved to `$DESIGNBOOK_DATA/references/<hash>/extract.json`. Screenshots are saved alongside it. Two strategies, both always include vision:

- **`playwright+vision`** -- Playwright extracts exact DOM values, Vision provides semantic understanding. Best quality.
- **`vision`** -- Screenshot only, all values estimated by AI. Fallback when no markup is available.

## Resolve Reference Directory

Each URL gets a persistent directory identified by a truncated SHA-256 hash:

1. **Normalize the URL**: lowercase, remove trailing slash. Keep query strings.
2. **Compute hash**:
   ```bash
   HASH=$(echo -n "<normalized-url>" | sha256sum | cut -c1-12)
   ```
3. **Set reference directory**:
   ```bash
   REF_DIR="$DESIGNBOOK_DATA/references/$HASH"
   mkdir -p "$REF_DIR"
   ```

## Step 1: Find Reference URL

(unchanged — keep the existing Step 1 content as-is)
```

- [ ] **Step 2: Add Reuse Check after Step 1**

Insert a new section after the "Find Reference URL" step (before the current Step 4):

```markdown
## Step 2: Reuse Check

After resolving the URL and computing the hash, check if an extraction already exists:

```bash
test -f "$REF_DIR/extract.json"
```

**If `extract.json` exists:**

Read the `extracted` field from the JSON to show the extraction date:

> "Extraktion von `<url>` existiert bereits (extrahiert am `<date>`). Wiederverwenden oder neu extrahieren?"

Wait for response. The user may:
- **Reuse**: Read `extract.json`, build results from it, skip to Step 5
- **Re-extract**: Continue to Step 4

**If `extract.json` does not exist:** Continue to Step 4.
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(extract-reference): add hash-based reference dir and reuse check"
```

---

### Task 3: Update extract-reference.md — Screenshot Paths

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md`

- [ ] **Step 1: Replace all `$CHANGES_DIR` references with `$REF_DIR`**

Find every occurrence of `$CHANGES_DIR` in the file and replace with `$REF_DIR`. These are in the Phase 1 screenshot commands:

```bash
npx @playwright/cli screenshot --full-page --filename "$REF_DIR/reference-full.png"
```

```bash
npx @playwright/cli screenshot <header-ref> --filename "$REF_DIR/reference-header.png"
npx @playwright/cli screenshot <footer-ref> --filename "$REF_DIR/reference-footer.png"
```

Also update the Phase 3 text that references screenshot paths:

```markdown
- All screenshots (`$REF_DIR/reference-full.png`, and region screenshots if they exist)
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(extract-reference): use REF_DIR for all screenshot paths"
```

---

### Task 4: Update extract-reference.md — Output Assembly + Results

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md` (Phase 4 and Step 5/6 sections)

- [ ] **Step 1: Replace Phase 4 (Assemble output)**

Replace the current Phase 4 section with:

```markdown
### Phase 4 -- Write output

Write the assembled `DesignReference` JSON to the reference directory:

```bash
# Write extract.json
cat > "$REF_DIR/extract.json" << 'EOF'
<assembled DesignReference JSON>
EOF
```

The JSON conforms to the `DesignReference` schema in `schemas.yml`. All fields populated from Phase 2 (exact) or Phase 3 (estimated). The `tokens` block contains semantically assigned values.
```

- [ ] **Step 2: Replace Step 5 (Return Results)**

Replace the current "Step 5: Return Results" section with:

```markdown
## Step 5: Return Results

All results are returned as data results via `workflow done --data`.

### reference_dir

The absolute path to the hash directory: `$REF_DIR` (e.g. `$DESIGNBOOK_DATA/references/a1b2c3d4e5f6`).

### reference[] Array

Build the reference array from the extracted data:
```json
[{"type": "url", "url": "<reference URL>", "threshold": 3, "title": "<page title>"}]
```

If the source was a screenshot (not URL), use `type: "image"`.

### screenshot

The full-page screenshot at `$REF_DIR/reference-full.png`.
```

- [ ] **Step 3: Update Step 6 (Reuse)**

Replace the current "Step 6: Reuse" section with:

```markdown
## Step 6: Reuse

If the user chose to reuse in Step 2, read `$REF_DIR/extract.json` and reconstruct the `reference[]` array from the `source` field. The screenshot files already exist in `$REF_DIR/`.
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/design/tasks/extract-reference.md
git commit -m "feat(extract-reference): write extract.json to REF_DIR, return reference_dir"
```

---

### Task 5: Update intake--design-component.md

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-component.md:1-11`

- [ ] **Step 1: Update frontmatter**

Replace the `params:` block:

```yaml
params:
  design_reference: { type: object, default: {} }
```

With:

```yaml
params:
  reference_dir: { type: string, default: "" }
```

- [ ] **Step 2: Update content references**

Replace all references to `design_reference` param with reading from `$reference_dir/extract.json`:
- Where the task says "If `design-reference.json` exists", change to "If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists"
- Where it references `$STORY_DIR/reference-full.png`, change to `$reference_dir/reference-full.png`
- Where it references `$STORY_DIR/reference-header.png` or `$STORY_DIR/reference-footer.png`, change to `$reference_dir/reference-header.png` and `$reference_dir/reference-footer.png`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-component.md
git commit -m "feat(intake-component): read design reference from reference_dir"
```

---

### Task 6: Update intake--design-shell.md

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md:1-16`

- [ ] **Step 1: Update frontmatter**

Replace the `params:` block:

```yaml
params:
  design_reference: { type: object, default: {} }
```

With:

```yaml
params:
  reference_dir: { type: string, default: "" }
```

- [ ] **Step 2: Update content references**

Replace all references to `design_reference` param with reading from `$reference_dir/extract.json`:
- "If a design reference was extracted, it is available via the `design_reference` param" → "If a design reference was extracted, it is available at `$reference_dir/extract.json`"
- "If `design_reference` is non-empty" → "If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists"
- "If `design_reference` is empty" → "If `$reference_dir` is empty"

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-shell.md
git commit -m "feat(intake-shell): read design reference from reference_dir"
```

---

### Task 7: Update intake--design-screen.md

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md:1-27`

- [ ] **Step 1: Update frontmatter**

Replace the `params:` block:

```yaml
params:
  design_reference: { type: object, default: {} }
```

With:

```yaml
params:
  reference_dir: { type: string, default: "" }
```

- [ ] **Step 2: Update content references**

Same pattern as Task 5:
- "If `design-reference.json` exists" → "If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists"
- `$STORY_DIR/reference-full.png` → `$reference_dir/reference-full.png`

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/intake--design-screen.md
git commit -m "feat(intake-screen): read design reference from reference_dir"
```

---

### Task 8: Update create-tokens.md

**Files:**
- Modify: `.agents/skills/designbook/tokens/tasks/create-tokens.md:1-18`

- [ ] **Step 1: Add reference_dir param to frontmatter**

Add to the params block (or create one if it doesn't exist):

```yaml
params:
  reference_dir: { type: string, default: "" }
```

- [ ] **Step 2: Update content references**

Replace all references to `$STORY_DIR/design-reference.json` with `$reference_dir/extract.json`:
- "If `$STORY_DIR/design-reference.json` already exists" → "If `$reference_dir` is non-empty and `$reference_dir/extract.json` exists"
- "Write the result directly to `$STORY_DIR/design-reference.json`" → remove this line (extract-reference handles writing to `$REF_DIR`)
- "present the fonts and colors from `design-reference.json`" → "present the fonts and colors from `$reference_dir/extract.json`"
- "present the color palette from design-reference.json" → "present the color palette from `$reference_dir/extract.json`"
- "present the font families from design-reference.json" → "present the font families from `$reference_dir/extract.json`"

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/tokens/tasks/create-tokens.md
git commit -m "feat(create-tokens): read design reference from reference_dir"
```

---

### Task 9: Update create-scene.md

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/create-scene.md:1-22`

- [ ] **Step 1: Update frontmatter params**

Replace `design_reference` param:

```yaml
design_reference: { type: object, default: {} }
```

With:

```yaml
reference_dir: { type: string, default: "" }
```

- [ ] **Step 2: Update content references**

- "If the `design_reference` scope data is available (non-empty object), read its `source` field" → "If `$reference_dir` is non-empty, read `$reference_dir/extract.json` and use its `source` field"
- "If the `{{ reference }}` param is empty but `design_reference` exists in scope" → "If the `{{ reference }}` param is empty but `$reference_dir` is non-empty"

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/design/tasks/create-scene.md
git commit -m "feat(create-scene): read design reference from reference_dir"
```

---

### Task 10: Update existing design spec

**Files:**
- Modify: `docs/superpowers/specs/2026-04-14-optimize-extract-reference-design.md`

- [ ] **Step 1: Update the Flow diagram in the spec**

In the "Flow" section, replace the output paths:

```
Phase 4 — Write output
  → $DESIGNBOOK_DATA/references/<hash>/extract.json (primary output)
  → $DESIGNBOOK_DATA/references/<hash>/reference-full.png
  → $DESIGNBOOK_DATA/references/<hash>/reference-header.png
  → $DESIGNBOOK_DATA/references/<hash>/reference-footer.png
```

Update the "Result Flow" section to show `reference_dir` instead of `design-reference.json`:

```
extract-reference
  ├─ reference_dir             ──→  intake--design-* (reads extract.json from dir)
  │                            ──→  create-tokens (reads tokens block from extract.json)
  │                            ──→  create-scene (reads source URL from extract.json)
  ├─ reference[]               ──→  create-scene, setup-compare (reference URLs)
  └─ screenshot                ──→  intake (visual context)
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-14-optimize-extract-reference-design.md
git commit -m "docs: update optimize-extract-reference spec for URL cache"
```
