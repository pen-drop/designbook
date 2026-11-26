/** Suffix of a sample-data display companion: `<field>_formatted` holds `<field>`'s display string. */
const FORMATTED_SUFFIX = '_formatted';

/** The base field of a `<field>_formatted` companion name, or undefined when `name` is not one. */
export function formattedBase(name: string): string | undefined {
  if (!name.endsWith(FORMATTED_SUFFIX) || name.length === FORMATTED_SUFFIX.length) return undefined;
  return name.slice(0, -FORMATTED_SUFFIX.length);
}

/** `record` with each base field replaced by its `<field>_formatted` companion, or undefined when it has none. */
export function displayRecord(record: unknown): Record<string, unknown> | undefined {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return undefined;
  const rec = record as Record<string, unknown>;
  const display = { ...rec };
  let found = false;
  for (const [key, value] of Object.entries(rec)) {
    const base = formattedBase(key);
    if (base !== undefined && base in rec) {
      display[base] = value;
      found = true;
    }
  }
  return found ? display : undefined;
}

type Tree = Record<string, unknown>;
const isTree = (v: unknown): v is Tree => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Merge a mapping evaluated over the raw record with the same mapping evaluated over its
 * display record: scalar slot values take the display value, props keep the raw one.
 */
export function withSlotDisplay(raw: unknown, display: unknown): unknown {
  if (Array.isArray(raw)) {
    return Array.isArray(display) && display.length === raw.length
      ? raw.map((item, i) => withSlotDisplay(item, display[i]))
      : raw;
  }
  if (!isTree(raw) || !isTree(display)) return raw;
  const slots = raw.slots;
  if (!isTree(slots) || !isTree(display.slots)) return raw;
  const shown = display.slots;
  const merged: Tree = {};
  for (const [name, value] of Object.entries(slots)) merged[name] = slotValue(value, shown[name]);
  return { ...raw, slots: merged };
}

function slotValue(raw: unknown, display: unknown): unknown {
  if (Array.isArray(raw)) {
    return Array.isArray(display) && display.length === raw.length
      ? raw.map((item, i) => slotValue(item, display[i]))
      : raw;
  }
  if (isTree(raw)) return withSlotDisplay(raw, display);
  // Shapes differ only when a condition reads the companion's field; keep the raw value then.
  // shortcut: a condition with the same shape on both sides (e.g. `field = 0 ? a : b`) may pick another branch over the display string; evaluate conditions on the raw record if that bites.
  return raw === null || raw === undefined || isTree(display) || Array.isArray(display) ? raw : display;
}
