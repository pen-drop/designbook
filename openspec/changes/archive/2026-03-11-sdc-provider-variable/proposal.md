## Why

Skills and workflows use the placeholder `[provider]` for SDC component references (e.g., `'[provider]:container'`). This requires manual replacement every time, is error-prone, and makes generated Twig templates non-functional until manually fixed. The provider is always derivable from the Drupal theme directory name.

## What Changes

- Add `$DESIGNBOOK_SDC_PROVIDER` environment variable to `designbook-configuration` skill (auto-derived from `drupal.theme` basename, kebab→snake)
- Replace all `[provider]` placeholders in skill resources with `$DESIGNBOOK_SDC_PROVIDER`
- Update `component-yml.md` to document the variable instead of `[provider]`
- Update `story-yml.md` to use `$DESIGNBOOK_SDC_PROVIDER`
- Update `layout-reference.md` to use `$DESIGNBOOK_SDC_PROVIDER`

## Capabilities

### New Capabilities
- `sdc-provider-resolution`: Auto-derive SDC provider name from config and expose as environment variable

### Modified Capabilities
_None — no existing spec requirements change._

## Impact

- `designbook-configuration` skill: new env variable in `set-env.sh` and `load-config.cjs`
- `designbook-components-sdc` skill: 3 resource files updated
- Generated Twig files will use the resolved provider directly
- No breaking changes — `[provider]` was already a placeholder requiring manual intervention
