/**
 * Workflow notifications via channel events.
 *
 * Listens for typed file-change events from the Vite plugin and fires
 * Storybook toast notifications when task files are created (started) or
 * deleted from the active changes directory (done/archived).
 *
 * Also polls for 'waiting' status and auto-focuses the Designbook panel.
 */

import type { API } from 'storybook/manager-api';
import { PANEL_ID } from './constants.js';

interface FileEvent {
  fileType: string;
  path: string;
}

let wasWaiting = false;

async function checkWaitingStatus(api: API): Promise<void> {
  try {
    const res = await fetch('/__designbook/workflows');
    if (!res.ok) return;
    const json = await res.json();
    const workflows: Array<{ status?: string; waiting_message?: string }> = json.workflows ?? json;
    const waitingWf = workflows.find((wf) => wf.status === 'waiting');
    const hasWaiting = !!waitingWf;
    if (hasWaiting && !wasWaiting) {
      api.setSelectedPanel(PANEL_ID);
      api.addNotification({
        id: `designbook-waiting-${Date.now()}`,
        content: {
          headline: 'Attention Attention Senior',
          subHeadline: waitingWf?.waiting_message ?? 'Workflow waiting for input',
        },
        duration: 15000,
      });
    }
    wasWaiting = hasWaiting;
  } catch {
    // Network error, skip
  }
}

export function startWorkflowNotifications(api: API): void {
  api.on('designbook:file-add', (event: FileEvent) => {
    if (event.fileType === 'task' && event.path.includes('workflows/changes/')) {
      api.addNotification({
        id: `designbook-started-${event.path}-${Date.now()}`,
        content: { headline: 'Workflow started', subHeadline: event.path },
        duration: 5000,
      });
    }
  });

  api.on('designbook:file-delete', (event: FileEvent) => {
    if (event.fileType === 'task' && event.path.includes('workflows/changes/')) {
      api.addNotification({
        id: `designbook-done-${event.path}-${Date.now()}`,
        content: { headline: 'Workflow completed', subHeadline: event.path },
        duration: 8000,
      });
    }
  });

  // Check waiting status on task file changes
  const onTaskChange = (event: FileEvent) => {
    if (event.fileType === 'task') checkWaitingStatus(api);
  };
  api.on('designbook:file-update', onTaskChange);
}
