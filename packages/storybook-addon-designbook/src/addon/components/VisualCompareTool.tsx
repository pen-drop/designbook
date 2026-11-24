import React, { memo, useState, useEffect, useCallback } from 'react';
import { useTheme } from 'storybook/theming';
import { useGlobals, useStorybookApi } from 'storybook/manager-api';
import { IconButton, WithTooltip } from 'storybook/internal/components';
import { PhotoIcon } from '@storybook/icons';
import { VISUAL_COMPARE_KEY, VISUAL_TOOL_ID } from '../../shared/constants';
import { menuModel, type MenuModel, type MenuView } from '../visual-compare-menu';

interface VisualCompareState {
  breakpoint: string | null;
  state: string | null;
  region: string | null;
  opacity: number;
}

async function loadMenu(storyId: string): Promise<MenuModel> {
  try {
    const res = await fetch(`/__designbook/story/${encodeURIComponent(storyId)}`);
    const body = await res.json().catch(() => null);
    return menuModel(res.status, body);
  } catch {
    return menuModel(0, null);
  }
}

const rowStyle = (active: boolean, indent: number, size: number): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  padding: `4px 8px 4px ${8 + indent}px`,
  border: 'none',
  borderRadius: 4,
  background: active ? 'rgba(30, 167, 253, 0.12)' : 'transparent',
  cursor: 'pointer',
  fontSize: size,
  fontWeight: active ? 600 : 400,
  textAlign: 'left',
  color: 'inherit',
});

const DropdownContent = memo(function DropdownContent({
  model,
  state,
  onSelect,
  onOpacityChange,
}: {
  model: MenuModel;
  state: VisualCompareState;
  onSelect: (view: MenuView | null, captureState: string | null, region: string | null) => void;
  onOpacityChange: (opacity: number) => void;
}) {
  const theme = useTheme();

  if (model.kind !== 'ok') {
    const text = model.kind === 'hidden' ? 'Loading…' : model.text;
    return (
      <div
        role={model.kind === 'error' ? 'alert' : undefined}
        style={{
          padding: 12,
          fontSize: 12,
          maxWidth: 280,
          color: model.kind === 'error' ? theme.color.negative : theme.textMutedColor,
        }}
      >
        {text}
      </div>
    );
  }

  return (
    <div style={{ minWidth: 220, padding: 8 }}>
      {model.views.map((view) => (
        <React.Fragment key={view.id}>
          <div style={{ padding: '6px 8px 2px', fontSize: 12, fontWeight: 600 }}>
            {view.id}{' '}
            <span style={{ color: theme.textMutedColor, fontWeight: 400 }}>
              {view.width}×{view.height}
            </span>
          </div>
          {view.states.map((captureState) => {
            const isStateActive = state.breakpoint === view.id && state.state === captureState.name;
            return (
              <React.Fragment key={captureState.name}>
                <button
                  onClick={() =>
                    isStateActive && !state.region
                      ? onSelect(null, null, null)
                      : onSelect(view, captureState.name, null)
                  }
                  aria-pressed={isStateActive && !state.region}
                  style={rowStyle(isStateActive && !state.region, 8, 12)}
                >
                  {captureState.name}
                </button>
                {captureState.subjects.map((subject) => {
                  const isRegionActive = isStateActive && state.region === subject;
                  return (
                    <button
                      key={subject}
                      onClick={() => onSelect(view, captureState.name, isRegionActive ? null : subject)}
                      aria-pressed={isRegionActive}
                      style={{
                        ...rowStyle(isRegionActive, 24, 11),
                        color: isStateActive ? 'inherit' : theme.textMutedColor,
                      }}
                    >
                      {subject}
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </React.Fragment>
      ))}

      <div style={{ borderTop: `1px solid ${theme.appBorderColor}`, marginTop: 8, paddingTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
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
        </label>
      </div>
    </div>
  );
});

export const VisualCompareTool = memo(function VisualCompareTool() {
  // Visibility follows the story's reference binding (any story kind), not scene/entity parameters.
  const [globals, updateGlobals] = useGlobals();
  const api = useStorybookApi();
  const storyId = api.getCurrentStoryData()?.id;
  const [model, setModel] = useState<MenuModel>({ kind: 'hidden' });

  useEffect(() => {
    let current = true;
    setModel({ kind: 'hidden' });
    if (storyId) loadMenu(storyId).then((next) => current && setModel(next));
    return () => {
      current = false;
    };
  }, [storyId]);

  const state: VisualCompareState = {
    breakpoint: null,
    state: null,
    region: null,
    opacity: 50,
    ...globals[VISUAL_COMPARE_KEY],
  };
  const isActive = !!state.breakpoint;

  const handleSelect = useCallback(
    (view: MenuView | null, captureState: string | null, region: string | null) => {
      const url = new URL(window.location.href);
      if (view && captureState) {
        let globals = `viewport.value:${view.width}-${view.height};${VISUAL_COMPARE_KEY}.breakpoint:${view.id};${VISUAL_COMPARE_KEY}.state:${captureState};${VISUAL_COMPARE_KEY}.opacity:${state.opacity}`;
        if (region) globals += `;${VISUAL_COMPARE_KEY}.region:${region}`;
        url.searchParams.set('globals', globals);
      } else {
        url.searchParams.delete('globals');
      }
      window.location.replace(url.toString());
    },
    [state.opacity],
  );

  const handleOpacityChange = useCallback(
    (opacity: number) => {
      updateGlobals({
        [VISUAL_COMPARE_KEY]: { ...state, opacity },
      });
    },
    [state, updateGlobals],
  );

  if (!storyId || model.kind === 'hidden') return null;

  return (
    <WithTooltip
      trigger="click"
      closeOnOutsideClick
      placement="bottom"
      tooltip={() => (
        <DropdownContent model={model} state={state} onSelect={handleSelect} onOpacityChange={handleOpacityChange} />
      )}
    >
      <IconButton key={VISUAL_TOOL_ID} active={isActive} title="Visual Compare">
        <PhotoIcon />
      </IconButton>
    </WithTooltip>
  );
});
