<?php
/**
 * Gutenberg adapter render, slot and preview checks. Run with assertions enabled:
 *   ddev exec php -d zend.assertions=1 -d assert.exception=1 /usr/local/bin/wp eval-file tests/gutenberg-render.php
 */
$ns = str_replace('_', '-', get_stylesheet());
$dir = sys_get_temp_dir() . '/designbook-gutenberg-render-' . getmypid();
@mkdir($dir, 0777, true);
$write = static function (string $id, string $schema, string $twig) use ($dir): void {
    @mkdir("$dir/$id", 0777, true);
    file_put_contents("$dir/$id/$id.schema.yml", $schema);
    file_put_contents("$dir/$id/$id.twig", $twig);
};

$write('slot-card', <<<'YML'
name: Slot Card
group: Layout
props:
  type: object
  properties:
    heading:
      type: string
      title: Heading
      default: ''
slots:
  left:
    title: Left
  right:
    title: Right
YML, <<<'TWIG'
<section class="slot-card">
  {% if heading %}<h2>{{ heading|e }}</h2>{% endif %}
  <div class="slot-card__left">{{ left }}</div>
  <div class="slot-card__right">{{ right }}</div>
</section>
TWIG);

$write('link-box', <<<'YML'
name: Link Box
props:
  type: object
  properties:
    href:
      type: string
      format: uri
    count:
      type: integer
    label:
      type: string
    payload:
      type: object
YML, '<a href="{{ href|e }}">{{ label|e }} {{ count|e }}</a>');

$recipeSrc = get_stylesheet_directory() . '/components/recipe-card';
if (is_dir($recipeSrc)) {
    @mkdir("$dir/recipe-card", 0777, true);
    foreach (glob($recipeSrc . '/*') ?: [] as $file) {
        if (is_file($file)) {
            copy($file, "$dir/recipe-card/" . basename($file));
        }
    }
}

$registry = new Designbook\ComponentRegistry($dir, get_stylesheet());
Designbook\GutenbergAdapter::register($registry);

$admins = get_users(['role' => 'administrator', 'number' => 1]);
assert($admins !== [], 'an administrator exists');
$adminId = (int) $admins[0]->ID;
wp_set_current_user($adminId);

$cardAttrs = static function (string $title): array {
    return [
        'image_src' => '/images/recipe-card-chicken.png',
        'image_alt' => '',
        'title' => $title,
        'description' => '',
        'total_time' => '',
        'difficulty' => '',
        'servings' => '',
        'url' => '',
    ];
};

$comment = static function (string $name, array $attrs = [], string $inner = '') {
    $json = $attrs === [] ? '' : ' ' . wp_json_encode($attrs, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($inner === '') {
        return "<!-- wp:$name$json /-->";
    }
    return "<!-- wp:$name$json -->$inner<!-- /wp:$name -->";
};

$slot = static function (string $name, string $title, string $inner) use ($comment, $ns): string {
    return $comment("$ns/slot", ['name' => $name, 'title' => $title], $inner);
};

$twoSlot = $comment("$ns/slot-card", ['heading' => 'Two slots'],
    $slot('left', 'Left', $comment("$ns/recipe-card", $cardAttrs('Left slot heading')))
    . $slot('right', 'Right', $comment("$ns/recipe-card", $cardAttrs('Right slot heading')))
);

$html = do_blocks($twoSlot);
assert(substr_count($html, 'Left slot heading') === 1, 'left recipe-card renders once: ' . $html);
assert(substr_count($html, 'Right slot heading') === 1, 'right recipe-card renders once');
assert(strpos($html, 'Left slot heading') < strpos($html, 'Right slot heading'), 'left slot precedes right');
assert(!str_contains($html, 'data-designbook-slot'), 'slot wrappers emit no frontend marker');
assert(!str_contains($html, 'wp-block-'), 'no editor wrapper leakage in component output');

$leftHtml = $registry->render('recipe-card', $cardAttrs('Left slot heading'));
$rightHtml = $registry->render('recipe-card', $cardAttrs('Right slot heading'));
$expected = $registry->render('slot-card', ['heading' => 'Two slots'], ['left' => $leftHtml, 'right' => $rightHtml]);
assert($html === $expected, "block render matches registry render\n---block---\n$html\n---registry---\n$expected");

$empty = do_blocks($comment("$ns/slot-card", ['heading' => 'Empty'],
    $slot('left', 'Left', '') . $slot('right', 'Right', '')
));
assert(str_contains($empty, 'Empty'), 'empty slots still render the parent');
assert(substr_count($empty, 'Left slot heading') === 0, 'empty slots carry no leftover children');

$deep = do_blocks($comment("$ns/slot-card", ['heading' => 'Outer'],
    $slot('left', 'Left', $comment("$ns/slot-card", ['heading' => 'Mid'],
        $slot('left', 'Left', $comment("$ns/recipe-card", $cardAttrs('Deep card')))
        . $slot('right', 'Right', '')
    )) . $slot('right', 'Right', '')
));
assert(substr_count($deep, 'Deep card') === 1, 'three-level nest renders the descendant once');
assert(str_contains($deep, 'Outer') && str_contains($deep, 'Mid'), 'three-level nest keeps each heading');

$escaped = do_blocks($comment("$ns/recipe-card", $cardAttrs('<script>alert(1)</script>')));
assert(!str_contains($escaped, '<script>'), 'script-bearing text is escaped');
assert(str_contains($escaped, '&lt;script&gt;') || str_contains($escaped, 'alert(1)'), 'escaped text remains visible');

$scriptHtml = do_blocks($comment("$ns/slot-card", ['heading' => 'HTML'],
    $slot('left', 'Left', '<!-- wp:paragraph --><p><script>alert(1)</script>Hi</p><!-- /wp:paragraph -->')
    . $slot('right', 'Right', '')
));
assert(!str_contains($scriptHtml, '<script>'), 'script-bearing slot HTML is sanitized');

do_action('enqueue_block_assets');
assert(
    wp_style_is(get_stylesheet(), 'enqueued') || wp_style_is(get_stylesheet(), 'registered'),
    'compiled CSS is enqueued for the block editor iframe'
);

$postId = wp_insert_post([
    'post_title' => 'Gutenberg render fixture',
    'post_status' => 'publish',
    'post_type' => 'page',
    'post_content' => $twoSlot,
    'post_author' => $adminId,
]);
assert(is_int($postId) && $postId > 0, 'fixture page stored');
$storedBefore = get_post($postId)->post_content;

$preview = static function (int $postId, string $content) {
    $request = new WP_REST_Request('POST', '/designbook/v1/gutenberg-preview');
    $request->set_header('content-type', 'application/json');
    $request->set_body(wp_json_encode(['post_id' => $postId, 'content' => $content]));
    return rest_do_request($request);
};

$ok = $preview($postId, $twoSlot);
assert($ok->get_status() === 200, 'authorized preview succeeds: ' . $ok->get_status() . ' ' . wp_json_encode($ok->get_data()));
$okData = $ok->get_data();
$okHtml = is_array($okData) ? ($okData['html'] ?? '') : '';
assert(substr_count($okHtml, 'Left slot heading') === 1, 'preview renders left slot');
assert(substr_count($okHtml, 'Right slot heading') === 1, 'preview renders right slot');
assert($okHtml === $html, 'preview uses the same render path as frontend');

$dup = $preview($postId, $comment("$ns/slot-card", ['heading' => 'Dup'],
    $slot('left', 'Left', '') . $slot('left', 'Left again', '')
));
assert($dup->get_status() === 400, 'duplicate slot is a structured error');
$dupData = $dup->get_data();
$dupMsg = wp_json_encode($dupData);
assert(str_contains(strtolower($dupMsg), 'left'), 'duplicate slot names the slot: ' . $dupMsg);
assert(!str_contains($dupMsg, 'Stack trace') && !str_contains($dupMsg, '.php'), 'errors omit stack traces');

$unknown = $preview($postId, $comment("$ns/slot-card", ['heading' => 'Unknown'],
    $slot('left', 'Left', '') . $slot('middle', 'Middle', '')
));
assert($unknown->get_status() === 400, 'unknown slot is a structured error');

$missing = $preview($postId, $comment("$ns/does-not-exist", []));
assert($missing->get_status() === 400, 'unknown component is a structured error');

$invalidType = $preview($postId, $comment("$ns/link-box", ['href' => 'https://example.com', 'count' => 'abc', 'label' => 'n']));
assert($invalidType->get_status() === 400, 'invalid attribute type is a structured error');

$unsafe = $preview($postId, $comment("$ns/link-box", ['href' => 'javascript:alert(1)', 'count' => 1, 'label' => 'x']));
assert($unsafe->get_status() === 400, 'unsafe URI is rejected');

$emptyObj = $preview($postId, $comment("$ns/link-box", [
    'href' => 'https://example.com',
    'count' => 1,
    'label' => 'n',
    'payload' => new stdClass(),
]));
assert($emptyObj->get_status() === 200, 'empty object attributes remain valid: ' . $emptyObj->get_status());

$jsUrl = $preview($postId, $comment("$ns/recipe-card", array_merge($cardAttrs('js'), ['url' => 'javascript:alert(1)'])));
assert($jsUrl->get_status() === 400, 'javascript: on a url string prop is rejected');

$missingTitle = $preview($postId, $comment("$ns/recipe-card", ['image_src' => '/images/recipe-card-chicken.png']));
assert($missingTitle->get_status() === 400, 'missing required title is rejected');

$oversize = $preview($postId, str_repeat('a', 1048576 + 8));
assert($oversize->get_status() === 400, 'oversized tree is rejected');

$deepMarkup = $comment("$ns/recipe-card", $cardAttrs('leaf'));
for ($i = 0; $i < 51; $i++) {
    $deepMarkup = $comment("$ns/slot-card", ['heading' => "L$i"], $slot('left', 'Left', $deepMarkup) . $slot('right', 'Right', ''));
}
$tooDeep = $preview($postId, $deepMarkup);
assert($tooDeep->get_status() === 400, '51-level tree is rejected');

assert(get_post($postId)->post_content === $storedBefore, 'failed previews do not mutate stored content');

wp_set_current_user(0);
$anon = $preview($postId, $twoSlot);
assert(in_array($anon->get_status(), [401, 403], true), 'anonymous preview is rejected: ' . $anon->get_status());

$subId = wp_insert_user([
    'user_login' => 'gb_sub_' . wp_generate_password(6, false),
    'user_pass' => wp_generate_password(12, false),
    'user_email' => 'gb_sub_' . wp_generate_password(6, false) . '@example.com',
    'role' => 'subscriber',
]);
wp_set_current_user((int) $subId);
$sub = $preview($postId, $twoSlot);
assert(in_array($sub->get_status(), [401, 403], true), 'subscriber preview is rejected: ' . $sub->get_status());

$authorId = wp_insert_user([
    'user_login' => 'gb_author_' . wp_generate_password(6, false),
    'user_pass' => wp_generate_password(12, false),
    'user_email' => 'gb_author_' . wp_generate_password(6, false) . '@example.com',
    'role' => 'author',
]);
$foreign = wp_insert_post([
    'post_title' => 'Foreign post',
    'post_status' => 'publish',
    'post_type' => 'post',
    'post_content' => 'untouched',
    'post_author' => $adminId,
]);
wp_set_current_user((int) $authorId);
$denied = $preview((int) $foreign, $twoSlot);
assert(in_array($denied->get_status(), [401, 403], true), 'forbidden post preview is rejected: ' . $denied->get_status());
assert(get_post($foreign)->post_content === 'untouched', 'forbidden preview does not mutate the post');

$own = wp_insert_post([
    'post_title' => 'Author owned',
    'post_status' => 'draft',
    'post_type' => 'post',
    'post_content' => $twoSlot,
    'post_author' => (int) $authorId,
]);
$ownPreview = $preview((int) $own, $twoSlot);
assert($ownPreview->get_status() === 200, 'an editor may preview its editable post: ' . $ownPreview->get_status());

wp_set_current_user((int) $authorId);
$tplDenied = $preview(0, $twoSlot);
assert(in_array($tplDenied->get_status(), [401, 403], true), 'author cannot preview templates: ' . $tplDenied->get_status());

wp_set_current_user($adminId);
$tplOk = $preview(0, $twoSlot);
assert($tplOk->get_status() === 200, 'admin may preview a template: ' . $tplOk->get_status());
$tplHtml = is_array($tplOk->get_data()) ? ($tplOk->get_data()['html'] ?? '') : '';
assert(substr_count($tplHtml, 'Left slot heading') === 1, 'template preview renders left slot');

echo "OK\n";
