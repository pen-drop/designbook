const HEADING_RE = /^##\s+example\s+output\s*$/i;
const FENCE_OPEN_RE = /^```[\w-]*\s*$/;
const FENCE_CLOSE_RE = /^```\s*$/;
const ANY_HEADING_RE = /^#{1,2}\s+/;

export function extractExample(bodyMarkdown: string): string | null {
  const lines = bodyMarkdown.split('\n');

  let headingIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (HEADING_RE.test(lines[i]!.trim())) {
      headingIdx = i;
      break;
    }
  }
  if (headingIdx === -1) return null;

  for (let i = headingIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i]!.trim();
    if (ANY_HEADING_RE.test(trimmed) && !HEADING_RE.test(trimmed)) return null;
    if (FENCE_OPEN_RE.test(trimmed)) {
      const buf: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        if (FENCE_CLOSE_RE.test(lines[j]!.trim())) return buf.join('\n');
        buf.push(lines[j]!);
      }
      return null; // unterminated fence
    }
  }
  return null;
}
