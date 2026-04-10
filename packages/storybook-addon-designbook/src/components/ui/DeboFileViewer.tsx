/**
 * DeboFileViewer — modal overlay that displays file contents.
 *
 * Supports images, markdown (.md), and code/data files with syntax highlighting.
 * Uses Storybook's SyntaxHighlighter for code and parseMarkdown for .md files.
 * Fetches files via the /__designbook/file endpoint using absolute paths.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SyntaxHighlighter } from 'storybook/internal/components';
import { parseMarkdown } from '../parsers';

interface DeboFileViewerProps {
  path: string;
  onClose: () => void;
}

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']);
const MARKDOWN_EXTENSIONS = new Set(['md', 'mdx']);

const SYNTAX_LANGUAGES: Record<string, string> = {
  yml: 'yaml',
  yaml: 'yaml',
  json: 'json',
  jsonata: 'javascript',
  js: 'javascript',
  ts: 'typescript',
  tsx: 'tsx',
  jsx: 'jsx',
  css: 'css',
  html: 'html',
  sh: 'bash',
  bash: 'bash',
};

function getExtension(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

const S = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  modal: {
    background: 'var(--appContentBg, #1a1a2e)',
    border: '1px solid var(--appBorderColor, #333)',
    borderRadius: 8,
    width: '80vw',
    maxWidth: 900,
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderBottom: '1px solid var(--appBorderColor, #333)',
    fontSize: 12,
    fontFamily: 'monospace',
    color: 'var(--textMutedColor, #999)',
    flexShrink: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--textMutedColor, #999)',
    cursor: 'pointer',
    fontSize: 16,
    padding: '0 4px',
    lineHeight: 1,
  },
  body: {
    overflow: 'auto',
    flex: 1,
    textAlign: 'left' as const,
  },
  image: {
    maxWidth: '100%',
    maxHeight: '80vh',
    display: 'block',
    margin: '16px auto',
  },
  error: {
    padding: 16,
    fontSize: 12,
    color: '#f87171',
  },
  loading: {
    padding: 16,
    fontSize: 12,
    color: 'var(--textMutedColor, #999)',
  },
  markdown: {
    padding: '16px 24px',
    fontSize: 13,
    lineHeight: 1.7,
    color: 'var(--textColor, #fff)',
    textAlign: 'left' as const,
  },
  frontmatter: {
    margin: '12px 24px 0',
    padding: '10px 14px',
    background: 'var(--barBg, rgba(255,255,255,0.03))',
    border: '1px solid var(--appBorderColor, #333)',
    borderRadius: 6,
    fontSize: 12,
    fontFamily: 'monospace',
    display: 'grid' as const,
    gridTemplateColumns: 'auto 1fr',
    gap: '4px 12px',
  },
  fmKey: {
    color: 'var(--textMutedColor, #999)',
    fontWeight: 600,
  },
  fmValue: {
    color: 'var(--textColor, #fff)',
    wordBreak: 'break-word' as const,
  },
};

function parseFrontmatter(raw: string): { frontmatter: Record<string, unknown> | null; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: raw };
  try {
    const lines = match[1]!.split('\n');
    const obj: Record<string, unknown> = {};
    for (const line of lines) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      obj[key] = val;
    }
    return { frontmatter: Object.keys(obj).length > 0 ? obj : null, body: match[2]! };
  } catch {
    return { frontmatter: null, body: raw };
  }
}

function formatFmValue(value: unknown): string {
  if (value === null || value === undefined || value === '~') return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function FrontmatterBlock({ data }: { data: Record<string, unknown> }) {
  return (
    <div style={S.frontmatter}>
      {Object.entries(data).map(([key, val]) => (
        <React.Fragment key={key}>
          <span style={S.fmKey}>{key}</span>
          <span style={S.fmValue}>{formatFmValue(val)}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

const MD_SCOPED_CSS = `
  .debo-md h1, .debo-md h2, .debo-md h3, .debo-md h4 {
    margin: 1.2em 0 0.4em;
    font-weight: 600;
    line-height: 1.3;
  }
  .debo-md h1 { font-size: 1.4em; border-bottom: 1px solid var(--appBorderColor, #333); padding-bottom: 0.3em; }
  .debo-md h2 { font-size: 1.15em; }
  .debo-md h3 { font-size: 1em; color: var(--textMutedColor, #999); }
  .debo-md p { margin: 0.5em 0; }
  .debo-md ul, .debo-md ol { padding-left: 1.2em; margin: 0.4em 0; }
  .debo-md li { margin: 0.2em 0; }
  .debo-md li > ul, .debo-md li > ol { margin: 0.1em 0; }
  .debo-md code {
    font-family: monospace;
    font-size: 0.9em;
    background: rgba(255,255,255,0.06);
    padding: 0.15em 0.4em;
    border-radius: 3px;
  }
  .debo-md pre { margin: 0.6em -24px; }
  .debo-md pre code { display: block; padding: 0.8em 24px; background: rgba(0,0,0,0.3); overflow-x: auto; }
  .debo-md table { border-collapse: collapse; margin: 0.6em 0; width: 100%; font-size: 0.92em; }
  .debo-md th, .debo-md td { padding: 0.35em 0.7em; border: 1px solid var(--appBorderColor, #333); text-align: left; }
  .debo-md th { font-weight: 600; background: rgba(255,255,255,0.03); }
  .debo-md blockquote { margin: 0.5em 0; padding: 0.3em 1em; border-left: 3px solid var(--appBorderColor, #555); color: var(--textMutedColor, #999); }
  .debo-md hr { border: none; border-top: 1px solid var(--appBorderColor, #333); margin: 1em 0; }
  .debo-md a { color: #60a5fa; text-decoration: none; }
  .debo-md a:hover { text-decoration: underline; }
`;

function MarkdownBody({ content }: { content: string }) {
  const { frontmatter, body } = useMemo(() => parseFrontmatter(content), [content]);
  const html = useMemo(() => parseMarkdown(body) as string, [body]);
  return (
    <>
      <style>{MD_SCOPED_CSS}</style>
      {frontmatter && <FrontmatterBlock data={frontmatter} />}
      <div className="debo-md" style={S.markdown} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}

function CodeBody({ content, language }: { content: string; language?: string }) {
  return (
    <SyntaxHighlighter language={(language ?? 'text') as 'text'} copyable padded showLineNumbers>
      {content}
    </SyntaxHighlighter>
  );
}

export function DeboFileViewer({ path, onClose }: DeboFileViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const ext = getExtension(path);
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isMarkdown = MARKDOWN_EXTENSIONS.has(ext);
  const syntaxLang = SYNTAX_LANGUAGES[ext];

  useEffect(() => {
    if (isImage) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    fetch(`/__designbook/file?path=${encodeURIComponent(path)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { content?: string; error?: string }) => {
        if (data.error) throw new Error(data.error);
        setContent(data.content ?? '');
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setError(err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [path, isImage]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const shortPath = path.split('/').slice(-3).join('/');

  return (
    <div style={S.overlay} onClick={handleOverlayClick}>
      <div style={S.modal}>
        <div style={S.header}>
          <span title={path}>{shortPath}</span>
          <button style={S.closeBtn} onClick={onClose} title="Close">
            ✕
          </button>
        </div>
        <div style={S.body}>
          {isImage ? (
            <img src={`/__designbook/file?path=${encodeURIComponent(path)}`} alt={shortPath} style={S.image} />
          ) : loading ? (
            <div style={S.loading}>Loading…</div>
          ) : error ? (
            <div style={S.error}>{error}</div>
          ) : isMarkdown ? (
            <MarkdownBody content={content ?? ''} />
          ) : (
            <CodeBody content={content ?? ''} language={syntaxLang} />
          )}
        </div>
      </div>
    </div>
  );
}
