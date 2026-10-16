# Elementor pin

Current supported build. Procedure: `.agents/skills/designbook-wordpress/sync/rules/elementor-support.md`.

- Product: Elementor Free. License: GPL v3-or-later (plugin header). Pro stays absent.
- Version: `4.3.5`
- Dist: https://downloads.wordpress.org/plugin/elementor.4.3.5.zip
- SHA256: `8f025581b9e425dbe0a64adbcaae955d90b23bbfc8584d90495df4fc75eae239`
- Editor: classic widgets and containers. Atomic Editor unsupported.
- Nested Elements: `Elementor\Modules\NestedElements\Base\Widget_Nested_Base` and the nested editor model/view (internal API).
- Fixture Composer: `wpackagist-plugin/elementor` at the version above.
- Materialize: `scripts/prepare-wordpress-fixture.sh` (plugin dir present). Activate after SCF: `scripts/start-wordpress-workspace.sh`.
- Check: `tests/elementor-pin-test.php` (header version matches the pin, Pro inactive).
- Seeded pages keep theme template `elementor-designbook.php` after Elementor document save so the classic editor can attach its preview.
