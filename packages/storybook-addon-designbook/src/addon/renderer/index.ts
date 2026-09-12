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
  SceneSceneNode,
  DataModel,
  SampleData,
  BundleDef,
  DataModelContent,
  ImageStyleDef,
  ImageStyleBreakpoint,
  DesignbookConfig,
  SceneDef,
  ComponentNode,
  RawNode,
  BuildContext,
  SceneNodeBuilder,
  ComponentModule,
  SceneTreeNode,
  BuildResult,
  EntityOrigin,
  SceneRefOrigin,
} from '../../scene-model/types';

// Expression cache
export { ExpressionCache } from '../../scene-model/expression-cache';

// Runtime renderer (browser-side)
export { renderComponent } from './renderer';

// Builder registry
export { BuilderRegistry } from '../../scene-model/builder-registry';

// View projection (SceneTree → RenderTree)
export { view } from '../../scene-model/view';

// Built-in builders
export { componentBuilder } from '../../scene-model/builders/component-builder';
export { entityBuilder } from '../../scene-model/builders/entity-builder';
export { sceneBuilder } from '../../scene-model/builders/scene-builder';

// CSF prep
export { buildCsfModule } from '../../scene-model/csf-prep';
export type { CsfPrepOptions, CsfPrepScene } from '../../scene-model/csf-prep';

// Entity module builder
export { buildEntityModule, titleCaseBundle } from '../../scene-model/entity-module-builder';
