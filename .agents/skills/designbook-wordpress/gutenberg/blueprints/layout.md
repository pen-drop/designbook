---
type: data-mapping
name: gutenberg-layout
trigger:
  domain: data-mapping
  config_name: 'layout.*'
filter:
  backend: wordpress
extends:
  ConfigNameUnit:
    properties:
      build_form:
        enum: [gutenberg]
---

# Blueprint: Gutenberg Layout Seed

`layout.<scene>` — `plugins/<ns>-content/seed/layout-<scene>.php`, a WP-CLI seed script
run by `backend_cmd.seed_cmd`. It walks the resolved scene component tree, rejects a node
the adapter cannot represent (unknown component, undeclared slot, missing sample or
attachment) with that node's path, then upserts one page (or the bound sample post) by
`_designbook_id`.

```php
<?php
$ns = str_replace('_', '-', get_stylesheet());
$blocks = [
    Designbook\GutenbergAdapter::makeBlock("$ns/slot-card", [/* props */], [
        Designbook\GutenbergAdapter::makeBlock("$ns/slot", ['name' => 'left', 'title' => 'Left'], [
            /* child blocks */
        ]),
        Designbook\GutenbergAdapter::makeBlock("$ns/slot", ['name' => 'right', 'title' => 'Right'], [
            /* child blocks */
        ]),
    ]),
];
try {
    Designbook\GutenbergAdapter::seedBlocks('page.<scene>', $blocks);
} catch (Throwable $e) {
    echo 'failed page.<scene>: ' . $e->getMessage() . "\n";
    exit(1);
}
```

`seedBlocks()` validates the tree, then stores `wp_slash(serialize_blocks($blocks))`.
A second run updates the same post's `post_content` and leaves title, slug and status
unchanged. Unmanaged posts stay untouched. Entity-bound screens use the sample record's
`_designbook_id` (`<entity_type>.<bundle>.<record id>`) as the upsert key so the Gutenberg
tree lands on that post's `post_content`.
