/**
 * Ref Renderer — storyNodesRenderer plugin for storybook-addon-sdc.
 *
 * Handles `type: ref` story nodes.
 * Since data is now resolved at build time, this renderer should simply pass through
 * the resolved value or fall back gracefully if data is missing.
 */

export const refStoryNodeRenderer = [
    {
        appliesTo: (item) => item?.type === 'ref',
        render: (item) => {
            // Build-time resolved data might have replaced the node entirely.
            // But if we still see 'type: ref', it means resolution failed or
            // we are in a non-entity context.

            // If the item itself IS the resolved value (e.g. string/number), return it.
            // However, SDC addon passes the *node* object here.

            // If the node has been transformed by Vite plugin, it shouldn't possess 'type: ref' anymore
            // unless we failed to resolve it.

            // Fallback: Check if item is just a value wrapping
            if (item.value !== undefined) {
                return JSON.stringify(item.value);
            }

            if (item.path) {
                return JSON.stringify(`[unresolved: ${item.path}]`);
            }

            if (item.field) {
                return JSON.stringify(item.field);
            }

            return JSON.stringify('[ref: unknown]');
        },
        priority: 10,
    },
];
