import type { ResolvedStep } from '../workflow-resolve.js';
import { slugifyArtifactName } from './anchors.js';

export type ArtifactKind = 'rule' | 'blueprint';
export type ArtifactIndex = Record<string, Array<{ stage: string; task: string }>>;

export function buildArtifactIndex(
  stepResolved: Record<string, ResolvedStep | ResolvedStep[]>,
  stages: Record<string, { steps?: string[] }>,
  kind: ArtifactKind,
): ArtifactIndex {
  const out: ArtifactIndex = {};

  for (const [stageName, stageDef] of Object.entries(stages)) {
    for (const step of stageDef.steps ?? []) {
      const raw = stepResolved[step];
      if (!raw) continue;
      const list = Array.isArray(raw) ? raw : [raw];
      for (const rs of list) {
        const paths = kind === 'rule' ? rs.rules : rs.blueprints;
        for (const p of paths) {
          const slug = slugifyArtifactName(p);
          if (!out[slug]) out[slug] = [];
          out[slug]!.push({ stage: stageName, task: step });
        }
      }
    }
  }

  return out;
}
