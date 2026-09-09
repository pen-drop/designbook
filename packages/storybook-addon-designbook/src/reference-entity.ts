import { existsSync, realpathSync } from 'node:fs';
import { join, relative, resolve, isAbsolute } from 'node:path';
import type { DesignbookConfig } from './config.js';
import { readPublishedCapture, type ObservationMeta, type ObservationExtract } from './reference-capture.js';
import { projectPublishedObservations } from './reference-project.js';

export type ReferenceElement = ObservationMeta['elements'][number];
export interface ReferenceJSON {
  id: string;
  revision: string;
  source: ObservationMeta['source'];
  role: ObservationMeta['role'];
  elements: ReferenceElement[];
  captures: ObservationExtract['captures'];
  dir: string;
}

/** A reference binding is a complete id/revision pair, never a live source URL. */
export function isReferenceBinding(value: string): boolean {
  return /^[a-f0-9]{16}\/[a-f0-9]{16}$/.test(value);
}

export class Reference {
  private constructor(
    readonly id: string,
    readonly revision: string,
    readonly dir: string,
    private readonly data: ObservationMeta,
    private readonly captures: ObservationExtract['captures'],
  ) {}

  static load(config: DesignbookConfig, binding: string): Reference | null {
    if (!isReferenceBinding(binding)) return null;
    const root = resolve(config.data, 'references');
    const directory = join(root, binding);
    if (!existsSync(join(directory, 'publication.json'))) return null;
    const relativeDirectory = relative(realpathSync(root), realpathSync(directory));
    if (relativeDirectory.startsWith('..') || isAbsolute(relativeDirectory)) return null;
    const published = readPublishedCapture(directory);
    if (`${published.id}/${published.revision}` !== binding) throw new Error('Reference binding identity differs');
    const { meta, extract } = projectPublishedObservations(directory);
    return new Reference(published.id, published.revision, `references/${binding}`, meta, extract.captures);
  }

  toJSON(): ReferenceJSON {
    return {
      id: this.id,
      revision: this.revision,
      source: this.data.source,
      role: this.data.role,
      dir: this.dir,
      elements: this.data.elements,
      captures: this.captures,
    };
  }
}
