/**
 * Standalone workflow notification polling.
 *
 * Runs independently of the Panel — fires Storybook toast notifications
 * when workflows start or complete, regardless of whether the Designbook
 * panel is open.
 */

import type { API } from 'storybook/manager-api';

interface WorkflowEntry {
  changeName: string;
  title: string;
  workflow: string;
  source: 'active' | 'archived';
}

const POLL_INTERVAL = 3000;

export function startWorkflowNotifications(api: API): void {
  const known = new Map<string, 'active' | 'archived'>();

  const poll = async () => {
    try {
      const res = await fetch('/__designbook/workflows');
      if (!res.ok) return;
      const entries: WorkflowEntry[] = await res.json();

      for (const wf of entries) {
        const prev = known.get(wf.changeName);

        if (!prev && wf.source === 'active') {
          api.addNotification({
            id: `designbook-started-${wf.changeName}`,
            content: {
              headline: wf.title,
              subHeadline: 'Workflow started',
            },
            duration: 5000,
          });
        } else if (prev === 'active' && wf.source === 'archived') {
          api.addNotification({
            id: `designbook-done-${wf.changeName}`,
            content: {
              headline: wf.title,
              subHeadline: 'Workflow completed',
            },
            duration: 8000,
          });
        }

        known.set(wf.changeName, wf.source);
      }
    } catch {
      // Network error — skip this cycle
    }
  };

  poll();
  setInterval(poll, POLL_INTERVAL);
}
