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
}

const KNOWN_BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

function parseReport(text: string): Map<string, { diff: number; threshold: number; pass: boolean }> {
  const results = new Map<string, { diff: number; threshold: number; pass: boolean }>();
  // Parse report.md for per-breakpoint results
  // Expected format: lines like "| md | 2.1% | 5% | PASS |" or "## md" sections with diff info
  const linePattern = /\|\s*(\w+)\s*\|\s*([\d.]+)%?\s*\|\s*([\d.]+)%?\s*\|\s*(PASS|FAIL)\s*\|/gi;
  let match;
  while ((match = linePattern.exec(text)) !== null) {
    const [, bpRaw, diffRaw, threshRaw, passRaw] = match;
    if (!bpRaw || !diffRaw || !threshRaw || !passRaw) continue;
    results.set(bpRaw.toLowerCase(), {
      diff: parseFloat(diffRaw),
      threshold: parseFloat(threshRaw),
      pass: passRaw.toUpperCase() === 'PASS',
    });
  }
  return results;
}

async function discoverBreakpoints(storyId: string): Promise<BreakpointInfo[]> {
  const breakpoints: BreakpointInfo[] = [];

  // Probe each known breakpoint for a reference image
  const probes = Object.entries(KNOWN_BREAKPOINTS).map(async ([name, width]) => {
    const url = `/__designbook/load?path=screenshots/${encodeURIComponent(storyId)}/reference/${name}.png`;
    try {
      const res = await fetch(url, { method: 'GET' });
      const contentType = res.headers.get('content-type') || '';
      return { name, width, exists: res.ok && contentType.startsWith('image/') };
    } catch {
      return { name, width, exists: false };
    }
  });

  const results = await Promise.all(probes);

  // Fetch report for diff data
  let reportData = new Map<string, { diff: number; threshold: number; pass: boolean }>();
  try {
    const reportUrl = `/__designbook/load?path=screenshots/${encodeURIComponent(storyId)}/report.md`;
    const reportRes = await fetch(reportUrl);
    if (reportRes.ok) {
      reportData = parseReport(await reportRes.text());
    }
  } catch {
    // No report available
  }

  for (const { name, width, exists } of results) {
    if (!exists) continue;
    const report = reportData.get(name);
    breakpoints.push({
      name,
      width,
      hasReference: true,
      diffPercent: report?.diff ?? null,
      threshold: report?.threshold ?? null,
      pass: report?.pass ?? null,
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
                {bp.diffPercent.toFixed(1)}% / {bp.threshold}%
              </span>
            ) : (
              <span style={{ fontSize: 10, color: '#aaa' }}>—</span>
            )}
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
