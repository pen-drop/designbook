<?php
// Adapter-interface check against the generated content plugin (must be active).
// Run: ddev exec php -d zend.assertions=1 -d assert.exception=1 $(which wp) eval-file tests/registry-test.php
$dir = sys_get_temp_dir() . '/designbook-registry-' . getmypid();
foreach (['card' => "name: Card\nprops: { type: object }\n", 'icon' => "name: Icon\nui: false\nprops: { type: object }\n"] as $id => $schema) {
    @mkdir("$dir/$id", 0777, true);
    file_put_contents("$dir/$id/$id.schema.yml", $schema);
    file_put_contents("$dir/$id/$id.twig", "<i class=\"$id\">{{ label|e }}</i>");
}
add_filter('timber/locations', fn ($paths) => $paths + ['registrytest' => [$dir]]);

$r = new Designbook\ComponentRegistry($dir, 'registrytest');
assert(array_keys($r->all()) === ['card', 'icon'], 'all() lists every component');
assert($r->get('icon')->ui === false && $r->get('card')->ui === true, 'ui flag read from schema');

$registered = null;
add_action('designbook/register_components', function ($reg) use (&$registered) { $registered = array_keys($reg->ui()); });
do_action('designbook/register_components', $r);
assert($registered === ['card'], 'adapter registers only ui components');
assert($r->render('icon', ['label' => 'x']) === '<i class="icon">x</i>', 'ui: false still renders');
echo "OK\n";
