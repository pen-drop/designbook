---
params:
  group: ~
files:
  - file: $DESIGNBOOK_DATA/designbook-css-$DESIGNBOOK_FRAMEWORK_CSS/generate-{{ group }}.jsonata
    key: generate-jsonata
    validators:
      - "cmd:npx jsonata-w transform --dry-run {{ file }}"
      - "cmd:npx jsonata-w transform --dry-run {{ file }} | npx stylelint --stdin-filename output.css"
reads:
  - path: $DESIGNBOOK_DATA/design-system/design-tokens.yml
    workflow: design-tokens
---

# Generate JSONata Expression — Generic

Generates one `.jsonata` expression file for the token group specified in `params.group`, using the `css-mapping` rule provided by the active CSS framework skill.

The intake creates one item per present token group → this task runs once per group.

Write the file via stdin to the CLI:
```
designbook workflow write-file $WORKFLOW_NAME $TASK_ID --key generate-jsonata
```

## Step 1: Read the css-mapping rule

Find the `css-mapping` rule in your resolved rules. Parse the `groups:` YAML block. Look up the entry for `params.group`. It provides:

- **`prefix`** — CSS variable prefix (e.g. `color` → `--color-*`)
- **`wrap`** — CSS wrapper, used verbatim as the opening block (e.g. `@theme`, `@plugin "daisyui/theme"`)
- **`meta`** (optional) — key-value pairs emitted as bare declarations before the variables

If the group is not in the mapping, report an error and stop.

## Step 2: Generate the expression file

### Config block

The `@config` block uses paths relative to the `.jsonata` file location:

- `input`: relative path to `design-tokens.yml`
- `output`: relative path to the CSS output — derive from `$DESIGNBOOK_DIRS_CSS` relative to the `.jsonata` file location. Name the output `{group}.src.css`.

### Template

The `wrap` value from the mapping is used verbatim as the block opener. If `meta` is present, its key-value pairs are emitted as `key: value;` lines before the variables.

```jsonata
/** @config
 {
   "input": "<relative-path-to-design-tokens.yml>",
   "output": "<relative-path-to-output-css>"
 }
 */
(
  $entries := $each($."<token-group>", function($v, $k) {
    "  --<prefix>-" & $k & ": " & $v."$value" & ";"
  });
  "<wrap> {\n<meta-lines>" & $join($entries, "\n") & "\n}\n"
)
```

Where:
- `<token-group>` — `params.group`
- `<prefix>` — `prefix` value from the mapping
- `<wrap>` — `wrap` value from the mapping, used as-is
- `<meta-lines>` — if `meta` exists, emit each key-value pair as `  <key>: <value>;\n` followed by a blank line. If no `meta`, omit entirely.

### Typography with fontFamily type

For the `typography` group, only include tokens with `$type: fontFamily`. Composite typography tokens (`$type: typography`) are not CSS variables and should be skipped.

Quote font family values:
```
  --font-heading: "Space Grotesk";
```

## Step 3: Generate Theme JSONata Files

If theme files exist in `$DESIGNBOOK_DATA/design-system/themes/` **and** `params.group` is `color`, generate an additional JSONata file per theme.

For each theme file `themes/{name}.yml`, create `generate-color-theme-{name}.jsonata`:

### Config block

- `input`: relative path to `../design-system/themes/{name}.yml`
- `output`: relative path to CSS output named `color-theme-{name}.src.css`

### Template

Read the `theme_wrap` value from the `css-mapping` rule. If `theme_meta` is present, emit its key-value pairs (with `{{ name }}` and `{{ color-scheme }}` placeholders resolved from the theme file).

```jsonata
/** @config
 {
   "input": "<relative-path-to-themes/{name}.yml>",
   "output": "<relative-path-to-css>/color-theme-{name}.src.css"
 }
 */
(
  $entries := $each(color, function($v, $k) {
    "  --color-" & $k & ": " & $v."$value" & ";"
  });
  "<theme_wrap resolved> {\n<meta-lines>" & $join($entries, "\n") & "\n}\n"
)
```

Where:
- `<theme_wrap resolved>` — the `theme_wrap` value from `css-mapping` with `{{ name }}` replaced by the theme's `name`
- `<meta-lines>` — if `theme_meta` exists in the mapping, emit each entry with `{{ name }}` and `{{ color-scheme }}` resolved from the theme file's top-level keys

For Tailwind this produces `[data-theme="dark"] { ... }`. For DaisyUI this produces `@plugin "daisyui/theme" { name: dark; color-scheme: dark; ... }`.

## Step 4: Verify

Check that the `.jsonata` file was written and is non-empty. If theme JSONata files were generated, verify those as well.
