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
}

/** The data model structure (content section of data-model.yml). */
export interface DataModelContent {
  [entityType: string]: {
    [bundle: string]: BundleDef;
  };
}

/** Top-level data model. */
export interface DataModel {
  content: DataModelContent;
}

/** Sample data structure from data.yml. */
export interface SampleData {
  [entityType: string]: {
    [bundle: string]: Record<string, unknown>[];
  };
}

// ─── Scene Node Types ───────────────────────────────────────────────

/** A scene node to be rendered — either component, entity, or custom. */
export interface SceneNode {
  type: string;
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

/** A component entry in a scene layout slot. */
export interface SceneComponentEntry {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
  story?: string;
}

/** An entity entry in a scene layout slot. */
export interface SceneEntityEntry {
  entity: string; // "node.article"
  view_mode: string;
  record?: number; // single record
  records?: number[]; // multiple records shorthand
}

/** Union type for entries in a scene slot. */
export type SceneLayoutEntry = SceneComponentEntry | SceneEntityEntry;

/** A single scene definition within a *.scenes.yml file. */
export interface SceneDef {
  name: string;
  docs?: string;
  section?: string;
  group?: string;
  layout: Record<string, SceneLayoutEntry[]>;
}

/** The root structure of a *.scenes.yml file. */
export interface ScenesFile {
  layout?: string;
  scenes: SceneDef[];
}

/** Resolved scene: all slots expanded to ComponentNode arrays. */
export interface ResolvedScene {
  name: string;
  section?: string;
  group?: string;
  slots: Record<string, ComponentSceneNode[]>;
}

/** Check if a layout entry is an entity entry. */
export function isSceneEntityEntry(entry: SceneLayoutEntry): entry is SceneEntityEntry {
  return 'entity' in entry && typeof (entry as SceneEntityEntry).entity === 'string';
}

/** Check if a layout entry is a component entry. */
export function isSceneComponentEntry(entry: SceneLayoutEntry): entry is SceneComponentEntry {
  return 'component' in entry && typeof (entry as SceneComponentEntry).component === 'string';
}

// ─── Renderer Registry Types ─────────────────────────────────────────

/**
 * Context provided to each renderer.
 * Carries metadata, utilities, and recursion support.
 */
export interface RenderContext {
  /** SDC provider prefix (e.g., 'daisy_cms_daisyui'). */
  provider?: string;

  /** Data model from data-model.yml. */
  dataModel: DataModel;

  /** Sample data from data.yml. */
  sampleData: SampleData;

  /** Absolute path to the designbook directory. */
  designbookDir: string;

  /** Render a child node recursively (dispatches back to registry). */
  renderNode: (node: SceneNode) => string;

  /** Track an import for the generated CSF module. */
  trackImport: (componentName: string) => string;

  /** Evaluate a JSONata expression against data. Returns the result. */
  evaluateExpression: (expressionPath: string, data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * A pluggable renderer for scene nodes.
 * Integrations register these via addon options.
 */
export interface SceneNodeRenderer {
  /** Unique renderer name (for debugging). */
  name: string;

  /** Priority — higher runs first. Built-ins: -10, integrations: 0+ */
  priority?: number;

  /**
   * Return true if this renderer handles the given node.
   */
  appliesTo: (node: SceneNode) => boolean;

  /**
   * Render the node to a code string (for CSF module generation).
   */
  render: (node: SceneNode, ctx: RenderContext) => string;
}
