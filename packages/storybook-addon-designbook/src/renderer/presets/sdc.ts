/**
 * SDC Renderer Preset — pre-configured renderer set for Drupal/SDC/Twig.
 *
 * Includes:
 * - entityJsonataRenderer: resolves entity nodes via JSONata expressions
 * - sdcComponentRenderer: renders component nodes to SDC/Twig calls
 */

import { sdcComponentRenderer } from '../sdc-renderer';
import { entityJsonataRenderer } from '../entity-renderer';
import type { SceneNodeRenderer } from '../types';

export const sdcRenderers: SceneNodeRenderer[] = [entityJsonataRenderer, sdcComponentRenderer];
