/**
 * SDC Component Renderer — renders component nodes to SDC/Twig code.
 *
 * Extracts import tracking, provider prefix, slot nesting, story refs,
 * and TwigSafeArray wrapping from the monolithic renderNode() in vite-plugin.ts.
 */

import type { ScreenNodeRenderer, RenderContext, ComponentScreenNode, ScreenNode } from './types';

/**
 * Create the SDC component renderer.
 * This is a built-in renderer that handles `type: 'component'` nodes.
 */
export const sdcComponentRenderer: ScreenNodeRenderer = {
    name: 'sdc-component',
    priority: -10,

    appliesTo(node: ScreenNode): boolean {
        return node.type === 'component';
    },

    render(node: ScreenNode, ctx: RenderContext): string {
        const componentNode = node as ComponentScreenNode;
        const componentId = ctx.provider
            ? `${ctx.provider}:${componentNode.component}`
            : componentNode.component;

        // Track the import and get the JS variable name
        const varName = ctx.trackImport(componentId);

        // Build the args object: merge props + slots
        const argParts: string[] = [];

        if (componentNode.props) {
            for (const [key, value] of Object.entries(componentNode.props)) {
                argParts.push(`${key}: ${JSON.stringify(value)}`);
            }
        }

        if (componentNode.slots) {
            for (const [slotKey, slotValue] of Object.entries(componentNode.slots)) {
                if (Array.isArray(slotValue)) {
                    // Array of nested nodes → render each recursively
                    const renderedParts = slotValue.map((child: ScreenNode) =>
                        ctx.renderNode(child)
                    );
                    argParts.push(`${slotKey}: [${renderedParts.join(', ')}]`);
                } else {
                    argParts.push(`${slotKey}: ${JSON.stringify(slotValue)}`);
                }
            }
        }

        // Check for .story reference — load story args if available
        const storyRef = componentNode.story;
        const storyArgs = storyRef
            ? `...${varName}.${storyRef.charAt(0).toUpperCase() + storyRef.slice(1)}?.args ?? {}`
            : '';

        const baseArgs = `...${varName}?.Basic?.baseArgs ?? {}`;

        return `${varName}.default.component({${baseArgs}, ${storyArgs ? storyArgs + ', ' : ''}${argParts.join(', ')}})`;
    },
};
