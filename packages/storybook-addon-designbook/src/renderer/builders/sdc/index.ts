/**
 * SDC Builder — barrel export.
 *
 * Re-exports the SDC module builder, renderer, and preset array.
 */

export { sdcComponentRenderer } from './renderer';
export { buildSdcModule } from './module-builder';
export type { SdcModuleBuilderOptions } from './module-builder';

import { sdcComponentRenderer } from './renderer';
import { entityJsonataRenderer } from '../../entity-renderer';

/**
 * Default renderer stack for SDC/Twig-based projects.
 */
export const sdcRenderers: import('../../types').SceneNodeRenderer[] = [sdcComponentRenderer, entityJsonataRenderer];
