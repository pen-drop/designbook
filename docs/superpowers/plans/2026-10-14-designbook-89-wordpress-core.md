# WordPress Integration Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `backend: wordpress` to Designbook. The work covers:
- a backend-neutral Twig component framework
- WordPress data model, tokens (`theme.json`) and adapter interface
- a backend-neutral `sync-to` that generates a WordPress plugin and theme
- a neutral `seed-content` workflow that creates sample content via WP-CLI

**Architecture:**
- Core gains only neutral pieces:
  - framework `twig`, rendered by Twing 7's synchronous API through the same `resolveImportPath`/`wrapImport` seam Vue uses
  - a neutral `SyncUnit`/`SyncResult`
  - an `export-tokens` step and a `seed-content` workflow
- Drupal specifics in core move into `designbook-drupal`.
- Everything WordPress lives in `.agents/skills/designbook-wordpress/`.
- Generated code: plugin `<ns>-content` holds the model and the registry; theme `<ns>` holds presentation and is also the Storybook project.

**Tech Stack:** TypeScript (addon, vitest), Twing 7.3 (sync API), Storybook html-vite, WordPress + WP-CLI in DDEV, Secure Custom Fields (ACF API), Timber 2 (Composer), debo-test fixtures.

**Spec:** `docs/superpowers/specs/2026-10-14-designbook-89-wordpress-core-design.md`

## Global Constraints

- Never write migration/backward-compat code; renamed keys are renamed everywhere, old artifacts are disposable (CLAUDE.md).
- Load `designbook-skill-creator` (and the per-file-type rule) before creating or editing any task, rule, blueprint, workflow or `schemas.yml` under `.agents/skills/designbook*/`.
- Load `designbook-addon-skills` before changing `packages/storybook-addon-designbook/`.
- Tasks state WHAT, blueprints HOW, and rules are constraints without params.
- Core (`.agents/skills/designbook/`, `packages/storybook-addon-designbook/src`) contains no `wordpress|acf|timber|wp ` strings and, after Task 11, no `drush|cim_ok|config_sync_dir`.
- Field API target: ACF API (`acf_add_local_field_group`); runtime plugin: Secure Custom Fields.
- Twig is plain, with no `attributes` object and no `create_attribute`. Autoescape is **off** in both Twing and Timber (Timber default). Text props are escaped in templates with `|e`.
- Props/slots sidecar: `<name>.schema.yml` next to `<name>.twig` and `<name>.default.story.yml`.
- Commit messages: conventional type, no scope, end with `ref:DESIGNBOOK-89`, plus `Co-Authored-By` trailer.
- Run `pnpm check` before every commit.
- DDEV host is shared with other projects. The WordPress fixture project name is `designbook-wp-<workspace-key>`. Never run `ddev poweroff`.
- Transient evidence goes under `assets-ai/DESIGNBOOK-89/` (gitignored).

## Review Focus

1. **Slot HTML escaped twice.** With autoescape off, slot HTML must render as markup in Storybook. Task 6 test renders a slot containing `<strong>` and asserts the raw tag.
2. **Hyphen vs underscore component ids** (`ns:recipe_card` vs dir `recipe-card`). The twig resolver must try both, like the Vue resolver. Task 6 test covers it.
3. **Re-running sync** against an already-synced site must not overwrite or duplicate. `exists_cmd` drops existing units, and the Task 12 case runs sync twice and asserts the second `units` list is empty.
4. **Re-running seed** must update, not duplicate (`_designbook_id`). The Task 13 case asserts the recipe count is unchanged after a second run.
5. **Drupal regression from the C2 rename.** The Task 11 regression runs `drupal-web sync-node` and `sync-scene-rich` and requires both green.

---

## File Structure

**Addon (core, neutral)**
- `src/shared/config/story-patterns.ts`: add the `twig` pattern
- `src/scene-model/scene-module-builder.ts`: add `defaultTwigResolver`, `defaultTwigWrapImport`
- `src/addon/vite-plugin-twig.ts` (new): `.twig` → JS module rendering through a shared sync Twing env
- `src/addon/preset.ts`: twig branch (framework options, story glob, indexer)
- `src/tools/resolvers/sync-target-dir.ts` (new, replaces `config-sync-dir.ts`), plus `registry.ts`
- `package.json`: optional peer `twing`

**Core skill (neutral)**
- `designbook/skills/install/schemas.yml`: enum gets `twig`
- `designbook/skills/sync-to/{schemas.yml,workflows/sync-to.md,tasks/*.md,rules/sync-to-intake.md}`: neutralized
- `designbook/skills/seed-content/` (new): workflow, `seed` step contract, `SeedResult` schema
- `designbook/skills/css-generate/workflows/css-generate.md`: `export-tokens` step

**designbook-drupal:** filters added; new `sync/rules/sync-units.md` (the moved expansion); config blueprint keys renamed

**designbook-wordpress (new):** `SKILL.md`, `install/`, `data-model/`, `components/`, `tokens/`, `sync/`, `seed/`, `shell/`

**Test infra:**
- `packages/integrations/wordpress-fixture/`
- `packages/integrations/test-integration-wordpress/`
- `scripts/setup-workspace.sh`, `scripts/setup-test.sh`, `scripts/start-wordpress-workspace.sh`
- `fixtures/wordpress-recipe/`

---

## Phase P1 — Foundation (AC-1, AC-6)

### Task 1: Filter hygiene for designbook-drupal (C5)

**Files:**
- Modify (add `filter:` frontmatter): `.agents/skills/designbook-drupal/components/blueprints/{icon,button,link,logo,header,footer,page,pager,form,navigation,container,grid,section,component-template,js-behavior}.md`, `.agents/skills/designbook-drupal/data-mapping/blueprints/{field-map,canvas,layout-builder,ui-patterns}.md`, `.agents/skills/designbook-drupal/data-mapping/rules/{image-fields,field-cardinality}.md`. The list is not exhaustive; the test in Step 1 finds every remaining file.
- Test: `packages/storybook-addon-designbook/src/shared/__tests__/integration-filters.test.ts`

**Interfaces:** Produces the invariant "every designbook-drupal task/rule/blueprint is gated by `backend: drupal` or `frameworks.component: sdc`, except `install/rules/detect-drupal.md`".

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

const ROOT = resolve(__dirname, '../../../../../.agents/skills');
const EXEMPT = new Set(['designbook-drupal/install/rules/detect-drupal.md']);

function frontmatter(file: string): Record<string, unknown> {
  const m = readFileSync(file, 'utf-8').match(/^---\n([\s\S]*?)\n---/);
  return (m ? load(m[1]) : {}) as Record<string, unknown>;
}

describe.each([
  ['designbook-drupal', ['backend', 'frameworks.component']],
])('%s artifacts are gated', (skill, keys) => {
  const files = globSync(`${skill}/**/{tasks,rules,blueprints}/*.md`, { cwd: ROOT });
  it.each(files.filter((f) => !EXEMPT.has(f)))('%s', (rel) => {
    const filter = (frontmatter(resolve(ROOT, rel)).filter ?? {}) as Record<string, unknown>;
    expect(keys.some((k) => k in filter)).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `pnpm --filter storybook-addon-designbook exec vitest run src/shared/__tests__/integration-filters.test.ts`
Expected: FAIL listing the unfiltered files.

- [ ] **Step 3: Add filters.** Load `designbook-skill-creator` (`rules/blueprint-files.md`, `rules/rule-files.md`, `rules/common-rules.md`).
  - Files under `components/` get `filter:\n  frameworks.component: sdc` (merge with an existing `filter:` if present).
  - Everything else gets `filter:\n  backend: drupal`.
  - Do not change bodies.

- [ ] **Step 4: Run the test and confirm it passes.** Same command. Expected: PASS.

- [ ] **Step 5: Regression check.** Run `pnpm check`, then:

`npx debo-test run drupal-web design-component --workspace workspaces/t1-drupal`. If the suite has no case of that exact name, use the closest design-component case in `fixtures/drupal-web/cases`.

Expected: the case passes, which shows the SDC blueprints still load for `sdc`.

- [ ] **Step 6: Commit**

```bash
git add .agents/skills/designbook-drupal packages/storybook-addon-designbook/src/shared/__tests__/integration-filters.test.ts
git commit -m "fix: gate drupal integration artifacts by backend or framework filter

ref:DESIGNBOOK-89"
```

### Task 2: WordPress DDEV fixture and test theme scaffold

**Files:**
- Create: `packages/integrations/wordpress-fixture/.ddev/config.yaml`, `packages/integrations/wordpress-fixture/composer.json`, `packages/integrations/wordpress-fixture/README.md`
- Create: `packages/integrations/test-integration-wordpress/{style.css,functions.php,index.php,package.json,.storybook/main.js,.storybook/preview.js,components/.gitkeep}`
- Create: `scripts/start-wordpress-workspace.sh`

**Interfaces:**
- Produces a workspace layout: WP root = workspace root, theme at `wp-content/themes/test_integration_wordpress`, plugin target dir `wp-content/plugins`.
- DDEV project name `designbook-wp-<key>`.
- Admin user `admin` / password `admin`.

- [ ] **Step 1: DDEV config.** Write `.ddev/config.yaml`:

```yaml
name: designbook-wp
type: wordpress
docroot: ""
php_version: "8.3"
webserver_type: nginx-fpm
database:
  type: mariadb
  version: "10.11"
```

- [ ] **Step 2: Composer for the WP root.** Write `composer.json`. This pulls Timber for the theme-side runtime; the generated plugin also requires Timber, and the installer de-duplicates by version.

```json
{
  "name": "designbook/wordpress-fixture",
  "require": { "timber/timber": "^2.3" },
  "config": { "vendor-dir": "vendor" }
}
```

- [ ] **Step 3: Start script.** Write `scripts/start-wordpress-workspace.sh`, using the same argument handling as `start-drupal-workspace.sh` (`<name>` or `--workspace <dir>`). It must:
  - set `ddev config --project-name "designbook-wp-$KEY"`, where `KEY` is the workspace key sanitized as in setup-workspace.sh
  - run `ddev start`
  - run `ddev composer install`
  - run `ddev wp core download --skip-content --force` when `wp-includes/` is missing
  - run `ddev wp core install --url="$(ddev describe -j | jq -r .raw.primary_url)" --title=Designbook --admin_user=admin --admin_password=admin --admin_email=admin@example.com --skip-email` when `ddev wp core is-installed` fails
  - run `ddev wp plugin install secure-custom-fields --activate`
  - run `ddev wp theme activate test_integration_wordpress`
  - run `ddev wp rewrite structure '/%postname%/' --hard`
  - use `set -euo pipefail`
  - **never** call `ddev poweroff`

- [ ] **Step 4: Theme scaffold.**
  - `style.css` header: `Theme Name: Test Integration WordPress`, `Text Domain: test_integration_wordpress`.
  - `functions.php`:

```php
<?php
require_once ABSPATH . 'vendor/autoload.php';
Timber\Timber::init();
add_filter('timber/locations', function ($paths) {
    $paths['test_integration_wordpress'] = [get_stylesheet_directory() . '/components'];
    $paths[] = [get_stylesheet_directory() . '/views'];
    return $paths;
});
add_filter('timber/twig/environment/options', fn ($o) => ['autoescape' => false] + $o);
```

  - `index.php`: `<?php Timber\Timber::render('index.twig', Timber\Timber::context());`
  - `views/index.twig`: `{{ function('wp_head') }}<main>{% for post in posts %}<h2>{{ post.title|e }}</h2>{% endfor %}</main>{{ function('wp_footer') }}`
  - `package.json` copied from `packages/integrations/test-integration-vue/package.json`, with name changed, vue deps dropped and `twing` added.
  - `.storybook/main.js` copied from the vue app's `main.ts`, without `vuePlugin`. The twig plugin is auto-injected by the addon in Task 6.

- [ ] **Step 5: Verify manually.** Run `./scripts/setup-workspace.sh wp-smoke` after Task 3, then `./scripts/start-wordpress-workspace.sh wp-smoke`, then `cd workspaces/wp-smoke && ddev wp theme is-active test_integration_wordpress && ddev wp plugin is-active secure-custom-fields`.
  Expected: both exit 0. Record the output under `assets-ai/DESIGNBOOK-89/p1/`.

- [ ] **Step 6: Commit** after Task 3 verifies the scripts together.

### Task 3: Workspace scripts learn `backend: wordpress` (C6)

**Files:**
- Modify: `scripts/setup-workspace.sh:74-130`, `scripts/setup-test.sh` (backend read near l.102)

**Interfaces:**
- Consumes the Task 2 layout.
- Produces `THEME_REL=wp-content/themes/test_integration_wordpress` for `backend: wordpress`.

- [ ] **Step 1: Add the branch** in `setup-workspace.sh`, between the `none` branch and the Drupal `else`:

```bash
elif [ "$BACKEND" = "wordpress" ]; then
  THEME="test_integration_wordpress"
  THEME_REL="wp-content/themes/$THEME"
  THEME_DIR="$WORKSPACE_DIR/$THEME_REL"
  echo "Setting up workspace: $WORKSPACE_DIR (backend: wordpress)"
  FIX_WP="$REPO_ROOT/packages/integrations/wordpress-fixture"
  [ -d "$FIX_WP" ] || { echo "Missing $FIX_WP" >&2; exit 1; }
  rm -rf "$WORKSPACE_DIR"; mkdir -p "$WORKSPACE_DIR"
  rsync -a --exclude='.git' "$FIX_WP/" "$WORKSPACE_DIR/"
  mkdir -p "$THEME_DIR" "$WORKSPACE_DIR/wp-content/plugins"
  rsync -a --exclude='node_modules' --exclude='.git' \
    "$REPO_ROOT/packages/integrations/test-integration-wordpress/" "$THEME_DIR/"
```

  Make sure the code after the branch (`.agents`/`.claude` copy, `pnpm install` in `$THEME_DIR`) runs for this branch too. Read the full script first and follow the Drupal branch's tail.

- [ ] **Step 2: Mirror the branch in `setup-test.sh`** wherever it switches on `BACKEND` (theme-relative merge target).

- [ ] **Step 3: Verify.** Create a throwaway `fixtures/wp-smoke/designbook.config.yml` with `backend: wordpress` (delete it afterwards), then run `./scripts/setup-workspace.sh wp-smoke`.
  Expected: `workspaces/wp-smoke/wp-content/themes/test_integration_wordpress/style.css` exists. Then run Task 2 Step 5.

- [ ] **Step 4: Regression.** Run `./scripts/setup-workspace.sh drupal-web`. Expected: the Drupal layout is unchanged (`web/themes/custom/test_integration_drupal` exists).

- [ ] **Step 5: Commit** Tasks 2 and 3:

```bash
git add packages/integrations/wordpress-fixture packages/integrations/test-integration-wordpress scripts/
git commit -m "feat: add wordpress workspace fixture and setup scripts

ref:DESIGNBOOK-89"
```

### Task 4: `designbook-wordpress` skeleton and install content

**Files** (all under `.agents/skills/designbook-wordpress/`):
- Create: `SKILL.md`
- Create: `install/rules/detect-wordpress.md`
- Create: `install/rules/find-theme.md`
- Create: `install/blueprints/designbook-config.md`
- Create: `install/blueprints/storybook-setup.md`
- Register the skill wherever skills are listed for the marketplace/plugin manifest. Find it with `grep -rn designbook-vue --include=*.json .`.

**Interfaces:**
- Produces config keys: `backend: wordpress`, `frameworks.component: twig`, `component.namespace`, `sync_target_dir` (relative to `workspace`: `wp-content`), and `backend_cmd`:

| Key | Value |
|---|---|
| `exists_cmd` | `test -e` |
| `import` | `ddev composer install -d wp-content/plugins/<ns>-content && ddev wp plugin activate <ns>-content && ddev wp theme activate <ns> && ddev wp rewrite flush` |
| `seed_cmd` | `ddev wp eval-file` |
| `page_url_cmd` | `ddev wp eval 'echo get_permalink(get_page_by_path("{scene}"));'` |

- [ ] **Step 1:** Load `designbook-skill-creator` plus `rules/rule-files.md`, `rules/blueprint-files.md` and `rules/common-rules.md`.
- [ ] **Step 2: `detect-wordpress.md`.** Frontmatter `trigger: steps: [detect-backend]`, no filter (same as `detect-drupal.md`). Body:
  - Match when `wp-config.php` or `wp-includes/version.php` exists at the project root, or `composer.json` requires `roots/wordpress` or `johnpbloch/wordpress`.
  - Result `backend: wordpress`, docroot = the directory containing `wp-includes/`.
- [ ] **Step 3: `find-theme.md`** (`trigger: steps: [find-target]`, `filter: backend: wordpress`). Scan `wp-content/themes/*/style.css`; choose or scaffold. `target_dir` = the theme dir, `namespace` = the theme slug.
- [ ] **Step 4: `designbook-config.md` blueprint** (`trigger: steps: [write-config]`, `filter: backend: wordpress`). Give the YAML starting point with the keys from **Interfaces** above, and `frameworks.css: tailwind` as an overridable default.
- [ ] **Step 5: `storybook-setup.md` blueprint** (`trigger: steps: [setup-storybook]`, `filter: backend: wordpress`). Deps `storybook`, `@storybook/html-vite`, `storybook-addon-designbook`, `twing@^7.3`. The `main.js` stories glob is `../components/*/*.story.yml`, with no `storybook-addon-sdc`.
- [ ] **Step 6: `SKILL.md`** (`disable-model-invocation: true`, `user-invocable: false`). Index only files that exist; the Drupal index has dead links, so do not copy it.
- [ ] **Step 7: Validate.** Run the skill-creator validation (`npx debo validate` or the command its `resources/cli-validate.md` names) on the new files. Expected: no errors.
- [ ] **Step 8: Commit** `feat: add designbook-wordpress install integration` + `ref:DESIGNBOOK-89`.

### Task 5: WordPress data model content and `wordpress-recipe` suite

**Files:**
- Create: `.agents/skills/designbook-wordpress/data-model/blueprints/{post,term,attachment,field-types}.md`
- Create: `.agents/skills/designbook-wordpress/data-model/rules/wordpress-naming.md`
- Create: `fixtures/wordpress-recipe/{designbook.config.yml,README.md}` and `fixtures/wordpress-recipe/cases/03-data-model.yaml`. Copy the fixture dirs `empty`, `reference`, `vision` from `fixtures/drupal-recipe`. The `reference` dir is backend-independent.

**Interfaces:**
- Data model entity-type keys: `post` (bundles = post types, including `post`, `page`), `term` (bundles = taxonomies), `attachment` (bundle `image`).
- Field `type` values: `text`, `textarea`, `wysiwyg`, `number`, `image`, `gallery`, `link`, `relationship`, `taxonomy`, `repeater` (with `sub_fields`), `true_false`, `select`.
- Field names have no `field_` prefix; use snake_case ≤ 32 chars.

- [ ] **Step 1: Blueprints** (`type: entity-type`, `filter: backend: wordpress`; `field-types.md` with `extends: DataModel`, following `designbook-drupal/data-model/blueprints/field-types.md`). Each entity-type blueprint documents:
  - its base fields: `post` has `title`, `content`, `excerpt`, `featured_image`, `author`; `term` has `name`, `description`
  - which WordPress API registers it: `register_post_type` / `register_taxonomy` / media library
  - `field-types.md` maps each type to its ACF type and states that cardinality > 1 becomes `repeater`/`gallery`/`relationship(multiple)`
- [ ] **Step 2: Rule `wordpress-naming.md`** (`trigger: steps: [create-data-model]`, or the step the drupal-config rule triggers on, verified via `grep -n "trigger" -A3 .agents/skills/designbook-drupal/data-model/rules/drupal-config.md`; plus `filter: backend: wordpress`). Constraints:
  - post-type key `^[a-z0-9_-]{1,20}$`
  - taxonomy key `^[a-z0-9_]{1,32}$`
  - reserved terms forbidden: `post, page, attachment, revision, nav_menu_item, action, author, order, theme, type, category, tag, term, taxonomy`, except the built-in `post`/`page` bundles
- [ ] **Step 3: Suite config** `fixtures/wordpress-recipe/designbook.config.yml`:

```yaml
workspace: .
backend: wordpress
extensions:
  - id: figma
frameworks:
  component: twig
  css: tailwind
designbook:
  cmd: npx storybook dev
  home: .
dirs:
  components: components
  css: { tokens: css/tokens, themes: css/themes }
css:
  app: css/app.src.css
component:
  namespace: 'test_integration_wordpress'
  src: components
```

- [ ] **Step 4: Case `03-data-model.yaml`**, copied from drupal-recipe with these changes:
  - "Drupal / SDC" becomes "WordPress / Twig"
  - the route-bearing entity is `post.recipe`
  - ingredients and steps are `repeater` fields
  - field names are `prep_minutes` and `cook_minutes`
  - assertions:

```yaml
assert:
- type: javascript
  value: output.completedWorkflows['data-model']?.state?.status === 'completed'
- type: javascript
  value: "!!output.fileContents['designbook/data-model.yml']?.content?.post?.recipe?.fields?.prep_minutes"
- type: javascript
  value: "output.fileContents['designbook/data-model.yml']?.content?.post?.recipe?.fields?.ingredients?.type === 'repeater'"
- type: javascript
  value: Object.keys(output.fileContents || {}).some(f => f === 'designbook/data/post.recipe.yml')
```

- [ ] **Step 5: Run** `npx debo-test run wordpress-recipe 03-data-model --workspace workspaces/wpr-dm`. Expected: all assertions pass. Store the report under `assets-ai/DESIGNBOOK-89/debo-test/`.
- [ ] **Step 6: Save the produced `designbook/` tree as fixture dir `fixtures/wordpress-recipe/data-model/`**, mirroring how drupal-recipe stores its stages, so later cases can layer on it.
- [ ] **Step 7: `pnpm check`, then commit** `feat: add wordpress data model integration and recipe suite` + `ref:DESIGNBOOK-89`.

---

## Phase P2 — Components & tokens (AC-2, AC-3)

### Task 6: Addon framework `twig` (C1)

**Files:**
- Modify: `packages/storybook-addon-designbook/src/shared/config/story-patterns.ts`
- Modify: `packages/storybook-addon-designbook/src/scene-model/scene-module-builder.ts` (after the Vue section)
- Create: `packages/storybook-addon-designbook/src/addon/vite-plugin-twig.ts`
- Modify: `packages/storybook-addon-designbook/src/addon/preset.ts` (`indexComponentStory` ~l.149, `viteFinal` ~l.205, `stories` ~l.268, `experimental_indexers`)
- Modify: `packages/storybook-addon-designbook/package.json` (peer `twing: ^7.3.0`, optional; devDependency `twing`)
- Modify: `.agents/skills/designbook/skills/install/schemas.yml:91` (enum `[sdc, vue, twig]`)
- Test: `src/scene-model/__tests__/twig-resolver.test.ts`, `src/addon/__tests__/vite-plugin-twig.test.ts`

**Interfaces:**
- `defaultTwigResolver(componentId: string, designbookDir: string): string | null` returns the absolute path of `components/<dir>/<file>.twig`. It tries `name` and `name` with `_`→`-` for both dir and file.
- `defaultTwigWrapImport(alias: string): string` returns `` `{ render: (p, s) => ${alias}.default({ ...p, ...s }) }` ``.
- A Vite module for any `*.twig` under the components dir: `export default (ctx) => string`, rendered by one shared synchronous Twing environment. That environment registers namespace `@<component.namespace>` → components dir, uses autoescape off, and has all templates loaded by `createSynchronousArrayLoader`.
- `designbookTwigPlugin({ componentsDir: string, namespace: string }): Plugin`

- [ ] **Step 1: Failing resolver test**

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { defaultTwigResolver, defaultTwigWrapImport } from '../scene-module-builder.js';

describe('defaultTwigResolver', () => {
  const root = mkdtempSync(join(tmpdir(), 'twig-'));
  mkdirSync(join(root, 'components', 'recipe-card'), { recursive: true });
  writeFileSync(join(root, 'components', 'recipe-card', 'recipe-card.twig'), '<div></div>');
  const designbookDir = join(root, 'designbook');

  it('resolves ns:name with hyphen fallback', () => {
    expect(defaultTwigResolver('ns:recipe_card', designbookDir)).toBe(
      join(root, 'components', 'recipe-card', 'recipe-card.twig'),
    );
  });
  it('returns null for unknown or malformed ids', () => {
    expect(defaultTwigResolver('ns:missing', designbookDir)).toBeNull();
    expect(defaultTwigResolver('nonamespace', designbookDir)).toBeNull();
  });
  it('wraps the default export with merged props and slots', () => {
    expect(defaultTwigWrapImport('C0')).toBe('{ render: (p, s) => C0.default({ ...p, ...s }) }');
  });
});
```

- [ ] **Step 2: Run it.** `pnpm --filter storybook-addon-designbook exec vitest run src/scene-model/__tests__/twig-resolver.test.ts`. Expected: FAIL (`defaultTwigResolver` is not exported).

- [ ] **Step 3: Implement** in `scene-module-builder.ts`:

```ts
// ── Default Twig import resolver ───────────────────────────────────────

/** Resolves 'provider:component' → absolute path to `components/<dir>/<file>.twig`. */
export function defaultTwigResolver(componentId: string, designbookDir: string): string | null {
  const parts = componentId.split(':');
  if (parts.length !== 2 || !parts[1]) return null;
  const name = parts[1];
  const candidates = [name, name.replace(/_/g, '-')];
  for (const dirName of candidates) {
    for (const fileName of [name, dirName]) {
      const file = join(resolve(designbookDir, '..', 'components', dirName), `${fileName}.twig`);
      if (existsSync(file)) return file;
    }
  }
  return null;
}

/** Twig modules export `(ctx) => html`; slots arrive pre-rendered as HTML strings. */
export function defaultTwigWrapImport(alias: string): string {
  return `{ render: (p, s) => ${alias}.default({ ...p, ...s }) }`;
}
```

- [ ] **Step 4: Run it.** Expected: PASS.

- [ ] **Step 5: Failing plugin test**

```ts
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderTwigForTest } from '../vite-plugin-twig.js';

describe('twig rendering', () => {
  const dir = mkdtempSync(join(tmpdir(), 'twigc-'));
  mkdirSync(join(dir, 'card'));
  mkdirSync(join(dir, 'badge'));
  writeFileSync(join(dir, 'badge', 'badge.twig'), '<span class="badge">{{ label|e }}</span>');
  writeFileSync(
    join(dir, 'card', 'card.twig'),
    "<article>{{ title|e }}{% include '@ns/badge/badge.twig' with { label: 'New' } only %}<div>{{ content }}</div></article>",
  );

  it('renders props escaped, slot html raw, and namespaced includes', () => {
    const html = renderTwigForTest(dir, 'ns', join(dir, 'card', 'card.twig'), {
      title: '<b>x</b>',
      content: '<strong>slot</strong>',
    });
    expect(html).toBe(
      '<article>&lt;b&gt;x&lt;/b&gt;<span class="badge">New</span><div><strong>slot</strong></div></article>',
    );
  });
});
```

- [ ] **Step 6: Run it.** Expected: FAIL (module missing).

- [ ] **Step 7: Implement `vite-plugin-twig.ts`**

```ts
import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { globSync } from 'glob';
import type { Plugin } from 'vite';
import { createSynchronousArrayLoader, createSynchronousEnvironment } from 'twing';

const ENV_ID = 'virtual:designbook-twig-env';

function templateMap(componentsDir: string, namespace: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const file of globSync('**/*.twig', { cwd: componentsDir, absolute: true })) {
    map[`@${namespace}/${relative(componentsDir, file).split(sep).join('/')}`] = readFileSync(file, 'utf-8');
  }
  return map;
}

function templateName(componentsDir: string, namespace: string, file: string): string {
  return `@${namespace}/${relative(componentsDir, file).split(sep).join('/')}`;
}

/** Node-side render used by tests (same env shape as the browser module). */
export function renderTwigForTest(componentsDir: string, namespace: string, file: string, ctx: object): string {
  const env = createSynchronousEnvironment(createSynchronousArrayLoader(templateMap(componentsDir, namespace)), {
    autoEscapingStrategy: false as unknown as string,
  });
  return env.render(templateName(componentsDir, namespace, file), ctx as Record<string, unknown>);
}

/** `.twig` under componentsDir → `export default (ctx) => html` via one shared sync Twing env. */
export function designbookTwigPlugin(opts: { componentsDir: string; namespace: string }): Plugin {
  return {
    name: 'designbook-twig',
    resolveId: (id) => (id === ENV_ID ? '\0' + ENV_ID : null),
    load(id) {
      if (id === '\0' + ENV_ID) {
        for (const f of globSync('**/*.twig', { cwd: opts.componentsDir, absolute: true })) this.addWatchFile(f);
        return [
          `import { createSynchronousArrayLoader, createSynchronousEnvironment } from 'twing';`,
          `const templates = ${JSON.stringify(templateMap(opts.componentsDir, opts.namespace))};`,
          `export const env = createSynchronousEnvironment(createSynchronousArrayLoader(templates), { autoEscapingStrategy: false });`,
        ].join('\n');
      }
      if (!id.endsWith('.twig') || !id.startsWith(opts.componentsDir)) return null;
      return [
        `import { env } from '${ENV_ID}';`,
        `export default (ctx) => env.render(${JSON.stringify(templateName(opts.componentsDir, opts.namespace, id))}, ctx);`,
      ].join('\n');
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.twig')) return;
      const mod = server.moduleGraph.getModuleById('\0' + ENV_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
```

  If Twing's `autoEscapingStrategy` typing rejects `false`, check `node_modules/twing/lib/environment.d.ts` for the accepted "off" value and use it in both places. The test pins the behavior.

- [ ] **Step 8: Run it.** Expected: PASS.

- [ ] **Step 9: Wire `preset.ts`.** It currently has two binary `componentFramework === 'vue'` checks; replace them as follows.
  - Framework options become:

```ts
const designbookDir = resolve(configDir, fsRoot || 'designbook');
const frameworkOptions =
  componentFramework === 'vue'
    ? { resolveImportPath: (id: string) => defaultVueResolver(id, designbookDir), wrapImport: defaultVueWrapImport, extraImportLines: defaultVueExtraImportLines, builtInComponents: vueBuiltInComponents }
    : componentFramework === 'twig'
      ? { resolveImportPath: (id: string) => defaultTwigResolver(id, designbookDir), wrapImport: defaultTwigWrapImport }
      : {};
if (componentFramework === 'twig') {
  plugins.push(designbookTwigPlugin({
    componentsDir: resolve(configDir, String(designbookConfig['dirs.components'] ?? 'components')),
    namespace: String(designbookConfig['component.namespace']),
  }));
}
```

  - The component story glob applies when the framework is `vue` or `twig`.
  - In `indexComponentStory`, the sibling check accepts `<name>.vue` **or** `<name>.twig`. Update the comment above it.

- [ ] **Step 10: Install schema enum.** Change `.agents/skills/designbook/skills/install/schemas.yml` `frameworks.component` to `enum: [sdc, vue, twig]` and add a description line: "twig — plain Twig templates rendered by Twing (Storybook) and any Twig runtime (e.g. Timber)". This is neutral wording.

- [ ] **Step 11: Add `twig` to `DEFAULT_STORY_PATTERNS`**: `{ import_path_pattern: /^\.\/components\/([^/]+)\/\1\.twig$/, component_name_group: 1 }`.

- [ ] **Step 12: Package peer.** Add `"twing": "^7.3.0"` to `peerDependencies` (optional in `peerDependenciesMeta`) and to `devDependencies`, then run `pnpm install`.

- [ ] **Step 13: `pnpm check`.** Expected: green, including the existing vue/sdc preset tests.

- [ ] **Step 14: Commit** `feat: add twig component framework rendered via twing` + `ref:DESIGNBOOK-89`.

### Task 7: Twig component content and design-component case

**Files:**
- Create: `.agents/skills/designbook-wordpress/components/schemas.yml` (`TwigComponent`, `TwigComponentSchema`, `TwigStory`, `TwigStoryNode`)
- Create: `.agents/skills/designbook-wordpress/components/tasks/write-component.md`
- Create: `.agents/skills/designbook-wordpress/components/rules/twig-components.md`
- Create: `fixtures/wordpress-recipe/cases/design-component.yaml`

**Interfaces:**
- `write-component` results:
  - `component-twig` → `${DESIGNBOOK_HOME}/components/{{ component.component }}/{{ component.component }}.twig`
  - `component-schema` → `….schema.yml`
  - `component-story` → `….default.story.yml`
- The `TwigComponentSchema` shape follows the spec's `card.schema.yml`: `name`, `props` (JSON Schema object), `slots` (map name → `{title, description?}`).

- [ ] **Step 1:** Load `designbook-skill-creator` (`rules/schema-files.md`, `rules/task-files.md`, `rules/rule-files.md`).
- [ ] **Step 2: `schemas.yml`.** Start from `designbook-vue/components/schemas.yml`.
  - `TwigStory`/`TwigStoryNode` are copies of `VueStory`/`VueStoryNode` with Vue wording replaced. Story props keys match `<name>.schema.yml` props; slot keys match its `slots`.
  - `TwigComponent` is `type: string`. Its description holds the naming rule (kebab dir = file base) and states that the template is plain Twig with no `attributes` object.
  - `TwigComponentSchema` is a strict object: `required: [name, props]`, `props.type: const object`, `slots` with `additionalProperties: {type: object, required: [title]}`.
- [ ] **Step 3: Task `write-component.md`.** Use the vue task frontmatter with `filter: frameworks.component: twig` and the three results above, each `$ref` to `designbook-wordpress/components/schemas.yml#/…`. The body is WHAT only, same as the vue task body.
- [ ] **Step 4: Rule `twig-components.md`** (`trigger: steps: [write-component, refresh-components, validate]`, `filter: frameworks.component: twig`). Constraints table:
  - one root element
  - CSS classes come from props (`class` prop optional), not from an attributes object
  - every text prop is printed with `|e`, and slots are printed raw
  - nested components use `{% include '@<namespace>/<name>/<name>.twig' with {…} only %}`
  - no Drupal functions or filters (`t`, `create_attribute`, `attach_library`, `clean_class`)
- [ ] **Step 5: Case `design-component.yaml`.** Fixtures: `empty`, `reference`, `vision`, `data-model`, `tokens` (the tokens fixture is produced in Task 8, so run this case after Task 8). The prompt asks for the recipe card component via the design-component workflow.
  Assert:
  - the files `components/recipe-card/recipe-card.{twig,schema.yml,default.story.yml}` exist
  - the twig contains no `attributes.`
  - the workflow completed
- [ ] **Step 6: Run it** after Task 8: `npx debo-test run wordpress-recipe design-component --workspace workspaces/wpr-dc`. Expected: pass, and the Storybook story `components-recipe-card--default` renders. The debo-test harness screenshot shows the card. Evidence goes under `assets-ai/DESIGNBOOK-89/debo-test/`.
- [ ] **Step 7: `pnpm check`, then commit** `feat: add twig component authoring for wordpress` + `ref:DESIGNBOOK-89`.

### Task 8: `export-tokens` step and `theme.json` (C4)

**Files:**
- Modify: `.agents/skills/designbook/skills/css-generate/workflows/css-generate.md` (append stage `export-tokens` with step `export-tokens` after `compile-css`)
- Create: `.agents/skills/designbook-wordpress/tokens/tasks/export-tokens.md`
- Create: `.agents/skills/designbook-wordpress/tokens/blueprints/theme-json.md`
- Create: `fixtures/wordpress-recipe/cases/04-tokens.yaml`

**Interfaces:**
- `export-tokens` task params: `design_tokens` (path `$DESIGNBOOK_DATA/design-system/design-tokens.yml`).
- Result `theme-json` with path `${DESIGNBOOK_HOME}/theme.json`.

- [ ] **Step 1:** Load `designbook-skill-creator` (`rules/workflow-files.md`, `rules/task-files.md`, `rules/blueprint-files.md`).
- [ ] **Step 2: Workflow step.** Verify how `compile-css` is declared in `css-generate.md` and declare `export-tokens` the same way. Then confirm that a project with no matching task still builds a plan. Run `npx debo-test run drupal-web css-generate --workspace workspaces/t8-drupal`; expected: pass, with no export-tokens task planned. If the planner rejects a step without tasks, stop and escalate; do not add a dummy Drupal task.
- [ ] **Step 3: Task** (`trigger: steps: [export-tokens]`, `filter: backend: wordpress`). WHAT: write `theme.json` (version 3) whose `settings.color.palette`, `settings.typography.fontFamilies`/`fontSizes` and `settings.spacing.spacingSizes` presets carry the design tokens.
- [ ] **Step 4: Blueprint `theme-json.md`.** HOW: the token group → preset mapping, slug = token key, and `$schema: https://schemas.wp.org/trunk/theme.json`.
- [ ] **Step 5: Case `04-tokens.yaml`**, copied from drupal-recipe `04-tokens.yaml`, then:
  - assert that `theme.json` exists with `version === 3` and a non-empty `settings.color.palette`
  - in the case, validate the file with `npx ajv-cli validate -s <(curl -s https://schemas.wp.org/trunk/theme.json) -d theme.json --spec=draft7 --strict=false`, or record the validation as one agent-run command in the case evidence if the case runner cannot shell out
- [ ] **Step 6: Run it** (`npx debo-test run wordpress-recipe 04-tokens --workspace workspaces/wpr-tok`) and store `fixtures/wordpress-recipe/tokens/` from the result.
- [ ] **Step 7: `pnpm check`, then commit** `feat: export design tokens as theme.json for wordpress` + `ref:DESIGNBOOK-89`.

---

## Phase P3 — Adapter interface (AC-5)

### Task 9: ComponentRegistry (PHP) and its test

**Files:**
- Create: `.agents/skills/designbook-wordpress/sync/templates/plugin/src/ComponentRegistry.php`
- Create: `.agents/skills/designbook-wordpress/sync/templates/plugin/tests/registry-test.php`

**Interfaces:**

```php
namespace Designbook;
final class ComponentDefinition { public function __construct(public string $id, public string $name, public array $props, public array $slots) {} }
final class ComponentRegistry {
  public function __construct(string $componentsDir, string $namespace);
  /** @return array<string, ComponentDefinition> */ public function all(): array;
  public function get(string $id): ?ComponentDefinition;
  public function render(string $id, array $props = [], array $slots = []): string;
}
// plugin bootstrap fires: do_action('designbook/register_components', $registry);
```

- [ ] **Step 1: Write the failing test script** `tests/registry-test.php`. It is run with `ddev wp eval-file`, which needs no PHPUnit install.

```php
<?php
require_once __DIR__ . '/../src/ComponentRegistry.php';
$dir = get_stylesheet_directory() . '/components';
$r = new Designbook\ComponentRegistry($dir, get_stylesheet());
$all = $r->all();
assert(isset($all['recipe-card']), 'recipe-card registered');
assert($all['recipe-card']->props['type'] === 'object', 'props schema loaded');
$seen = [];
add_action('designbook/register_components', function ($reg) use (&$seen) { $seen = array_keys($reg->all()); });
do_action('designbook/register_components', $r);
assert($seen === array_keys($all), 'adapter receives all definitions');
$story = Symfony\Component\Yaml\Yaml::parseFile("$dir/recipe-card/recipe-card.default.story.yml");
$html = $r->render('recipe-card', $story['props'] ?? [], []);
file_put_contents(getenv('SNAPSHOT_OUT') ?: '/tmp/recipe-card.html', $html);
echo "OK\n";
```

  Run with `ddev exec -e SNAPSHOT_OUT=/var/www/html/registry.html wp eval-file …` and `zend.assertions=1` (`ddev exec php -d zend.assertions=1 -d assert.exception=1 $(which wp) eval-file …`).
  `symfony/yaml` comes in with Timber's dependency tree; if it does not, add `symfony/yaml` to the plugin `composer.json` template in Task 12.

- [ ] **Step 2: Run** in the `wpr-dc` workspace from Task 7 (it has `recipe-card`). Expected: fatal error, class missing.

- [ ] **Step 3: Implement `ComponentRegistry.php`**

```php
<?php
namespace Designbook;

use Symfony\Component\Yaml\Yaml;
use Timber\Timber;

final class ComponentDefinition {
    public function __construct(public string $id, public string $name, public array $props, public array $slots) {}
}

final class ComponentRegistry {
    /** @var array<string, ComponentDefinition>|null */
    private ?array $definitions = null;

    public function __construct(private string $componentsDir, private string $namespace) {}

    public function all(): array {
        if ($this->definitions !== null) return $this->definitions;
        $this->definitions = [];
        foreach (glob($this->componentsDir . '/*/*.schema.yml') ?: [] as $file) {
            $id = basename(dirname($file));
            if (basename($file) !== "$id.schema.yml") continue;
            $s = Yaml::parseFile($file);
            $this->definitions[$id] = new ComponentDefinition($id, $s['name'] ?? $id, $s['props'] ?? ['type' => 'object'], $s['slots'] ?? []);
        }
        ksort($this->definitions);
        return $this->definitions;
    }

    public function get(string $id): ?ComponentDefinition {
        return $this->all()[$id] ?? null;
    }

    /** Slots are pre-rendered HTML strings keyed by slot name. */
    public function render(string $id, array $props = [], array $slots = []): string {
        if (!$this->get($id)) throw new \InvalidArgumentException("Unknown component: $id");
        return Timber::compile("@{$this->namespace}/$id/$id.twig", $props + $slots);
    }
}
```

- [ ] **Step 4: Run again.** Expected: `OK`.
- [ ] **Step 5: Snapshot parity.** Render the same story in Storybook via `node -e` with `renderTwigForTest` (Task 6) using the story props, write it to `assets-ai/DESIGNBOOK-89/p3/storybook.html`, and diff it against `registry.html` after whitespace normalization (`tr -s ' \n'`). Expected: identical. Commit the Storybook-side snapshot as `sync/templates/plugin/tests/recipe-card.snapshot.html` only if the two match.
- [ ] **Step 6: Commit** `feat: add wordpress component registry adapter interface` + `ref:DESIGNBOOK-89`.

### Task 10: Writer contract rule

**Files:**
- Create: `.agents/skills/designbook-wordpress/sync/rules/builder-adapter-contract.md`

- [ ] **Step 1:** Load `designbook-skill-creator` (`rules/rule-files.md`).
- [ ] **Step 2: Write the rule** (`trigger: steps: [sync-to:resolve-filter, sync-to:transform]`, `filter: backend: wordpress`). Constraints table:
  - **ADAPT-01:** a builder registers components only through `designbook/register_components`; it never reads `components/` itself
  - **ADAPT-02:** controls derive from the `props` JSON Schema (`enum`→select, `boolean`→toggle, `format: uri`→URL, `type: string`→text); there are no hand-coded per-component controls
  - **ADAPT-03:** each slot maps to exactly one nested region
  - **ADAPT-04:** frontend output always goes through `ComponentRegistry::render`
  - **ADAPT-05:** a builder is a `build_form` value in `entity_mapping.templates`, and its data-mapping blueprint is matched by that value. The blueprint writes the scene's component tree into the builder's storage as one sync unit `layout.<scene>` whose `path` is a PHP seed script (run by `seed_cmd`), so storage writes stay idempotent through `_designbook_id`
- [ ] **Step 3: Validate the skill, run `pnpm check`, commit** `docs: define wordpress builder adapter contract` + `ref:DESIGNBOOK-89`.

---

## Phase P4 — Sync & seed (AC-4, AC-6)

### Task 11: Neutral `sync-to` (C2) and Drupal relocation

**Files:**
- Create: `packages/storybook-addon-designbook/src/tools/resolvers/sync-target-dir.ts` and `__tests__/sync-target-dir.test.ts`
- Delete: `src/tools/resolvers/config-sync-dir.ts` and its test
- Modify: `src/tools/resolvers/registry.ts`
- Modify: `.agents/skills/designbook/skills/sync-to/{schemas.yml,workflows/sync-to.md,tasks/resolve-filter.md,tasks/transform.md,tasks/sync.md,tasks/outtake.md,rules/sync-to-intake.md,SKILL.md}`
- Modify: `.agents/skills/designbook/SKILL.md:35` and `.agents/skills/designbook/resources/cli-validate.md:33` (drop the Drupal wording)
- Create: `.agents/skills/designbook-drupal/sync/rules/sync-units.md`
- Modify: `.agents/skills/designbook-drupal/install/blueprints/designbook-config.md`, every `fixtures/drupal-*/**/designbook.config.yml` and `config-overrides/*.yml` that sets `config_sync_dir`. Find them with `grep -rln config_sync_dir fixtures .agents packages scripts`.

**Interfaces:**
- Resolver `sync_target_dir`:
  - an absolute explicit param wins
  - otherwise the config key `sync_target_dir` resolved against `workspace` (or cwd)
  - the error when unset is `sync_target_dir: set sync_target_dir in designbook.config.yml`
- `SyncUnit`: `{ name: string (pattern ^[a-z0-9_-]+(\.[a-z0-9_-]+)+$), path: string, entity_type?, bundle?, field_name?, config_key?, def?, build_form? }`, with `required: [name, path]`.
- `SyncResult`: `{ summary: string, applied: string[], ok: const true }`.
- `ExportSummary`: `{ unit_names, count, presenter_templates?, uncovered_units?, page_url? }`.
- Transform result path: `{{ sync_target_dir }}/{{ unit.path }}`. `prepare` stays declared, and the task body states it runs only when `backend_cmd.schema_cmd` is configured.
- Drupal config: `sync_target_dir: web/sites/default/files/sync`. Drupal unit `path`: `<config_name>.yml`.

- [ ] **Step 1: Failing resolver test**

```ts
import { describe, it, expect } from 'vitest';
import { syncTargetDirResolver } from '../sync-target-dir.js';

const ctx = (config: Record<string, unknown>, params: Record<string, unknown> = {}) => ({ config, params }) as never;

describe('sync_target_dir', () => {
  it('resolves the config value against workspace', () => {
    expect(syncTargetDirResolver.resolve('', {}, ctx({ workspace: '/w', sync_target_dir: 'wp-content' })).value).toBe('/w/wp-content');
  });
  it('keeps an absolute explicit param', () => {
    expect(syncTargetDirResolver.resolve('', {}, ctx({ sync_target_dir: 'x' }, { sync_target_dir: '/abs' })).value).toBe('/abs');
  });
  it('fails clearly when unset', () => {
    const r = syncTargetDirResolver.resolve('', {}, ctx({}));
    expect(r.resolved).toBe(false);
    expect(r.error).toContain('set sync_target_dir');
  });
});
```

- [ ] **Step 2: Run it.** Expected: FAIL.
- [ ] **Step 3: Implement**

```ts
import { resolve } from 'node:path';
import type { ParamResolver, ResolverResult, ResolverContext } from './types.js';

/** `resolve: sync_target_dir` — backend's sync output root from designbook.config.yml. */
export const syncTargetDirResolver: ParamResolver = {
  name: 'sync_target_dir',
  requiresInput: false,
  resolve(input: string, _config: Record<string, unknown>, context: ResolverContext): ResolverResult {
    const explicit = context.params?.sync_target_dir;
    if (typeof explicit === 'string' && explicit.startsWith('/')) return { resolved: true, value: explicit, input: explicit };
    if (input.startsWith('/')) return { resolved: true, value: input, input };
    const cfg = context.config as Record<string, unknown>;
    const dir = cfg.sync_target_dir;
    if (typeof dir !== 'string' || dir === '') {
      return { resolved: false, input: '', error: 'sync_target_dir: set sync_target_dir in designbook.config.yml' };
    }
    const base = typeof cfg.workspace === 'string' && cfg.workspace !== '' ? cfg.workspace : process.cwd();
    const value = resolve(base, dir);
    return { resolved: true, value, input: dir };
  },
};
```

  Register it in `registry.ts` in place of `configSyncDirResolver`, and delete the old file and its test.
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Skill edits.** Load `designbook-skill-creator` (schema, task, workflow and rule files).
  - Rename all schemas and fields per **Interfaces**.
  - Replace `config_sync_dir` with `sync_target_dir` in every param block.
  - Rewrite `resolve-filter.md`'s "Result: units" section to WHAT only: "Expand each matching slice into the units the active backend's sync-unit rule defines, in dependency-before-user order, then apply the existence filter (`{{ backend_cmd.exists_cmd }} {{ sync_target_dir }}/<unit.path>` exit 0 ⇒ drop)." The existence check now receives the unit's absolute output path. Drupal's `exists_cmd` (`ddev drush config:get`) needs the config name, so the Drupal rule says Drupal units set `path` = `<name>.yml`, and the Drupal `exists_cmd` becomes a wrapper `sh -c 'ddev drush config:get "$(basename "$1" .yml)"' --`. Put that string in the Drupal config blueprint and fixture configs.
  - Move the full current Drupal expansion text (content-bundle numbered list, config-slice general rule, `image_style` exception, view/form-mode dedup, taxonomy/paragraph exceptions, block decision on the scene branch) verbatim into `designbook-drupal/sync/rules/sync-units.md` (`trigger: steps: [sync-to:resolve-filter]`, `filter: backend: drupal`), adding "`path` = `<name>.yml`".
  - `sync.md`: "Apply the generated units to the live backend by running `{{ backend_cmd.import }}`"; result fields `summary`/`applied`/`ok`.
  - Workflow title: "Sync to backend".
- [ ] **Step 6: Grep check**: `grep -rnE 'drush|cim_ok|config_sync_dir|Drupal' .agents/skills/designbook/skills/sync-to packages/storybook-addon-designbook/src`. Expected: no hits. A justified hit goes into the AC-6 exception list (Task 14) with its reason.
- [ ] **Step 7: `pnpm check`.**
- [ ] **Step 8: Drupal regression.** Run `npx debo-test run drupal-web sync-node --workspace workspaces/t11-node`, then `npx debo-test run drupal-web sync-scene-rich --workspace workspaces/t11-scene`. Expected: both pass.
  - Before running, check `ddev list` for other projects on the shared host and confirm with the owner if a Drupal fixture start would contend.
  - On failure, stop and escalate with output; never mark done.
- [ ] **Step 9: Commit** `refactor: make sync-to backend-neutral and move drupal unit expansion into the integration` + `ref:DESIGNBOOK-89`.

### Task 12: WordPress sync content and sync case

**Files** (under `.agents/skills/designbook-wordpress/sync/`):
- Create: `rules/sync-units.md`
- Create: `blueprints/{plugin-bootstrap,theme-bootstrap,post-type,taxonomy,field-group,single-view,template-parts}.md`
- Create: `templates/plugin/{plugin.php.tpl,composer.json.tpl}`, `templates/theme/{functions.php.tpl,single.php.tpl,index.php.tpl}`
- Create: `fixtures/wordpress-recipe/cases/sync.yaml`
- Create: `fixtures/wordpress-recipe/cases/sync-rerun.yaml`

**Interfaces:**
- WordPress units (all `path` relative to `sync_target_dir` = `wp-content`):

| Unit name | Path |
|---|---|
| `plugin.<ns>_content` | `plugins/<ns>-content/<ns>-content.php` (+ `composer.json`, `src/ComponentRegistry.php` copied from `templates/`) |
| `post_type.<bundle>` | `plugins/<ns>-content/post-types/<bundle>.php` |
| `taxonomy.<bundle>` | `plugins/<ns>-content/taxonomies/<bundle>.php` |
| `field_group.<et>_<bundle>` | `plugins/<ns>-content/fields/<et>-<bundle>.php` |
| `theme.<ns>` | `themes/<ns>/functions.php` (+ `single.php`, `index.php`) |
| `view.<bundle>.full` | `themes/<ns>/views/single-<bundle>.twig` |
| `parts.<ns>.shell` | `themes/<ns>/views/parts/header.twig`, `footer.twig` |

- `exists_cmd`: `test -e` (core appends the absolute output path `{{ sync_target_dir }}/<unit.path>`).
- The plugin bootstrap requires `vendor/autoload.php` and every file under `post-types/`, `taxonomies/` and `fields/` on `init`/`acf/init`. It then builds `ComponentRegistry(get_stylesheet_directory().'/components', get_stylesheet())` and fires `do_action('designbook/register_components', $registry)` on `init` priority 20.

- [ ] **Step 1:** Load `designbook-skill-creator` (rules, blueprints).
- [ ] **Step 2: `rules/sync-units.md`** (`trigger: steps: [sync-to:resolve-filter]`, `filter: backend: wordpress`). Lists the unit table above and the order: plugin → post types → taxonomies → field groups → theme → views → parts.
- [ ] **Step 3: Blueprints**, one per unit kind (`trigger: config_name` glob per kind, e.g. `post_type.*`, `filter: backend: wordpress`). Each gives the exact PHP shape. Example for `post-type.md`:

```php
<?php
add_action('init', function () {
    register_post_type('recipe', [
        'label' => 'Recipes',
        'public' => true,
        'show_in_rest' => true,
        'has_archive' => true,
        'rewrite' => ['slug' => 'recipe'],
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail'],
        'taxonomies' => ['recipe_category'],
    ]);
});
```

  `field-group.md` gives `acf_add_local_field_group(['key' => 'group_<et>_<bundle>', 'title' => …, 'fields' => [['key' => 'field_<bundle>_<name>', 'name' => '<name>', 'type' => '<acf type>', …]], 'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => '<bundle>']]]])` inside `add_action('acf/init', …)`. Repeater `sub_fields` follow the same key scheme.
  `single-view.md` maps the entity mapping (view mode `full`) to `{% include '@<ns>/<component>/<component>.twig' with { title: post.title, image: post.thumbnail.src, ingredients: post.meta('ingredients') } only %}` inside `{% extends 'base.twig' %}`, with `base.twig` including the header/footer parts.
- [ ] **Step 4: Templates.** Write the `.tpl` files referenced above. `composer.json.tpl` requires `timber/timber:^2.3` and `symfony/yaml:^6.4|^7.0`.
- [ ] **Step 5: Case `sync.yaml`.** Fixtures: `empty`, `reference`, `vision`, `data-model`, `tokens`, `screen` (design-component output saved in Task 7). The prompt runs `sync-to` with an empty filter. It must start the workspace with `scripts/start-wordpress-workspace.sh --workspace {{workspace}}` before the sync.
  Asserts, run as case commands with exit codes captured:

```yaml
assert:
- type: javascript
  value: output.completedWorkflows['sync-to']?.state?.status === 'completed'
- type: javascript
  value: Object.keys(output.fileContents || {}).some(f => f.endsWith('wp-content/plugins/test_integration_wordpress-content/fields/post-recipe.php'))
- type: javascript
  value: "output.commands?.['wp plugin is-active test_integration_wordpress-content']?.exitCode === 0"
- type: javascript
  value: "output.commands?.['wp post-type get recipe']?.exitCode === 0"
- type: javascript
  value: "output.commands?.['wp eval acf_group']?.exitCode === 0"
```

  If the debo-test case format has no `commands` capture, check how `fixtures/drupal-web/cases/sync-scene-rich.yaml:45` runs `ddev drush php:script` and use that mechanism. The three commands are `ddev wp plugin is-active test_integration_wordpress-content`, `ddev wp post-type get recipe` and `ddev wp eval 'exit(acf_get_field_group("group_post_recipe") ? 0 : 1);'`.
- [ ] **Step 6: Case `sync-rerun.yaml`.** It layers on `sync`'s output and runs `sync-to` again. Assert the `resolve-filter` result `units` is empty (Review Focus 3).
- [ ] **Step 7: Run** both cases. Expected: pass. Store the evidence.
- [ ] **Step 8: `pnpm check`, then commit** `feat: generate wordpress plugin and theme via sync-to` + `ref:DESIGNBOOK-89`.

### Task 13: `seed-content` workflow (C3) and WordPress seed

**Files:**
- Create: `.agents/skills/designbook/skills/seed-content/{SKILL.md,schemas.yml,workflows/seed-content.md,rules/seed-content-intake.md}`
- Create: `.agents/skills/designbook-wordpress/seed/tasks/seed.md`
- Create: `.agents/skills/designbook-wordpress/seed/blueprints/wp-cli-seed.md`
- Create: `fixtures/wordpress-recipe/cases/seed-content.yaml`

**Interfaces:**
- Workflow `seed-content`: params `filter` (object, default `{}`); stages `seed: { steps: [seed] }`, `outtake: { steps: [outtake] }`. Mirror the sync-to step naming. Check the workflow-file rule on whether steps are namespaced `seed-content:seed`, and follow `sync-to`'s convention.
- `SeedResult`: `{ created: string[], updated: string[], ok: const true }`. Entries are `<entity_type>.<bundle>.<record id>`.
- WordPress `seed` task params:
  - `data_model`
  - `sample_data` (the files `$DESIGNBOOK_DATA/data/*.yml`)
  - `backend_cmd.seed_cmd`
- WordPress `seed` task result: `seed-script` path `$DESIGNBOOK_DATA/seed/seed.php` (generated), then run `{{ backend_cmd.seed_cmd }} <script>` and report a `SeedResult`.

- [ ] **Step 1:** Load `designbook-skill-creator` (workflow, task, schema, rule, blueprint files).
- [ ] **Step 2: Core workflow and schema** (neutral wording only: "create the sample records in the live backend").
- [ ] **Step 3: WordPress task and blueprint.** The blueprint's PHP pattern, idempotent through `_designbook_id`:

```php
<?php
function db_upsert_post(string $type, string $id, array $args, array $acf): string {
    $found = get_posts(['post_type' => $type, 'meta_key' => '_designbook_id', 'meta_value' => $id, 'numberposts' => 1, 'post_status' => 'any']);
    $postId = $found ? $found[0]->ID : 0;
    $postId = wp_insert_post(['ID' => $postId, 'post_type' => $type, 'post_status' => 'publish'] + $args, true);
    if (is_wp_error($postId)) throw new RuntimeException($postId->get_error_message());
    update_post_meta($postId, '_designbook_id', $id);
    foreach ($acf as $name => $value) update_field($name, $value, $postId);
    echo ($found ? 'updated ' : 'created ') . "$type.$id\n";
    return (string) $postId;
}
```

  Terms use `wp_insert_term`/`get_terms(['meta_key' => '_designbook_id'])` the same way. Images are sideloaded with `media_sideload_image` from the theme's local image path (`get_stylesheet_directory_uri()`), and their attachment ids are reused by `_designbook_id`. An unknown referenced term or image id makes the script throw for that record, report it, and continue. The task then reports the failed records, and `ok` is not `true` while any record failed.
- [ ] **Step 4: Case `seed-content.yaml`** (layers on `sync`'s output). It runs `seed-content` twice. Assert:
  - after the first run, `ddev wp post list --post_type=recipe --format=count` equals the number of records in `designbook/data/post.recipe.yml`
  - after the second run the count is unchanged (Review Focus 4)
  - `curl -s -o /dev/null -w '%{http_code}' <primary_url>/lemon-garlic-roasted-chicken/` is `200`; the slug is the record id from the data-model case
  - the body contains `recipe-card`
- [ ] **Step 5: Run it.** Expected: pass. Store the evidence.
- [ ] **Step 6: `pnpm check`, then commit** `feat: add backend-neutral seed-content workflow with wordpress seeding` + `ref:DESIGNBOOK-89`.

### Task 14: AC-6 neutrality check and final regression

**Files:**
- Create: `packages/storybook-addon-designbook/src/shared/__tests__/core-neutrality.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { globSync } from 'glob';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(__dirname, '../../../../..');
const FILES = [
  ...globSync('.agents/skills/designbook/**/*.{md,yml}', { cwd: REPO }),
  ...globSync('packages/storybook-addon-designbook/src/**/*.ts', { cwd: REPO, ignore: ['**/__tests__/**'] }),
];
// Reasoned exceptions only; each entry states why it is not a backend leak.
const EXCEPTIONS: Record<string, string> = {};

describe('core stays backend-neutral', () => {
  it.each([/wordpress|\bacf\b|timber|\bwp /i, /drush|cim_ok|config_sync_dir/])('no %s in core', (re) => {
    const hits = FILES.filter((f) => !EXCEPTIONS[f] && re.test(readFileSync(resolve(REPO, f), 'utf-8')));
    expect(hits).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it.** It fails while legacy Drupal mentions remain in core (`attachDrupalBehaviors` in `renderer.ts`/`csf-prep.ts`, `designbook/SKILL.md`, image_style blueprint). The second regex covers only the sync vocabulary, which Task 11 removed.
  - Fix every first-regex hit, since it is new WordPress leakage.
  - Leave existing Drupal-runtime names that are not sync vocabulary out of scope; the second regex does not match them.
  - Add each justified, reasoned exception to `EXCEPTIONS`.
- [ ] **Step 3: Run it.** Expected: PASS.
- [ ] **Step 4: Final regression.** Run `pnpm check`, then:
  - `npx debo-test run drupal-web sync-node`
  - `npx debo-test run drupal-web sync-scene-rich`
  - one drupal-web design-component case
  - one `vue-web` case (`ls fixtures/vue-web/cases`, pick the design-component case)
  - the `wordpress-recipe` cases `03-data-model`, `04-tokens`, `design-component`, `sync`, `sync-rerun`, `seed-content`

  Expected: all pass. Record command, result and commit SHA for each in the coding handoff.
- [ ] **Step 5: Commit** `test: guard core backend neutrality` + `ref:DESIGNBOOK-89`.
