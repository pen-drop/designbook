/**
 * Renderer module public API.
 *
 * Re-exports all types, services, built-in renderers, and presets.
 */

// Core types
export type {
  ScreenNode,
  ComponentScreenNode,
  EntityScreenNode,
  RenderContext,
  ScreenNodeRenderer,
  DataModel,
  SampleData,
  BundleDef,
  DataModelContent,
  ScreenDef,
  ResolvedScreen,
  ScreenComponentEntry,
  ScreenEntityEntry,
  ScreenLayoutEntry,
} from './types';

export { isScreenEntityEntry, isScreenComponentEntry } from './types';

// Services
export { ScreenNodeRenderService } from './render-service';
export { ExpressionCache } from './expression-cache';

// Parser
export { parseScreen } from './parser';

// Built-in renderers
export { sdcComponentRenderer } from './sdc-renderer';
export { entityJsonataRenderer } from './entity-renderer';

// Presets
export { sdcRenderers } from './presets/sdc';
