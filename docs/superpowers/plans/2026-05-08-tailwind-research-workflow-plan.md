# Tailwind Research Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the design-shell research workflow generate framework-correct Tailwind output and capture arbitrary webpage landmarks more faithfully.

**Architecture:** Keep responsibilities separated. `designbook-css-tailwind` defines framework-agnostic Tailwind styling policy; `designbook-drupal` maps the active CSS framework into SDC/Twig mechanics; core `designbook` design tasks/rules describe generic landmark extraction and comparison guidance. No addon validators are added.

**Tech Stack:** Designbook skills, Markdown task/rule/resource files, Tailwind CSS v4 `@theme`, Drupal SDC/Twig, `storybook-addon-designbook plan`.

---

## File Map

- `.agents/skills/designbook-css-tailwind/SKILL.md` — update the index to list actual Tailwind rules.
- `.agents/skills/designbook-css-tailwind/rules/component-styling.md` — create the Tailwind-only styling policy rule.
- `.agents/skills/designbook-drupal/components/tasks/create-component.md` — remove the mandatory `app-css` result and the component-CSS authoring step.
- `.agents/skills/designbook-drupal/components/resources/twig.md` — keep SDC/Twig-specific class placement guidance and delegate class vocabulary to the active CSS framework skill.
- `.agents/skills/designbook/design/tasks/extract-reference.md` — replace header/footer-specific extraction wording with generic landmark/region decomposition.
- `.agents/skills/designbook/design/rules/screen-compare.md` — add dimension drift as structural compare guidance before resized pixel comparison.
- `docs/superpowers/specs/2026-05-08-tailwind-workflow-policy-design.md` — already written design source; update only if implementation discoveries change scope.

Implementation should happen in a writable worktree. In this environment, root `.agents` is mounted read-only, so use `/home/cw/projects/designbook/.claude/worktrees/workflow-plan` or another writable project worktree for skill edits.

## Task 1: Add Tailwind Component Styling Policy

**Files:**
- Create: `.agents/skills/designbook-css-tailwind/rules/component-styling.md`
- Modify: `.agents/skills/designbook-css-tailwind/SKILL.md`

- [ ] **Step 1: Verify current plan lacks the policy**

Run from the writable worktree:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.before.md
rg -n "Tailwind Component Styling|Do not create external component stylesheet|BEM" /tmp/design-shell-plan.before.md
```

Expected: `rg` exits `1` because the policy is not present.

- [ ] **Step 2: Create the Tailwind styling rule**

Create `.agents/skills/designbook-css-tailwind/rules/component-styling.md` with:

```markdown
---
trigger:
  domain: components
filter:
  frameworks.style: tailwind
---

# Tailwind Component Styling

Use Tailwind utility classes as the default styling surface for component output.

Prefer utilities generated from Designbook tokens:

- Standard Tailwind namespaces use token-backed utilities directly, such as `bg-primary`, `text-on-surface`, `font-heading`, and `rounded-pill`.
- Non-standard namespaces use arbitrary values that reference token variables, such as `max-w-[var(--container-xl)]`, `gap-[var(--grid-md)]`, and `py-[var(--layout-spacing-md)]`.
- Exact arbitrary values are allowed when the design reference requires a value that has no token yet. Prefer creating or reusing a token when the value is part of the design system.

Do not create external component stylesheet rules for ordinary layout, spacing, color, typography, border, radius, or responsive behavior when Tailwind utilities can express the design.

External CSS is reserved for:

- Tailwind and token infrastructure such as imports, `@theme`, and `@source`.
- Reusable Tailwind-native `@utility` abstractions.
- Complex effects that Tailwind cannot express clearly.

Do not invent BEM or semantic component class names for styling in Tailwind projects. Stable hook classes are allowed only when needed for behavior, testing, or third-party integration, and they must not carry styling responsibility.
```

- [ ] **Step 3: Update the Tailwind skill index**

Modify the `## Rules` section in `.agents/skills/designbook-css-tailwind/SKILL.md` to include:

```markdown
- [component-styling.md](rules/component-styling.md) — Tailwind utility-first component styling policy.
- [component-source.md](rules/component-source.md) — Tailwind source registration for component templates.
- [css-mapping.md](rules/css-mapping.md) — Token-group-to-CSS mapping for the generic `generate-jsonata` task.
```

Remove the stale `tailwind-naming.md` index entry if the file still does not exist.

- [ ] **Step 4: Verify the policy appears in the full plan**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.after-tailwind.md
rg -n "Tailwind Component Styling|Do not create external component stylesheet|Do not invent BEM" /tmp/design-shell-plan.after-tailwind.md
```

Expected: all three phrases are present.

## Task 2: Stop Requiring External Component CSS From SDC Component Generation

**Files:**
- Modify: `.agents/skills/designbook-drupal/components/tasks/create-component.md`
- Modify: `.agents/skills/designbook-drupal/components/resources/twig.md`

- [ ] **Step 1: Verify the current plan still requires `app-css`**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.before-app-css.md
rg -n "app-css|Append component-specific styles" /tmp/design-shell-plan.before-app-css.md
```

Expected: both `app-css` and `Append component-specific styles` appear.

- [ ] **Step 2: Remove `app-css` from the task result**

In `.agents/skills/designbook-drupal/components/tasks/create-component.md`:

- Change `required: [component-yml, component-twig, component-story, app-css]` to `required: [component-yml, component-twig, component-story]`.
- Delete the `app-css:` result property.
- Delete the body step that says to append component-specific styles to `${DESIGNBOOK_CSS_APP}`.

- [ ] **Step 3: Clarify Twig class responsibility**

In `.agents/skills/designbook-drupal/components/resources/twig.md`, keep the SDC/Twig mechanics but make the class boundary explicit:

```markdown
The CSS framework skill is the single source of truth for which classes to use. This SDC resource only defines where classes are attached in Twig. When the active CSS framework is Tailwind, use Tailwind utilities from the Tailwind skill policy instead of inventing local styling classes.
```

Keep `attributes.addClass([...])` examples because they are SDC/Twig mechanics, not Tailwind policy.

- [ ] **Step 4: Verify `app-css` is gone from the full plan**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.after-app-css.md
rg -n "app-css|Append component-specific styles" /tmp/design-shell-plan.after-app-css.md
```

Expected: `rg` exits `1`.

## Task 3: Generalize Reference Extraction to Landmark Regions

**Files:**
- Modify: `.agents/skills/designbook/design/tasks/extract-reference.md`

- [ ] **Step 1: Verify current plan is header/footer-specific**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.before-landmarks.md
rg -n "landmarks\\.header|landmarks\\.footer|typical institutional site" /tmp/design-shell-plan.before-landmarks.md
```

Expected: all phrases are present.

- [ ] **Step 2: Replace the landmark section**

Replace the current `### Landmarks — every visual row separately` section with:

```markdown
### Landmarks and regions

Populate `landmarks` for every visually distinct page landmark that appears in the reference, such as header, footer, navigation, hero, sidebar, toolbar, search area, promo strip, legal bar, or content panels.

For each landmark, split direct visual regions whenever background, border, spacing, layout, purpose, content grouping, or interaction treatment changes. Do not collapse multiple visual regions into one generic row or slot.

For each region capture:
- `bg` — resolved background color (hex or CSS color)
- `height` — measured rendered height
- `padding` — vertical + horizontal padding
- `layout` — `flex`/`grid`/`stack` with direction and alignment
- `gap` — spacing between items
- `content` — concrete enumeration of items in reading order
- `treatment` — short visual role such as brand strip, navigation row, action group, form panel, legal row, card rail, or content band
```

- [ ] **Step 3: Replace the interactive-elements section**

Replace the current `### Interactive elements` body with:

```markdown
Populate `interactive[]` for every distinct interactive treatment. Classify the visual treatment separately from the semantic role.

Common treatments include:
- text link
- transparent button
- icon-only button
- filled or accent button
- outline button
- input or search control
- menu or dropdown trigger using whichever treatment the reference shows

Do not map every clickable element to a filled or accent button. Preserve the observed treatment.
```

- [ ] **Step 4: Replace the thin-extract verification**

Replace the header-specific verification sentence with:

```markdown
Before returning, verify the extract is not thin: if a visible landmark contains multiple visual regions but `landmarks` records it as one aggregate area, if `images.length === 0` on a page with visible brand or content images, or if `forms.length === 0` on a page with a visible search/newsletter/login/contact form, re-extract. Thin extracts are almost always the cause of shell/screen mismatches in verify.
```

- [ ] **Step 5: Verify the full plan is generic**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.after-landmarks.md
rg -n "landmarks\\.header|landmarks\\.footer|typical institutional site" /tmp/design-shell-plan.after-landmarks.md
rg -n "Landmarks and regions|interaction treatment|Do not map every clickable" /tmp/design-shell-plan.after-landmarks.md
```

Expected: first `rg` exits `1`; second `rg` finds all phrases.

## Task 4: Add Structural Dimension Drift Guidance to Compare

**Files:**
- Modify: `.agents/skills/designbook/design/rules/screen-compare.md`

- [ ] **Step 1: Inspect current compare plan**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.before-compare.md
rg -n "dimension|resiz|pixel" /tmp/design-shell-plan.before-compare.md
```

Expected: the plan does not clearly require structural dimension drift reporting before pixel comparison.

- [ ] **Step 2: Add dimension drift guidance**

In `.agents/skills/designbook/design/rules/screen-compare.md`, add a short section before pixel comparison instructions:

```markdown
## Structural Dimension Drift

Before interpreting pixel diff quality, compare the reference screenshot dimensions with the Storybook screenshot dimensions for the same breakpoint and region.

When width or height differs enough to indicate missing or extra structure, emit an issue that names the dimension drift and treat it as a structural mismatch. Continue writing the normal diff artifact when possible, but do not let screenshot resizing hide missing landmark regions.
```

- [ ] **Step 3: Verify the guidance appears in the plan**

Run:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.after-compare.md
rg -n "Structural Dimension Drift|do not let screenshot resizing hide missing landmark regions" /tmp/design-shell-plan.after-compare.md
```

Expected: both phrases are present.

## Task 5: Build and Research Check

**Files:**
- No additional file edits.

- [ ] **Step 1: Run package build**

Run:

```bash
pnpm --filter storybook-addon-designbook build
```

Expected: build exits `0`.

- [ ] **Step 2: Run full build**

Run:

```bash
pnpm build
```

Expected: build exits `0`. The component CSS/JS static copy removal in `packages/integrations/test-integration-drupal/vite.config.js` should prevent missing `dist/css/components` and `dist/js/components` copy failures.

- [ ] **Step 3: Run final plan smoke check**

Run from the `workflow-plan` worktree:

```bash
npx storybook-addon-designbook plan design-shell > /tmp/design-shell-plan.final.md
rg -n "Tailwind Component Styling|Landmarks and regions|Structural Dimension Drift" /tmp/design-shell-plan.final.md
rg -n "app-css|Append component-specific styles|landmarks\\.header|landmarks\\.footer|typical institutional site" /tmp/design-shell-plan.final.md
```

Expected: first `rg` finds all phrases; second `rg` exits `1`.

- [ ] **Step 4: Run project check before committing**

Run:

```bash
pnpm check
```

Expected: typecheck, lint, and tests pass.
