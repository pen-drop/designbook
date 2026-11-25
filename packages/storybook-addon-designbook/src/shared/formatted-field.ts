/** Suffix of a sample-data display companion: `<field>_formatted` holds `<field>`'s display string. */
export const FORMATTED_SUFFIX = '_formatted';

/** The base field of a `<field>_formatted` companion name, or undefined when `name` is not one. */
export function formattedBase(name: string): string | undefined {
  if (!name.endsWith(FORMATTED_SUFFIX) || name.length === FORMATTED_SUFFIX.length) return undefined;
  return name.slice(0, -FORMATTED_SUFFIX.length);
}
