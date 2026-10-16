---
type: blueprint
name: wp-cli-seed
trigger:
  steps: [seed]
filter:
  backend: wordpress
---

# Blueprint: WP-CLI Seed Script

One PHP script seeds all selected records. Every record is upserted by a `_designbook_id`
meta (`<entity_type>.<bundle>.<record id>`), so a re-run updates instead of duplicating.
Order: attachments, then terms, then posts, so references resolve to existing ids.

```php
<?php
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/image.php';

function db_find_post(string $type, string $id): int {
    $found = get_posts(['post_type' => $type, 'meta_key' => '_designbook_id', 'meta_value' => $id,
        'numberposts' => 1, 'post_status' => 'any', 'fields' => 'ids']);
    return $found ? (int) $found[0] : 0;
}

function db_upsert_post(string $type, string $id, array $args, array $acf): int {
    $existing = db_find_post($type, $id);
    $postId = wp_insert_post(['ID' => $existing, 'post_type' => $type, 'post_status' => 'publish'] + $args, true);
    if (is_wp_error($postId)) throw new RuntimeException($postId->get_error_message());
    update_post_meta($postId, '_designbook_id', $id);
    foreach ($acf as $name => $value) update_field($name, $value, $postId);
    echo ($existing ? 'updated ' : 'created ') . "$id\n";
    return $postId;
}

function db_upsert_term(string $taxonomy, string $id, string $name, array $acf): int {
    $found = get_terms(['taxonomy' => $taxonomy, 'hide_empty' => false, 'meta_key' => '_designbook_id',
        'meta_value' => $id, 'fields' => 'ids']);
    $termId = $found ? (int) $found[0] : 0;
    $r = $termId ? wp_update_term($termId, $taxonomy, ['name' => $name]) : wp_insert_term($name, $taxonomy);
    if (is_wp_error($r)) throw new RuntimeException($r->get_error_message());
    $termId = (int) $r['term_id'];
    update_term_meta($termId, '_designbook_id', $id);
    foreach ($acf as $field => $value) update_field($field, $value, "term_$termId");
    echo ($found ? 'updated ' : 'created ') . "$id\n";
    return $termId;
}

/** Local image (path relative to the theme) → attachment id, reused by `_designbook_id`. */
function db_upsert_image(string $relPath, string $alt): int {
    $id = 'attachment.image.' . sanitize_title($relPath);
    if ($existing = db_find_post('attachment', $id)) return $existing;
    $tmp = wp_tempnam(basename($relPath));
    copy(get_stylesheet_directory() . '/' . $relPath, $tmp);
    $attId = media_handle_sideload(['name' => basename($relPath), 'tmp_name' => $tmp], 0);
    if (is_wp_error($attId)) throw new RuntimeException($attId->get_error_message());
    update_post_meta($attId, '_designbook_id', $id);
    update_post_meta($attId, '_wp_attachment_image_alt', $alt);
    return $attId;
}

$failed = 0;
foreach ($records as [$label, $fn]) {          // $records: [record id, closure] in seed order
    try { $fn(); } catch (Throwable $e) { $failed++; echo "failed $label: {$e->getMessage()}\n"; }
}
exit($failed ? 1 : 0);
```

Map record values: native properties (`title` → `post_title`, `content`, `excerpt`,
`featured_image` → `set_post_thumbnail`) into `$args`/after insert; ACF fields into `$acf`
(images as attachment ids, repeaters as arrays of row arrays, taxonomy fields as term ids,
relationships as post ids). The post slug (`post_name`) is the record id. A record whose
referenced term or image cannot be resolved throws, is reported as `failed`, and the run
continues with the next record.

For a Gutenberg layout seed, replace `post_content` with
`Designbook\GutenbergAdapter::seedBlocks($id, $blocks, $type)` after attachments resolve.
That helper validates the tree, writes `wp_slash(serialize_blocks($blocks))`, and reuses
`_designbook_id`. A validation or WordPress error throws, is reported as `failed`, and
leaves the existing managed record in place.
