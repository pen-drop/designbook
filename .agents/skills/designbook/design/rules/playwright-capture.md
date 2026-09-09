---
name: designbook:design:playwright-capture
trigger:
  steps: [capture, re-capture, capture-backend, re-capture-backend, compare, re-compare, polish, polish-config]
---

# Screenshot capture

Write each declared PNG with `_debo reference capture-image --reference <revision-dir> --path <png>
--url <url> --selector <css-locator> --width <px> --session <name> [--steps <json>]
[--prelude <file>]`. Empty selector is the full page except on a
Storybook story, where the full subject is `#storybook-root`. `--steps`
reaches a non-rest state. A prelude makes the page observable before the
shot — dismissing consent, closing widgets, forcing lazy content.

A whole element × state × breakpoint matrix uses `_debo capture matrix
<meta.yml> --url <url> --out <dir>`. After template, scene or CSS writes,
restart with `_debo storybook start --force` before recapture.

Capture directly to the absolute screenshot path in the saved task
(`submission: direct`). Inspect the resulting image: the selected subject,
requested state and relevant overlay must be visible. On compare, recapture
and polish, a selector with no matches skips with a warning. Create the
output directory before the command. A nonzero CLI exit is the diagnosis.
