import React from 'react';
import { styled } from 'storybook/theming';

export const DeboPageTitle = styled.h1(({ theme }) => ({
  fontSize: 24,
  fontWeight: 600,
  color: theme.color.defaultText,
  margin: 0,
}));

const ProseRoot = styled.div(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
  lineHeight: 1.6,
  color: theme.color.defaultText,
  '& h1, & h2, & h3, & h4': { fontWeight: 600, marginTop: '1em', marginBottom: '0.5em' },
  '& h1': { fontSize: '1.75em' },
  '& h2': { fontSize: '1.4em' },
  '& h3': { fontSize: '1.15em' },
  '& h4': { fontSize: '1em' },
  '& p': { marginTop: '0.5em', marginBottom: '0.5em' },
  '& ul, & ol': { paddingLeft: '1.5em', margin: 0 },
  '& li': { marginBottom: 4 },
  '& a': { color: '#3B82F6', textDecoration: 'underline' },
  '& code': {
    fontFamily: theme.typography.fonts.mono,
    fontSize: '0.9em',
    background: theme.background?.hoverable || '#F1F5F9',
    padding: '2px 4px',
    borderRadius: 3,
  },
}));

/**
 * DeboProse — renders content intelligently:
 * - html prop      → raw HTML string via dangerouslySetInnerHTML (e.g. from marked)
 * - content: Array of { title, steps } → <ul><li> with bold title
 * - content: Array of strings → <ul><li> list
 * - content: string → plain text
 * - children → passed through as-is
 */
export function DeboProse({ html, content, children, ...props }) {
  if (html !== undefined) {
    return <ProseRoot {...props} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (content !== undefined) {
    if (Array.isArray(content)) {
      return (
        <ProseRoot {...props}>
          <ul>
            {content.map((item, i) => (
              <li key={i}>
                {item && typeof item === 'object'
                  ? <><strong>{item.title}</strong>{item.steps ? `: ${item.steps}` : ''}</>
                  : item}
              </li>
            ))}
          </ul>
        </ProseRoot>
      );
    }
    return <ProseRoot {...props}>{content}</ProseRoot>;
  }
  return <ProseRoot {...props}>{children}</ProseRoot>;
}
