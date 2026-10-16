<?php
$elDir = $args[0];
require_once $elDir . '/src/Seed.php';
require_once $elDir . '/src/Tokens.php';

use Designbook\Elementor\Seed;
use Designbook\Elementor\Tokens;

$admins = get_users(['role' => 'administrator', 'number' => 1]);
wp_set_current_user($admins[0]->ID);

$unrelated = wp_insert_post([
    'post_type' => 'page',
    'post_status' => 'publish',
    'post_title' => 'Unrelated',
]);
assert($unrelated > 0);

$elements = [[
    'id' => substr(sha1('/0'), 0, 7),
    'elType' => 'widget',
    'widgetType' => 'heading',
    'settings' => ['title' => 'Hello seed'],
    'elements' => [],
]];

$id1 = Seed::upsert('recipes-home', $elements);
assert($id1 > 0);
assert(get_post_meta($id1, '_designbook_id', true) === 'recipes-home');
assert(get_post_meta($id1, '_elementor_edit_mode', true) === 'builder');
assert(get_post_meta($id1, '_elementor_template_type', true) === 'wp-page');
assert(get_post_meta($id1, '_elementor_version', true) === '4.3.5');
$data1 = json_decode(get_post_meta($id1, '_elementor_data', true), true);
assert($data1[0]['id'] === substr(sha1('/0'), 0, 7));
assert($data1[0]['settings']['title'] === 'Hello seed');

$id2 = Seed::upsert('recipes-home', $elements);
assert($id2 === $id1, 're-upsert keeps one page');
$pages = get_posts([
    'post_type' => 'page',
    'meta_key' => '_designbook_id',
    'meta_value' => 'recipes-home',
    'post_status' => 'any',
    'numberposts' => -1,
]);
assert(count($pages) === 1);
$data2 = json_decode(get_post_meta($id1, '_elementor_data', true), true);
assert($data2[0]['id'] === $data1[0]['id'], 'stable node ids');

assert(get_post_status($unrelated) === 'publish', 'unrelated page preserved');

$before = get_post_meta($id1, '_elementor_data', true);
try {
    Seed::upsert('recipes-home', [[
        'id' => 'badwidg',
        'elType' => 'widget',
        'widgetType' => 'not-a-real-widget-xyz',
        'settings' => [],
        'elements' => [],
    ]]);
    assert(false, 'invalid widget should throw');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'not-a-real-widget-xyz'));
}
assert(get_post_meta($id1, '_elementor_data', true) === $before, 'failed save keeps previous document');

$kit = \Elementor\Plugin::$instance->kits_manager->get_active_kit();
$kitId = $kit->get_main_id();
$settings = get_post_meta($kitId, '_elementor_page_settings', true) ?: [];
$existing = $settings['custom_colors'] ?? [];
$existing[] = ['_id' => 'keep-me', 'title' => 'Keep me', 'color' => '#abcdef'];
$settings['custom_colors'] = $existing;
update_post_meta($kitId, '_elementor_page_settings', $settings);

Tokens::mirrorKit(['brand' => '#ff3300'], ['heading' => 'Montserrat']);
$saved = get_post_meta($kitId, '_elementor_page_settings', true) ?: [];
$byId = array_column($saved['custom_colors'] ?? [], null, '_id');
assert(isset($byId['keep-me']) && $byId['keep-me']['color'] === '#abcdef', 'unrelated kit color kept');
assert(isset($byId['designbook-brand']) && $byId['designbook-brand']['color'] === '#ff3300');
$fontsById = array_column($saved['custom_typography'] ?? [], null, '_id');
assert(isset($fontsById['designbook-heading']));

$template = get_stylesheet_directory() . '/elementor-designbook.php';
assert(is_file($template) || is_file($elDir . '/page-template.php'), 'page template exists');
$src = file_get_contents(is_file($template) ? $template : $elDir . '/page-template.php');
assert(str_contains($src, 'wp_head'));
assert(str_contains($src, 'the_content'));
assert(str_contains($src, 'wp_footer'));
assert(!str_contains($src, 'the_title('), 'no extra title');

echo "OK\n";
