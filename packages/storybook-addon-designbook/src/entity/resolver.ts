/**
 * Entity Resolver — Pure JavaScript core.
 *
 * Resolves entity references against data-model.yml (view_modes mapping)
 * and data.yml (sample records). Framework-agnostic — returns plain
 * ComponentNode[] objects.
 *
 * Supports nested entity references in slots:
 *   slots:
 *     avatar:
 *       type: entity
 *       entity_type: block_content
 *       bundle: contact_person
 *       view_mode: avatar
 */

import type {
    EntityRef,
    ComponentNode,
    MappingEntry,
    DataModel,
    SampleData,
    ViewModeDef,
} from './types';

/**
 * Check if a value is an entity reference node.
 */
function isEntityRef(value: unknown): value is EntityRef {
    return (
        typeof value === 'object' &&
        value !== null &&
        (value as Record<string, unknown>).type === 'entity' &&
        typeof (value as Record<string, unknown>).entity_type === 'string'
    );
}

/**
 * Resolve a $field_name reference against an entity record.
 */
function resolveValue(
    value: unknown,
    record: Record<string, unknown>,
    dataModel: DataModel,
    sampleData: SampleData,
    provider?: string
): unknown {
    if (typeof value === 'string' && value.startsWith('$')) {
        const path = value.slice(1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return path.split('.').reduce((obj: any, key) => obj?.[key], record);
    }

    // Nested entity reference in a slot → resolve recursively
    if (isEntityRef(value)) {
        const nodes = resolveEntity(dataModel, sampleData, value, provider);
        return nodes;
    }

    if (Array.isArray(value)) {
        return value.map((item) => {
            if (item && typeof item === 'object' && 'component' in item) {
                return resolveMapping(item as MappingEntry, record, dataModel, sampleData, provider);
            }
            return resolveValue(item, record, dataModel, sampleData, provider);
        });
    }

    if (typeof value === 'object' && value !== null && !('component' in value)) {
        const resolved: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value)) {
            resolved[k] = resolveValue(v, record, dataModel, sampleData, provider);
        }
        return resolved;
    }

    return value;
}

/**
 * Resolve a single mapping entry against entity data.
 */
function resolveMapping(
    entry: MappingEntry,
    record: Record<string, unknown>,
    dataModel: DataModel,
    sampleData: SampleData,
    provider?: string
): ComponentNode {
    const component = provider ? `${provider}:${entry.component}` : entry.component;

    const node: ComponentNode = { type: 'component', component };

    if (entry.props) {
        node.props = {};
        for (const [key, value] of Object.entries(entry.props)) {
            node.props[key] = resolveValue(value, record, dataModel, sampleData, provider);
        }
    }

    if (entry.slots) {
        node.slots = {};
        for (const [key, value] of Object.entries(entry.slots)) {
            node.slots[key] = resolveValue(value, record, dataModel, sampleData, provider);
        }
    }

    return node;
}

/**
 * Resolve an entity reference to an array of component nodes.
 *
 * Recursively resolves nested entity references in slots.
 *
 * @param dataModel - The data-model.yml content
 * @param sampleData - The data.yml sample records
 * @param ref - Entity reference (type, bundle, view_mode, record)
 * @param provider - Optional SDC provider prefix (e.g. 'daisy_cms_daisyui')
 * @returns Array of resolved ComponentNode objects
 * @throws Error if entity, view mode, or record not found
 */
export function resolveEntity(
    dataModel: DataModel,
    sampleData: SampleData,
    ref: EntityRef,
    provider?: string
): ComponentNode[] {
    const { entity_type, bundle, view_mode, record = 0 } = ref;

    // 1. Look up bundle definition
    const bundleDef = dataModel.content?.[entity_type]?.[bundle];
    if (!bundleDef) {
        throw new Error(`Entity ${entity_type}/${bundle} not found in data model`);
    }

    // 2. Look up view mode
    const viewModeDef: ViewModeDef | undefined = bundleDef.view_modes?.[view_mode];
    if (!viewModeDef) {
        throw new Error(
            `View mode '${view_mode}' not defined for ${entity_type}/${bundle}`
        );
    }

    // 3. Look up sample data record
    const records = sampleData[entity_type]?.[bundle];
    if (!records || !records[record]) {
        throw new Error(
            `Record ${record} not found for ${entity_type}/${bundle} in sample data`
        );
    }

    const entityRecord = records[record] as Record<string, unknown>;

    // 4. Resolve mapping entries (with recursive entity resolution in slots)
    return viewModeDef.mapping.map((entry) =>
        resolveMapping(entry, entityRecord, dataModel, sampleData, provider)
    );
}
