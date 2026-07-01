import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { DesignbookConfig } from './config.js';

export interface ReferenceElement {
  id: string;
  selector: string;
  states: Array<{ name: string; steps: unknown[] }>;
  breakpoints: string[];
}

interface ReferenceData {
  source?: { url?: string; origin?: string; screenId?: string; hasMarkup?: boolean };
  elements?: Array<Partial<ReferenceElement>>;
  extract?: string;
  assets_dir?: string;
}

export interface ReferenceJSON {
  source: NonNullable<ReferenceData['source']>;
  elements: ReferenceElement[];
  dir: string;
}

export class Reference {
  private constructor(
    readonly hash: string,
    readonly dir: string,
    private readonly data: ReferenceData,
  ) {}

  static load(config: DesignbookConfig, hash: string): Reference | null {
    const dirAbs = join(config.data, 'references', hash);
    const metaPath = join(dirAbs, 'meta.yml');
    if (!existsSync(metaPath)) return null;
    const data = (parse(readFileSync(metaPath, 'utf8')) ?? {}) as ReferenceData;
    return new Reference(hash, `references/${hash}`, data);
  }

  toJSON(): ReferenceJSON {
    return {
      source: this.data.source ?? {},
      dir: this.dir,
      elements: (this.data.elements ?? []).map((e) => ({
        id: e.id ?? '',
        selector: e.selector ?? '',
        breakpoints: e.breakpoints ?? [],
        states: e.states ?? [{ name: 'rest', steps: [] }],
      })),
    };
  }
}
