<?php
// Run inside WordPress: ddev exec php -d zend.assertions=1 -d assert.exception=1 $(which wp) eval-file <this file>
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/ComponentRegistry.php';
$dir = get_stylesheet_directory() . '/components';
$r = new Designbook\ComponentRegistry($dir, get_stylesheet());
$all = $r->all();
assert(isset($all['recipe-card']), 'recipe-card registered');
assert($all['recipe-card']->props['type'] === 'object', 'props schema loaded');
$seen = [];
add_action('designbook/register_components', function ($reg) use (&$seen) { $seen = array_keys($reg->all()); });
do_action('designbook/register_components', $r);
assert($seen === array_keys($all), 'adapter receives all definitions');
$story = Symfony\Component\Yaml\Yaml::parseFile("$dir/recipe-card/recipe-card.default.story.yml");
$html = $r->render('recipe-card', $story['props'] ?? [], []);
file_put_contents(getenv('SNAPSHOT_OUT') ?: '/tmp/recipe-card.html', $html);
echo "OK\n";
