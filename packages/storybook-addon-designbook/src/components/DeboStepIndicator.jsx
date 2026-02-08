import { useState } from 'react';

/**
 * Step status types: 'completed' | 'current' | 'upcoming'
 */

/**
 * StepBadge - Renders the circular step indicator badge.
 */
function StepBadge({ step, status }) {
  const baseClasses =
    'debo:w-7 debo:h-7 debo:rounded-full debo:flex debo:items-center debo:justify-center debo:text-xs debo:font-semibold debo:transition-all debo:duration-200';

  if (status === 'completed') {
    return (
      <div
        className={`${baseClasses} debo:bg-success/20 debo:text-success`}
        aria-label={`Step ${step} completed`}
      >
        <svg className="debo:w-3.5 debo:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (status === 'current') {
    return (
      <div
        className={`${baseClasses} debo:bg-primary debo:text-primary-content debo:shadow-sm`}
        aria-label={`Step ${step} current`}
      >
        <svg className="debo:w-3.5 debo:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </div>
    );
  }

  // upcoming
  return (
    <div
      className={`${baseClasses} debo:bg-base-300 debo:text-base-content/50`}
      aria-label={`Step ${step} upcoming`}
    >
      {step}
    </div>
  );
}

/**
 * DeboStepIndicator - Displays a step in a multi-step workflow with
 * visual status indicators (completed, current, upcoming) and
 * a vertical connecting line between steps.
 *
 * @param {Object} props
 * @param {number} props.step - The step number
 * @param {string} props.title - The step title
 * @param {'completed'|'current'|'upcoming'} props.status - Current status
 * @param {React.ReactNode} props.children - Content rendered inside the step
 * @param {boolean} [props.isLast=false] - Whether this is the last step
 */
export function DeboStepIndicator({ step, title, status, children, isLast = false }) {
  return (
    <div className="debo:relative">
      {/* Vertical connecting line */}
      {!isLast && (
        <div
          className="debo:absolute debo:left-[13px] debo:top-[32px] debo:w-[2px] debo:h-[calc(100%+12px)] debo:bg-base-300"
          aria-hidden="true"
        />
      )}

      {/* Step header with badge and title */}
      <div className="debo:flex debo:items-center debo:gap-3 debo:mb-3">
        <StepBadge step={step} status={status} />
        <h3 className="debo:text-base debo:font-semibold debo:text-base-content">
          {title}
        </h3>
        {status === 'completed' && (
          <span className="debo:text-xs debo:text-success debo:font-medium debo:uppercase debo:tracking-wide">
            Complete
          </span>
        )}
      </div>

      {/* Step content */}
      <div className="debo:pl-10">
        {children}
      </div>
    </div>
  );
}

/**
 * DeboStepIndicatorGroup - Renders multiple steps together with proper spacing.
 *
 * @param {Object} props
 * @param {Array} props.steps - Array of { step, title, status, content }
 */
export function DeboStepIndicatorGroup({ steps }) {
  return (
    <div className="debo:space-y-6">
      {steps.map((stepData, index) => (
        <DeboStepIndicator
          key={stepData.step}
          step={stepData.step}
          title={stepData.title}
          status={stepData.status}
          isLast={index === steps.length - 1}
        >
          {stepData.content}
        </DeboStepIndicator>
      ))}
    </div>
  );
}
