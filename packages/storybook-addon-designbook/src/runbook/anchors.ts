import { basename, extname } from 'node:path';

export function slugifyArtifactName(filePath: string): string {
  const stem = basename(filePath, extname(filePath));
  return stem
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
