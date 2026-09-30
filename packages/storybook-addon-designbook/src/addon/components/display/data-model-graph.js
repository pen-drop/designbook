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
