/**
 * Ref Renderer — storyNodesRenderer plugin for storybook-addon-sdc.
 *
 * Handles `type: ref` story nodes that resolve entity field data
 * from the global Designbook Storage.
 *
 * Usage in story YAML:
 *   props:
 *     title:
 *       type: ref
 *       field: title
 *
 * The entity context (type, bundle, record) comes from the component's
 * designbook.entity metadata, set automatically before story processing.
 *
 * For cross-entity references, use a full path:
 *   props:
 *     author_name:
 *       type: ref
 *       path: block_content.contact_person.0.field_name
 *
 * Register in main.js:
 *   sdcStorybookOptions: {
 *     storyNodesRenderer: refStoryNodeRenderer,
 *   }
 */
import { resolveField, resolvePath } from './designbookStorage.js';

export const refStoryNodeRenderer = [
    {
        appliesTo: (item) => item?.type === 'ref',
        render: (item) => {
            let value;

            if (item.field) {
                // Short field path — resolved against current entity context
                value = resolveField(item.field);
            } else if (item.path) {
                // Full path — resolved against the raw store (cross-entity)
                value = resolvePath(item.path);
            }

            if (value === undefined) {
                const ref = item.field || item.path || '?';
                console.warn(`[refRenderer] Could not resolve: ${ref}`);
                return JSON.stringify(`[missing: ${ref}]`);
            }

            return JSON.stringify(value);
        },
        priority: 10,
    },
];
