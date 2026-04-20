# Convert vision.md to vision.yml — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename all vision.md data files to vision.yml (YAML format), update every path reference in runtime code, task files, rules, tests, and fixtures.

**Architecture:** Simple rename + format conversion. The vite-plugin, React component, task frontmatter, rule files, and tests all reference `vision.md` by string — change each to `vision.yml`. The DeboProductOverview component currently parses Markdown with `marked` — replace with a YAML parser using `js-yaml` (already a project dependency). Convert all ~22 data files from Markdown to YAML matching the create-vision result schema.

**Tech Stack:** TypeScript (vite-plugin, tests), JSX (React component), js-yaml, YAML task frontmatter, Markdown skill docs

---

### Task 1: Update vite-plugin.ts — Three Hardcoded Paths

**Files:**
- Modify: `packages/storybook-addon-designbook/src/vite-plugin.ts:142,157,233`

- [ ] **Step 1: Replace FILE_TYPES vision entry**

```typescript
// Line 142 — change:
vision: 'vision.md',
// to:
vision: 'vision.yml',
```

- [ ] **Step 2: Replace watcher path**

```typescript
// Line 157 — change:
server.watcher.add(resolve(designbookDir, 'vision.md'));
// to:
server.watcher.add(resolve(designbookDir, 'vision.yml'));
```

- [ ] **Step 3: Replace status endpoint path**

```typescript
// Line 233 — change:
vision: { exists: existsSync(resolve(designbookDir, 'vision.md')) },
// to:
vision: { exists: existsSync(resolve(designbookDir, 'vision.yml')) },
```

- [ ] **Step 4: Run typecheck**

Run: `pnpm --filter storybook-addon-designbook typecheck`
Expected: PASS (no type changes, only string literals)

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/vite-plugin.ts
git commit -m "refactor: rename vision.md to vision.yml in vite-plugin paths"
```

---

### Task 2: Update DeboProductOverview — YAML Parser

The component currently uses `parseProductSections` from `parsers.js`, which splits Markdown by H2 headings using `marked.lexer()`. With YAML data, replace this with a YAML-aware parser that produces the same `[{ title, html }]` section format.

**Files:**
- Modify: `packages/storybook-addon-designbook/src/components/parsers.js`
- Modify: `packages/storybook-addon-designbook/src/components/display/DeboProductOverview.jsx`

- [ ] **Step 1: Add parseVisionYaml to parsers.js**

Add after the existing `parseProductSections` function:

```javascript
/**
 * Parses vision YAML content into display sections.
 * Returns an array of { title, html } matching the collapsible section format.
 */
export function parseVisionYaml(content) {
  if (!content) return null;
  let data;
  try {
    data = parseYaml(content);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;

  const sections = [];

  if (data.description) {
    sections.push({ title: 'Description', html: `<p>${escapeHtml(data.description)}</p>` });
  }

  if (Array.isArray(data.problems) && data.problems.length > 0) {
    const items = data.problems
      .map((p) => `<h3>${escapeHtml(p.title)}</h3><p>${escapeHtml(p.solution)}</p>`)
      .join('\n');
    sections.push({ title: 'Problems & Solutions', html: items });
  }

  if (Array.isArray(data.features) && data.features.length > 0) {
    const items = data.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('\n');
    sections.push({ title: 'Key Features', html: `<ul>${items}</ul>` });
  }

  if (data.design_reference && data.design_reference.url) {
    const ref = data.design_reference;
    const label = escapeHtml(ref.label || ref.url);
    sections.push({
      title: 'Design Reference',
      html: `<p><a href="${escapeHtml(ref.url)}" target="_blank" rel="noopener noreferrer">${label}</a></p>`,
    });
  }

  if (Array.isArray(data.references) && data.references.length > 0) {
    const items = data.references
      .map((r) => {
        const label = escapeHtml(r.label || r.url);
        return `<li><a href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
      })
      .join('\n');
    sections.push({ title: 'References', html: `<ul>${items}</ul>` });
  }

  return sections.length > 0 ? sections : null;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

Also add the js-yaml import at the top of parsers.js:

```javascript
import { load as parseYaml } from 'js-yaml';
```

- [ ] **Step 2: Update DeboProductOverview.jsx**

Change the import and props:

```jsx
// Change import — remove parseProductSections, add parseVisionYaml:
import { parseVisionYaml } from '../parsers.js';

// In the component, change:
//   dataPath="vision.md"
//   parser={parseProductSections}
// to:
//   dataPath="vision.yml"
//   parser={parseVisionYaml}
```

Full updated component:

```jsx
import React from 'react';
import { DeboSection } from '../DeboSection.jsx';
import { DeboCollapsible } from '../ui/DeboCollapsible.jsx';
import { DeboProse } from '../ui/DeboTypography.jsx';
import { DeboGrid } from '../ui/DeboGrid.jsx';
import { parseVisionYaml } from '../parsers.js';

export function DeboProductOverview() {
  return (
    <DeboSection
      title="Vision"
      dataPath="vision.yml"
      parser={parseVisionYaml}
      command="/debo vision"
      emptyMessage="No vision defined yet"
      renderContent={(sections) => (
        <DeboGrid gap="lg">
          {sections.map((section, i) => (
            <DeboCollapsible key={section.title} title={section.title} defaultOpen={i === 0}>
              <DeboProse html={section.html} />
            </DeboCollapsible>
          ))}
        </DeboGrid>
      )}
    />
  );
}
```

- [ ] **Step 3: Verify parseProductSections is still used elsewhere**

Run: `grep -r "parseProductSections" packages/storybook-addon-designbook/src/`

If DeboProductOverview was the only consumer, remove `parseProductSections` from `parsers.js`. If used elsewhere, keep it.

- [ ] **Step 4: Run typecheck + lint**

Run: `pnpm --filter storybook-addon-designbook typecheck && pnpm --filter storybook-addon-designbook lint`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/storybook-addon-designbook/src/components/parsers.js packages/storybook-addon-designbook/src/components/display/DeboProductOverview.jsx
git commit -m "feat: add YAML parser for vision data in DeboProductOverview"
```

---

### Task 3: Update Test Files

**Files:**
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts:444,470`
- Modify: `packages/storybook-addon-designbook/src/validators/__tests__/workflow-result.test.ts:886-889`

- [ ] **Step 1: Update workflow-resolve.test.ts**

Two test strings reference `vision.md` in param path values. Change both:

```typescript
// Line 444 — change:
vision: { type: 'object', path: '$DESIGNBOOK_DATA/vision.md' },
// to:
vision: { type: 'object', path: '$DESIGNBOOK_DATA/vision.yml' },

// Line 470 — change:
vision: { type: 'object', path: '$DESIGNBOOK_DATA/vision.md' },
// to:
vision: { type: 'object', path: '$DESIGNBOOK_DATA/vision.yml' },
```

- [ ] **Step 2: Update workflow-result.test.ts**

Line 886 creates a test file at `vision.md` with Markdown content. Change the path and content to YAML:

```typescript
// Line 886 — change:
const targetPath = resolve(dist, 'output', 'vision.md');
// to:
const targetPath = resolve(dist, 'output', 'vision.yml');

// Line 889 — change:
writeFileSync(targetPath, '# My Product\n\nA great product.\n');
// to:
writeFileSync(targetPath, 'product_name: My Product\ndescription: A great product.\n');
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter storybook-addon-designbook test`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add packages/storybook-addon-designbook/src/validators/__tests__/workflow-resolve.test.ts packages/storybook-addon-designbook/src/validators/__tests__/workflow-result.test.ts
git commit -m "test: update vision.md path references to vision.yml in tests"
```

---

### Task 4: Update Task File Frontmatter Paths (9 Files)

Every `path: $DESIGNBOOK_DATA/vision.md` in task frontmatter becomes `path: $DESIGNBOOK_DATA/vision.yml`.

**Files:**
- Modify: `.agents/skills/designbook/vision/tasks/create-vision.md:8,15` (both params and result)
- Modify: `.agents/skills/designbook/tokens/tasks/create-tokens.md:11`
- Modify: `.agents/skills/designbook/sections/tasks/intake--sections.md:9`
- Modify: `.agents/skills/designbook/sections/tasks/create-section.md:13`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-shell.md:11`
- Modify: `.agents/skills/designbook/design/tasks/intake--design-screen.md:17`
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md:11`
- Modify: `.agents/skills/designbook/import/tasks/intake--import.md:10`

- [ ] **Step 1: Update create-vision.md**

Two occurrences (params and result):

```yaml
# Line 8 — change:
      path: $DESIGNBOOK_DATA/vision.md
# to:
      path: $DESIGNBOOK_DATA/vision.yml

# Line 15 — change:
      path: $DESIGNBOOK_DATA/vision.md
# to:
      path: $DESIGNBOOK_DATA/vision.yml
```

- [ ] **Step 2: Update remaining 8 task files**

Each file has exactly one `path: $DESIGNBOOK_DATA/vision.md` line in frontmatter. Change to `path: $DESIGNBOOK_DATA/vision.yml`:

- `tokens/tasks/create-tokens.md:11`
- `sections/tasks/intake--sections.md:9`
- `sections/tasks/create-section.md:13`
- `design/tasks/intake--design-shell.md:11`
- `design/tasks/intake--design-screen.md:17`
- `design/tasks/extract-reference.md:11`
- `import/tasks/intake--import.md:10`

- [ ] **Step 3: Update create-vision.md task body — YAML output instructions**

The task body currently says to produce Markdown. Update to instruct YAML output. The body (after the frontmatter `---`) should instruct the AI to write YAML matching the result schema:

```markdown
# Product Vision

Define the product vision through dialog. Extract fields from the user's message.
If all required fields are present, no questions needed.
If fields are missing, ask for all missing in a single question.

Write the result as YAML matching the result schema.
```

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook/vision/tasks/create-vision.md \
  .agents/skills/designbook/tokens/tasks/create-tokens.md \
  .agents/skills/designbook/sections/tasks/intake--sections.md \
  .agents/skills/designbook/sections/tasks/create-section.md \
  .agents/skills/designbook/design/tasks/intake--design-shell.md \
  .agents/skills/designbook/design/tasks/intake--design-screen.md \
  .agents/skills/designbook/design/tasks/extract-reference.md \
  .agents/skills/designbook/import/tasks/intake--import.md
git commit -m "refactor: update vision param paths from vision.md to vision.yml in task files"
```

---

### Task 5: Update Task Body Text References

Several task files reference `vision.md` in their body text (below the frontmatter). Update each to `vision.yml`.

**Files:**
- Modify: `.agents/skills/designbook/tokens/tasks/create-tokens.md:41,45`
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md:49,61,63`
- Modify: `.agents/skills/designbook/import/tasks/intake--import.md:29,62,64,80`
- Modify: `.agents/skills/designbook/data-model/tasks/create-data-model.md:27`
- Modify: `.agents/skills/designbook/design/tasks/compare-screenshots.md:75`

- [ ] **Step 1: Update create-tokens.md body**

```markdown
# Line 41 — change:
Otherwise, apply the `extract-reference` rule to the design reference URL from `vision.md`.
# to:
Otherwise, apply the `extract-reference` rule to the design reference URL from `vision.yml`.

# Line 45 — change:
If no design reference URL is available, fall back to `vision.md` context and user input.
# to:
If no design reference URL is available, fall back to `vision.yml` context and user input.
```

- [ ] **Step 2: Update extract-reference.md body**

```markdown
# Line 49 — change:
Read `vision.md` and look for a design reference URL.
# to:
Read `vision.yml` and look for a design reference URL.

# Line 61 — change:
**If no URL in vision.md:**
# to:
**If no URL in vision.yml:**

# Line 63 — change:
> "No design reference URL found in vision.md. You can provide:
# to:
> "No design reference URL found in vision.yml. You can provide:
```

- [ ] **Step 3: Update intake--import.md body**

```markdown
# Line 29 — change:
Read `vision.md`. Check for the `## Design Reference` section.
# to:
Read `vision.yml`. Check for the `design_reference` field.

# Line 62 — change:
If `vision.md` exists, read the product name and description from it.
# to:
If `vision.yml` exists, read the product name and description from it.

# Line 64 — change:
If `vision.md` does not exist, ask:
# to:
If `vision.yml` does not exist, ask:

# Line 80 — change:
If `vision.md` already exists with a design reference, skip the vision entry.
# to:
If `vision.yml` already exists with a design reference, skip the vision entry.
```

- [ ] **Step 4: Update create-data-model.md body**

```markdown
# Line 27 — change:
Read vision.md for product context. If data-model.yml exists, extend it.
# to:
Read vision.yml for product context. If data-model.yml exists, extend it.
```

- [ ] **Step 5: Update compare-screenshots.md body**

```markdown
# Line 75 — change:
   - Design reference from `vision.md` (if available)
# to:
   - Design reference from `vision.yml` (if available)
```

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook/tokens/tasks/create-tokens.md \
  .agents/skills/designbook/design/tasks/extract-reference.md \
  .agents/skills/designbook/import/tasks/intake--import.md \
  .agents/skills/designbook/data-model/tasks/create-data-model.md \
  .agents/skills/designbook/design/tasks/compare-screenshots.md
git commit -m "docs: update vision.md references to vision.yml in task body text"
```

---

### Task 6: Update vision-context Rule

**Files:**
- Modify: `.agents/skills/designbook/vision/rules/vision-context.md:10,12,13`

- [ ] **Step 1: Update path, error message, and instruction**

```markdown
# Line 10 — change:
1. Resolve path: `$DESIGNBOOK_DATA/vision.md`
# to:
1. Resolve path: `$DESIGNBOOK_DATA/vision.yml`

# Line 12 — change:
   > ❌ `vision.md` not found. Run `/designbook vision` first.
# to:
   > ❌ `vision.yml` not found. Run `/designbook vision` first.

# Line 13 — change:
3. **If the file exists** → read it and apply the design reference and references as context throughout this stage.
# to:
3. **If the file exists** → read the YAML and apply the design reference and references as context throughout this stage.
```

- [ ] **Step 2: Update "How to apply" table**

Line 19 references `## Design Reference` (a Markdown heading). Change to reference the YAML field:

```markdown
# Line 19 — change:
| `## Design Reference` | Primary source for visual decisions. ...
# to:
| `design_reference` | Primary source for visual decisions. ...

# Line 20 — change:
| `## References` | Consult linked design systems, ...
# to:
| `references` | Consult linked design systems, ...
```

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook/vision/rules/vision-context.md
git commit -m "docs: update vision-context rule for vision.yml format"
```

---

### Task 7: Update Skill Documentation References

**Files:**
- Modify: `.agents/skills/designbook/SKILL.md:47`
- Modify: `.agents/skills/designbook-skill-creator/resources/schemas.md:99`
- Modify: `.agents/skills/designbook-stitch/rules/stitch-tokens.md:24`
- Modify: `.agents/skills/designbook-stitch/rules/stitch-import.md:19`

- [ ] **Step 1: Update SKILL.md table entry**

```markdown
# Line 47 — change:
| vision | `vision` | `$DESIGNBOOK_DATA/vision.md` |
# to:
| vision | `vision` | `$DESIGNBOOK_DATA/vision.yml` |
```

- [ ] **Step 2: Update schemas.md example**

```yaml
# Line 99 — change:
      path: $DESIGNBOOK_DATA/vision.md
# to:
      path: $DESIGNBOOK_DATA/vision.yml
```

- [ ] **Step 3: Update stitch-tokens.md body**

```markdown
# Line 24 — change:
Extract the project ID from `vision.md` → `## Design Reference` section → `url`. Call `mcp__stitch__get_project` with the project resource name. If the call fails, skip silently.
# to:
Extract the project ID from `vision.yml` → `design_reference.url`. Call `mcp__stitch__get_project` with the project resource name. If the call fails, skip silently.
```

- [ ] **Step 4: Update stitch-import.md body**

```markdown
# Line 19 — change:
3. Use the project name as default for `product_name` if vision.md does not exist
# to:
3. Use the project name as default for `product_name` if vision.yml does not exist
```

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/SKILL.md \
  .agents/skills/designbook-skill-creator/resources/schemas.md \
  .agents/skills/designbook-stitch/rules/stitch-tokens.md \
  .agents/skills/designbook-stitch/rules/stitch-import.md
git commit -m "docs: update vision.md references to vision.yml in skill docs"
```

---

### Task 8: Update JSDoc Comments

**Files:**
- Modify: `packages/storybook-addon-designbook/src/components/designbookApi.js:14`
- Modify: `packages/storybook-addon-designbook/src/hooks/useDesignbookData.js:12`

- [ ] **Step 1: Update designbookApi.js JSDoc**

```javascript
// Line 14 — change:
 * @param {string} path — Relative path within designbook/ (e.g. "vision.md")
// to:
 * @param {string} path — Relative path within designbook/ (e.g. "vision.yml")
```

- [ ] **Step 2: Update useDesignbookData.js JSDoc**

```javascript
// Line 12 — change:
 * @param {string} path — Relative path within designbook/ (e.g., "vision.md")
// to:
 * @param {string} path — Relative path within designbook/ (e.g., "vision.yml")
```

- [ ] **Step 3: Commit**

```bash
git add packages/storybook-addon-designbook/src/components/designbookApi.js packages/storybook-addon-designbook/src/hooks/useDesignbookData.js
git commit -m "docs: update vision.md JSDoc examples to vision.yml"
```

---

### Task 9: Convert Fixture Data Files (2 files)

Convert each Markdown vision file to YAML matching the create-vision result schema.

**Files:**
- Rename + rewrite: `fixtures/drupal-web/vision/designbook/vision.md` → `vision.yml`
- Rename + rewrite: `fixtures/drupal-stitch/vision/designbook/vision.md` → `vision.yml`

- [ ] **Step 1: Convert drupal-web fixture**

Delete `fixtures/drupal-web/vision/designbook/vision.md`, create `vision.yml`:

```yaml
product_name: LEANDO
description: >-
  The portal for vocational training practice — a platform by BIBB (Federal
  Institute for Vocational Education and Training) for trainers, examiners, and
  vocational education professionals. LEANDO provides a centralized hub for
  vocational education practitioners to find curated content, network with peers,
  and access interactive learning materials.
problems:
  - title: Scattered Information
    solution: >-
      Training personnel cannot find relevant materials and information in one
      place. LEANDO solves this with a curated portal featuring topic,
      profession, and target group navigation that brings all resources together.
  - title: Lack of Professional Networking
    solution: >-
      Networking and exchange among vocational training practitioners is lacking.
      LEANDO provides community features with events, groups, and discussions to
      foster collaboration and knowledge sharing.
  - title: Non-Interactive Learning Materials
    solution: >-
      Learning materials are scattered and not interactive. LEANDO offers
      structured learning packages (Learning Nuggets) with SCORM and H5P
      integration for engaging, self-paced learning.
features:
  - Topic and profession-based content navigation
  - Event management with registration and BBB video conferencing
  - Learning packages (Learning Nuggets) with interactive content
  - Handbook system (Book) for structured documentation
  - Landing pages with flexible paragraph-based sections
  - Location and profession database
design_reference:
  type: url
  url: https://leando.de/
  label: LEANDO Portal
references: []
```

```bash
git rm fixtures/drupal-web/vision/designbook/vision.md
```

- [ ] **Step 2: Convert drupal-stitch fixture**

Read `fixtures/drupal-stitch/vision/designbook/vision.md`, convert to YAML, write as `vision.yml`, delete the `.md`:

```bash
git rm fixtures/drupal-stitch/vision/designbook/vision.md
```

Create `vision.yml` with the same structure — read the current file for exact content.

- [ ] **Step 3: Commit**

```bash
git add fixtures/drupal-web/vision/designbook/vision.yml fixtures/drupal-stitch/vision/designbook/vision.yml
git commit -m "refactor: convert fixture vision.md files to vision.yml"
```

---

### Task 10: Convert Promptfoo Workspace Data Files (13 files)

Each file at `promptfoo/workspaces/*/designbook/product/vision.md` → `vision.yml`.

**Files (13):**
- `promptfoo/workspaces/debo-design-tokens/designbook/product/vision.md`
- `promptfoo/workspaces/debo-sample-data-canvas/designbook/product/vision.md`
- `promptfoo/workspaces/debo-data-model/designbook/product/vision.md`
- `promptfoo/workspaces/tokens/designbook/product/vision.md`
- `promptfoo/workspaces/debo-data-model-canvas/designbook/product/vision.md`
- `promptfoo/workspaces/data-model-canvas/designbook/product/vision.md`
- `promptfoo/workspaces/sample-data/designbook/product/vision.md`
- `promptfoo/workspaces/debo-sections/designbook/product/vision.md`
- `promptfoo/workspaces/debo-shape-section/designbook/product/vision.md`
- `promptfoo/workspaces/debo-sample-data/designbook/product/vision.md`
- `promptfoo/workspaces/sample-data-canvas/designbook/product/vision.md`
- `promptfoo/workspaces/debo-css-generate/designbook/product/vision.md`
- `promptfoo/workspaces/debo-vision/designbook/product/vision.md`

- [ ] **Step 1: Read each file and convert to YAML**

For each of the 13 files:
1. Read the Markdown content
2. Extract: product_name (from `# heading`), description (from `## Description`), problems (from `### Problem N: title` + body), features (from `## Key Features` list), design_reference (from `## Design Reference` if present), references (from `## References` if present)
3. Write the YAML at the same directory as `vision.yml`
4. Delete the `.md` file

Use this conversion pattern for each file:

```bash
# For each workspace:
git rm promptfoo/workspaces/<name>/designbook/product/vision.md
# Then write vision.yml with converted content
```

- [ ] **Step 2: Commit**

```bash
git add promptfoo/workspaces/*/designbook/product/vision.yml
git commit -m "refactor: convert promptfoo workspace vision.md files to vision.yml"
```

---

### Task 11: Convert Runtime Workspace Data Files (7 files)

Each file at `workspaces/*/designbook/vision.md` → `vision.yml`.

**Files (7):**
- `workspaces/drupal-stitch-css-generate/designbook/vision.md`
- `workspaces/drupal-stitch-design-shell/designbook/vision.md`
- `workspaces/drupal/designbook/vision.md`
- `workspaces/theme-test/designbook/vision.md`
- `workspaces/drupal-stitch/designbook/vision.md`
- `workspaces/drupal-petshop/designbook/vision.md`
- `workspaces/drupal-web/designbook/vision.md`

- [ ] **Step 1: Read each file and convert to YAML**

Same conversion pattern as Task 10:
1. Read Markdown, extract structured fields
2. Write YAML as `vision.yml`
3. Delete the `.md` file

```bash
# For each workspace:
git rm workspaces/<name>/designbook/vision.md
# Then write vision.yml with converted content
```

- [ ] **Step 2: Commit**

```bash
git add workspaces/*/designbook/vision.yml
git commit -m "refactor: convert workspace vision.md files to vision.yml"
```

---

### Task 12: Final Validation

- [ ] **Step 1: Verify no remaining vision.md data references**

```bash
# Should only find workflow definition files and docs (not data file references):
grep -r "vision\.md" .agents/skills/ packages/storybook-addon-designbook/src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.md" --include="*.yml" | grep -v "workflows/vision.md" | grep -v "cli-workflow.md" | grep -v "workflow-execution.md" | grep -v "node_modules"
```

Expected: No results (or only workflow file references like `vision/workflows/vision.md` and documentation examples in `cli-workflow.md` / `workflow-execution.md`).

- [ ] **Step 2: Verify no vision.md data files remain**

```bash
find fixtures/ promptfoo/ workspaces/ -name "vision.md" -not -path "*/workflows/*"
```

Expected: No results.

- [ ] **Step 3: Run full check**

```bash
pnpm check
```

Expected: typecheck PASS, lint PASS, all tests PASS.
