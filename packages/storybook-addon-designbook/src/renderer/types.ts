/**
 * Renderer — Type definitions.
 *
 * Consolidated types for the entire rendering pipeline:
 * - Data model types (formerly entity/types.ts)
 * - Scene types (formerly screen/types.ts)
 * - Renderer registry interfaces
 */

// ─── Data Model Types ────────────────────────────────────────────────

/** A bundle definition from data-model.yml. */
export interface BundleDef {
  title?: string;
  description?: string;
  fields?: Record<string, unknown>;
  [key: string]: unknown;
}

/** The data model structure (content section of data-model.yml). */
export interface DataModelContent {
  [entityType: string]: {
    [bundle: string]: BundleDef;
  };
}

/** A breakpoint within an image style definition. */
export interface ImageStyleBreakpoint {
  width: number;
  aspect_ratio?: string;
}

/** An image style definition from data-model.yml. */
export interface ImageStyleDef {
  aspect_ratio: string;
  breakpoints?: Record<string, ImageStyleBreakpoint>;
}

/** Top-level data model. */
export interface DataModel {
  content: DataModelContent;
  config?: DataModelContent;
}

/** Entity bundles map used in SampleData. */
interface EntityBundles {
  [entityType: string]: {
    [bundle: string]: Record<string, unknown>[];
  };
}

/** Sample data structure from data.yml — uses content/config namespacing. */
export interface SampleData {
  content?: EntityBundles;
  config?: EntityBundles;
}

// ─── Scene Node Types ───────────────────────────────────────────────

/** A scene node to be rendered — either component, entity, config, or scene ref. */
export interface SceneNode {
  type?: string;
  [key: string]: unknown;
}

/** A component scene node. */
export interface ComponentSceneNode extends SceneNode {
  type: 'component';
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
  story?: string;
}

/** An entity scene node. */
export interface EntitySceneNode extends SceneNode {
  type: 'entity';
  entity_type: string;
  bundle: string;
  view_mode: string;
  record?: number;
}

// ─── Scene Definition Types ─────────────────────────────────────────

/** A scene reference node — references another scene by source:name. */
export interface SceneSceneNode extends SceneNode {
  scene: string; // "source:sceneName"
  with?: Record<string, unknown>; // fills $variable placeholders in the template
  slots?: Record<string, unknown>; // deprecated alias for `with`
}

/** A single scene definition within a *.scenes.yml file. */
export interface SceneDef {
  name: string;
  docs?: string;
  section?: string;
  group?: string;
  theme?: string;
  items: SceneNode[];
}

/** The root structure of a *.scenes.yml file. */
export interface ScenesFile {
  group?: string;
  scenes: SceneDef[];
}

// ─── Build Time Types ─────────────────────────────────────────────────

/**
 * A fully-resolved component node — the data contract between build and runtime.
 * Pure data, no framework specificity.
 */
export interface ComponentNode {
  component: string; // component reference key, e.g. 'test_provider:card'
  props?: Record<string, unknown>;
  slots?: Record<string, ComponentNode | ComponentNode[] | string>;
}

/**
 * Raw output from a builder — may contain SceneNodes (entity/config refs)
 * that resolveEntityRefs() will resolve into ComponentNodes.
 */
export type RawNode = ComponentNode | SceneNode;

/**
 * Context provided to each builder during the async build phase.
 */
/** Designbook configuration (from designbook.config.yml). */
export interface DesignbookConfig {
  image_provider?: { type: string };
  [key: string]: unknown;
}

export interface BuildContext {
  /** Data model from data-model.yml. */
  dataModel: DataModel;

  /** Sample data from data.yml. */
  sampleData: SampleData;

  /** Absolute path to the designbook directory. */
  designbookDir: string;

  /** Designbook configuration. */
  config?: DesignbookConfig;

  /**
   * Dispatch a node through the registry.
   * Returns SceneTreeNode[] — the annotated intermediate representation.
   */
  buildNode: (node: SceneNode) => Promise<SceneTreeNode[]>;
}

/**
 * A pluggable async builder for scene nodes.
 * Registered via addon options; built-ins: EntityBuilder, SceneBuilder.
 */
export interface SceneNodeBuilder {
  /** Return true if this builder handles the given node. */
  appliesTo: (node: SceneNode) => boolean;

  /**
   * Build the node into raw output with origin metadata.
   * resolveEntityRefs() in the registry will walk the result afterward.
   */
  build: (node: SceneNode, ctx: BuildContext) => Promise<BuildResult>;
}

// ─── Scene Tree Types ─────────────────────────────────────────────────

/** Origin metadata for entity nodes. */
export interface EntityOrigin {
  entity_type: string;
  bundle: string;
  view_mode: string;
  record?: number;
  /** Path to the .jsonata mapping file. */
  mapping: string;
}

/** Origin metadata for scene-ref nodes. */
export interface SceneRefOrigin {
  /** Scene reference string, e.g. "shared:footer". */
  source: string;
  with?: Record<string, unknown>;
}

/**
 * SceneTreeNode — the annotated intermediate representation.
 *
 * Produced by build(), consumed by view() to project into ComponentNode[].
 * Carries origin metadata (kind, entity/ref info) alongside resolved output.
 * Analogous to Drupal's render array between entity->build() and entity->view().
 */
export interface SceneTreeNode {
  kind: 'component' | 'entity' | 'scene-ref' | 'string';

  /** Resolved component ID (all kinds except 'string'). */
  component?: string;

  /** Entity origin — only present when kind is 'entity'. */
  entity?: EntityOrigin;

  /** Scene-ref origin — only present when kind is 'scene-ref'. */
  ref?: SceneRefOrigin;

  /** String value — only present when kind is 'string'. */
  value?: string;

  /** Resolved props from the build. */
  props?: Record<string, unknown>;

  /** Recursive slots — each slot maps to child SceneTreeNodes. */
  slots?: Record<string, SceneTreeNode[]>;

  /** Direct children — scene-refs (inlined at render time) or multi-node entities. */
  children?: SceneTreeNode[];
}

/**
 * Result returned by SceneNodeBuilder.build().
 * Contains the resolved nodes plus origin metadata for SceneTree assembly.
 *
 * `nodes` contains RawNode[] that still need resolution (entity/component builders).
 * `resolvedChildren` contains already-built SceneTreeNode[] (scene builder).
 * Only one of the two should be set.
 */
export interface BuildResult {
  nodes?: RawNode[];
  resolvedChildren?: SceneTreeNode[];
  meta: { kind: 'component' } | { kind: 'entity'; entity: EntityOrigin } | { kind: 'scene-ref'; ref: SceneRefOrigin };
}

// ─── Runtime Types ────────────────────────────────────────────────────

/**
 * Framework-specific leaf renderer — the only framework-specific point.
 * SDC: mod.default.component({...props, ...slots})
 * React: React.createElement(Component, {...props, ...slots})
 * Vue3: h(Component, {...props, ...slots})
 */
export interface ComponentModule {
  render: (props: Record<string, unknown>, slots: Record<string, unknown>) => unknown;
}
