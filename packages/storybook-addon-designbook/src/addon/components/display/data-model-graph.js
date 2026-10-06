const REFERENCE_TYPES = new Set(['reference', 'entity_reference']);

/** Non-empty string entries from `target_bundle` and each `target_bundles` item, unique, in order. */
function targetBundlesOf(settings) {
  const seen = new Set();
  const bundles = [];
  const add = (value) => {
    if (typeof value === 'string' && value !== '' && !seen.has(value)) {
      seen.add(value);
      bundles.push(value);
    }
  };
  add(settings?.target_bundle);
  if (Array.isArray(settings?.target_bundles)) settings.target_bundles.forEach(add);
  return bundles;
}

/**
 * Derive a graph from a data model: one node per declared content
 * `<entity_type>.<bundle>` and one directed link per `type: reference`
 * or `type: entity_reference` field, for each of `settings.target_bundle` and
 * `settings.target_bundles`, whose `settings.target_type`.<bundle> is a declared node.
 * Config entities are omitted. References that cannot be resolved (including
 * targets that exist only under config) are returned in `unresolved`, never as links.
 * Returns fresh objects; the input is not mutated.
 */
export function buildDataModelGraph(data) {
  const bundles = new Map();
  for (const [type, typeBundles] of Object.entries(data?.content || {})) {
    for (const [bundle, def] of Object.entries(typeBundles || {})) {
      bundles.set(`${type}.${bundle}`, { type, bundle, def: def || {} });
    }
  }

  const nodes = [];
  const links = [];
  const unresolved = [];
  for (const [id, { type, bundle, def }] of bundles) {
    nodes.push({ id, type, bundle, title: def.title || bundle });
    for (const [field, fieldDef] of Object.entries(def.fields || {})) {
      if (!REFERENCE_TYPES.has(fieldDef?.type)) continue;
      const targetType = fieldDef.settings?.target_type;
      const targetBundles = targetBundlesOf(fieldDef.settings);
      const typeOk = typeof targetType === 'string' && targetType !== '';
      if (!typeOk || targetBundles.length === 0) {
        const target = [targetType, fieldDef.settings?.target_bundle].filter(Boolean).join('.');
        unresolved.push({ source: id, field, target, reason: 'incomplete target' });
        continue;
      }
      const suffix = targetBundles.length > 1;
      for (const targetBundle of targetBundles) {
        const target = `${targetType}.${targetBundle}`;
        if (!bundles.has(target)) {
          unresolved.push({ source: id, field, target, reason: 'undeclared target' });
        } else {
          links.push({
            id: suffix ? `${id}:${field}:${targetBundle}` : `${id}:${field}`,
            source: id,
            target,
            field,
          });
        }
      }
    }
  }
  return { nodes, links, unresolved };
}

/**
 * Visible subgraph for the selected entity types: nodes of those types, links whose both
 * endpoints stay visible, and unresolved references of visible sources. A link to a hidden
 * node is dropped, not reported as unresolved. Returns fresh arrays; the graph is not mutated.
 * @param {ReturnType<typeof buildDataModelGraph>} graph
 * @param {string[]} selectedTypes
 */
export function filterDataModelGraph(graph, selectedTypes) {
  const types = new Set(selectedTypes);
  const nodes = graph.nodes.filter((n) => types.has(n.type));
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes,
    links: graph.links.filter((l) => ids.has(l.source) && ids.has(l.target)),
    unresolved: graph.unresolved.filter((u) => ids.has(u.source)),
  };
}

/**
 * Ids of the focused node and its direct neighbors, incoming and outgoing, within `graph`;
 * `null` when nothing (or a node absent from the graph) is focused.
 * @param {ReturnType<typeof buildDataModelGraph>} graph
 * @param {string | null} focusedId
 */
export function directNeighborIds(graph, focusedId) {
  if (!focusedId || !graph.nodes.some((n) => n.id === focusedId)) return null;
  const ids = new Set([focusedId]);
  for (const link of graph.links) {
    if (link.source === focusedId) ids.add(link.target);
    if (link.target === focusedId) ids.add(link.source);
  }
  return ids;
}
