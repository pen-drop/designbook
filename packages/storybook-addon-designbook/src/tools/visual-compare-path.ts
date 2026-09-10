export interface VisualCompareRegion {
  name: string;
  state: string;
}

export function referenceImagePath(referenceDir: string, breakpoint: string, region: VisualCompareRegion): string {
  return `/__designbook/load?path=${referenceDir}/${encodeURIComponent(breakpoint)}--${encodeURIComponent(region.name)}--${encodeURIComponent(region.state)}.png`;
}
