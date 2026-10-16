<?php
$plugin = WP_PLUGIN_DIR . '/elementor/elementor.php';
assert(is_file($plugin), 'elementor plugin file exists');
$data = get_plugin_data($plugin, false, false);
assert($data['Version'] === '4.3.5', 'pinned version 4.3.5, got ' . $data['Version']);
assert(!is_plugin_active('elementor-pro/elementor-pro.php'), 'Elementor Pro is absent');
echo "OK\n";
