/**
 * Screen Renderer — Type definitions.
 *
 * Types for the *.screen.yml format, which describes page-level
 * compositions of UI components and entity references.
 */

import type { ComponentNode } from '../entity/types';

/** A component entry in a screen layout slot. */
export interface ScreenComponentEntry {
    component: string;
    props?: Record<string, unknown>;
    slots?: Record<string, unknown>;
    story?: string;
}

/** An entity entry in a screen layout slot. */
export interface ScreenEntityEntry {
    entity: string;          // "node.article"
    view_mode: string;
    record?: number;         // single record
    records?: number[];      // multiple records shorthand
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
    slots: Record<string, ComponentNode[]>;
}

/** Check if a layout entry is an entity entry. */
export function isScreenEntityEntry(entry: ScreenLayoutEntry): entry is ScreenEntityEntry {
    return 'entity' in entry && typeof (entry as ScreenEntityEntry).entity === 'string';
}

/** Check if a layout entry is a component entry. */
export function isScreenComponentEntry(entry: ScreenLayoutEntry): entry is ScreenComponentEntry {
    return 'component' in entry && typeof (entry as ScreenComponentEntry).component === 'string';
}
