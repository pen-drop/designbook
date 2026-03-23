import React from 'react';
import { WithTooltip, TooltipLinkList, IconButton } from 'storybook/internal/components';
import { EllipsisIcon } from '@storybook/icons';
import { addons } from 'storybook/manager-api';

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    // Fallback: noop on failure
  });
}

function openInEditor(file) {
  const channel = addons.getChannel();
  channel.emit('openInEditorRequest', { file });
}

function shortenPath(p) {
  const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
  return parts.slice(-2).join('/');
}

/**
 * ContextAction — Ellipsis (⋮) button with a click-triggered action menu.
 *
 * Provides "Copy path" and "Open in editor" for a given file path.
 * Accepts optional `validation` to display status info and `extraLinks`
 * for additional menu entries.
 *
 * @param {object} props
 * @param {string} props.path - Absolute file path
 * @param {object} [props.validation] - Validation result ({ valid, type, last_validated, error })
 * @param {Array} [props.extraLinks] - Additional TooltipLinkList entries
 */
export function ContextAction({ path, validation, extraLinks }) {
  const links = [];

  // Standard file actions
  links.push({
    id: 'copy-path',
    title: 'Copy path',
    onClick: () => copyToClipboard(path),
  });

  links.push({
    id: 'open-in-editor',
    title: 'Open in editor',
    onClick: () => openInEditor(path),
  });

  // Extra links (e.g., rule files for stage context)
  if (extraLinks?.length) {
    for (const link of extraLinks) {
      links.push(link);
    }
  }

  // Validation info (disabled info row)
  if (validation) {
    const icon = validation.valid ? '✅' : validation.valid === false ? '❌' : '⏳';
    const time = validation.last_validated
      ? new Date(validation.last_validated).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
      : '';
    const label = [icon, validation.type, time].filter(Boolean).join(' · ');
    links.push({
      id: 'validation-info',
      title: label,
      disabled: true,
    });
    if (validation.error) {
      links.push({
        id: 'validation-error',
        title: `⚠ ${validation.error}`,
        disabled: true,
      });
    }
  }

  return (
    <WithTooltip
      trigger="click"
      closeOnOutsideClick
      placement="bottom"
      tooltip={({ onHide }) => (
        <TooltipLinkList
          links={links.map((l) => ({
            ...l,
            onClick: l.onClick
              ? (e) => {
                  l.onClick(e);
                  onHide();
                }
              : undefined,
          }))}
        />
      )}
    >
      <IconButton
        title={shortenPath(path)}
        style={{ padding: '2px', height: 'auto', width: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <EllipsisIcon />
      </IconButton>
    </WithTooltip>
  );
}
