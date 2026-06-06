# Designbook Install Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A skill-driven `install` flow that takes a bare Drupal project to a verified designbook setup (backend detected, theme found, Storybook configured, `designbook.config.yml` written, Storybook verified running).

**Architecture:** Pure skill flow — markdown instructions only, no workflow engine (the engine needs the addon + config, neither exists at install time). The core skill (`designbook`) owns a generic 4-phase flow with a backend detection table and dispatches by convention to `designbook-<backend>/install/`. v1 ships only the Drupal integration.

**Tech Stack:** Markdown skill files under `.agents/skills/`, Storybook 10 (html-vite), `storybook-addon-sdc`, `storybook-addon-designbook`, twing, optional Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-06-06-designbook-install-workflow-design.md`

**Testing note:** All artifacts are markdown instruction files — unit-test TDD does not apply. Verification = static skill validation (designbook-skill-creator `resources/validate.md` process) + an end-to-end smoke test against a bare Drupal fixture (Task 7).

**Authoring constraint (CLAUDE.md):** Load the `designbook-skill-creator` skill BEFORE creating or editing any file under `.agents/skills/designbook/` or `.agents/skills/designbook-*/`. Read `rules/common-rules.md`. The new `install/*.md` files are none of task/rule/blueprint/workflow — they are instruction documents — but COMMON-01 (parseable YAML frontmatter) and COMMON-02 (site-agnostic) still apply, and the two `SKILL.md` edits are validated files.

---

## File Structure

```
.agents/skills/designbook/
├── SKILL.md                          # Modify: add `install` sub-command + dispatch exception
└── install/
    └── install.md                    # Create: generic flow (phases 1–4) + detection table

.agents/skills/designbook-drupal/
├── SKILL.md                          # Modify: add Install index section
└── install/
    ├── install.md                    # Create: step index (detect → theme → storybook → config)
    ├── detect.md                     # Create: docroot detection
    ├── theme.md                      # Create: theme find/ask/scaffold
    ├── storybook.md                  # Create: fresh + extend paths, CSS detection, deps
    ├── config.md                     # Create: designbook.config.yml template
    └── templates/
        ├── main.js                   # Create: .storybook/main.js template
        ├── preview.js                # Create: .storybook/preview.js template
        └── twing-hooks.js            # Create: twing environment stub
```

Responsibilities: core `install.md` = backend-agnostic orchestration + verify; each Drupal step file = one phase, consumed in order via the integration's `install.md` index. Templates carry `__NAMESPACE__` placeholders and `// [tailwind-only]` markers; `storybook.md` owns the substitution rules.

---

### Task 1: Core skill — generic install flow

**Files:**
- Create: `.agents/skills/designbook/install/install.md`
- Modify: `.agents/skills/designbook/SKILL.md` (frontmatter lines 3–11, dispatch section after line 31)

- [ ] **Step 1: Create `.agents/skills/designbook/install/install.md`**

````markdown
---
name: install
description: Install designbook into an existing project — check preconditions, detect the backend, dispatch to the integration skill's install instructions, verify the result.
---

# Designbook Install

Pure skill flow. The workflow engine is NOT available during install — the Storybook
addon and `designbook.config.yml` do not exist yet. Do not run `workflow create`;
Rules 0–7 from `resources/workflow-execution.md` do not apply to this flow.

Execute the phases in order. Every abort must state the reason and what the user
should do next. Never report success while any step failed.

## Phase 1 — Preconditions

1. Locate the skills root: the directory containing this skill (`.agents/skills/`
   or `.claude/skills/`), walking up from the project root.
2. Walk up from the project root looking for an existing `designbook.config.yml`
   (or `.yaml`). Found → designbook is already installed: report the path and stop.
   Continue only if the user explicitly asks to reconfigure, and never overwrite
   the existing file without showing the intended changes and getting confirmation.
3. Check that `node --version` succeeds. Missing → tell the user to install
   Node.js (>= 20) and stop.

## Phase 2 — Detect backend

Evaluate the table top to bottom against the project root. First match wins.

| Backend | Marker | Integration skill |
|---|---|---|
| `drupal` | `composer.json` exists and its `require` or `require-dev` contains a package whose name starts with `drupal/core` | `designbook-drupal` |

- No row matches → print the list of supported backends from this table and stop.
- The matched integration skill directory is missing under the skills root → tell
  the user to install it via the Claude marketplace and stop.

Adding a backend = one new row here + a `designbook-<backend>` integration skill
shipping an `install/` directory. Nothing else in this file changes.

## Phase 3 — Dispatch

Read `<skills-root>/designbook-<backend>/install/install.md` and follow it
completely. It handles backend-specific detection details, target/theme discovery,
Storybook setup, and writing `designbook.config.yml`. When it finishes, continue
with Phase 4.

## Phase 4 — Verify

Run from the directory containing the new `designbook.config.yml`:

1. Install JS dependencies in `designbook.home`: `pnpm install` when a
   `pnpm-lock.yaml` or `pnpm-workspace.yaml` is present, otherwise `npm install`.
2. Start Storybook through the addon CLI:
   `npx storybook-addon-designbook storybook start --force`
   The command exits 0 once Storybook is reachable and prints its URL.
3. Confirm the addon is active: `curl -sf <url>/index.json` (URL reported by the
   start command; fall back to `designbook.url` from the config) returns HTTP 200.
4. Any failure → stop, show the exact command output, and escalate to the user.
   Do not retry silently and do not mark the install successful.
5. On success print a summary: backend, theme directory, config file path,
   Storybook URL.
````

- [ ] **Step 2: Modify `.agents/skills/designbook/SKILL.md` — frontmatter**

Replace lines 3–11 (`argument-hint` + `description`) with:

```yaml
argument-hint: "[install|vision|tokens|data-model|design-component|design-screen|design-shell|design-verify|sections|shape-section|sample-data|css-generate|import|sb] [--optimize]"
description: >
  Designbook design system. Use ALWAYS when creating, modifying, or
  deleting components, screens, scenes, design tokens, CSS, or any
  design system artifact — whether the user asks directly or the need
  arises during other work. Never create component files without this
  skill. Sub-commands: install, vision, tokens, data-model, design-component,
  design-screen, design-shell, sections,
  shape-section, sample-data, css-generate, import.
```

- [ ] **Step 3: Modify `.agents/skills/designbook/SKILL.md` — dispatch exception**

Insert directly after the line `Sub-command: **$ARGUMENTS[0]**` (line 32) and before the "known sub-command" paragraph:

```markdown
**If `$ARGUMENTS[0]` is `install`** (or the user asks to install/set up designbook
in a project), load [install/install.md](install/install.md) and follow it
directly. Install is a pure skill flow — the workflow engine, `workflow create`,
and Rules 0–7 from `resources/workflow-execution.md` do NOT apply, because the
addon and `designbook.config.yml` do not exist yet.
```

- [ ] **Step 4: Verify frontmatter parses**

```bash
for f in .agents/skills/designbook/install/install.md .agents/skills/designbook/SKILL.md; do
  python3 -c "import yaml,re; t=open('$f').read(); print(yaml.safe_load(re.match(r'^---\n(.*?)\n---', t, re.S).group(1))['name'])"
done
```

Expected: prints `install` and `debo` — no parse error.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook/install/install.md .agents/skills/designbook/SKILL.md
git commit -m "feat(skill): add core designbook install flow with backend dispatch"
```

---

### Task 2: Drupal integration — index, detect, theme

**Files:**
- Create: `.agents/skills/designbook-drupal/install/install.md`
- Create: `.agents/skills/designbook-drupal/install/detect.md`
- Create: `.agents/skills/designbook-drupal/install/theme.md`

- [ ] **Step 1: Create `.agents/skills/designbook-drupal/install/install.md`**

````markdown
---
name: install
description: Drupal-specific designbook install steps, dispatched from the core install flow.
---

# Designbook Install — Drupal

Execute the steps in order. Each step file defines its own abort conditions.
Variables (`DOCROOT`, `THEME_DIR`, `NAMESPACE`, `CSS_FRAMEWORK`) are set by earlier
steps and consumed by later ones.

1. [detect.md](detect.md) — confirm the Drupal codebase, determine `DOCROOT`
2. [theme.md](theme.md) — find or scaffold the target theme → `THEME_DIR`, `NAMESPACE`
3. [storybook.md](storybook.md) — set up or extend Storybook in `THEME_DIR`
4. [config.md](config.md) — write `designbook.config.yml` into `THEME_DIR`

Then return to Phase 4 (Verify) of the core install flow
(`designbook/install/install.md`).
````

- [ ] **Step 2: Create `.agents/skills/designbook-drupal/install/detect.md`**

````markdown
---
name: detect
description: Confirm the project is a Drupal codebase and determine the docroot.
---

# Detect — Drupal layout

The core detection table already matched a `drupal/core*` package in
`composer.json`. This step determines the docroot.

1. Read `composer.json`. If `extra.drupal-scaffold.locations.web-root` is set,
   strip a trailing slash and use it as `DOCROOT`.
2. Otherwise take the first of `web`, `docroot`, `.` that contains a `themes/`
   or `core/` directory.
3. Neither found → abort: "Could not determine the Drupal docroot — expected
   `web/`, `docroot/`, or a scaffold `web-root` entry in composer.json."
4. Record `DOCROOT` for the following steps.
````

- [ ] **Step 3: Create `.agents/skills/designbook-drupal/install/theme.md`**

````markdown
---
name: theme
description: Find the target custom theme or scaffold a new one; derive the component namespace.
---

# Theme — find or scaffold

1. Glob `DOCROOT/themes/custom/*/*.info.yml`. Keep only files whose stem equals
   the parent directory name. Parse each as YAML; skip entries with
   `hidden: true` or a `type` other than `theme` (a missing `type` counts as
   `theme` for legacy info files). Collect `{ machine_name (stem), name, path }`.
2. Decide:
   - Exactly one result → use it.
   - Several → list them (`name` + machine name) and ask the user to pick one.
   - None → ask the user whether to scaffold a new theme. On yes, ask for a
     human-readable name, derive the machine name (lowercase, only `[a-z0-9_]`,
     must start with a letter), and create
     `DOCROOT/themes/custom/<machine_name>/<machine_name>.info.yml`:

     ```yaml
     name: <Human Name>
     type: theme
     core_version_requirement: ^10 || ^11
     base theme: false
     ```

     On no → abort: designbook needs a theme directory to install into.
3. Record:
   - `THEME_DIR` — the theme directory
   - `NAMESPACE` — the theme machine name (used as SDC/component namespace)
````

- [ ] **Step 4: Commit**

```bash
git add .agents/skills/designbook-drupal/install/install.md .agents/skills/designbook-drupal/install/detect.md .agents/skills/designbook-drupal/install/theme.md
git commit -m "feat(skill): add drupal install steps — index, detect, theme"
```

---

### Task 3: Drupal integration — storybook + config steps

**Files:**
- Create: `.agents/skills/designbook-drupal/install/storybook.md`
- Create: `.agents/skills/designbook-drupal/install/config.md`

- [ ] **Step 1: Create `.agents/skills/designbook-drupal/install/storybook.md`**

````markdown
---
name: storybook
description: Set up Storybook in the theme — fresh from templates, or extend an existing instance.
---

# Storybook — set up or extend

All paths are relative to `THEME_DIR`.

## CSS framework detection

Set `CSS_FRAMEWORK` to `tailwind` when either holds, otherwise `css`:

- `package.json` lists `tailwindcss` under `dependencies` or `devDependencies`
- any `*.css` file under the theme contains `@import "tailwindcss"` or `@tailwind`

## Choose path

A `.storybook/` directory containing `main.js` or `main.ts` exists → **Extend**.
Otherwise → **Fresh**.

## Fresh

1. `package.json` missing → create it:

   ```json
   {
     "name": "NAMESPACE",
     "private": true,
     "type": "module",
     "scripts": {
       "storybook": "storybook dev -p 6006"
     }
   }
   ```

   (`"name"` = the `NAMESPACE` value, `_` replaced by `-`.)
   Existing → only add the `storybook` script when absent.
2. Add devDependencies (`pnpm add -D` / `npm install -D` — same pick as the core
   verify phase): `storybook@^10`, `@storybook/html-vite@^10`,
   `@storybook/addon-docs@^10`, `storybook-addon-sdc@^0.22.0`,
   `storybook-addon-designbook`, `twing@^7.3.0`, `vite@^6`.
   When `CSS_FRAMEWORK` is `tailwind`, additionally: `tailwindcss@^4`,
   `@tailwindcss/vite@^4`.
3. Copy every file from this skill's `install/templates/` into `.storybook/`,
   then post-process each copied file:
   - replace every `__NAMESPACE__` with the `NAMESPACE` value
   - `CSS_FRAMEWORK` ≠ `tailwind` → delete every block between
     `// [tailwind-only] start` and `// [tailwind-only] end` including the marker
     lines; `CSS_FRAMEWORK` = `tailwind` → delete only the marker lines.
4. Ensure a `components/` directory exists (create it empty if needed).
5. `CSS_FRAMEWORK` = `tailwind` and `css/app.src.css` missing → create it:

   ```css
   @import "tailwindcss";
   ```

## Extend

Touch nothing except the two addon registrations and missing dependencies.

1. In the existing `.storybook/main.js`/`main.ts` `addons` array, append the
   entries that are not yet present (replace `__NAMESPACE__` with `NAMESPACE`;
   quote the object key when the namespace is not a valid JS identifier):

   ```js
   'storybook-addon-designbook',
   {
     name: 'storybook-addon-sdc',
     options: {
       sdcStorybookOptions: {
         twigLib: 'twing',
         namespace: '__NAMESPACE__',
       },
       vitePluginTwingDrupalOptions: {
         namespaces: {
           __NAMESPACE__: ['../components'],
         },
       },
     },
   },
   ```

2. Ensure `"../components/**/*.component.yml"` is in the `stories` globs; append
   it when missing.
3. Add missing devDependencies: `storybook-addon-designbook`,
   `storybook-addon-sdc@^0.22.0`, `twing@^7.3.0`.
4. Leave every other setting untouched.
````

- [ ] **Step 2: Create `.agents/skills/designbook-drupal/install/config.md`**

````markdown
---
name: config
description: Write designbook.config.yml into the theme root.
---

# Config — designbook.config.yml

Write `THEME_DIR/designbook.config.yml` with exactly this content, substituting
`__CSS_FRAMEWORK__` and `__NAMESPACE__`:

```yaml
backend: drupal
frameworks:
  component: sdc
  css: __CSS_FRAMEWORK__
designbook:
  cmd: npx storybook dev
  home: .
  url: "http://localhost:6006"
dirs:
  components: components
  css:
    tokens: css/tokens
    themes: css/themes
css:
  app: css/app.src.css
component:
  namespace: '__NAMESPACE__'
  src: components
extensions:
  - id: drupal
    skill: designbook-drupal
```

When `CSS_FRAMEWORK` is `tailwind`, append to `extensions`:

```yaml
  - id: tailwind
    skill: designbook-css-tailwind
```

The file must not exist at this point — the core flow aborts in Phase 1 when it
does. Never overwrite an existing config without explicit user confirmation.
````

- [ ] **Step 3: Commit**

```bash
git add .agents/skills/designbook-drupal/install/storybook.md .agents/skills/designbook-drupal/install/config.md
git commit -m "feat(skill): add drupal install steps — storybook setup and config"
```

---

### Task 4: Storybook file templates

**Files:**
- Create: `.agents/skills/designbook-drupal/install/templates/main.js`
- Create: `.agents/skills/designbook-drupal/install/templates/preview.js`
- Create: `.agents/skills/designbook-drupal/install/templates/twing-hooks.js`

Templates are generic versions of `packages/integrations/test-integration-drupal/.storybook/` — fixture-specific parts (refRenderer, uiPatterns defs, icon helper, drupal-build plugin filtering) deliberately omitted (YAGNI).

- [ ] **Step 1: Create `templates/main.js`**

```js
import { join } from 'node:path'
import { cwd } from 'node:process'
// [tailwind-only] start
import tailwindcss from '@tailwindcss/vite'
// [tailwind-only] end

/** @type { import('@storybook/html-vite').StorybookConfig } */
const config = {
  stories: ['../components/**/*.component.yml'],
  addons: [
    '@storybook/addon-docs',
    { name: 'storybook-addon-designbook' },
    {
      name: 'storybook-addon-sdc',
      options: {
        sdcStorybookOptions: {
          useBasicArgsForStories: false,
          twigLib: 'twing',
          namespace: '__NAMESPACE__',
        },
        vitePluginTwingDrupalOptions: {
          hooks: join(cwd(), '.storybook/twing-hooks.js'),
          namespaces: {
            __NAMESPACE__: ['../components'],
          },
        },
      },
    },
  ],
  core: { builder: { name: '@storybook/builder-vite' } },
  framework: { name: '@storybook/html-vite', options: {} },
  // [tailwind-only] start
  async viteFinal(config) {
    const { mergeConfig } = await import('vite')
    return mergeConfig(config, {
      plugins: [tailwindcss()],
    })
  },
  // [tailwind-only] end
}
export default config
```

- [ ] **Step 2: Create `templates/preview.js`**

```js
// [tailwind-only] start
import '../css/app.src.css'
// [tailwind-only] end

/** @type { import('@storybook/html-vite').Preview } */
const preview = {
  tags: ['autodocs'],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}
export default preview
```

- [ ] **Step 3: Create `templates/twing-hooks.js`**

```js
// Register custom Twig functions/filters for the Storybook twing environment here.
export function initEnvironment(twingEnvironment, config = {}) {}
```

- [ ] **Step 4: Sanity-check template substitution produces valid JS**

```bash
mkdir -p /tmp/db-tpl-check
sed 's/__NAMESPACE__/demo_theme/g' .agents/skills/designbook-drupal/install/templates/main.js | sed '/\/\/ \[tailwind-only\] start/,/\/\/ \[tailwind-only\] end/d' > /tmp/db-tpl-check/main.js
node --check /tmp/db-tpl-check/main.js
sed 's/__NAMESPACE__/demo_theme/g' .agents/skills/designbook-drupal/install/templates/main.js | grep -v '\[tailwind-only\]' > /tmp/db-tpl-check/main-tw.js
node --check /tmp/db-tpl-check/main-tw.js
node --check .agents/skills/designbook-drupal/install/templates/twing-hooks.js
```

Expected: all three `node --check` calls exit 0 (no syntax errors) — covering both the tailwind-stripped and tailwind-kept variants.

- [ ] **Step 5: Commit**

```bash
git add .agents/skills/designbook-drupal/install/templates/
git commit -m "feat(skill): add drupal storybook templates for install flow"
```

---

### Task 5: Drupal SKILL.md index

**Files:**
- Modify: `.agents/skills/designbook-drupal/SKILL.md` (append after the Blueprints section, line 55)

- [ ] **Step 1: Append Install section**

```markdown

## Install

Backend-specific install steps, dispatched from the core install flow
(`designbook/install/install.md`).

- [install/install.md](install/install.md) — Step index: detect → theme → storybook → config
- [install/detect.md](install/detect.md) — Confirm Drupal codebase, determine docroot
- [install/theme.md](install/theme.md) — Find or scaffold the target custom theme
- [install/storybook.md](install/storybook.md) — Fresh Storybook setup or extend existing
- [install/config.md](install/config.md) — Write designbook.config.yml
- [install/templates/](install/templates/) — `.storybook/` file templates
```

- [ ] **Step 2: Commit**

```bash
git add .agents/skills/designbook-drupal/SKILL.md
git commit -m "docs(skill): index drupal install steps in SKILL.md"
```

---

### Task 6: Static validation

**Files:** none created — validation pass over the files from Tasks 1–5.

- [ ] **Step 1: Run the skill validator process**

Follow `.agents/skills/designbook-skill-creator/resources/validate.md` for the two touched skills ("Validate skill designbook", "Validate skill designbook-drupal"), restricted to the files created/modified in Tasks 1–5. The validator is an LLM process, not a CLI: load every rule file from `.agents/skills/designbook-skill-creator/rules/` whose `applies-to` glob matches, apply each `## Checks` row. For the new `install/*.md` instruction files only `common-rules.md` matches (COMMON-01 frontmatter, COMMON-02 site-agnostic); both `SKILL.md` files are also COMMON-checked.

Expected: zero `error` findings on the touched files. `__NAMESPACE__` placeholders and the test fixture mention are generic, not site-specific.

- [ ] **Step 2: Run `pnpm check`**

Run: `pnpm check`
Expected: PASS (typecheck → lint → test). No TypeScript was touched; this guards against accidental package changes.

- [ ] **Step 3: Fix any findings and commit (only if changes were needed)**

```bash
git add -A .agents/skills/designbook .agents/skills/designbook-drupal
git commit -m "fix(skill): address install-flow validation findings"
```

---

### Task 7: End-to-end smoke test (happy path) — CHECKPOINT

**Files:** none in the repo — disposable fixture under `/tmp/db-install-test`.

Spec scenario 1: one custom theme, no Storybook, fresh setup. Scenarios 2 and 3 (multi/no theme, existing Storybook) stay manual follow-ups — they exercise user interaction and are verified by reading the instruction branches, not scripted here.

- [ ] **Step 1: Build the addon package (needed for `file:` install — the package may not be on npm)**

```bash
pnpm --filter storybook-addon-designbook build
```

Expected: build succeeds, `packages/storybook-addon-designbook/dist/cli.js` exists.

- [ ] **Step 2: Create the bare Drupal fixture**

```bash
rm -rf /tmp/db-install-test
mkdir -p /tmp/db-install-test/web/themes/custom/demo_theme
cat > /tmp/db-install-test/composer.json <<'EOF'
{
  "require": { "drupal/core-recommended": "^11" },
  "extra": { "drupal-scaffold": { "locations": { "web-root": "web/" } } }
}
EOF
cat > /tmp/db-install-test/web/themes/custom/demo_theme/demo_theme.info.yml <<'EOF'
name: Demo Theme
type: theme
core_version_requirement: ^10 || ^11
EOF
ln -s "$(pwd)/.agents" /tmp/db-install-test/.agents
```

- [ ] **Step 3: Execute the install flow against the fixture**

Acting as the installing agent, follow `.agents/skills/designbook/install/install.md` from `/tmp/db-install-test` end to end. One deviation: when `storybook.md` says to add `storybook-addon-designbook`, install it from the local build instead:

```bash
npm install -D "file:/home/cw/projects/designbook/.claude/worktrees/setup/packages/storybook-addon-designbook"
```

Expected along the way: backend `drupal` detected, `DOCROOT=web`, single theme `demo_theme` auto-selected, fresh Storybook path, `CSS_FRAMEWORK=css` (tailwind blocks stripped, no `css/app.src.css`).

- [ ] **Step 4: Verify the outcome**

```bash
test -f /tmp/db-install-test/web/themes/custom/demo_theme/designbook.config.yml && echo CONFIG_OK
test -f /tmp/db-install-test/web/themes/custom/demo_theme/.storybook/main.js && echo MAIN_OK
grep -c demo_theme /tmp/db-install-test/web/themes/custom/demo_theme/.storybook/main.js
cd /tmp/db-install-test/web/themes/custom/demo_theme && npx storybook-addon-designbook storybook start --force
curl -sf -o /dev/null -w '%{http_code}\n' http://localhost:6006/index.json
```

Expected: `CONFIG_OK`, `MAIN_OK`, grep count ≥ 2, start command exits 0, curl prints `200` (use the URL/port the start command reports if it differs).

- [ ] **Step 5: Tear down**

```bash
cd /tmp/db-install-test/web/themes/custom/demo_theme && npx storybook-addon-designbook storybook stop; cd /
rm -rf /tmp/db-install-test
```

- [ ] **Step 6: Fix-forward** — any instruction that proved wrong or ambiguous during the smoke test: fix the corresponding `install/*.md` or template, re-run the failing part, commit:

```bash
git add -A .agents/skills/designbook .agents/skills/designbook-drupal
git commit -m "fix(skill): correct install instructions after smoke test"
```
