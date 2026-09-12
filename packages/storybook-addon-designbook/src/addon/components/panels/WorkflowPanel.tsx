/**
 * Designbook panel — a logs-only view.
 *
 * The engine refactor removed the catalogue/definition UI. The panel now shows the
 * digested CLI log (`$DESIGNBOOK_DATA/dbo.log`, tagged entries), served by the dev
 * plugin at `/__designbook/log`. No workflow-document rendering, no tabs.
 */
import React, { memo, useEffect, useState } from 'react';
import { AddonPanel } from 'storybook/internal/components';
import { useTheme } from 'storybook/theming';

interface LogEntry {
  ts: string;
  cmd: string;
  args?: Record<string, unknown>;
  error?: string;
  duration_ms?: number;
}
interface LogDigest {
  entries: LogEntry[];
  errors: LogEntry[];
  longRunning: LogEntry[];
}

function useLogDigest(active: boolean): { digest: LogDigest | null; error: string | null } {
  const [digest, setDigest] = useState<LogDigest | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () =>
      fetch('/__designbook/log')
        .then((r) => r.json())
        .then((d: LogDigest & { error?: string }) => {
          if (cancelled) return;
          if (d.error) setError(d.error);
          else setDigest(d);
        })
        .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : String(e)));
    load();
    const timer = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);
  return { digest, error };
}

function Row({ entry, color }: { entry: LogEntry; color?: string }) {
  return (
    <div style={{ padding: '4px 8px', borderBottom: '1px solid rgba(128,128,128,0.15)', color }}>
      <code style={{ fontSize: 12 }}>
        {entry.ts} · {entry.cmd}
        {typeof entry.duration_ms === 'number' ? ` · ${entry.duration_ms}ms` : ''}
      </code>
      {entry.error ? <div style={{ fontSize: 12 }}>{entry.error}</div> : null}
    </div>
  );
}

export const WorkflowPanel = memo(function WorkflowPanel({ active }: { active?: boolean }) {
  const theme = useTheme();
  const { digest, error } = useLogDigest(Boolean(active));
  return (
    <AddonPanel active={Boolean(active)}>
      <div style={{ fontFamily: theme.typography.fonts.mono, padding: 8 }}>
        {error ? <div style={{ color: theme.color.negative, padding: 8 }}>{error}</div> : null}
        {!digest ? (
          <div style={{ padding: 8 }}>No log yet.</div>
        ) : (
          <>
            {digest.errors.map((e, i) => (
              <Row key={`err-${i}`} entry={e} color={theme.color.negative} />
            ))}
            {digest.entries.map((e, i) => (
              <Row key={`e-${i}`} entry={e} />
            ))}
            {digest.entries.length === 0 && digest.errors.length === 0 ? (
              <div style={{ padding: 8 }}>No tagged log entries.</div>
            ) : null}
          </>
        )}
      </div>
    </AddonPanel>
  );
});
