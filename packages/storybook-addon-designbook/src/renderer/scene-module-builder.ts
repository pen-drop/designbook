/**
 * Scene Module Builder — framework-agnostic base for building CSF story modules.
 *
 * Handles all shared concerns:
 * - Scene parsing from YAML
 * - Data model + sample data loading
 * - Layout → SceneNode conversion
 * - Render service orchestration
 *
 * Delegates framework-specific concerns to a ModuleBuilder adapter:
 * - Import tracking and component resolution
 * - Entity marker resolution
 * - CSF code generation (module text output)
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import jsonata from 'jsonata';
import { parseScene } from './parser';
import { extractGroup, buildExportName, fileBaseName, extractScenes } from './scene-metadata';
import type { SceneLayoutEntry } from './types';
import { SceneNodeRenderService } from './render-service';
import type {
    DataModel,
    SampleData,
    SceneNode,
    EntitySceneNode,
    ComponentSceneNode,
    SceneNodeRenderer,
    RenderContext,
} from './types';
import { isSceneEntityEntry, isSceneComponentEntry } from './types';

// ── Types ──────────────────────────────────────────────────────────

/** A single resolved scene ready for code generation. */
export interface ResolvedScene {
    name: string;
    exportName: string;
    /** slot name → rendered code strings */
    slots: Record<string, string[]>;
}

/** Framework-specific module builder adapter. */
export interface ModuleBuilder {
    /**
     * Called once per module to set up import tracking.
     * Returns a trackImport function for use during rendering.
     */
    createImportTracker(designbookDir: string): {
        trackImport: (componentId: string) => string;
        getImports: () => string[];
    };

    /**
     * Resolve entity expression markers in rendered output.
     * SDC uses __ENTITY_EXPR__…__END_ENTITY_EXPR__ markers.
     * Other frameworks may handle entity rendering differently.
     */
    resolveMarkers(
        rendered: string,
        sampleData: SampleData,
        renderService: SceneNodeRenderService,
        renderContext: RenderContext,
    ): Promise<string>;

    /**
     * Generate the final CSF module code string.
     */
    generateModule(opts: {
        imports: string[];
        group: string;
        source: string;
        scenes: ResolvedScene[];
    }): string;
}

// ── Shared options ─────────────────────────────────────────────────

export interface SceneModuleOptions {
    provider?: string;
    renderers?: SceneNodeRenderer[];
    builtinRenderers?: SceneNodeRenderer[];
}

// ── Layout reference resolution ────────────────────────────────────

/**
 * Resolve a layout reference like "shell" or "shell:minimal".
 *
 * Scans ALL *.scenes.yml files in {designbookDir}/{source}/ and collects
 * their scenes. Returns the layout slots of the matched scene.
 *
 * Reference syntax:
 *   "shell"          → all scenes in shell/ → first scene (scenes[0])
 *   "shell:minimal"  → all scenes in shell/ → scene named "minimal"
 */
function resolveLayoutReference(
    ref: string,
    designbookDir: string,
    trackDependency?: (sceneId: string, dataFile: string) => void,
    sceneId?: string,
): Record<string, SceneLayoutEntry[]> | undefined {
    const [source, sceneName] = ref.split(':');
    const dir = join(designbookDir, source!);

    // Collect all *.scenes.yml files in the directory
    let files: string[];
    try {
        files = readdirSync(dir)
            .filter(f => f.endsWith('.scenes.yml'))
            .map(f => join(dir, f));
    } catch {
        console.warn(`[Designbook] Layout reference "${ref}": directory not found: ${dir}`);
        return undefined;
    }

    if (files.length === 0) {
        console.warn(`[Designbook] Layout reference "${ref}": no *.scenes.yml files in ${dir}`);
        return undefined;
    }

    // Parse all scenes from all files
    const allScenes: { name: string; layout: Record<string, SceneLayoutEntry[]> }[] = [];
    for (const file of files) {
        try {
            const raw = parseYaml(readFileSync(file, 'utf-8')) as Record<string, unknown>;
            const scenes = extractScenes(raw) as unknown[];
            for (const s of scenes) {
                const parsed = parseScene(s);
                allScenes.push(parsed);
                trackDependency?.(sceneId ?? '', file);
            }
        } catch (e) {
            console.warn(`[Designbook] Layout reference "${ref}": error parsing ${file}:`, e);
        }
    }

    if (allScenes.length === 0) {
        console.warn(`[Designbook] Layout reference "${ref}": no scenes found in ${dir}`);
        return undefined;
    }

    // Find the target scene: by name or first
    let target;
    if (sceneName) {
        target = allScenes.find(s => s.name.toLowerCase() === sceneName.toLowerCase());
        if (!target) {
            console.warn(`[Designbook] Layout reference "${ref}": scene "${sceneName}" not found, using first`);
            target = allScenes[0];
        }
    } else {
        target = allScenes[0];
    }

    console.log(`[Designbook] Layout reference "${ref}" resolved → scene "${target!.name}" with slots: [${Object.keys(target!.layout).join(', ')}]`);
    return target!.layout;
}

// ── Main entry point ───────────────────────────────────────────────

/**
 * Build a CSF story module from a parsed scenes YAML object.
 *
 * This is framework-agnostic — all framework-specific behaviour comes
 * from the `builder` adapter.
 */
export async function buildSceneModule(
    id: string,
    raw: Record<string, unknown>,
    designbookDir: string,
    builder: ModuleBuilder,
    options: SceneModuleOptions = {},
    trackDependency?: (sceneId: string, dataFile: string) => void,
): Promise<string> {
    // ── 1. Parse scenes ──────────────────────────────────────────────
    const scenesArray: unknown[] = extractScenes(raw) as unknown[];
    const parsedScenes = scenesArray.map((s: unknown) => parseScene(s));

    // ── 1b. Resolve layout reference ────────────────────────────────
    let layoutSlots: Record<string, SceneLayoutEntry[]> | undefined;
    if (typeof raw.layout === 'string') {
        layoutSlots = resolveLayoutReference(raw.layout, designbookDir, trackDependency, id);
    }

    // ── 2. Load data model ───────────────────────────────────────────
    let dataModel: DataModel;
    const dataModelPath = join(designbookDir, 'data-model.yml');
    try {
        dataModel = parseYaml(readFileSync(dataModelPath, 'utf-8')) as DataModel;
        trackDependency?.(id, dataModelPath);
    } catch {
        console.warn('[Designbook] No data-model.yml found, scene entities will not resolve');
        dataModel = { content: {} };
    }

    // ── 3. Load sample data ──────────────────────────────────────────
    let sampleData: SampleData = {};
    const firstScene = parsedScenes[0];
    let sectionId = firstScene?.section;
    if (!sectionId) {
        const match = id.match(/sections\/([^/]+)\//);
        if (match) sectionId = match[1];
    }
    if (sectionId) {
        const sectionDataPath = join(designbookDir, 'sections', sectionId, 'data.yml');
        const globalDataPath = join(designbookDir, 'data.yml');
        try {
            sampleData = parseYaml(readFileSync(sectionDataPath, 'utf-8')) as SampleData;
            trackDependency?.(id, sectionDataPath);
        } catch {
            try {
                sampleData = parseYaml(readFileSync(globalDataPath, 'utf-8')) as SampleData;
                trackDependency?.(id, globalDataPath);
            } catch {
                console.warn(`[Designbook] No data.yml found for scene "${firstScene?.name ?? 'unknown'}"`);
            }
        }
    }

    // ── 4. Scene metadata ────────────────────────────────────────────
    const fileBase = fileBaseName(id);
    const group = extractGroup(raw, fileBase);

    // ── 5. Render service ────────────────────────────────────────────
    const renderService = new SceneNodeRenderService();
    if (options.builtinRenderers) {
        renderService.register(options.builtinRenderers);
    }
    if (options.renderers && options.renderers.length > 0) {
        renderService.register(options.renderers);
    }

    // ── 6. Import tracker (framework-specific) ───────────────────────
    const { trackImport, getImports } = builder.createImportTracker(designbookDir);

    // ── 7. Build RenderContext ───────────────────────────────────────
    const renderContext: RenderContext = {
        provider: options.provider,
        dataModel,
        sampleData,
        designbookDir,
        renderNode: (node: SceneNode) => renderService.render(node, renderContext),
        trackImport,
        evaluateExpression: async (exprPath: string, data: Record<string, unknown>) => {
            const expr = jsonata(readFileSync(exprPath, 'utf-8'));
            return expr.evaluate(data);
        },
    };

    // ── 8. Process scenes ────────────────────────────────────────────
    const resolvedScenes: ResolvedScene[] = [];

    for (const scene of parsedScenes) {
        // Merge: layout reference slots + scene overrides
        const mergedLayout = layoutSlots
            ? { ...layoutSlots, ...scene.layout }
            : scene.layout;

        // Convert layout entries → SceneNode[]
        const sceneNodes: Record<string, SceneNode[]> = {};
        for (const [slotName, entries] of Object.entries(mergedLayout)) {
            const nodes: SceneNode[] = [];
            for (const entry of entries) {
                if (isSceneEntityEntry(entry)) {
                    const [entity_type, bundle] = entry.entity.split('.');
                    nodes.push({
                        type: 'entity',
                        entity_type,
                        bundle,
                        view_mode: entry.view_mode,
                        record: entry.record ?? 0,
                    } as EntitySceneNode);
                } else if (isSceneComponentEntry(entry)) {
                    nodes.push({
                        type: 'component',
                        component: entry.component,
                        props: entry.props,
                        slots: entry.slots,
                        story: entry.story,
                    } as ComponentSceneNode);
                }
            }
            sceneNodes[slotName] = nodes;
        }

        // Render + resolve markers
        const slots: Record<string, string[]> = {};
        for (const [slotName, nodes] of Object.entries(sceneNodes)) {
            const renders: string[] = [];
            for (const node of nodes) {
                let rendered = renderService.render(node, renderContext);
                rendered = await builder.resolveMarkers(rendered, sampleData, renderService, renderContext);
                renders.push(rendered);
            }
            slots[slotName] = renders;
        }

        resolvedScenes.push({
            name: scene.name,
            exportName: buildExportName(scene.name),
            slots,
        });
    }

    // ── 9. Generate module (framework-specific) ──────────────────────
    return builder.generateModule({
        imports: getImports(),
        group,
        source: fileBase + '.scenes.yml',
        scenes: resolvedScenes,
    });
}
