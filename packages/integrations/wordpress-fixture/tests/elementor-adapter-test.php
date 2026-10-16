<?php
$elDir = $args[0];
$registryFile = $args[1];
require_once ABSPATH . 'vendor/autoload.php';
require_once $registryFile;
foreach (['Controls.php', 'LeafWidget.php', 'NestedWidget.php', 'Plugin.php'] as $file) {
    require_once $elDir . '/src/' . $file;
}

use Designbook\ComponentDefinition;
use Designbook\ComponentRegistry;
use Designbook\Elementor\Plugin;
use Timber\Timber;

assert(str_contains(Plugin::supportError('4.4.0'), '4.4.0'), 'version helper refuses 4.4.0');

$dir = sys_get_temp_dir() . '/designbook-elementor-' . getmypid();
@mkdir("$dir/card", 0777, true);
@mkdir("$dir/stack", 0777, true);
@mkdir("$dir/icon", 0777, true);
file_put_contents("$dir/card/card.twig", '<div class="card">{{ title|e }}</div>');
file_put_contents("$dir/stack/stack.twig", '<div class="stack">{{ media }}{{ body }}</div>');
file_put_contents("$dir/icon/icon.twig", '<i class="icon"></i>');

Timber::init();
add_filter('timber/locations', fn ($paths) => $paths + ['demo' => [$dir]]);
add_filter('timber/twig/environment/options', fn ($o) => ['autoescape' => false] + $o);

$registry = new ComponentRegistry($dir, 'demo');
$defs = [
    'card' => new ComponentDefinition(
        'card',
        'Card',
        ['type' => 'object', 'required' => ['title'], 'properties' => ['title' => ['type' => 'string', 'title' => 'Title']]],
        [],
        true,
        null,
    ),
    'stack' => new ComponentDefinition(
        'stack',
        'Stack',
        ['type' => 'object', 'properties' => []],
        ['media' => ['title' => 'Media'], 'body' => ['title' => 'Body']],
        true,
        'Layout',
    ),
    'icon' => new ComponentDefinition('icon', 'Icon', ['type' => 'object'], [], false, null),
];
$ref = new ReflectionClass($registry);
$prop = $ref->getProperty('definitions');
$prop->setAccessible(true);
$prop->setValue($registry, $defs);

$pluginRef = new ReflectionClass(Plugin::class);
foreach (['widgetsRegistered' => false, 'registry' => null] as $name => $value) {
    $p = $pluginRef->getProperty($name);
    $p->setAccessible(true);
    $p->setValue(null, $value);
}

Plugin::boot('demo', $elDir);
do_action('designbook/register_components', $registry);

$wm = \Elementor\Plugin::$instance->widgets_manager;
assert($wm->get_widget_types('db_demo_card') instanceof \Elementor\Widget_Base, 'card registered');
assert($wm->get_widget_types('db_demo_stack') instanceof \Elementor\Widget_Base, 'stack registered');
assert($wm->get_widget_types('db_demo_icon') === null, 'icon not in palette');

$card = $wm->get_widget_types('db_demo_card');
$controls = $card->get_controls();
assert(isset($controls['title']), 'card title control');
foreach (array_keys($controls) as $id) {
    assert(
        !preg_match('/color|padding|typography/i', $id),
        "adapter widget has presentation control $id"
    );
}

$cardEl = \Elementor\Plugin::$instance->elements_manager->create_element_instance([
    'id' => 'c0card0',
    'elType' => 'widget',
    'widgetType' => 'db_demo_card',
    'settings' => ['title' => 'Hello'],
]);
ob_start();
$cardEl->print_element();
$cardHtml = ob_get_clean();
$expectedCard = $registry->render('card', ['title' => 'Hello']);
assert(str_contains($cardHtml, $expectedCard), 'card render matches Timber');

$stackEl = \Elementor\Plugin::$instance->elements_manager->create_element_instance([
    'id' => 's0stack',
    'elType' => 'widget',
    'widgetType' => 'db_demo_stack',
    'settings' => [],
    'elements' => [
        [
            'id' => 'slotmed',
            'elType' => 'container',
            'isInner' => true,
            'settings' => ['designbook_slot' => 'media', '_title' => 'Media'],
            'elements' => [[
                'id' => 'htmlmed',
                'elType' => 'widget',
                'widgetType' => 'html',
                'settings' => ['html' => 'MEDIA_MARK'],
            ]],
        ],
        [
            'id' => 'slotbod',
            'elType' => 'container',
            'isInner' => true,
            'settings' => ['designbook_slot' => 'body', '_title' => 'Body'],
            'elements' => [[
                'id' => 'htmlbod',
                'elType' => 'widget',
                'widgetType' => 'html',
                'settings' => ['html' => 'BODY_MARK'],
            ]],
        ],
    ],
]);
ob_start();
$stackEl->print_element();
$stackHtml = ob_get_clean();
$mediaPos = strpos($stackHtml, 'MEDIA_MARK');
$bodyPos = strpos($stackHtml, 'BODY_MARK');
assert($mediaPos !== false && $bodyPos !== false, 'stack slot html present');
assert($mediaPos < $bodyPos, 'stack slot order media then body');

foreach (glob($elDir . '/src/*.php') ?: [] as $file) {
    $src = file_get_contents($file);
    assert(!str_contains($src, 'schema.yml'), basename($file) . ' must not read schema.yml');
    assert(!preg_match('/glob\s*\([^)]*components/', $src), basename($file) . ' must not scan components/');
}

\Elementor\Plugin::$instance->editor->set_edit_mode(true);
$container = \Elementor\Plugin::$instance->elements_manager->create_element_instance([
    'id' => 'c0proto',
    'elType' => 'container',
    'settings' => [],
]);
$stackRef = new ReflectionClass(\Elementor\Controls_Stack::class);
$dataProp = $stackRef->getProperty('data');
$dataProp->setAccessible(true);
$dataProp->setValue($container, ['id' => 'c0proto', 'elType' => 'container', 'settings' => null]);
try {
    Plugin::stripSlotContainerStyle($container);
} catch (\Throwable $e) {
    assert(false, 'stripSlotContainerStyle must not throw when settings are null: ' . $e->getMessage());
}
\Elementor\Plugin::$instance->editor->set_edit_mode(false);

$tplPost = wp_insert_post([
    'post_type' => 'page',
    'post_status' => 'publish',
    'post_title' => 'template-keep',
]);
update_post_meta($tplPost, '_designbook_id', 'template-keep');
update_post_meta($tplPost, '_wp_page_template', 'elementor-designbook.php');
$doc = \Elementor\Plugin::$instance->documents->get($tplPost);
$doc->save([
    'settings' => ['post_status' => 'publish', 'template' => 'default'],
    'elements' => [],
]);
assert(
    get_post_meta($tplPost, '_wp_page_template', true) === 'elementor-designbook.php',
    'elementor save keeps designbook page template, got ' . get_post_meta($tplPost, '_wp_page_template', true)
);

echo "OK\n";
