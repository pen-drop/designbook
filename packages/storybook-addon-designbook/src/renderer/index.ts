/**
 * Renderer module public API.
 *
 * Re-exports all types, services, built-in renderers, and presets.
 */

// Core types
export type {
  SceneNode,
  ComponentSceneNode,
  EntitySceneNode,
  RenderContext,
  SceneNodeRenderer,
  DataModel,
  SampleData,
  BundleDef,
  DataModelContent,
  SceneDef,
  ResolvedScene,
  SceneComponentEntry,
  SceneEntityEntry,
  SceneLayoutEntry,
} from './types';

export { isSceneEntityEntry, isSceneComponentEntry } from './types';

// Services
export { SceneNodeRenderService } from './render-service';
export { ExpressionCache } from './expression-cache';

// Parser
export { parseScene } from './parser';

// Built-in renderers
export { sdcComponentRenderer, sdcRenderers } from './builders/sdc';
export { entityJsonataRenderer } from './entity-renderer';
