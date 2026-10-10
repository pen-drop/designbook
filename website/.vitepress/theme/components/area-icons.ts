const svg = (body: string) =>
  `<svg viewBox="0 0 18 18" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">${body}</svg>`

export const AREA_ICONS: Record<string, string> = {
  start: svg(
    '<path d="M4 3.5 14.5 9 4 14.5V3.5Z" stroke="#12454E" stroke-width="1.6" stroke-linejoin="round"/>',
  ),
  extend: svg(
    '<rect x="3" y="3" width="12" height="12" rx="2" stroke="#12454E" stroke-width="1.6"/><path d="M9 6v6M6 9h6" stroke="#EE8B6B" stroke-width="1.6" stroke-linecap="round"/>',
  ),
  plug: svg(
    '<path d="M7 3v4M11 3v4M5 7h8v3a4 4 0 0 1-8 0V7Z" stroke="#12454E" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 14v2" stroke="#12454E" stroke-width="1.6" stroke-linecap="round"/>',
  ),
  gear: svg(
    '<circle cx="9" cy="9" r="2.2" stroke="#12454E" stroke-width="1.6"/><path d="M9 2.8v1.6M9 13.6v1.6M2.8 9h1.6M13.6 9h1.6M4.4 4.4l1.1 1.1M12.5 12.5l1.1 1.1M13.6 4.4l-1.1 1.1M5.5 12.5l-1.1 1.1" stroke="#12454E" stroke-width="1.6" stroke-linecap="round"/>',
  ),
}
