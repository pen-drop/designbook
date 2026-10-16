<?php
$elDir = null;
if (isset($args[0]) && is_string($args[0])) {
    $elDir = $args[0];
} elseif (isset($argv[1]) && is_string($argv[1])) {
    $elDir = $argv[1];
} else {
    $elDir = dirname(__DIR__, 4) . '/.agents/skills/designbook-wordpress/sync/templates/elementor';
}
$files = array_merge(
    glob($elDir . '/src/*.php') ?: [],
    glob($elDir . '/*.php') ?: [],
);
assert($files !== [], 'adapter PHP templates exist');

$sawRegistry = false;
foreach ($files as $file) {
    $src = file_get_contents($file);
    $base = basename($file);
    assert(!str_contains($src, 'schema.yml'), "$base must not read schema.yml");
    assert(!preg_match('/glob\s*\([^)]*components/', $src), "$base must not scan components/");
    if (str_contains($src, 'ComponentRegistry')) {
        $sawRegistry = true;
    }
}
assert($sawRegistry, 'adapter PHP references ComponentRegistry');

$docs = null;
foreach ([dirname(__DIR__) . '/ELEMENTOR.md', __DIR__ . '/../ELEMENTOR.md'] as $candidate) {
    if (is_file($candidate)) {
        $docs = $candidate;
        break;
    }
}
assert($docs !== null, 'ELEMENTOR.md exists');
$md = file_get_contents($docs);
assert(str_contains($md, '4.3.5'), 'docs pin 4.3.5');
assert(str_contains($md, 'classic'), 'docs name classic editor');
assert(str_contains($md, 'Nested Elements'), 'docs name Nested Elements');
assert(str_contains($md, 'Pro'), 'docs name Pro absence');
assert(str_contains($md, 'SHA256'), 'docs record dist hash');

$rule = null;
foreach ([
    dirname($elDir, 2) . '/rules/elementor-support.md',
    dirname(__DIR__, 4) . '/.agents/skills/designbook-wordpress/sync/rules/elementor-support.md',
] as $candidate) {
    if (is_file($candidate)) {
        $rule = $candidate;
        break;
    }
}
assert($rule !== null, 'elementor-support rule exists');
$ruleBody = file_get_contents($rule);
assert(!str_contains($ruleBody, '4.3.5'), 'support rule has no pin version');
assert(str_contains($ruleBody, 'fresh fixture'), 'support rule names bump as a fresh fixture run');

echo "OK\n";
