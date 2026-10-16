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

foreach (['page', 'post'] as $staleType) {
    foreach (get_posts([
        'post_type' => $staleType,
        'meta_key' => '_designbook_id',
        'meta_value' => 'page.recipes.home',
        'numberposts' => -1,
        'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
        'fields' => 'ids',
    ]) as $staleId) {
        wp_delete_post((int) $staleId, true);
    }
}

$unmanagedId = wp_insert_post([
    'post_title' => 'Unmanaged page',
    'post_status' => 'publish',
    'post_type' => 'page',
    'post_content' => 'leave this alone',
]);
$unmanagedBefore = get_post($unmanagedId)->post_content;

$firstPostId = Designbook\GutenbergAdapter::seedBlocks('page.recipes.home', $blocks);
wp_update_post(['ID' => $firstPostId, 'post_title' => 'Kept title', 'post_name' => 'kept-slug', 'post_status' => 'draft']);
$secondPostId = Designbook\GutenbergAdapter::seedBlocks('page.recipes.home', $blocks);
assert($firstPostId === $secondPostId, 'repeated seed updates the same post');
assert($firstPostId > 0, 'seed returns a post id');
$updated = get_post($firstPostId);
assert($updated->post_title === 'Kept title', 'seed update preserves title');
assert($updated->post_name === 'kept-slug', 'seed update preserves slug');
assert($updated->post_status === 'draft', 'seed update preserves status');

$managed = get_posts([
    'post_type' => 'page',
    'meta_key' => '_designbook_id',
    'meta_value' => 'page.recipes.home',
    'numberposts' => -1,
    'post_status' => ['publish', 'draft', 'pending', 'private', 'future'],
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

assert(is_file("$theme/templates/page.html"), 'sync unit wrote page.html');
assert(substr_count((string) file_get_contents("$theme/templates/page.html"), 'wp:post-content') === 1, 'core/post-content appears once');
assert(is_file("$theme/parts/header.html") && is_file("$theme/parts/footer.html"), 'shell parts exist');

$html = do_blocks($stored);
assert(str_contains($html, 'Left slot heading') && str_contains($html, 'Right slot heading'), 'seeded page renders both slots');

echo "OK\n";
