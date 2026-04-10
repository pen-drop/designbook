/**
 * DeboFacetFilter — dropdown with checkboxes for faceted filtering.
 *
 * Each facet is a dropdown that shows available options based on the current
 * selection of other facets (dependent filtering).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface FacetOption {
  value: string;
  label: string;
}

export interface FacetDef {
  id: string;
  label: string;
  options: FacetOption[];
}

interface FacetDropdownProps {
  facet: FacetDef;
  selected: Set<string>;
  onToggle: (value: string) => void;
  onClear: () => void;
}

const S = {
  bar: {
    display: 'flex',
    gap: 6,
    padding: '6px 8px',
    flexWrap: 'wrap' as const,
  },
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    fontSize: 11,
    fontFamily: 'inherit',
    color: 'var(--textMutedColor, #999)',
    background: 'transparent',
    border: '1px solid var(--appBorderColor, #444)',
    borderRadius: 4,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  triggerActive: {
    color: 'var(--textColor, #fff)',
    borderColor: 'var(--barSelectedColor, #6366f1)',
    background: 'rgba(99, 102, 241, 0.1)',
  },
  count: {
    fontSize: 9,
    fontWeight: 700,
    background: 'var(--barSelectedColor, #6366f1)',
    color: '#fff',
    borderRadius: 8,
    padding: '1px 5px',
    marginLeft: 2,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    left: 0,
    marginTop: 4,
    background: 'var(--appContentBg, #1a1a2e)',
    border: '1px solid var(--appBorderColor, #444)',
    borderRadius: 6,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    zIndex: 100,
    minWidth: 180,
    maxHeight: 240,
    overflow: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 10px',
    fontSize: 11,
    cursor: 'pointer',
    color: 'var(--textColor, #fff)',
  },
  optionHover: {
    background: 'rgba(255,255,255,0.05)',
  },
  checkbox: {
    width: 14,
    height: 14,
    accentColor: 'var(--barSelectedColor, #6366f1)',
    cursor: 'pointer',
    flexShrink: 0,
  },
  clearBtn: {
    display: 'block',
    width: '100%',
    padding: '5px 10px',
    fontSize: 10,
    color: 'var(--textMutedColor, #999)',
    background: 'none',
    border: 'none',
    borderTop: '1px solid var(--appBorderColor, #333)',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  arrow: {
    fontSize: 8,
    marginLeft: 2,
  },
};

function FacetDropdown({ facet, selected, onToggle, onClear }: FacetDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const hasSelection = selected.size > 0;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button style={{ ...S.trigger, ...(hasSelection ? S.triggerActive : {}) }} onClick={() => setOpen((v) => !v)}>
        {facet.label}
        {hasSelection && <span style={S.count}>{selected.size}</span>}
        <span style={S.arrow}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={S.dropdown}>
          {facet.options.map((opt) => (
            <label
              key={opt.value}
              style={S.option}
              onMouseEnter={(e) => Object.assign(e.currentTarget.style, S.optionHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = '')}
            >
              <input
                type="checkbox"
                checked={selected.has(opt.value)}
                onChange={() => onToggle(opt.value)}
                style={S.checkbox}
              />
              {opt.label}
            </label>
          ))}
          {hasSelection && (
            <button
              style={S.clearBtn}
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Facet Filter Bar
// ---------------------------------------------------------------------------

export interface FacetState {
  [facetId: string]: Set<string>;
}

interface DeboFacetFilterProps {
  facets: FacetDef[];
  state: FacetState;
  onToggle: (facetId: string, value: string) => void;
  onClear: (facetId: string) => void;
}

export function DeboFacetFilter({ facets, state, onToggle, onClear }: DeboFacetFilterProps) {
  return (
    <div style={S.bar}>
      {facets.map((f) => (
        <FacetDropdown
          key={f.id}
          facet={f}
          selected={state[f.id] ?? new Set()}
          onToggle={(val) => onToggle(f.id, val)}
          onClear={() => onClear(f.id)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// useFacetFilter — dependent facet logic
// ---------------------------------------------------------------------------

/**
 * Generic hook for dependent faceted filtering.
 *
 * Each item has facet values (string or string[]). When a facet is selected,
 * other facets' available options are narrowed to only values that co-occur
 * with the current selection.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFacetFilter<T extends Record<string, any>>(
  items: T[],
  facetIds: string[],
  labelFns?: Partial<Record<string, (value: string) => string>>,
) {
  const [state, setState] = useState<FacetState>(() => {
    const init: FacetState = {};
    for (const id of facetIds) init[id] = new Set();
    return init;
  });

  const toggle = useCallback((facetId: string, value: string) => {
    setState((prev) => {
      const next = { ...prev };
      const set = new Set(prev[facetId]);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[facetId] = set;
      return next;
    });
  }, []);

  const clear = useCallback((facetId: string) => {
    setState((prev) => ({ ...prev, [facetId]: new Set<string>() }));
  }, []);

  // Helper: get values for a facet from an item
  const getValues = (item: T, facetId: string): string[] => {
    const val = item[facetId];
    if (val === undefined || val === null) return [];
    if (Array.isArray(val)) return val as string[];
    if (typeof val === 'string') return [val];
    return [];
  };

  // Filter items by all selected facets
  const filtered = items.filter((item) =>
    facetIds.every((id) => {
      const sel = state[id];
      if (!sel || sel.size === 0) return true;
      return getValues(item, id).some((v) => sel.has(v));
    }),
  );

  // Compute available options per facet (dependent on OTHER facets' selections)
  const facets: FacetDef[] = facetIds.map((id) => {
    // Items passing all OTHER facets
    const otherFiltered = items.filter((item) =>
      facetIds.every((otherId) => {
        if (otherId === id) return true;
        const sel = state[otherId];
        if (!sel || sel.size === 0) return true;
        return getValues(item, otherId).some((v) => sel.has(v));
      }),
    );
    // Collect unique values from those items
    const values = new Set<string>();
    for (const item of otherFiltered) {
      for (const v of getValues(item, id)) values.add(v);
    }
    const labelFn = labelFns?.[id];
    const options = [...values].sort().map((v) => ({ value: v, label: labelFn ? labelFn(v) : v }));
    return { id, label: id.charAt(0).toUpperCase() + id.slice(1), options };
  });

  return { state, facets, filtered, toggle, clear };
}
