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
    if (!$this->entityTypeManager()->hasDefinition($entity_type)) {
      throw new NotFoundHttpException();
    }
    $loaded = $this->entityTypeManager()->getStorage($entity_type)->load($entity);
    if ($loaded === NULL) {
      throw new NotFoundHttpException();
    }
    return $this->entityTypeManager()->getViewBuilder($entity_type)->view($loaded, $view_mode);
  }

}
