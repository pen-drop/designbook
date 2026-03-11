## Approach

Auto-derive the SDC provider from `drupal.theme` config value:

```
drupal.theme = "packages/integrations/test-integration-drupal"
                                        ─────────────────────
                                           basename()
                                              ↓
                                 "test-integration-drupal"
                                              ↓
                                        replace(-, _)
                                              ↓
                                 "test_integration_drupal"
                                              ↓
                                 $DESIGNBOOK_SDC_PROVIDER
```

## Implementation

### 1. `set-env.sh` — derive and export

After the existing dynamic export loop, add:

```bash
# Derive SDC provider from DESIGNBOOK_DRUPAL_THEME
if [ -n "$DESIGNBOOK_DRUPAL_THEME" ]; then
  export DESIGNBOOK_SDC_PROVIDER="$(basename "$DESIGNBOOK_DRUPAL_THEME" | tr '-' '_')"
fi
```

### 2. `load-config.cjs` — add to JS config

Add `sdcProvider` to the returned config object:

```javascript
const themePath = config.drupal?.theme || '';
config.sdcProvider = path.basename(themePath).replace(/-/g, '_');
```

### 3. Skill resources — replace `[provider]`

In `component-yml.md`, `story-yml.md`, and `layout-reference.md`:
- Replace all `[provider]` with `$DESIGNBOOK_SDC_PROVIDER` in documentation text
- In code examples (YAML/Twig), keep literal values since those are generated at build time

### 4. SKILL.md rules

Add a rule to `designbook-components-sdc/SKILL.md` stating:
> When generating component files, resolve `$DESIGNBOOK_SDC_PROVIDER` from config and use the actual value in Twig includes and story component references.

## Decisions

- **No config key needed** — provider is always `basename(drupal.theme)` with `-` → `_`
- **Twig uses literal values** — Twig can't read env vars, so generated files get the resolved value baked in
- **Skills use the variable name** — documentation references `$DESIGNBOOK_SDC_PROVIDER` so the agent knows to resolve it
