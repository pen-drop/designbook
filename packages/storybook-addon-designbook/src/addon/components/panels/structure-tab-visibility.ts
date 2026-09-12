/**
 * Whether the Structure panel tab is disabled (hidden) for a story.
 *
 * Scene stories carry a `scene` parameter; entity stories carry per-record
 * `sceneTrees` (and no `scene`). The tab must be enabled for BOTH so entity
 * stories show the structure tree too (DESIGNBOOK-32, AC-6) — gating on `scene`
 * alone left the tab hidden on every entity story.
 */
export function isStructureTabDisabled(parameters?: { scene?: unknown; sceneTrees?: unknown }): boolean {
  return !parameters?.scene && !parameters?.sceneTrees;
}
