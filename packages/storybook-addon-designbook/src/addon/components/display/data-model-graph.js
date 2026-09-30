/**
 * Derive a graph from a data model: one node per declared `<entity_type>.<bundle>`
 * (content before config, first wins) and one directed link per `type: reference`
 * field whose `settings.target_type`.`settings.target_bundle` is a declared node.
 * References that cannot be resolved are returned in `unresolved`, never as links.
 * Returns fresh objects; the input is not mutated.
 */
export function buildDataModelGraph(data) {
  const bundles = new Map();
  for (const section of [data?.content, data?.config]) {
    for (const [type, typeBundles] of Object.entries(section || {})) {
      for (const [bundle, def] of Object.entries(typeBundles || {})) {
        const id = `${type}.${bundle}`;
        if (!bundles.has(id)) bundles.set(id, { type, bundle, def: def || {} });
      }
    }
  }

  const nodes = [];
  const links = [];
  const unresolved = [];
  for (const [id, { type, bundle, def }] of bundles) {
    nodes.push({ id, type, bundle, title: def.title || bundle });
    for (const [field, fieldDef] of Object.entries(def.fields || {})) {
      if (fieldDef?.type !== 'reference') continue;
      const targetType = fieldDef.settings?.target_type;
      const targetBundle = fieldDef.settings?.target_bundle;
      const complete = [targetType, targetBundle].every((part) => typeof part === 'string' && part !== '');
      const target = complete ? `${targetType}.${targetBundle}` : [targetType, targetBundle].filter(Boolean).join('.');
      if (!complete) {
        unresolved.push({ source: id, field, target, reason: 'incomplete target' });
      } else if (!bundles.has(target)) {
        unresolved.push({ source: id, field, target, reason: 'undeclared target' });
      } else {
        links.push({ id: `${id}:${field}`, source: id, target, field });
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
