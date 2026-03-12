import { DeboBadge } from './DeboBadge.jsx';

/**
 * Status icon for action list items.
 * Renders checkmark (done), spinner (in-progress), or circle (pending).
 */
function StatusIcon({ status }) {
  if (status === 'done') {
    return (
      <div className="debo:w-5 debo:h-5 debo:rounded-full debo:bg-success/20 debo:flex debo:items-center debo:justify-center debo:shrink-0">
        <svg className="debo:w-3 debo:h-3 debo:text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === 'in-progress') {
    return (
      <div className="debo:w-5 debo:h-5 debo:rounded-full debo:border-2 debo:border-primary debo:border-t-transparent debo:animate-spin debo:shrink-0" />
    );
  }

  // pending
  return (
    <div className="debo:w-5 debo:h-5 debo:rounded-full debo:border-2 debo:border-base-300 debo:shrink-0" />
  );
}

/**
 * Label color by status.
 */
function labelClass(status) {
  if (status === 'done') return 'debo:text-success';
  if (status === 'in-progress') return 'debo:text-base-content';
  return 'debo:text-base-content/40';
}

/**
 * Type badge color mapping.
 */
const typeColors = {
  component: 'purple',
  scene: 'green',
  data: 'green',
  tokens: 'purple',
  'view-mode': 'green',
  css: 'purple',
  validation: 'green',
};

/**
 * DeboActionList.Item — A compact single-line task row.
 *
 * @param {Object} props
 * @param {'pending'|'in-progress'|'done'} props.status - Task status
 * @param {string} props.title - Task label
 * @param {string} [props.type] - Task type for badge display
 * @param {string} [props.timestamp] - Relative timestamp (e.g., "2m ago")
 * @param {React.ReactNode} [props.children] - Optional trailing content
 */
function Item({ status, title, type, timestamp, children }) {
  return (
    <div className="debo:flex debo:items-center debo:gap-2.5 debo:py-1.5 debo:px-1 debo:rounded debo:transition-colors hover:debo:bg-base-200/50">
      <StatusIcon status={status} />
      <span className={`debo:text-sm debo:font-normal debo:flex-1 debo:truncate ${labelClass(status)}`}>
        {title}
      </span>
      {type && (
        <DeboBadge color={typeColors[type] || 'green'}>
          {type}
        </DeboBadge>
      )}
      {timestamp && (
        <span className="debo:text-xs debo:text-base-content/30 debo:shrink-0">
          {timestamp}
        </span>
      )}
      {children}
    </div>
  );
}

/**
 * DeboActionList — Compact list container for task items.
 * Inspired by Storybook's internal ActionList component.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - DeboActionList.Item elements
 * @param {string} [props.className] - Additional classes
 */
export function DeboActionList({ children, className = '' }) {
  return (
    <div className={`debo:flex debo:flex-col ${className}`.trim()}>
      {children}
    </div>
  );
}

DeboActionList.Item = Item;
