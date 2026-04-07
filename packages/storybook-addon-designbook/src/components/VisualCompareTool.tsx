import React, { memo, useState, useEffect, useCallback } from 'react';
import { useGlobals, useParameter, useStorybookApi } from 'storybook/manager-api';
import { IconButton, WithTooltip } from 'storybook/internal/components';
import { PhotoIcon } from '@storybook/icons';
import { VISUAL_COMPARE_KEY, VISUAL_TOOL_ID } from '../constants';

interface VisualCompareState {
  breakpoint: string | null;
  opacity: number;
}

interface BreakpointInfo {
  name: string;
  width: number;
  hasReference: boolean;
  diffPercent: number | null;
  threshold: number | null;
  pass: boolean | null;
  markupPass: boolean | null;
  markupIssues: number | null;
}

const KNOWN_BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface MetaYml {
  reference?: {
    source?: { url?: string; origin?: string; hasMarkup?: boolean };
    breakpoints?: Record<
      string,
      {
        threshold?: number;
        lastDiff?: number | null;
        lastResult?: string | null;
        markup?: { lastResult?: string | null; issues?: number | null };
      }
    >;
  };
}

function parseMetaYml(yamlContent: string): MetaYml {
  // Minimal parser for the flat meta.yml breakpoints structure.
  // Parses lines like "    sm:" and "      threshold: 3" under "  breakpoints:".
  const meta: MetaYml = {};
  const breakpoints: Record<
    string,
    {
      threshold?: number;
      lastDiff?: number | null;
      lastResult?: string | null;
      markup?: { lastResult?: string | null; issues?: number | null };
    }
  > = {};

  let inBreakpoints = false;
  let currentBp: string | null = null;
  let inMarkup = false;

  for (const line of yamlContent.split('\n')) {
    const trimmed = line.trimStart();
    const indent = line.length - trimmed.length;

    if (trimmed.startsWith('breakpoints:')) {
      inBreakpoints = true;
      continue;
    }

    if (!inBreakpoints) continue;

    // Breakpoint name line (4 spaces indent, ends with colon)
    if (indent === 4 && trimmed.endsWith(':') && !trimmed.includes(' ')) {
      currentBp = trimmed.slice(0, -1);
      breakpoints[currentBp] = {};
      inMarkup = false;
      continue;
    }

    // markup: sub-block (6 spaces indent)
    if (indent === 6 && currentBp && trimmed === 'markup:') {
      inMarkup = true;
      breakpoints[currentBp]!.markup = {};
      continue;
    }

    // Property inside markup block (8+ spaces indent)
    if (indent >= 8 && currentBp && inMarkup) {
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, rawVal] = match;
        const val = rawVal!.trim();
        const mu = breakpoints[currentBp]!.markup!;
        if (key === 'lastResult') mu.lastResult = val === 'null' ? null : val;
        else if (key === 'issues') mu.issues = val === 'null' ? null : parseInt(val, 10);
      }
      continue;
    }

    // Property line under a breakpoint (6+ spaces indent, not in markup)
    if (indent >= 6 && currentBp && !inMarkup) {
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match) {
        const [, key, rawVal] = match;
        const val = rawVal!.trim();
        const bp = breakpoints[currentBp]!;
        if (key === 'threshold') bp.threshold = parseFloat(val);
        else if (key === 'lastDiff') bp.lastDiff = val === 'null' ? null : parseFloat(val);
        else if (key === 'lastResult') bp.lastResult = val === 'null' ? null : val;
      }
      continue;
    }

    // Non-markup property at indent 6 exits markup mode
    if (indent === 6 && inMarkup) {
      inMarkup = false;
      // Re-process this line as a breakpoint property
      const match = trimmed.match(/^(\w+):\s*(.+)$/);
      if (match && currentBp) {
        const [, key, rawVal] = match;
        const val = rawVal!.trim();
        const bp = breakpoints[currentBp]!;
        if (key === 'threshold') bp.threshold = parseFloat(val);
        else if (key === 'lastDiff') bp.lastDiff = val === 'null' ? null : parseFloat(val);
        else if (key === 'lastResult') bp.lastResult = val === 'null' ? null : val;
      }
      continue;
    }

    // Left of breakpoints indent means we've exited the breakpoints block
    if (indent < 4 && trimmed.length > 0) break;
  }

  if (Object.keys(breakpoints).length > 0) {
    meta.reference = { breakpoints };
  }
  return meta;
}

async function discoverBreakpoints(storyId: string): Promise<BreakpointInfo[]> {
  // Fetch meta.yml — single request replaces per-breakpoint probing
  const metaUrl = `/__designbook/load?path=stories/${encodeURIComponent(storyId)}/meta.yml`;
  let meta: MetaYml | null = null;
  try {
    const res = await fetch(metaUrl);
    if (!res.ok) return [];
    const text = await res.text();
    try {
      const json = JSON.parse(text) as { exists?: boolean; content?: string };
      if (!json.exists || !json.content) return [];
      meta = parseMetaYml(json.content);
    } catch {
      // Not JSON — try as raw YAML
      meta = parseMetaYml(text);
    }
  } catch {
    return [];
  }

  if (!meta?.reference?.breakpoints) return [];

  const breakpoints: BreakpointInfo[] = [];
  for (const [name, bp] of Object.entries(meta.reference.breakpoints)) {
    const width = KNOWN_BREAKPOINTS[name] ?? 0;
    breakpoints.push({
      name,
      width,
      hasReference: true,
      diffPercent: bp.lastDiff ?? null,
      threshold: bp.threshold ?? null,
      pass: bp.lastResult === 'pass' ? true : bp.lastResult === 'fail' ? false : null,
      markupPass: bp.markup?.lastResult === 'pass' ? true : bp.markup?.lastResult === 'fail' ? false : null,
      markupIssues: bp.markup?.issues ?? null,
    });
  }

  return breakpoints.sort((a, b) => a.width - b.width);
}

const DropdownContent = memo(function DropdownContent({
  storyId,
  state,
  onSelect,
  onOpacityChange,
}: {
  storyId: string;
  state: VisualCompareState;
  onSelect: (bp: string | null) => void;
  onOpacityChange: (opacity: number) => void;
}) {
  const [breakpoints, setBreakpoints] = useState<BreakpointInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    discoverBreakpoints(storyId).then((bps) => {
      setBreakpoints(bps);
      setLoading(false);
    });
  }, [storyId]);

  if (loading) {
    return <div style={{ padding: 12, fontSize: 12, color: '#888' }}>Loading…</div>;
  }

  if (breakpoints.length === 0) {
    return <div style={{ padding: 12, fontSize: 12, color: '#888' }}>No references found</div>;
  }

  return (
    <div style={{ minWidth: 200, padding: 8 }}>
      {breakpoints.map((bp) => {
        const isActive = state.breakpoint === bp.name;
        return (
          <button
            key={bp.name}
            onClick={() => onSelect(isActive ? null : bp.name)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '6px 8px',
              border: 'none',
              borderRadius: 4,
              background: isActive ? 'rgba(30, 167, 253, 0.12)' : 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              textAlign: 'left',
            }}
          >
            <span style={{ fontWeight: isActive ? 600 : 400 }}>
              {bp.name} <span style={{ color: '#888' }}>{bp.width}px</span>
            </span>
            <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {bp.diffPercent !== null && bp.threshold !== null ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: bp.pass ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: bp.pass ? '#16a34a' : '#dc2626',
                  }}
                >
                  {bp.diffPercent.toFixed(1)}%
                </span>
              ) : (
                <span style={{ fontSize: 10, color: '#aaa' }}>—</span>
              )}
              {bp.markupPass !== null && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 9999,
                    background: bp.markupPass ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: bp.markupPass ? '#16a34a' : '#dc2626',
                  }}
                >
                  CSS{bp.markupIssues !== null && bp.markupIssues > 0 ? ` ${bp.markupIssues}` : ''}
                </span>
              )}
            </span>
          </button>
        );
      })}

      <div style={{ borderTop: '1px solid #eee', marginTop: 8, paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
          <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={state.opacity}
            disabled={!state.breakpoint}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 11, color: '#888', minWidth: 30, textAlign: 'right' }}>{state.opacity}%</span>
        </div>
      </div>
    </div>
  );
});

export const VisualCompareTool = memo(function VisualCompareTool() {
  const scene = useParameter<Record<string, unknown> | undefined>('scene');
  const [globals, updateGlobals] = useGlobals();
  const api = useStorybookApi();

  const state: VisualCompareState = globals[VISUAL_COMPARE_KEY] ?? { breakpoint: null, opacity: 50 };
  const isActive = !!state.breakpoint;

  const storyId = api.getCurrentStoryData()?.id;

  const handleSelect = useCallback(
    (bp: string | null) => {
      const url = new URL(window.location.href);
      if (bp && KNOWN_BREAKPOINTS[bp]) {
        const dims = `${KNOWN_BREAKPOINTS[bp]}-896`;
        url.searchParams.set(
          'globals',
          `viewport.value:${dims};${VISUAL_COMPARE_KEY}.breakpoint:${bp};${VISUAL_COMPARE_KEY}.opacity:${state.opacity}`,
        );
      } else {
        url.searchParams.delete('globals');
      }
      window.location.replace(url.toString());
    },
    [state],
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      updateGlobals({
        [VISUAL_COMPARE_KEY]: { ...state, opacity },
      });
    },
    [state, updateGlobals],
  );

  if (!scene || !storyId) return null;

  return (
    <WithTooltip
      trigger="click"
      closeOnOutsideClick
      placement="bottom"
      tooltip={() => (
        <DropdownContent
          storyId={storyId}
          state={state}
          onSelect={handleSelect}
          onOpacityChange={handleOpacityChange}
        />
      )}
    >
      <IconButton key={VISUAL_TOOL_ID} active={isActive} title="Visual Compare">
        <PhotoIcon />
      </IconButton>
    </WithTooltip>
  );
});
