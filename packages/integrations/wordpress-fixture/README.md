# wordpress-fixture

WordPress root for `backend: wordpress` test workspaces, the counterpart of `drupal-fixture`.

- Committed: `.ddev/config.yaml`, `composer.json` + `composer.lock` (Timber, Secure Custom Fields
  via wpackagist) and `db.sql.gz` — a bare WordPress (core installed, admin `admin` / `admin`,
  permalinks `/%postname%/`, site URL `https://designbook-wp.ddev.site`).
- Gitignored, materialized once by `scripts/prepare-wordpress-fixture.sh`: WordPress core (pinned
  version), `vendor/` and `wp-content/plugins/`.

`scripts/setup-workspace.sh` copies this tree to the workspace root and drops
`test-integration-wordpress` into `wp-content/themes/`. `scripts/start-wordpress-workspace.sh`
starts DDEV, imports `db.sql.gz`, rewrites the URL, activates the test theme and Secure Custom
Fields and builds the theme CSS — no downloads or installs at start.

Regenerate the dump after changing the baseline: start the fixture project, reset and
`wp core install` with the values above, set the permalink structure, `ddev export-db --file=db.sql.gz`.
