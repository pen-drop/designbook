/**
 * Workflow notifications via channel events.
 *
 * Listens for typed file-change events from the Vite plugin and fires
 * Storybook toast notifications when task files are created (started) or
 * deleted from the active changes directory (done/archived).
 */

import type { API } from 'storybook/manager-api';

interface FileEvent {
  fileType: string;
  path: string;
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
}
