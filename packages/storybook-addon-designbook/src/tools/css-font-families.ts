/**
 * Parse a CSS `font-family` value into its ordered list of family names,
 * honouring quotes and commas. A pure leaf shared by the reference capture
 * pipeline (`reference-project`) and the page extractor (`extract-page`).
 *
 * Extracted from `cli/extract-page.ts` (DESIGNBOOK-60 R5) so `reference-project`
 * imports the parser directly instead of the CLI extractor — breaking the
 * `reference-project` ↔ `extract-page` runtime import cycle.
 */
export function cssFontFamilies(value: string): string[] {
  const families: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  for (const ch of value) {
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ',') {
      const family = current.trim();
      if (family) families.push(family);
      current = '';
      continue;
    }
    current += ch;
  }
  const family = current.trim();
  if (family) families.push(family);
  return families;
}
