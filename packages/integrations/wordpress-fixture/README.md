# wordpress-fixture

WordPress root for `backend: wordpress` test workspaces. `scripts/setup-workspace.sh` copies it to
the workspace root and drops `test-integration-wordpress` into `wp-content/themes/`.
`scripts/start-wordpress-workspace.sh` starts DDEV (project `designbook-wp-<workspace-key>`),
installs Timber via Composer, downloads and installs WordPress (admin `admin` / `admin`),
activates Secure Custom Fields and the test theme.
