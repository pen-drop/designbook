import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { walkDocument, PAGE_SCRIPT } from '../element-walker.js';

function loadFixture(): Document {
  const html = readFileSync(resolve(__dirname, '../../../../../tests/fixtures/element-walker/basic-page.html'), 'utf8');
  return new JSDOM(html, { pretendToBeVisual: true }).window.document;
}

describe('element walker', () => {
  it('produces a CapturedSource with url-dom kind', () => {
    const doc = loadFixture();
    const captured = walkDocument(doc, {
      sourceRef: 'file://fixture',
      viewport: { width: 1440, height: 900 },
    });

    expect(captured.source_kind).toBe('url-dom');
    expect(captured.source_ref).toBe('file://fixture');
    expect(captured.viewport).toEqual({ width: 1440, height: 900 });
    expect(captured.captured_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(captured.adapter_version).toMatch(/^url-playwright\//);
    expect(Array.isArray(captured.nodes)).toBe(true);
    expect(captured.nodes.length).toBeGreaterThan(5);
  });

  it('captures the header with role=banner and flex-row layout', () => {
    const doc = loadFixture();
    const captured = walkDocument(doc, { sourceRef: 'file://fixture' });
    const header = captured.nodes.find((n) => n.role === 'banner');

    expect(header).toBeDefined();
    expect(header!.kind).toBe('container');
    expect(header!.style.layout).toBe('flex-row');
    expect(header!.style.main_axis_align).toBe('space-between');
    expect(header!.style.background).toBe('#ffffff');
    expect(header!.source.locator).toContain('header');
    expect(header!.child_ids.length).toBeGreaterThan(0);
  });

  it('assigns deterministic IDs', () => {
    const doc = loadFixture();
    const a = walkDocument(doc, { sourceRef: 'file://fixture' });
    const b = walkDocument(doc, { sourceRef: 'file://fixture' });
    expect(a.nodes.map((n) => n.id)).toEqual(b.nodes.map((n) => n.id));
  });

  it('skips nodes with display:none', () => {
    const dom = new JSDOM(
      `<html><body><div id="visible">Hi</div><div id="hidden" style="display:none">Bye</div></body></html>`,
      { pretendToBeVisual: true },
    );
    const captured = walkDocument(dom.window.document, { sourceRef: 'test' });
    const labels = captured.nodes.map((n) => n.label).join(' ');
    expect(labels).toContain('Hi');
    expect(labels).not.toContain('Bye');
  });

  it('normalizes background colors to hex', () => {
    const dom = new JSDOM(`<html><body><div style="background-color: rgb(255, 0, 0)">Red</div></body></html>`, {
      pretendToBeVisual: true,
    });
    const captured = walkDocument(dom.window.document, { sourceRef: 'test' });
    const red = captured.nodes.find((n) => n.label === 'Red');
    expect(red!.style.background).toBe('#ff0000');
  });

  it('classifies link/button/image kinds', () => {
    const doc = loadFixture();
    const captured = walkDocument(doc, { sourceRef: 'file://fixture' });
    const ctaLink = captured.nodes.find((n) => n.label === 'Sign up');
    expect(ctaLink!.kind).toBe('link');
    expect(ctaLink!.href).toBe('/signup');
  });

  it('treats rgba(0,0,0,0) as no background instead of solid black', () => {
    const dom = new JSDOM(`<html><body><div style="background-color: rgba(0,0,0,0)">Transparent</div></body></html>`, {
      pretendToBeVisual: true,
    });
    const captured = walkDocument(dom.window.document, { sourceRef: 'test' });
    const t = captured.nodes.find((n) => n.label === 'Transparent');
    expect(t).toBeDefined();
    expect(t!.style.background).not.toBe('#000000');
    expect(t!.style.background).toBe('');
  });

  it('PAGE_SCRIPT is valid JS containing all required identifiers', () => {
    expect(typeof PAGE_SCRIPT).toBe('string');
    // Required helpers must each be present by name.
    const required = [
      'ADAPTER_VERSION',
      'ROLE_TAG_MAP',
      'KIND_TAG_MAP',
      'HEADING_TAGS',
      'rgbToHex',
      'resolveBackground',
      'normalizeBox',
      'mapLayout',
      'mapAxisAlign',
      'mapCrossAlign',
      'isVisible',
      'hashId',
      'getDomPath',
      'findHeadingContext',
      'getRole',
      'getKind',
      'getLabel',
      'buildStyle',
      'walkDocument',
    ];
    for (const id of required) {
      expect(PAGE_SCRIPT).toContain(id);
    }
    // The script must parse as valid JavaScript (Function ctor throws on syntax error).
    expect(() => new Function(PAGE_SCRIPT + '; return walkDocument;')).not.toThrow();
  });
});
