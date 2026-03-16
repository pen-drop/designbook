/**
 * Component Builder — passes `component:` nodes through as ComponentNode.
 *
 * Props and slots from the scene YAML are passed through as-is.
 * resolveEntityRefs() will recurse into slots afterward if they contain SceneNode refs.
 */

import type { SceneNodeBuilder, SceneNode, BuildContext, RawNode } from '../types';

export const componentBuilder: SceneNodeBuilder = {
  appliesTo(node: SceneNode): boolean {
    return 'component' in node && typeof node['component'] === 'string';
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async build(node: SceneNode, _ctx: BuildContext): Promise<RawNode[]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { type, story, ...rest } = node as SceneNode & { type?: string; story?: string };
    return [rest as unknown as RawNode];
  },
};
