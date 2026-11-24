# Test an extension

Prove a contribution appears when selected and stays structurally valid. Use existing debo-test fixtures; do not invent a new production fixture for a documentation check.

**You need:** the internal `designbook-test` skill (hidden from the skills CLI unless `INSTALL_INTERNAL_SKILLS=1`), a committed fixture such as `fixtures/drupal-stitch` or `fixtures/vue-storybook`, and the built addon CLI.

1. Run structural intake against the fixture that enables the contribution, then against one that does not.

**AI prompt**

```text
Using the built CLI, run intake extract-reference --palette on fixtures/drupal-stitch
and on fixtures/drupal-petshop. Report whether stitch-import is present only on stitch.
Do not modify the fixtures.
```

**Shell**

```bash
npx storybook-addon-designbook intake extract-reference --config-dir fixtures/drupal-stitch --palette
npx storybook-addon-designbook intake extract-reference --config-dir fixtures/drupal-petshop --palette
```

Expect Stitch rules only on the stitch fixture. That is the observable config effect.

2. For a saved workflow case, use debo-test `run` with an existing Promptfoo fixture. The `run` sub-skill sets up a fresh workspace and executes one saved document. Follow `.agents/skills/designbook-test/skills/run/`. Do not author a new integration test fixture only to document the command.

3. After editing a guarded skill file, load skill-creator and run its validator (`resources/validate.md`) on the changed paths.

**Done when:** palette or `config` output shows the contribution with the extension on and omits it with the extension off, and any edited skill files pass the creator checks.

`debo-test` also owns `verify`, `research`, `is-clear`, and `experiment`. Those are training and audit flows, not first-use onboarding.
