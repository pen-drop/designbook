/** Load the exact published capture association instead of guessing a filename. */
export function referenceImagePath(referenceDir: string, capturePath: string): string {
  return `/__designbook/load?path=${encodeURIComponent(`${referenceDir}/${capturePath}`)}`;
}
