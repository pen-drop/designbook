<?php

declare(strict_types=1);

namespace Drupal\Tests\designbook\Functional;

use Drupal\Tests\BrowserTestBase;
use Drupal\node\NodeInterface;

/**
 * Tests the designbook preview route access + rendering.
 *
 * @group designbook
 */
final class PreviewRouteTest extends BrowserTestBase {

  /**
   * {@inheritdoc}
   */
  protected $defaultTheme = 'stark';

  /**
   * {@inheritdoc}
   */
  protected static $modules = ['designbook', 'config_inspector', 'node'];

  /**
   * The article node under test.
   */
  private NodeInterface $node;

  /**
   * {@inheritdoc}
   */
  protected function setUp(): void {
    parent::setUp();
    $this->drupalCreateContentType(['type' => 'article', 'name' => 'Article']);
    $this->node = $this->drupalCreateNode(['type' => 'article', 'title' => 'Preview me']);
  }

  /**
   * A user with the permission sees the entity rendered (200).
   */
  public function testPreviewReturns200WithPermission(): void {
    $this->drupalLogin($this->drupalCreateUser(['access designbook preview']));
    $this->drupalGet('/designbook/preview/node/' . $this->node->id() . '/full');
    $this->assertSession()->statusCodeEquals(200);
    // The entity label surfaces via the page title callback (full view mode
    // otherwise omits it), giving the screenshot its subject.
    $this->assertSession()->pageTextContains('Preview me');
    // The node was actually rendered by the entity view builder (theme-agnostic
    // marker emitted for any rendered node).
    $this->assertSession()->responseContains('data-history-node-id="' . $this->node->id() . '"');
  }

  /**
   * A user without the permission is denied (403).
   */
  public function testPreviewReturns403WithoutPermission(): void {
    $this->drupalLogin($this->drupalCreateUser([]));
    $this->drupalGet('/designbook/preview/node/' . $this->node->id() . '/full');
    $this->assertSession()->statusCodeEquals(403);
  }

  /**
   * A missing entity yields a 404.
   */
  public function testPreviewReturns404ForMissingEntity(): void {
    $this->drupalLogin($this->drupalCreateUser(['access designbook preview']));
    $this->drupalGet('/designbook/preview/node/999999/full');
    $this->assertSession()->statusCodeEquals(404);
  }

}
