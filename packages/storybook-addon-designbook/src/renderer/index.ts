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
  ConfigSceneNode,
  SceneSceneNode,
  DataModel,
  SampleData,
  BundleDef,
  DataModelContent,
  SceneDef,
  ComponentNode,
  RawNode,
  BuildContext,
  SceneNodeBuilder,
  ComponentModule,
} from './types';

// Expression cache
export { ExpressionCache } from './expression-cache';

// Runtime renderer (browser-side)
export { renderComponent } from './renderer';

// Builder registry
export { BuilderRegistry, resolveEntityRefs } from './builder-registry';

// Built-in builders
export { componentBuilder } from './builders/component-builder';
export { entityBuilder } from './builders/entity-builder';
export { configListBuilder } from './builders/config-list-builder';
export { sceneBuilder } from './builders/scene-builder';

// CSF prep
export { buildCsfModule } from './csf-prep';
export type { CsfPrepOptions, CsfPrepScene } from './csf-prep';
