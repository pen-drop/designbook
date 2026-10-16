<?php
require $argv[1];
use Designbook\Elementor\Controls;

$schema = [
  'type' => 'object',
  'required' => ['title'],
  'properties' => [
    'title' => ['type' => 'string', 'title' => 'Title'],
    'featured' => ['type' => 'boolean', 'default' => false],
    'count' => ['type' => 'integer', 'default' => 0],
    'href' => ['type' => 'string', 'format' => 'uri'],
    'tone' => ['type' => 'string', 'enum' => ['quiet', 'loud']],
    'meta' => ['type' => 'object'],
  ],
];
$controls = Controls::map($schema);
$byId = array_column($controls, null, 'id');
assert($byId['title']['type'] === 'text');
assert($byId['featured']['type'] === 'switcher');
assert($byId['count']['type'] === 'number');
assert($byId['href']['type'] === 'url');
assert($byId['tone']['type'] === 'select' && $byId['tone']['options'] === ['quiet' => 'quiet', 'loud' => 'loud']);
assert($byId['meta']['type'] === 'textarea');

$decoded = Controls::decode([
  'title' => 'Hello',
  'featured' => '',
  'count' => '0',
  'href' => ['url' => 'https://example.com', 'is_external' => ''],
  'tone' => 'quiet',
  'meta' => '{"a":1}',
], $schema);
assert($decoded['featured'] === false);
assert($decoded['count'] === 0);
assert($decoded['href'] === 'https://example.com');
assert($decoded['meta'] === ['a' => 1]);

try {
    Controls::validate(['featured' => false], $schema);
    assert(false, 'missing title');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'title'));
}

try {
    Controls::validate(['title' => 'x', 'href' => 'javascript:alert(1)'], $schema);
    assert(false, 'bad uri');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'href'));
}

try {
    Controls::map(['properties' => ['x' => ['oneOf' => []]]]);
    assert(false, 'unsupported');
} catch (InvalidArgumentException $e) {
    assert(str_contains($e->getMessage(), 'x'));
}

echo "OK\n";
