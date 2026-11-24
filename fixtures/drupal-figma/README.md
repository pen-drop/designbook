# Figma fixtures

The existing extract-reference cases use synthetic capture evidence. The
`saas-canvas` case is the real SaaS Website UI Kit demo captured from Figma file
`ErxLeXHIKYIBLlu0L4HUCY` (page 1:2, hero 28:1211, product 14:615, pricing 28:1209).
It includes the captured reference, local assets/fonts, tokens, components and
completed screen. Rebuilding this snapshot does not require Figma MCP access.

The screen wraps `canvas_page.landing_page.full` in the SaaS shell. Its
`components` field holds an inline tree; the Canvas mapping passes that tree
through. `node.feature` and `node.pricing_plan` are separate field-mapping examples,
not entity references inside Canvas. There is no `node.landing` or root Homepage.
The fixture seed removes the integration template's generic demo section and unused
`card`, `disclosure` and `plain` components. The 15 SDC components used by the
Figma demo retain their Twig templates, schemas and individual stories.

## Rebuild

Run from the repository root after installing the repository dependencies:

```bash
./scripts/setup-workspace.sh drupal-figma --into /tmp/designbook-figma
./scripts/setup-test.sh drupal-figma saas-canvas --into /tmp/designbook-figma
node fixtures/drupal-figma/verify-canvas.mjs /tmp/designbook-figma/web/themes/custom/test_integration_drupal
(cd /tmp/designbook-figma/web/themes/custom/test_integration_drupal && pnpm build-storybook)
(cd /tmp/designbook-figma && npx storybook-addon-designbook storybook start)
(cd /tmp/designbook-figma && npx storybook-addon-designbook storybook status)
```

Open the URL returned by status with
`/?path=/story/designbook-sections-saas-demo-scenes--landing`.

For another clean fixture build, stop Storybook, repeat `setup-test.sh`, the
verification and build commands, then start Storybook again. `setup-test.sh`
resets the disposable theme repository: keep your own work elsewhere.
To recreate the entire environment, repeat both setup commands.

`verify-canvas.mjs` checks the Canvas model and root, inline tree, local assets,
component presence and JSONata mappings. The case prompt can also be passed to
the existing debo-test runner for an agent-driven design-screen rebuild; a
static fixture build is not an agent evaluation.

## Verified

Fresh standalone workspace setup, reference validation at the new location,
two fixture layer/build cycles, and desktop/mobile rendering. Mobile width:
390 px, document width: 390 px, no broken images.

This is the hero/product/pricing demo scope, not every section of the original
long Figma page. Drupal sync and a new Promptfoo agent run were not exercised.
