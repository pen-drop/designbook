/**
 * Entity Resolver — Type definitions.
 */

/** Reference to an entity for resolution. */
export interface EntityRef {
    entity_type: string;
    bundle: string;
    view_mode: string;
    record?: number;
}

/** A resolved component node ready for SDC or React rendering. */
export interface ComponentNode {
    type: 'component';
    component: string;
    props?: Record<string, unknown>;
    slots?: Record<string, unknown>;
}

/** A mapping entry from data-model.yml view_modes.mapping[]. */
export interface MappingEntry {
    component: string;
    props?: Record<string, string | number | boolean>;
    slots?: Record<string, unknown>;
}


/** A view mode definition from data-model.yml. */
export interface ViewModeDef {
    mapping: MappingEntry[];
}

/** A bundle definition from data-model.yml. */
export interface BundleDef {
    title?: string;
    description?: string;
    fields?: Record<string, unknown>;
    view_modes?: Record<string, ViewModeDef>;
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

/** An entity story node as written in .story.yml files. */
export interface EntityStoryNode {
    type: 'entity';
    entity_type: string;
    bundle: string;
    view_mode: string;
    record?: number;
}
