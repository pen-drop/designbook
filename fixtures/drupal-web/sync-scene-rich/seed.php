<?php

/**
 * TEST SEED for the sync-scene-rich / sync-verify-scene fixtures (run via
 * `drush php:script` after sync-to has imported the config).
 *
 * 1. Creates EXACTLY ONE canonical node.landing so the page has a reachable URL.
 * 2. Attaches a Layout Builder **entity override** (layout_builder__layout) with:
 *    - inline_block:hero (real block_content revision — never block_serialized in config)
 *    - views_block:landing_teasers-block_1
 * 3. Creates the landing_teasers View's row content — one node.landing_page per sample record
 *    (field_short_title matches designbook/data/node.landing_page.yml). Without these the
 *    views_block lists nothing and the rendered list is empty; AC9 needs a *rendered* list, so
 *    the live View must list the same rows the Storybook reference enumerates
 *    (view.landing_teasers.default.jsonata → list-view wrapper → card rows).
 *
 * sync-to synchronises CONFIG only: node.landing.full has LB enabled + empty default
 * sections (template: layout-builder = content override). Visible section composition
 * is therefore seeded here, not authored into core.entity_view_display.*.yml.
 *
 * Idempotent: reuses the existing landing node when one is already present; rewrites
 * its override layout each run; skips row nodes that already exist.
 */

use Drupal\block_content\Entity\BlockContent;
use Drupal\layout_builder\Plugin\SectionStorage\OverridesSectionStorage;
use Drupal\layout_builder\Section;
use Drupal\layout_builder\SectionComponent;
use Drupal\node\Entity\Node;

$ids = \Drupal::entityQuery('node')
  ->accessCheck(FALSE)
  ->condition('type', 'landing')
  ->range(0, 1)
  ->execute();

$node = $ids ? Node::load(reset($ids)) : Node::create(['type' => 'landing']);
$node->setTitle('Landing');
$node->setPublished();

// Non-reusable hero block content (inline block revision).
$hero = BlockContent::create([
  'type' => 'hero',
  'info' => 'Hero',
  'reusable' => FALSE,
  'status' => TRUE,
  'field_title' => [['value' => 'Ausbildung gestalten']],
  'field_content' => [[
    'value' => '<p>Leando buendelt Themenbeitraege.</p>',
    'format' => 'basic_html',
  ]],
  'field_action' => [[
    'uri' => '/de/registrieren',
    'title' => 'Jetzt registrieren',
    'options' => [],
  ]],
]);
$hero->save();

$hero_uuid = 'ad1235e9-7216-5869-949c-9bdac4922d12';
$view_uuid = 'ecb42bea-b7b6-52fd-a863-be3c23e57e0a';

$hero_comp = new SectionComponent($hero_uuid, 'content', [
  'id' => 'inline_block:hero',
  'label' => 'Hero',
  'label_display' => '0',
  'provider' => 'layout_builder',
  'view_mode' => 'default',
  'block_revision_id' => $hero->getRevisionId(),
  'block_serialized' => NULL,
  'context_mapping' => [],
]);
$view_comp = new SectionComponent($view_uuid, 'content', [
  'id' => 'views_block:landing_teasers-block_1',
  'label' => 'Landing teasers',
  'label_display' => 'visible',
  'provider' => 'views',
  'views_label' => 'Landing teasers',
  'items_per_page' => NULL,
  'context_mapping' => [],
]);
$view_comp->setWeight(1);

$section = new Section('layout_onecol', ['label' => ''], [
  $hero_uuid => $hero_comp,
  $view_uuid => $view_comp,
]);

$node->set(OverridesSectionStorage::FIELD_NAME, [$section]);
$node->save();

// Row content the landing_teasers views_block lists. field_short_title values MUST stay
// byte-identical to designbook/data/node.landing_page.yml so the live list and the Storybook
// reference render the same rows (1:1 — AC9/AC19).
$row_titles = [
  'Ausbildung gestalten',
  'Praxis-Tipps für den Betrieb',
  'Qualitätsgesicherte Informationen',
];
$rows_created = 0;
foreach ($row_titles as $row_title) {
  $exists = \Drupal::entityQuery('node')
    ->accessCheck(FALSE)
    ->condition('type', 'landing_page')
    ->condition('field_short_title', $row_title)
    ->range(0, 1)
    ->execute();
  if ($exists) {
    continue;
  }
  $row = Node::create([
    'type' => 'landing_page',
    'title' => $row_title,
    'field_short_title' => $row_title,
    'status' => TRUE,
  ]);
  $row->save();
  $rows_created++;
}

print 'seed: node.landing ' . $node->id()
  . ' hero_rev=' . $hero->getRevisionId()
  . ' landing_page_rows=' . count($row_titles) . ' (created ' . $rows_created . ')'
  . ' url=' . $node->toUrl('canonical', ['absolute' => TRUE])->toString()
  . "\n";
