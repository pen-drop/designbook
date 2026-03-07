/**
 * Renderer — Type definitions.
 *
 * Consolidated types for the entire rendering pipeline:
 * - Data model types (formerly entity/types.ts)
 * - Screen types (formerly screen/types.ts)
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

// ─── Screen Node Types ───────────────────────────────────────────────

/** A screen node to be rendered — either component, entity, or custom. */
export interface ScreenNode {
  type: string;
  [key: string]: unknown;
}

/** A component screen node. */
export interface ComponentScreenNode extends ScreenNode {
  type: 'component';
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
  story?: string;
}

/** An entity screen node. */
export interface EntityScreenNode extends ScreenNode {
  type: 'entity';
  entity_type: string;
  bundle: string;
  view_mode: string;
  record?: number;
}

// ─── Screen Definition Types ─────────────────────────────────────────

/** A component entry in a screen layout slot. */
export interface ScreenComponentEntry {
  component: string;
  props?: Record<string, unknown>;
  slots?: Record<string, unknown>;
  story?: string;
}

/** An entity entry in a screen layout slot. */
export interface ScreenEntityEntry {
  entity: string; // "node.article"
  view_mode: string;
  record?: number; // single record
  records?: number[]; // multiple records shorthand
}

/** Union type for entries in a screen slot. */
export type ScreenLayoutEntry = ScreenComponentEntry | ScreenEntityEntry;

/** The parsed structure of a *.screen.yml file. */
export interface ScreenDef {
  name: string;
  section?: string;
  group?: string;
  layout: Record<string, ScreenLayoutEntry[]>;
}

/** Resolved screen: all slots expanded to ComponentNode arrays. */
export interface ResolvedScreen {
  name: string;
  section?: string;
  group?: string;
  slots: Record<string, ComponentScreenNode[]>;
}

/** Check if a layout entry is an entity entry. */
export function isScreenEntityEntry(entry: ScreenLayoutEntry): entry is ScreenEntityEntry {
  return 'entity' in entry && typeof (entry as ScreenEntityEntry).entity === 'string';
}

/** Check if a layout entry is a component entry. */
export function isScreenComponentEntry(entry: ScreenLayoutEntry): entry is ScreenComponentEntry {
  return 'component' in entry && typeof (entry as ScreenComponentEntry).component === 'string';
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
  renderNode: (node: ScreenNode) => string;

  /** Track an import for the generated CSF module. */
  trackImport: (componentName: string) => string;

  /** Evaluate a JSONata expression against data. Returns the result. */
  evaluateExpression: (expressionPath: string, data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * A pluggable renderer for screen nodes.
 * Integrations register these via addon options.
 */
export interface ScreenNodeRenderer {
  /** Unique renderer name (for debugging). */
  name: string;

  /** Priority — higher runs first. Built-ins: -10, integrations: 0+ */
  priority?: number;

  /**
   * Return true if this renderer handles the given node.
   */
  appliesTo: (node: ScreenNode) => boolean;

  /**
   * Render the node to a code string (for CSF module generation).
   */
  render: (node: ScreenNode, ctx: RenderContext) => string;
}
