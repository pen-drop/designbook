<?php

/**
 * Idempotent content importer for the sync-verify-scene fixture (run via
 * `drush php:script` as backend_cmd.content_import_cmd). Reads the staged content
 * payloads sync-to's transform-content wrote and creates/upserts the entities by
 * their deterministic uuid, then wires the page's Layout Builder layout.
 *
 * This is a fixture-local command-string implementation — core stays backend-neutral;
 * a real project ships the equivalent as a drush module command.
 *
 * Payload contract (one YAML per content unit, keyed by content_ref uuid):
 *   block: { uuid, entity_type: block_content, bundle, role: block, fields: {..} }
 *   page:  { uuid, entity_type: node, bundle, role: page, title, blocks: [uuid,..] }
 */

use Drupal\block_content\Entity\BlockContent;
use Drupal\node\Entity\Node;
use Drupal\layout_builder\Section;
use Drupal\layout_builder\SectionComponent;
use Drupal\Component\Serialization\Yaml;

// transform-content writes payloads host-side to $DESIGNBOOK_DATA/sync/content
// ($DESIGNBOOK_DATA = the theme's designbook dir); the container sees the theme
// mounted under /var/www/html, so read the same files from that container path.
$dir = '/var/www/html/web/themes/custom/test_integration_drupal/designbook/sync/content';
$repo = \Drupal::service('entity.repository');
$uuidGen = \Drupal::service('uuid');

$files = glob("$dir/*.yml") ?: [];
$payloads = [];
foreach ($files as $f) {
  $payloads[] = Yaml::decode(file_get_contents($f));
}
// Blocks before the page (dependency before user).
usort($payloads, fn($a, $b) => (($a['role'] ?? '') === 'block' ? 0 : 1) <=> (($b['role'] ?? '') === 'block' ? 0 : 1));

foreach ($payloads as $p) {
  $uuid = $p['uuid'];
  if (($p['entity_type'] ?? '') === 'block_content') {
    $block = $repo->loadEntityByUuid('block_content', $uuid)
      ?: BlockContent::create(['type' => $p['bundle'], 'uuid' => $uuid, 'info' => $p['bundle'] . ' ' . $uuid, 'reusable' => TRUE]);
    foreach (($p['fields'] ?? []) as $k => $v) {
      $block->set($k, $v);
    }
    $block->save();
  }
  elseif (($p['entity_type'] ?? '') === 'node') {
    $node = $repo->loadEntityByUuid('node', $uuid)
      ?: Node::create(['type' => $p['bundle'], 'uuid' => $uuid]);
    $node->setTitle($p['title'] ?? 'Landing');
    $node->setPublished();
    $components = [];
    $weight = 0;
    foreach (($p['blocks'] ?? []) as $blockUuid) {
      $components[] = new SectionComponent($uuidGen->generate(), 'content', [
        'id' => 'block_content:' . $blockUuid,
        'label' => 'Hero',
        'label_display' => 0,
        'provider' => 'layout_builder',
        'view_mode' => 'default',
      ], ['weight' => $weight++]);
    }
    $node->set('layout_builder__layout', [new Section('layout_onecol', [], $components)]);
    $node->save();
  }
}

print "content-import: " . count($payloads) . " payload(s) imported\n";
