// Type declarations for element-walker.js. Co-located so TypeScript prefers
// these types over the .js source — keeping the .js out of any consumer's
// rootDir without sacrificing type safety. The walker is deliberately a
// plain .js module so it can be inlined into a Playwright `run-code`
// browser-side function via `walkDocument.toString()`.

export interface CapturedSourceViewport {
  width: number;
  height: number;
}

export interface CapturedSourceBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CapturedSourceStyle {
  layout: 'flex-row' | 'flex-col' | 'grid' | 'stack' | 'none';
  main_axis_align?: string;
  cross_axis_align?: string;
  gap?: string;
  padding: string;
  margin: string;
  border?: string;
  border_radius?: string;
  background?: string;
  foreground?: string;
  font_family?: string;
  font_size?: string;
  font_weight?: string;
  line_height?: string;
  letter_spacing?: string;
  text_transform?: string;
}

export interface CapturedSourceNode {
  id: string;
  parent_id: string | null;
  child_ids: string[];
  label: string;
  kind: string;
  role?: string;
  heading_context?: string;
  bbox: CapturedSourceBBox;
  text?: string;
  href?: string;
  src?: string;
  alt?: string;
  style: CapturedSourceStyle;
  source: { locator: string; raw?: string };
}

export interface CapturedSource {
  source_kind: 'url-dom' | 'figma' | 'screenshot';
  source_ref: string;
  captured_at: string;
  viewport?: CapturedSourceViewport;
  adapter_version: string;
  nodes: CapturedSourceNode[];
}

export interface WalkDocumentOptions {
  sourceRef?: string;
  viewport?: CapturedSourceViewport;
}

export function walkDocument(doc: Document, options?: WalkDocumentOptions): CapturedSource;

/**
 * Self-contained source string with all helpers + walkDocument, ready for
 * `eval()` inside a Playwright `page.evaluate` call. Required because
 * `walkDocument.toString()` alone strips module-scoped helper references.
 */
export const PAGE_SCRIPT: string;

declare const _default: (page: unknown) => Promise<void>;
export default _default;
