import React, { memo, useState, useEffect, useCallback } from 'react';
import { useTheme } from 'storybook/theming';
import { useGlobals, useParameter, useStorybookApi } from 'storybook/manager-api';
import { IconButton, WithTooltip } from 'storybook/internal/components';
import { PhotoIcon } from '@storybook/icons';
import { VISUAL_COMPARE_KEY, VISUAL_TOOL_ID } from '../constants';

interface VisualCompareState {
  breakpoint: string | null;
  region: string | null;
  opacity: number;
}

interface RegionInfo {
  name: string;
  selector: string;
  diffPercent: number | null;
  threshold: number | null;
  pass: boolean | null;
  issues: string[];
}

interface BreakpointInfo {
  name: string;
  width: number;
  hasReference: boolean;
  threshold: number | null;
  regions: RegionInfo[];
}

const KNOWN_BREAKPOINTS: Record<string, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

interface StoryCheck {
  breakpoint: string;
  region: string;
  selector?: string;
  result?: 'pass' | 'fail';
  diff?: number;
  threshold: number;
  issues?: string[];
}

interface StorySummary {
  total: number;
  pass: number;
  fail: number;
  unchecked: number;
  maxDiff: number | null;
}

interface StoryJSON {
  checks: StoryCheck[];
  summary: StorySummary;
}

async function discoverBreakpoints(storyId: string): Promise<BreakpointInfo[]> {
  try {
    const res = await fetch(`/__designbook/story/${encodeURIComponent(storyId)}`);
    if (!res.ok) return [];
    const story = (await res.json()) as StoryJSON;
    if (!story.checks || story.checks.length === 0) return [];

    // Group checks by breakpoint
    const bpMap = new Map<string, StoryCheck[]>();
    for (const check of story.checks) {
      const arr = bpMap.get(check.breakpoint) ?? [];
      arr.push(check);
      bpMap.set(check.breakpoint, arr);
    }

    const breakpoints: BreakpointInfo[] = [];
    for (const [name, checks] of bpMap) {
      const width = KNOWN_BREAKPOINTS[name] ?? 0;
      const regions: RegionInfo[] = checks.map((c) => ({
        name: c.region,
        selector: c.selector ?? c.region,
        diffPercent: c.diff ?? null,
        threshold: c.threshold ?? null,
        pass: c.result === 'pass' ? true : c.result === 'fail' || c.result === 'review' ? false : null,
        issues: c.issues ?? [],
      }));

      breakpoints.push({
        name,
        width,
        hasReference: true,
        threshold: checks[0]?.threshold ?? null,
        regions,
      });
    }

    return breakpoints.sort((a, b) => a.width - b.width);
  } catch {
    return [];
  }
}

function DiffBadge({ diff, pass }: { diff: number | null; pass: boolean | null }) {
  const theme = useTheme();
  if (diff === null || pass === null) {
    return <span style={{ fontSize: 10, color: theme.textMutedColor }}>—</span>;
  }
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: '1px 6px',
        borderRadius: 9999,
        background: pass ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
        color: pass ? theme.color.positive : theme.color.negative,
      }}
    >
      {diff.toFixed(1)}%
    </span>
  );
}

const DropdownContent = memo(function DropdownContent({
  storyId,
  state,
  onSelect,
  onOpacityChange,
}: {
  storyId: string;
  state: VisualCompareState;
  onSelect: (bp: string | null, region: string | null) => void;
  onOpacityChange: (opacity: number) => void;
}) {
  const theme = useTheme();
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
    return <div style={{ padding: 12, fontSize: 12, color: theme.textMutedColor }}>Loading…</div>;
  }

  if (breakpoints.length === 0) {
    return <div style={{ padding: 12, fontSize: 12, color: theme.textMutedColor }}>No references found</div>;
  }

  return (
    <div style={{ minWidth: 220, padding: 8 }}>
      {breakpoints.map((bp) => {
        const isBpActive = state.breakpoint === bp.name;
        return (
          <React.Fragment key={bp.name}>
            {/* Breakpoint header row */}
            <button
              onClick={() => {
                if (isBpActive && !state.region) {
                  onSelect(null, null); // Deactivate
                } else {
                  onSelect(bp.name, null); // Select breakpoint (all regions)
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 8px',
                border: 'none',
                borderRadius: 4,
                background: isBpActive && !state.region ? 'rgba(30, 167, 253, 0.12)' : 'transparent',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: isBpActive ? 600 : 400 }}>
                {bp.name} <span style={{ color: theme.textMutedColor }}>{bp.width}px</span>
              </span>
              <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {bp.regions.some((r) => r.pass !== null) && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: 9999,
                      background: bp.regions.every((r) => r.pass !== false)
                        ? 'rgba(34, 197, 94, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                      color: bp.regions.every((r) => r.pass !== false) ? theme.color.positive : theme.color.negative,
                    }}
                  >
                    {bp.regions.filter((r) => r.pass === true).length}/{bp.regions.length}
                  </span>
                )}
              </span>
            </button>

            {/* Region rows (indented under breakpoint) */}
            {bp.regions.map((region) => {
              const isRegionActive = isBpActive && state.region === region.name;
              return (
                <button
                  key={region.name}
                  onClick={() => {
                    if (isRegionActive) {
                      onSelect(bp.name, null); // Back to all regions
                    } else {
                      onSelect(bp.name, region.name); // Select single region
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '4px 8px 4px 24px',
                    border: 'none',
                    borderRadius: 4,
                    background: isRegionActive ? 'rgba(30, 167, 253, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: 11,
                    textAlign: 'left',
                    color: isBpActive ? 'inherit' : theme.textMutedColor,
                  }}
                >
                  <span style={{ fontWeight: isRegionActive ? 600 : 400 }}>
                    {region.name === 'markup' ? 'CSS/Markup' : region.name}
                  </span>
                  {region.name === 'markup' ? (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: 9999,
                        background:
                          region.pass === null
                            ? 'transparent'
                            : region.pass
                              ? 'rgba(34, 197, 94, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                        color:
                          region.pass === null
                            ? theme.textMutedColor
                            : region.pass
                              ? theme.color.positive
                              : theme.color.negative,
                      }}
                    >
                      {region.pass === null ? '—' : region.issues.length > 0 ? `${region.issues.length} issues` : 'ok'}
                    </span>
                  ) : (
                    <DiffBadge diff={region.diffPercent} pass={region.pass} />
                  )}
                </button>
              );
            })}
          </React.Fragment>
        );
      })}

      <div style={{ borderTop: `1px solid ${theme.appBorderColor}`, marginTop: 8, paddingTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
          <span style={{ fontSize: 11, color: theme.textMutedColor, whiteSpace: 'nowrap' }}>Opacity</span>
          <input
            type="range"
            min={0}
            max={100}
            value={state.opacity}
            disabled={!state.breakpoint}
            onChange={(e) => onOpacityChange(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ fontSize: 11, color: theme.textMutedColor, minWidth: 30, textAlign: 'right' }}>
            {state.opacity}%
          </span>
        </div>
      </div>
    </div>
  );
});

export const VisualCompareTool = memo(function VisualCompareTool() {
  const scene = useParameter<Record<string, unknown> | undefined>('scene');
  const [globals, updateGlobals] = useGlobals();
  const api = useStorybookApi();

  const state: VisualCompareState = globals[VISUAL_COMPARE_KEY] ?? { breakpoint: null, region: null, opacity: 50 };
  const isActive = !!state.breakpoint;

  const storyId = api.getCurrentStoryData()?.id;

  const handleSelect = useCallback(
    (bp: string | null, region: string | null) => {
      const url = new URL(window.location.href);
      if (bp && KNOWN_BREAKPOINTS[bp]) {
        const dims = `${KNOWN_BREAKPOINTS[bp]}-896`;
        let globals = `viewport.value:${dims};${VISUAL_COMPARE_KEY}.breakpoint:${bp};${VISUAL_COMPARE_KEY}.opacity:${state.opacity}`;
        if (region) {
          globals += `;${VISUAL_COMPARE_KEY}.region:${region}`;
        }
        url.searchParams.set('globals', globals);
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
