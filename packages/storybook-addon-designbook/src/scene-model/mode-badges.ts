export type ModeBadgeState = 'mapped' | 'open' | 'orphan';
export interface ModeBadge {
  mode: string;
  state: ModeBadgeState;
}

/**
 * Derive per-mode badge states for one bundle from its declared modes and the
 * set of existing mapping files (entity-mapping/ or form-mapping/). Declared
 * modes come first in declaration order (mapped when a file exists, else open);
 * mapping files without a matching declaration are appended as orphan badges,
 * sorted by mode name.
 */
export function deriveModeBadges(
  declared: string[],
  mappingFiles: string[],
  entity_type: string,
  bundle: string,
): ModeBadge[] {
  const prefix = `${entity_type}.${bundle}.`;
  const suffix = '.jsonata';
  const mapped = new Set(
    mappingFiles
      .filter((f) => f.startsWith(prefix) && f.endsWith(suffix))
      .map((f) => f.slice(prefix.length, -suffix.length)),
  );
  const declaredSet = new Set(declared);

  const badges: ModeBadge[] = declared.map((mode) => ({
    mode,
    state: mapped.has(mode) ? 'mapped' : 'open',
  }));

  const orphans = [...mapped].filter((m) => !declaredSet.has(m)).sort();
  for (const mode of orphans) badges.push({ mode, state: 'orphan' });

  return badges;
}
