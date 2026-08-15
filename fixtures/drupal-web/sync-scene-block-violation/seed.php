<?php

/**
 * Bare-entity TEST SEED for the sync-verify-scene fixture (run via `drush php:script`
 * from the case prompt, after sync-to has imported the config).
 *
 * Creates EXACTLY ONE canonical node.landing entity so the Layout-Builder page has a
 * reachable canonical URL for sync-to's outtake and sync-verify's full-page capture.
 *
 * This is a FIXTURE seed, NOT a sync-to mechanism and NOT a content-sync path.
 * This is the RED / violation fixture: the Scene places a determinable block_content.hero AND
 * node.promo as a block. The data model declares NEITHER a block_content bundle nor a block_plugin
 * entry for promo (there is NO block plugin here), so the block-decision rule must report promo as
 * undeterminable and stop — the run should NOT reach a full node.landing.full display. This seed
 * only creates the bare canonical node.landing so a URL exists if the run is inspected.
 *
 * Idempotent: reuses the existing landing node when one is already present.
 */

use Drupal\node\Entity\Node;

$ids = \Drupal::entityQuery('node')
  ->accessCheck(FALSE)
  ->condition('type', 'landing')
  ->range(0, 1)
  ->execute();

$node = $ids ? Node::load(reset($ids)) : Node::create(['type' => 'landing']);
$node->setTitle('Landing');
$node->setPublished();
$node->save();

print 'seed: node.landing ' . $node->id() . "\n";
