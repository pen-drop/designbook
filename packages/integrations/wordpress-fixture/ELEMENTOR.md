# Elementor pin (4.3.5)

The WordPress fixture pins **Elementor Free 4.3.5** via Composer (`wpackagist-plugin/elementor`).
Do not install `latest`. Elementor Pro is not a dependency and must stay absent.

- License: GPL v3-or-later (plugin header).
- WordPress.org ZIP: https://downloads.wordpress.org/plugin/elementor.4.3.5.zip
- Archive SHA256: `8f025581b9e425dbe0a64adbcaae955d90b23bbfc8584d90495df4fc75eae239`
- Editor: classic widgets and containers only. The Atomic Editor is unsupported.
- Nested Elements: the adapter uses `Elementor\Modules\NestedElements\Base\Widget_Nested_Base`
  and Elementor’s nested editor model/view. That is an internal API; it can change without a
  deprecation cycle.
- Diagnostics: missing Elementor, a version other than 4.3.5, or unavailable Nested Elements
  must refuse adapter registration and seed writes without a PHP fatal.
- Upgrade: bump the pin only with a fresh fixture run that covers editor save/reopen and
  frontend parity. There is no migration or repair of old generated artifacts.

`scripts/prepare-wordpress-fixture.sh` materializes `wp-content/plugins/elementor` from the lock.
`scripts/start-wordpress-workspace.sh` activates the plugin after Secure Custom Fields.
`tests/elementor-pin-test.php` asserts the header version is 4.3.5 and Pro is inactive.
