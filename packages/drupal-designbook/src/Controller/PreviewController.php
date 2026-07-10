<?php

declare(strict_types=1);

namespace Drupal\designbook\Controller;

use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Renders an entity in a view mode as a themed page (dev-only preview).
 */
final class PreviewController extends ControllerBase {

  /**
   * Renders {entity} of {entity_type} in {view_mode}.
   *
   * @param string $entity_type
   *   The entity type id, e.g. "node".
   * @param string $entity
   *   The entity id to load.
   * @param string $view_mode
   *   The view mode to render in, e.g. "full".
   *
   * @return array
   *   A render array; Drupal wraps it in the themed page (HTTP 200).
   */
  public function preview(string $entity_type, string $entity, string $view_mode): array {
    return $this->entityTypeManager()
      ->getViewBuilder($entity_type)
      ->view($this->loadOr404($entity_type, $entity), $view_mode);
  }

  /**
   * Titles the preview page with the entity's label.
   *
   * The "full" view mode deliberately omits the entity label from its own
   * render output (core node.html.twig renders it only when view_mode != full,
   * relying on the page title). This route is not the canonical entity page, so
   * without a title callback the previewed entity's identity would appear
   * nowhere on the themed page — defeating screenshot capture. Falling back to a
   * static title keeps missing/unknown entities as a clean 404 in preview().
   *
   * @param string $entity_type
   *   The entity type id, e.g. "node".
   * @param string $entity
   *   The entity id to load.
   * @param string $view_mode
   *   The view mode (unused; part of the route signature).
   *
   * @return string
   *   The entity label, or a static fallback when it cannot be loaded.
   */
  public function title(string $entity_type, string $entity, string $view_mode): string {
    if (!$this->entityTypeManager()->hasDefinition($entity_type)) {
      return 'Designbook preview';
    }
    $loaded = $this->entityTypeManager()->getStorage($entity_type)->load($entity);
    return $loaded === NULL ? 'Designbook preview' : (string) $loaded->label();
  }

  /**
   * Loads an entity by type + id, or throws a 404.
   *
   * @param string $entity_type
   *   The entity type id.
   * @param string $entity
   *   The entity id.
   *
   * @return \Drupal\Core\Entity\EntityInterface
   *   The loaded entity.
   *
   * @throws \Symfony\Component\HttpKernel\Exception\NotFoundHttpException
   *   When the entity type is unknown or the entity does not exist.
   */
  private function loadOr404(string $entity_type, string $entity) {
    if (!$this->entityTypeManager()->hasDefinition($entity_type)) {
      throw new NotFoundHttpException();
    }
    $loaded = $this->entityTypeManager()->getStorage($entity_type)->load($entity);
    if ($loaded === NULL) {
      throw new NotFoundHttpException();
    }
    return $loaded;
  }

}
