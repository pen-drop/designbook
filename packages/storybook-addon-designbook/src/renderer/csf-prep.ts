/**
 * CSF Prep — builds the framework-agnostic CSF module string.
 *
 * Steps:
 * 1. Walk ComponentNode[] trees to collect all component references
 * 2. Resolve each component ref → import path via the injected resolver
 * 3. Generate import statements + __imports map
 * 4. Emit CSF module: default export + story exports with args.__scene + renderComponent
 */

import type { ComponentNode } from './types';

// ── Options ────────────────────────────────────────────────────────────

export interface CsfPrepScene {
  name: string;
  exportName: string;
  nodes: ComponentNode[];
  theme?: string;
}

export interface CsfPrepOptions {
  /** Storybook title (e.g. 'Sections/Blog'). */
  group: string;
  /** Source file path — stored in scene parameters. */
  source: string;
  scenes: CsfPrepScene[];
  /**
   * Framework-specific resolver: component ID → import path.
   * Return null if the component cannot be resolved (will emit a warning stub).
   */
  resolveImportPath: (componentId: string) => string | null;
  /**
   * Optional wrapper expression for each __imports map entry.
   * Receives the JS identifier (alias) for the imported module.
   *
   * Examples:
   *   SDC: `(alias) => \`{ render: (p, s) => \${alias}.default.component({...p, ...s}) }\``
   *   React: `(alias) => \`{ render: (p, s) => React.createElement(\${alias}.default, {...p, ...s}) }\``
   *
   * Default: alias is used directly (assumes the module already implements ComponentModule).
   */
  wrapImport?: (alias: string) => string;
}

// ── Import tracking ────────────────────────────────────────────────────

/** Sanitize a component ID to a valid JS identifier. */
function toAlias(componentId: string): string {
  return componentId.replace(/[^a-zA-Z0-9]/g, '');
}

/** Walk a ComponentNode tree and collect all unique component IDs. */
function collectComponentIds(nodes: ComponentNode[], seen = new Set<string>()): Set<string> {
  for (const node of nodes) {
    if (node.component) seen.add(node.component);
    if (node.slots) {
      for (const slotValue of Object.values(node.slots)) {
        if (typeof slotValue === 'string') continue;
        if (Array.isArray(slotValue)) {
          collectComponentIds(slotValue, seen);
        } else {
          collectComponentIds([slotValue], seen);
        }
      }
    }
  }
  return seen;
}

// ── Module generation ─────────────────────────────────────────────────

export function buildCsfModule(opts: CsfPrepOptions): string {
  const { group, source, scenes, resolveImportPath, wrapImport } = opts;

  // Collect all component IDs across all scenes
  const allIds = new Set<string>();
  for (const scene of scenes) {
    collectComponentIds(scene.nodes, allIds);
  }

  // Build import statements and __imports map
  const importLines: string[] = ["import { renderComponent } from 'storybook-addon-designbook/renderer';"];
  const importsMapEntries: string[] = [];

  for (const componentId of allIds) {
    const alias = toAlias(componentId);
    const importPath = resolveImportPath(componentId);

    if (importPath) {
      importLines.push(`import * as ${alias} from '${importPath}';`);
      const mapValue = wrapImport ? wrapImport(alias) : alias;
      importsMapEntries.push(`  '${componentId}': ${mapValue},`);
    } else {
      console.warn(`[Designbook] Cannot resolve import path for component: ${componentId}`);
      // Stub goes directly into __imports without wrapImport — avoids alias.default crash
      importsMapEntries.push(
        `  '${componentId}': { render: (_props, _slots) => { console.warn('[Designbook] Missing component: ${componentId}'); return ''; } },`,
      );
    }
  }

  const importsMap = `const __imports = {\n${importsMapEntries.join('\n')}\n};`;

  // Default export
  const defaultExport = [
    'export default {',
    `  title: '${group.replace(/'/g, "\\'")}',`,
    "  tags: ['scene'],",
    '  parameters: {',
    "    layout: 'fullscreen',",
    '    scene: {',
    `      source: '${source.replace(/'/g, "\\'")}',`,
    '    },',
    '  },',
    '};',
  ].join('\n');

  // Story exports
  const storyExports = scenes.map((scene, index) => {
    const nodesJson = JSON.stringify(scene.nodes, null, 4)
      .split('\n')
      .map((line, i) => (i === 0 ? line : '    ' + line))
      .join('\n');

    const parameters = [`designbook: { order: ${100 + index} }`];
    if (scene.theme) {
      parameters.push(`themes: { themeOverride: '${scene.theme.replace(/'/g, "\\'")}' }`);
    }

    return [
      `export const ${scene.exportName} = {`,
      `  parameters: { ${parameters.join(', ')} },`,
      '  args: {',
      `    __scene: ${nodesJson},`,
      '  },',
      '  render: (args) => renderComponent(args.__scene, __imports),',
      '};',
    ].join('\n');
  });

  return [importLines.join('\n'), '', importsMap, '', defaultExport, '', storyExports.join('\n\n'), ''].join('\n');
}
