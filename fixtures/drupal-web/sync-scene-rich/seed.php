<?php

/**
 * Bare-entity TEST SEED for the sync-verify-scene fixture (run via `drush php:script`
 * from the case prompt, after sync-to has imported the config).
 *
 * Creates EXACTLY ONE canonical node.landing entity so the Layout-Builder page has a
 * reachable canonical URL for sync-to's outtake and sync-verify's full-page capture.
 *
 * This is a FIXTURE seed, NOT a sync-to mechanism and NOT a content-sync path:
 * sync-to synchronises CONFIG (plus a presenter-template) ONLY — the node.landing.full
 * Layout-Builder display whose DEFAULT sections carry the block_content hero AND the
 * landing_teasers views_block (a block plugin), with the Scene's props inline.
 * The node created here carries no per-entity layout and no field content; the visible
 * content lives in the synced display config, which renders for this bare canonical entity.
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
