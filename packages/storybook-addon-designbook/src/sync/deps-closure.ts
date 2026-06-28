/**
 * Dependency closure resolver for Drupal config entities.
 *
 * Given a set of target entities and a pool of all known entities, computes
 * the transitive closure reachable via `data.dependencies.config[]` when
 * withDeps is true, or returns only the targets unchanged when false.
 */

interface DrupalConfigEntity {
  config_name: string;
  data: {
    dependencies: {
      config?: string[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

interface ClosureOptions {
  withDeps: boolean;
  pool: DrupalConfigEntity[];
}

/**
 * Compute the dependency closure for a set of target config entities.
 *
 * @param targets - The initial set of entities to start from.
 * @param options - withDeps: if true, follow transitive config dependencies;
 *                  pool: the full set of entities to resolve dependency names against.
 * @returns Deduped array of DrupalConfigEntity objects.
 */
export function closure(targets: DrupalConfigEntity[], { withDeps, pool }: ClosureOptions): DrupalConfigEntity[] {
  if (!withDeps) {
    return targets;
  }

  const poolMap = new Map<string, DrupalConfigEntity>(pool.map((e) => [e.config_name, e]));

  const visited = new Set<string>();
  const result: DrupalConfigEntity[] = [];
  const queue: DrupalConfigEntity[] = [...targets];

  while (queue.length > 0) {
    const entity = queue.shift()!;
    if (visited.has(entity.config_name)) {
      continue;
    }
    visited.add(entity.config_name);
    result.push(entity);

    const deps = entity.data.dependencies.config ?? [];
    for (const depName of deps) {
      if (!visited.has(depName)) {
        const depEntity = poolMap.get(depName);
        if (depEntity) {
          queue.push(depEntity);
        }
      }
    }
  }

  return result;
}
