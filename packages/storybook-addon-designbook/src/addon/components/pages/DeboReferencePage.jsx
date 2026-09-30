import React, { useState } from 'react';
import { styled } from 'storybook/theming';
import { DeboAlert } from '../ui/DeboAlert.jsx';
import { DeboBadge } from '../ui/DeboBadge.jsx';
import { DeboLink } from '../ui/DeboLink.jsx';
import { DeboLoading } from '../ui/DeboLoading.jsx';
import { DeboPageLayout } from '../ui/DeboPageLayout.jsx';
import { DeboTable } from '../ui/DeboTable.jsx';
import { useReferences } from '../../hooks/useReferences.js';
import { referenceImagePath } from '../../../tools/visual-compare-path';
import { APPROVAL_COLORS } from './DeboReferencesOverview.jsx';

const Heading = styled.h3(({ theme }) => ({
  fontSize: theme.typography.size.l1,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  margin: 0,
}));

const Frame = styled.figure(({ theme }) => ({
  margin: 0,
  overflow: 'auto',
  maxHeight: '70vh',
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.background.hoverable,
}));

const Button = styled.button(({ theme }) => ({
  alignSelf: 'flex-start',
  padding: '6px 12px',
  borderRadius: 4,
  border: `1px solid ${theme.appBorderColor}`,
  background: theme.background.content,
  color: theme.color.defaultText,
  cursor: 'pointer',
  '&:focus-visible': { outline: `2px solid ${theme.color.secondary}`, outlineOffset: 2 },
}));

/** Manager URL of this entry; the preview iframe shares the manager's origin. */
function managerUrl() {
  try {
    return window.parent.location.href;
  } catch {
    return window.location.href;
  }
}

/** Frozen detail of one published capture tuple — never a live rerender of its source. */
export function DeboReferencePage({ id, revision, subject, view, state }) {
  const { data: ref, error, loading } = useReferences(id, revision);
  const [copied, setCopied] = useState(null);

  if (loading) return <DeboLoading />;
  if (error) return <DeboAlert type="error">Reference {id}/{revision} could not be loaded: {error}</DeboAlert>;
  if (ref.status !== 'ok')
    return (
      <DeboAlert type="error">
        Reference {ref.binding} is {ref.status}: {ref.error ?? 'capture workflow not finished'}
      </DeboAlert>
    );

  const capture = ref.captures.find((c) => c.subject === subject && c.view === view && c.state === state);
  if (!capture)
    return (
      <DeboAlert type="error">
        Reference {ref.binding} has no capture {subject} · {view} · {state}
      </DeboAlert>
    );
  const viewInfo = ref.views.find((v) => v.id === view);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(managerUrl());
      setCopied('Link copied');
    } catch {
      setCopied(`Copy failed — URL: ${managerUrl()}`);
    }
  };

  const facts = [
    ['Revision', ref.label],
    ['Reference', `${ref.id}/${ref.revision}`],
    ['Source', `${ref.source.kind}: ${ref.source.identity}${ref.source.revision ? ` @ ${ref.source.revision}` : ''}`],
    ['Subject', capture.subject],
    ['View', viewInfo ? `${view} (${viewInfo.width}×${viewInfo.height})` : view],
    ['State', `${capture.state}${capture.session ? ` (session: ${capture.session})` : ''}`],
    ['Capture', `${capture.path} — ${capture.width}×${capture.height}px`],
  ];

  return (
    <DeboPageLayout gap="6">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Heading>{capture.name}</Heading>
        <DeboBadge color={APPROVAL_COLORS[ref.approval]}>approval: {ref.approval}</DeboBadge>
      </div>

      <Frame>
        {/* Native size: a frozen capture is never stretched to fit. */}
        <img
          src={referenceImagePath(ref.dir, capture.path)}
          width={capture.width}
          height={capture.height}
          alt={`Reference capture ${capture.subject}, view ${view}, state ${capture.state}`}
          style={{ display: 'block', maxWidth: 'none' }}
        />
      </Frame>

      <Button type="button" onClick={copy}>
        Copy link
      </Button>
      <span role="status" aria-live="polite" style={{ fontSize: 12 }}>
        {copied}
      </span>

      <DeboTable
        rows={facts}
        renderRow={([label, value]) => (
          <tr key={label}>
            <DeboTable.Th scope="row">{label}</DeboTable.Th>
            <DeboTable.Td>
              <DeboTable.Mono>{value}</DeboTable.Mono>
            </DeboTable.Td>
          </tr>
        )}
      />

      <DeboTable
        columns={['Capture matrix', '']}
        rows={ref.captures}
        renderRow={(c) => (
          <tr key={c.storyId}>
            <DeboTable.Td>
              {c.storyId === capture.storyId ? (
                <strong aria-current="page">{c.name}</strong>
              ) : (
                <DeboLink storyId={c.storyId}>{c.name}</DeboLink>
              )}
            </DeboTable.Td>
            <DeboTable.Td>
              {c.width}×{c.height}px
            </DeboTable.Td>
          </tr>
        )}
      />

      <DeboTable
        columns={['Bound stories']}
        rows={ref.boundStories.length ? ref.boundStories : ['—']}
        renderRow={(storyId) => (
          <tr key={storyId}>
            <DeboTable.Td>{storyId === '—' ? '—' : <DeboLink storyId={storyId}>{storyId}</DeboLink>}</DeboTable.Td>
          </tr>
        )}
      />
    </DeboPageLayout>
  );
}
