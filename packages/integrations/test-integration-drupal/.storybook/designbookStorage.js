/**
 * Designbook Storage — global data store for entity test data.
 *
 * Loads all data.json files from sections directories and merges them
 * into a single data store. Framework-agnostic — can be used by
 * refRenderer, Drupal, or any other integration.
 *
 * Also manages entity context for the current component being processed.
 * Context is set by the designbook vite plugin (enforce: 'pre') and
 * read by the refRenderer during the SDC addon's story processing.
 */
import { readFileSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { globSync } from 'glob';

let _store = null;

/**
 * Initialize the global storage by scanning for data.json files.
 *
 * @param {string} baseDir - Project root directory
 * @param {string} [fsRoot='designbook'] - Designbook directory relative to baseDir
 * @returns {object} The merged data store
 */
export function initStorage(baseDir, fsRoot = 'designbook') {
    const pattern = join(baseDir, fsRoot, 'sections', '*', 'data.json');
    const dataFiles = globSync(pattern);
    const merged = {};

    for (const file of dataFiles) {
        try {
            const data = JSON.parse(readFileSync(file, 'utf-8'));
            for (const [entityType, bundles] of Object.entries(data)) {
                if (!merged[entityType]) {
                    merged[entityType] = {};
                }
                for (const [bundle, records] of Object.entries(bundles)) {
                    if (Array.isArray(merged[entityType][bundle]) && Array.isArray(records)) {
                        merged[entityType][bundle] = merged[entityType][bundle].concat(records);
                    } else {
                        merged[entityType][bundle] = records;
                    }
                }
            }
        } catch (err) {
            console.warn(`[Designbook Storage] Error loading ${file}:`, err.message);
        }
    }

    _store = merged;
    console.log(`[Designbook Storage] Loaded ${dataFiles.length} data file(s), entities: ${Object.keys(merged).join(', ')}`);
    return _store;
}

/**
 * Load a specific data file and register it in the store.
 *
 * @param {string} filePath - Absolute path to the data file
 */
export function loadDataFile(filePath) {
    if (!_store) _store = {};
    if (!existsSync(filePath)) {
        console.warn(`[Designbook Storage] File not found: ${filePath}`);
        return;
    }
    try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        for (const [entityType, bundles] of Object.entries(data)) {
            if (!_store[entityType]) _store[entityType] = {};
            for (const [bundle, records] of Object.entries(bundles)) {
                _store[entityType][bundle] = records;
            }
        }
    } catch (err) {
        console.warn(`[Designbook Storage] Error loading ${filePath}:`, err.message);
    }
}

/**
 * Get the global data store.
 * @returns {object|null}
 */
export function getStorage() {
    return _store;
}

/**
 * Set the current entity context.
 * Called by the designbook vite plugin when entering a component
 * that has designbook.entity metadata.
 *
 * @param {{ type: string, bundle: string, record?: number }} ctx
 */
export function setContext(ctx) {
    globalThis.__designbook_entity_context = ctx;
}

/**
 * Get the current entity context.
 * @returns {{ type: string, bundle: string, record?: number }|null}
 */
export function getContext() {
    return globalThis.__designbook_entity_context || null;
}

/**
 * Resolve a field path against a specific entity record.
 *
 * @param {string} field - Field path (e.g. 'title', 'field_media.url')
 * @param {string} [entityType] - Entity type (e.g. 'node'). Falls back to context.
 * @param {string} [bundle] - Bundle (e.g. 'article'). Falls back to context.
 * @param {number} [record=0] - Record index. Falls back to context.
 * @returns {*} The resolved value, or undefined
 */
export function resolveField(field, entityType, bundle, record) {
    if (!_store || !field) return undefined;

    const ctx = getContext();
    const et = entityType || ctx?.type;
    const b = bundle || ctx?.bundle;
    const r = record ?? ctx?.record ?? 0;

    if (!et || !b) return undefined;

    const records = _store[et]?.[b];
    if (!Array.isArray(records) || !records[r]) return undefined;

    // Navigate the field path
    let value = records[r];
    for (const part of field.split('.')) {
        if (value == null) return undefined;
        value = value[part];
    }

    return value;
}

/**
 * Resolve a full dot-notation path against the raw store.
 * For cross-entity references like 'block_content.contact_person.0.field_name'.
 *
 * @param {string} path - Full dot path
 * @returns {*}
 */
export function resolvePath(path) {
    if (!_store || !path) return undefined;
    let value = _store;
    for (const part of path.split('.')) {
        if (value == null) return undefined;
        value = value[part];
    }
    return value;
}
