<?php
/**
 * Gutenberg adapter registration checks. Run with assertions enabled:
 *   ddev exec php -d zend.assertions=1 -d assert.exception=1 /usr/local/bin/wp eval-file tests/gutenberg-registration.php
 */
$registryApi = WP_Block_Type_Registry::get_instance();
$ns = str_replace('_', '-', get_stylesheet());

$block = $registryApi->get_registered("$ns/recipe-card");
assert($block !== null, 'ui component recipe-card is registered');
assert((int) $block->api_version === 3, 'apiVersion 3');
assert(($block->attributes['servings']['type'] ?? null) === 'string', 'servings follows the recipe-card schema type');
assert(($block->attributes['title']['type'] ?? null) === 'string', 'title is a string attribute');
$inserter = $block->supports['inserter'] ?? true;
assert($inserter !== false, 'ui component remains insertable');
$category = is_array($block->category) ? ($block->category['slug'] ?? '') : (string) $block->category;
assert($category !== '', 'category is set');

assert(class_exists('Designbook\\GutenbergAdapter'), 'GutenbergAdapter is loadable');
assert(class_exists('Designbook\\ComponentRegistry'), 'ComponentRegistry is loadable');

$dir = sys_get_temp_dir() . '/designbook-gutenberg-' . getmypid();
@mkdir($dir, 0777, true);
$write = static function (string $id, string $schema, string $twig = '<span>{{ label }}</span>') use ($dir): void {
    @mkdir("$dir/$id", 0777, true);
    file_put_contents("$dir/$id/$id.schema.yml", $schema);
    file_put_contents("$dir/$id/$id.twig", $twig);
};

$write('bool-flag', "name: Bool Flag\nprops:\n  type: object\n  properties:\n    on:\n      type: boolean\n      default: false\n    count:\n      type: integer\n      default: 0\n    label:\n      type: string\n      default: \"\"\n  required: [label]\n");
$write('enum-card', "name: Enum Card\ngroup: Cards\nprops:\n  type: object\n  properties:\n    variant:\n      type: string\n      enum: [default, featured]\n    payload:\n      type: object\n");
$write('hidden-icon', "name: Hidden Icon\nui: false\nprops:\n  type: object\n  properties:\n    label:\n      type: string\n");
$write('foo_bar', "name: Foo Bar\nprops:\n  type: object\n");
$write('foo-bar', "name: Foo Bar Hyphen\nprops:\n  type: object\n");

$tempNs = 'gutenberg_temp';
$r = new Designbook\ComponentRegistry($dir, $tempNs);
$hyphenNs = str_replace('_', '-', get_stylesheet());

$priorHash = null;
$adapterFile = null;
foreach ([
    WP_CONTENT_DIR . '/plugins/test_integration_wordpress-content/gutenberg/blocks/recipe-card/block.json',
    WP_PLUGIN_DIR . '/test_integration_wordpress-content/gutenberg/blocks/recipe-card/block.json',
] as $candidate) {
    if (is_file($candidate)) {
        $priorHash = hash_file('sha256', $candidate);
        $adapterFile = $candidate;
        break;
    }
}

$threw = false;
try {
    Designbook\GutenbergAdapter::register($r);
} catch (\Throwable $e) {
    $threw = true;
    assert(str_contains($e->getMessage(), 'foo'), 'collision names the components: ' . $e->getMessage());
}
assert($threw, 'underscore/hyphen normalization collisions are rejected');
if ($adapterFile && $priorHash !== null) {
    assert(is_file($adapterFile), 'prior block.json remains after a rejected register');
    assert(hash_file('sha256', $adapterFile) === $priorHash, 'prior metadata is unchanged after a rejected register');
}

@unlink("$dir/foo-bar/foo-bar.schema.yml");
@unlink("$dir/foo-bar/foo-bar.twig");
@rmdir("$dir/foo-bar");
$r = new Designbook\ComponentRegistry($dir, $tempNs);
Designbook\GutenbergAdapter::register($r);

$bool = $registryApi->get_registered("$hyphenNs/bool-flag");
assert($bool !== null, 'synthetic bool-flag is registered');
assert(($bool->attributes['on']['type'] ?? null) === 'boolean', 'boolean attribute');
assert(array_key_exists('default', $bool->attributes['on']) && $bool->attributes['on']['default'] === false, 'false default is preserved');
assert(($bool->attributes['count']['type'] ?? null) === 'integer', 'integer attribute');
assert(array_key_exists('default', $bool->attributes['count']) && $bool->attributes['count']['default'] === 0, 'zero default is preserved');
assert(array_key_exists('default', $bool->attributes['label']) && $bool->attributes['label']['default'] === '', 'empty string default is preserved');

$enum = $registryApi->get_registered("$hyphenNs/enum-card");
assert($enum !== null, 'enum-card is registered');
$enumCategory = is_array($enum->category) ? ($enum->category['slug'] ?? '') : (string) $enum->category;
assert($enumCategory === 'cards' || $enumCategory === 'designbook-cards' || str_contains($enumCategory, 'card'), 'group-derived category: ' . $enumCategory);
assert(($enum->attributes['payload']['type'] ?? null) === 'object', 'object props stay as object attributes for JSON editing');

$hidden = $registryApi->get_registered("$hyphenNs/hidden-icon");
assert($hidden !== null, 'ui:false components are registered');
assert(($hidden->supports['inserter'] ?? true) === false, 'ui:false components are not insertable');

$slot = $registryApi->get_registered("$hyphenNs/slot");
assert($slot !== null, 'shared slot block is registered');
assert(($slot->supports['inserter'] ?? true) === false, 'slot block is not insertable');

$write('readonly-comp', "name: Readonly\nprops:\n  type: object\n  properties:\n    label:\n      type: string\n");
$gutenbergDir = dirname((new ReflectionClass('Designbook\\GutenbergAdapter'))->getFileName());
$blocker = $gutenbergDir . '/blocks/readonly-comp';
if (is_dir($blocker)) {
    foreach (glob($blocker . '/*') ?: [] as $file) {
        @unlink($file);
    }
    @rmdir($blocker);
}
@mkdir($gutenbergDir . '/blocks', 0775, true);
file_put_contents($blocker, 'not-a-dir');
$r = new Designbook\ComponentRegistry($dir, $tempNs);
$threwWrite = false;
try {
    Designbook\GutenbergAdapter::register($r);
} catch (Throwable $e) {
    $threwWrite = true;
}
@unlink($blocker);
assert(!$threwWrite, 'register does not throw when block.json cannot be written');
assert($registryApi->get_registered("$hyphenNs/readonly-comp") !== null, 'block type is registered from memory without block.json');

echo "OK\n";
