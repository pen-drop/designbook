import { marked } from 'marked';

/**
 * parsers.js — Shared markdown and data parsers for designbook content.
 *
 * Provides a generic markdown parser (to HTML) and specialized parsers
 * for structured data extraction where needed (e.g. screenshots).
 */

// ---------------------------------------------------------------------------
// Generic markdown to HTML parser
// ---------------------------------------------------------------------------

export function parseMarkdown(md) {
  if (!md) return null;
  return marked.parse(md);
}

// ---------------------------------------------------------------------------
// Data Extraction Parsers (Specialized)
// ---------------------------------------------------------------------------

/**
 * Extracts h2 headings from roadmap markdown to identify sections.
 * Used for logic (counting sections), not display.
 */
export function parseRoadmapData(md) {
  if (!md) return [];
  const tokens = marked.lexer(md);
  const sections = [];
  tokens.forEach((token) => {
    if (token.type === 'heading' && token.depth === 2) {
      sections.push({ title: token.text });
    }
  });
  return sections;
}

/**
 * Splits product overview markdown into sections by H2 headings.
 * Returns an array of { title, html } objects.
 */
export function parseProductSections(md) {
  if (!md) return null;
  const tokens = marked.lexer(md);
  const sections = [];
  let current = null;

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 2) {
      if (current) sections.push(current);
      current = { title: token.text, tokens: [] };
    } else if (current) {
      current.tokens.push(token);
    }
  }
  if (current) sections.push(current);

  return sections.length > 0 ? sections.map((s) => ({ title: s.title, html: marked.parser(s.tokens) })) : null;
}

export function parseScreenshots(md) {
  if (!md) return [];
  const tokens = marked.lexer(md);
  const shots = [];

  // Helper to find images in tokens
  const findImages = (token) => {
    if (token.type === 'image') {
      shots.push({ alt: token.text, path: token.href });
    }

    // Traverse children
    if (token.tokens) {
      token.tokens.forEach(findImages);
    }

    // Special case for list items which store children in 'items'
    if (token.items) {
      token.items.forEach(findImages);
    }
  };

  tokens.forEach(findImages);
  return shots;
}
