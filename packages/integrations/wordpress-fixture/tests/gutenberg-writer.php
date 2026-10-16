<?php
/**
 * Gutenberg layout writer and seed-identity checks. Run with assertions enabled:
 *   ddev exec php -d zend.assertions=1 -d assert.exception=1 /usr/local/bin/wp eval-file tests/gutenberg-writer.php
 */
$ns = str_replace('_', '-', get_stylesheet());
$theme = get_stylesheet_directory();
$components = $theme . '/components';

assert(method_exists('Designbook\\GutenbergAdapter', 'seedBlocks'), 'seedBlocks upserts serialized block content');
assert(method_exists('Designbook\\GutenbergAdapter', 'makeBlock'), 'makeBlock builds serialize_blocks input');
assert(method_exists('Designbook\\GutenbergAdapter', 'writeBlockTheme'), 'writeBlockTheme emits file-based templates');
assert(method_exists('Designbook\\GutenbergAdapter', 'templateOverrideReport'), 'templateOverrideReport names Site Editor overrides');

$registry = new Designbook\ComponentRegistry($components, get_stylesheet());
Designbook\GutenbergAdapter::register($registry);

$card = static function (string $title) use ($ns): array {
    return Designbook\GutenbergAdapter::makeBlock("$ns/recipe-card", [
        'image_src' => '/images/recipe-card-chicken.png',
        'image_alt' => '',
        'title' => $title,
        'description' => '',
        'total_time' => '',
        'difficulty' => '',
        'servings' => '',
        'url' => '',
    ]);
};

$quoted = 'Say "hello" \\world';
$blocks = [
    Designbook\GutenbergAdapter::makeBlock("$ns/slot-card", ['heading' => $quoted], [
        Designbook\GutenbergAdapter::makeBlock("$ns/slot", ['name' => 'left', 'title' => 'Left'], [
            $card('Left slot heading'),
        ]),
        Designbook\GutenbergAdapter::makeBlock("$ns/slot", ['name' => 'right', 'title' => 'Right'], [
            $card('Right slot heading'),
        ]),
    ]),
];

$round = parse_blocks(serialize_blocks($blocks));
assert(($round[0]['attrs'] ?? []) === $blocks[0]['attrs'], 'serialize_blocks round-trips attributes');

$unmanagedId = wp_insert_post([
    'post_title' => 'Unmanaged page',
    'post_status' => 'publish',
    'post_type' => 'page',
    'post_content' => 'leave this alone',
]);
$unmanagedBefore = get_post($unmanagedId)->post_content;

$firstPostId = Designbook\GutenbergAdapter::seedBlocks('page.recipes.home', $blocks);
$secondPostId = Designbook\GutenbergAdapter::seedBlocks('page.recipes.home', $blocks);
assert($firstPostId === $secondPostId, 'repeated seed updates the same post');
assert($firstPostId > 0, 'seed returns a post id');

$managed = get_posts([
    'post_type' => 'page',
    'meta_key' => '_designbook_id',
    'meta_value' => 'page.recipes.home',
    'numberposts' => -1,
    'post_status' => 'any',
    'fields' => 'ids',
]);
assert(count($managed) === 1, 'managed post count stays 1');

$stored = get_post($firstPostId)->post_content;
$parsedStored = parse_blocks($stored);
assert(($parsedStored[0]['attrs']['heading'] ?? null) === $quoted, 'quotes and backslashes survive wp_slash');
assert(str_contains($stored, 'Left slot heading'), 'seeded markup keeps nested cards');

$unmanagedAfter = get_post($unmanagedId)->post_content;
assert($unmanagedAfter === $unmanagedBefore, 'unmanaged content is unchanged');

$existingTitle = get_post($firstPostId)->post_title;
$failed = false;
try {
    Designbook\GutenbergAdapter::seedBlocks('page.recipes.home', [
        Designbook\GutenbergAdapter::makeBlock("$ns/does-not-exist", ['title' => 'nope']),
    ]);
} catch (Throwable $e) {
    $failed = true;
}
assert($failed, 'unknown block reference fails');
assert(get_post($firstPostId)->post_title === $existingTitle, 'failed seed preserves the existing record');
assert(get_post($firstPostId)->post_content === $stored, 'failed seed preserves stored markup');

Designbook\GutenbergAdapter::writeBlockTheme();
assert(wp_is_block_theme(), 'file-based templates make a block theme');
$pageTpl = file_get_contents("$theme/templates/page.html");
assert(substr_count($pageTpl, 'wp:post-content') === 1, 'core/post-content appears once');
assert(is_file("$theme/templates/index.html"), 'index.html exists');
assert(is_file("$theme/parts/header.html") && is_file("$theme/parts/footer.html"), 'shell parts exist');
assert(!is_dir("$theme/patterns"), 'no generated patterns directory');

$themeSlug = get_stylesheet();
$overrideId = wp_insert_post([
    'post_type' => 'wp_template',
    'post_status' => 'publish',
    'post_name' => 'page',
    'post_title' => 'Page',
    'post_content' => '<!-- wp:paragraph --><p>site editor override</p><!-- /wp:paragraph -->',
]);
wp_set_object_terms($overrideId, $themeSlug, 'wp_theme');
$report = Designbook\GutenbergAdapter::templateOverrideReport();
assert(str_contains($report, 'page'), 'existing wp_template override is reported: ' . $report);
assert(get_post($overrideId)->post_content !== '', 'override is not deleted');
$resolved = null;
foreach (get_block_templates(['theme' => $themeSlug], 'wp_template') as $tpl) {
    if (($tpl->slug ?? '') === 'page') {
        $resolved = $tpl;
        break;
    }
}
assert($resolved !== null, 'page template is resolvable after override');
assert(str_contains((string) ($resolved->content ?? ''), 'site editor override'), 'Site Editor override is the selected page template');
wp_delete_post($overrideId, true);

$html = do_blocks($stored);
assert(str_contains($html, 'Left slot heading') && str_contains($html, 'Right slot heading'), 'seeded page renders both slots');

echo "OK\n";
