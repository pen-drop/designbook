/**
 * Screen Resolver — resolves a parsed ScreenDef to ComponentNode arrays.
 *
 * Uses entity/resolver.ts for entity entries and passes through
 * component entries with provider prefix applied.
 */

import type { DataModel, SampleData, ComponentNode, EntityRef } from '../entity/types';
import type { ScreenDef, ScreenLayoutEntry, ResolvedScreen } from './types';
import { isScreenEntityEntry, isScreenComponentEntry } from './types';
import { resolveEntity } from '../entity/resolver';

export interface ScreenResolverConfig {
    dataModel: DataModel;
    sampleData: SampleData;
    provider?: string;
}

/**
 * Parse an entity string "node.article" into entity_type and bundle.
 */
function parseEntityPath(entityPath: string): { entity_type: string; bundle: string } {
    const parts = entityPath.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`Invalid entity path "${entityPath}". Expected format: "entity_type.bundle"`);
    }
    return { entity_type: parts[0], bundle: parts[1] };
}

/**
 * Resolve a single layout entry to ComponentNode(s).
 */
function resolveEntry(
    entry: ScreenLayoutEntry,
    config: ScreenResolverConfig
): ComponentNode[] {
    const { dataModel, sampleData, provider } = config;

    if (isScreenEntityEntry(entry)) {
        const { entity_type, bundle } = parseEntityPath(entry.entity);
        const ref: EntityRef = {
            entity_type,
            bundle,
            view_mode: entry.view_mode,
            record: entry.record ?? 0,
        };
        return resolveEntity(dataModel, sampleData, ref, provider);
    }

    if (isScreenComponentEntry(entry)) {
        const component = provider ? `${provider}:${entry.component}` : entry.component;
        const node: ComponentNode = { type: 'component', component };

        if (entry.props) {
            node.props = { ...entry.props };
        }
        if (entry.slots) {
            node.slots = { ...entry.slots };
        }
        if (entry.story) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (node as any).story = entry.story;
        }

        return [node];
    }

    return [];
}

/**
 * Resolve an entire ScreenDef to a ResolvedScreen.
 *
 * Each layout slot is resolved to an array of ComponentNodes.
 */
export function resolveScreen(
    screen: ScreenDef,
    config: ScreenResolverConfig
): ResolvedScreen {
    const slots: Record<string, ComponentNode[]> = {};

    for (const [slotName, entries] of Object.entries(screen.layout)) {
        const nodes: ComponentNode[] = [];
        for (const entry of entries) {
            nodes.push(...resolveEntry(entry, config));
        }
        slots[slotName] = nodes;
    }

    return {
        name: screen.name,
        section: screen.section,
        group: screen.group,
        slots,
    };
}
