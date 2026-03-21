import React, { useState } from 'react';
import { Placeholder } from 'storybook/internal/components';
import { styled } from 'storybook/theming';

const Kbd = styled.kbd(({ theme }) => ({
  display: 'inline-block',
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s2,
  background: theme.background?.hoverable || '#F1F5F9',
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 6,
  padding: '6px 12px',
  cursor: 'pointer',
  userSelect: 'none',
  '&:hover': {
    background: theme.background?.app || '#E8EDF2',
  },
}));

const Hint = styled.p(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.color.mediumdark,
  marginTop: 8,
}));

export function DeboEmptyState({ message, command, filePath }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <Placeholder>
      <div style={{ textAlign: 'center' }}>
        <p>{message}</p>
        <p style={{ marginTop: 8, opacity: 0.7 }}>Run the AI command in your editor:</p>
        <div style={{ marginTop: 16 }}>
          <Kbd onClick={handleCopy} title="Click to copy">
            {copied ? '✓ Copied!' : command}
          </Kbd>
        </div>
        {filePath && (
          <Hint>
            The result will be saved to <code>{filePath}</code> and displayed here.
          </Hint>
        )}
      </div>
    </Placeholder>
  );
}
