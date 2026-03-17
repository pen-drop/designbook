/**
 * Workflow notifications via WebSocket events.
 *
 * Listens for designbook:workflow-event messages sent by the Vite plugin
 * and fires Storybook toast notifications when workflows start or complete.
 */

import type { API } from 'storybook/manager-api';

interface WorkflowEvent {
  type: 'started' | 'done';
  title: string;
  workflow: string;
}

export function startWorkflowNotifications(api: API): void {
  api.on('designbook:workflow-event', (event: WorkflowEvent) => {
    if (event.type === 'started') {
      api.addNotification({
        id: `designbook-started-${event.workflow}-${Date.now()}`,
        content: { headline: event.title, subHeadline: 'Workflow started' },
        duration: 5000,
      });
    } else if (event.type === 'done') {
      api.addNotification({
        id: `designbook-done-${event.workflow}-${Date.now()}`,
        content: { headline: event.title, subHeadline: 'Workflow completed' },
        duration: 8000,
      });
    }
  });
}
