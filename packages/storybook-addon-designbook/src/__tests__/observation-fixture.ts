/**
 * Synthetic translated source observations: what a source integration hands to
 * `reference import` after reading its host tools. Ids are synthetic; they prove
 * addon behavior, not access to any real file.
 */
import type { CaptureDefinition, ObservationMeta } from '../tools/reference-capture.js';
import type { ReferenceObservationDocument } from '../tools/reference-observations.js';
import { png } from './capture-fixture.js';

export interface ObservationFixtureOptions {
  /** Source kind and locator kind; defaults to a Figma file with figma-node locators. */
  kind?: string;
  locatorKind?: string;
  views?: Array<{ id: string; width: number; height: number; breakpoint?: string }>;
  states?: Array<{ name: string; session: string }>;
}

/** A PNG whose IHDR claims the given pixel size (the image validator reads the header). */
export function sizedPng(width: number, height: number): Buffer {
  const bytes = Buffer.from(png);
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

export function observationFixture(options: ObservationFixtureOptions = {}) {
  const kind = options.kind ?? 'figma';
  const locatorKind = options.locatorKind ?? 'figma-node';
  // Original frame geometry: the screenshot below is a downscaled export of it.
  const views = options.views ?? [{ id: 'desktop', width: 1200, height: 6605 }];
  const states = options.states ?? [{ name: 'rest', session: 'anonymous' }];
  const locator = { kind: locatorKind, value: '12:34' };
  const capture: CaptureDefinition = {
    role: 'reference',
    source: { kind, identity: 'synthetic-file-key', revision: null },
    scope: views.flatMap((view) =>
      states.map((state) => ({
        subject: 'hero',
        view: view.id,
        state: state.name,
        session: state.session,
        locator,
        ...(view.breakpoint ? { breakpoint: view.breakpoint } : {}),
      })),
    ),
  };
  const meta: ObservationMeta = {
    source: capture.source,
    role: 'reference',
    assets_dir: 'assets',
    elements: [{ id: 'hero', locator, states, views }],
  };
  const document = (state: string): ReferenceObservationDocument => ({
    format: 'designbook-observations',
    capture,
    state,
    captured_at: '2026-10-10T08:00:00.000Z',
    extract: {
      subjects: [
        {
          id: 'hero',
          locator,
          samples: views.map((view) => ({
            view: view.id,
            state,
            ...(view.breakpoint ? { breakpoint: view.breakpoint } : {}),
            structure: {
              roots: ['12:34'],
              nodes: [
                { id: '12:34', kind: 'FRAME', locator, children: ['I12:34;56:78'] },
                {
                  id: 'I12:34;56:78',
                  kind: 'INSTANCE',
                  locator: { kind: locatorKind, value: 'I12:34;56:78' },
                  children: [],
                },
              ],
            },
            observations: {
              layout: { layoutMode: 'VERTICAL', itemSpacing: 24 },
              typography: [{ family: 'Inter', weight: 500, size: 13 }],
              content: [{ text: 'Build faster' }],
              properties: { fills: ['#ffffff'] },
            },
            dependencies: { parent_ids: [], asset_ids: ['figma-image:hero-logo'], font_families: ['Inter'] },
            unavailable: [{ property: 'interactions', reason: 'Host tools return no prototype data', required: false }],
          })),
        },
      ],
      parents: [],
      images: [{ url: 'figma-image:hero-logo', role: 'logo', reference_path: 'assets/hero-logo.svg' }],
      fonts: [{ family: 'Inter', source: 'other', files: [] }],
      captures: views.map((view) => ({
        subject: 'hero',
        view: view.id,
        state,
        path: `${view.id}--hero--${state}.png`,
        width: 187,
        height: 1024,
      })),
    },
  });
  return { capture, meta, document, screenshot: sizedPng(187, 1024), asset: Buffer.from('<svg/>') };
}
