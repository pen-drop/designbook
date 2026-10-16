<?php
require $argv[1];
use Designbook\Elementor\Document;

function db_find_slot(array $els, string $key): ?array
{
    foreach ($els as $el) {
        if (($el['settings']['designbook_slot'] ?? null) === $key) {
            return $el;
        }
        $found = db_find_slot($el['elements'] ?? [], $key);
        if ($found) {
            return $found;
        }
    }
    return null;
}

function db_find_type(array $els, string $widgetType): array
{
    $out = [];
    foreach ($els as $el) {
        if (($el['widgetType'] ?? null) === $widgetType) {
            $out[] = $el;
        }
        $out = array_merge($out, db_find_type($el['elements'] ?? [], $widgetType));
    }
    return $out;
}

function db_ids(array $els): array
{
    $ids = [];
    foreach ($els as $el) {
        $ids[] = $el['id'];
        $ids = array_merge($ids, db_ids($el['elements'] ?? []));
    }
    return $ids;
}

$definitions = [
    'heading' => [
        'id' => 'heading',
        'ui' => true,
        'slots' => [],
    ],
    'card' => [
        'id' => 'card',
        'ui' => true,
        'slots' => [
            'title' => ['title' => 'Title'],
        ],
    ],
    'stack' => [
        'id' => 'stack',
        'ui' => true,
        'slots' => [
            'media' => ['title' => 'Media'],
            'body' => ['title' => 'Body'],
            'aside' => ['title' => 'Aside'],
        ],
    ],
    'icon' => [
        'id' => 'icon',
        'ui' => false,
        'slots' => [],
    ],
];

$ns = 'demo';
$items = [
    [
        'component' => 'stack',
        'props' => ['gap' => 8],
        'slots' => [
            'media' => [
                [
                    'type' => 'image',
                    'src' => '/images/hero.png',
                    'attributes' => ['alt' => 'Hero'],
                ],
            ],
            'body' => [
                [
                    'component' => 'heading',
                    'props' => ['title' => 'Hello'],
                ],
                [
                    'component' => 'card',
                    'props' => ['title' => 'Nested'],
                    'slots' => [
                        'title' => [
                            [
                                'type' => 'element',
                                'tag' => 'span',
                                'value' => 'Inner',
                                'attributes' => ['class' => 'kicker'],
                            ],
                        ],
                    ],
                ],
            ],
        ],
    ],
];

$elements = Document::fromScene($items, $definitions, $ns);

$stacks = db_find_type($elements, 'db_demo_stack');
assert(count($stacks) === 1, 'one stack widget');
$stack = $stacks[0];
assert($stack['elType'] === 'widget');
assert($stack['settings']['gap'] === 8);
assert($stack['id'] === substr(sha1('/0'), 0, 7));

$media = db_find_slot($stack['elements'], 'media');
$body = db_find_slot($stack['elements'], 'body');
$aside = db_find_slot($stack['elements'], 'aside');
assert($media['elType'] === 'container' && $media['isInner'] === true);
assert($media['settings']['_title'] === 'Media');
assert($body['settings']['_title'] === 'Body');
assert($aside['settings']['_title'] === 'Aside');
assert($aside['elements'] === [], 'empty slot still emitted');

$images = array_values(array_filter(
    $media['elements'],
    fn ($el) => isset($el['settings']['src']) || isset($el['settings']['image']['url'])
));
assert(count($images) === 1, 'image node kept');
$src = $images[0]['settings']['src'] ?? $images[0]['settings']['image']['url'];
assert($src === '/images/hero.png', 'image src kept');
assert(($images[0]['settings']['attributes']['alt'] ?? null) === 'Hero');

$headings = db_find_type($body['elements'], 'db_demo_heading');
assert(count($headings) === 1);
assert($headings[0]['settings']['title'] === 'Hello');

$cards = db_find_type($body['elements'], 'db_demo_card');
assert(count($cards) === 1);
$titleSlot = db_find_slot($cards[0]['elements'], 'title');
assert($titleSlot !== null, 'nested slot');
$inner = $titleSlot['elements'][0];
assert(($inner['settings']['value'] ?? null) === 'Inner');
assert(($inner['settings']['tag'] ?? null) === 'span');
assert(($inner['settings']['attributes']['class'] ?? null) === 'kicker');

$ids = db_ids($elements);
assert(count($ids) === count(array_unique($ids)), 'element ids unique');

try {
    Document::fromScene([['component' => 'nope']], $definitions, $ns);
    assert(false, 'unknown component');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'nope'));
}

try {
    Document::fromScene([[
        'component' => 'heading',
        'slots' => ['ghost' => []],
    ]], $definitions, $ns);
    assert(false, 'unknown slot');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'ghost'));
}

try {
    Document::fromScene([['component' => 'icon']], $definitions, $ns);
    assert(false, 'ui false palette');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'icon') || str_contains($e->getMessage(), 'ui'));
}

try {
    Document::fromScene([
        ['_designbook_id' => 'dup', 'component' => 'heading'],
        ['_designbook_id' => 'dup', 'component' => 'heading'],
    ], $definitions, $ns);
    assert(false, 'duplicate designbook id');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'dup') || str_contains($e->getMessage(), '_designbook_id'));
}

echo "OK\n";
