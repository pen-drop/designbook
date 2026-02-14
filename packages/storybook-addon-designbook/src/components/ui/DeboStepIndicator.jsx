/**
 * DeboStepIndicator - Displays a step in a multi-step workflow using
 * DaisyUI's steps component for visual status indicators.
 *
 * @param {Object} props
 * @param {number} props.step - The step number
 * @param {string} props.title - The step title
 * @param {'completed'|'current'|'upcoming'} props.status - Current status
 * @param {React.ReactNode} props.children - Content rendered inside the step
 * @param {boolean} [props.isLast=false] - Whether this is the last step
 */
export function DeboStepIndicator({ step, title, status, children, isLast = false }) {
  const stepClass = status === 'completed'
    ? 'debo:step-success'
    : status === 'current'
      ? 'debo:step-primary'
      : '';

  return (
    <div className="debo:mb-6">
      {/* Step header */}
      <div className="debo:flex debo:items-center debo:gap-3 debo:mb-3">
        <div className={`debo:w-7 debo:h-7 debo:rounded-full debo:flex debo:items-center debo:justify-center debo:text-xs debo:font-semibold debo:shrink-0 ${status === 'completed'
            ? 'debo:bg-success/20 debo:text-success'
            : status === 'current'
              ? 'debo:bg-primary debo:text-primary-content debo:shadow-sm'
              : 'debo:bg-base-300 debo:text-base-content/50'
          }`}>
          {status === 'completed' ? (
            <svg className="debo:w-3.5 debo:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : status === 'current' ? (
            <svg className="debo:w-3.5 debo:h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          ) : (
            step
          )}
        </div>
        <h3 className="debo:text-base debo:font-semibold debo:text-base-content">
          {title}
        </h3>
        {status === 'completed' && (
          <span className="debo:badge debo:badge-success debo:badge-sm debo:gap-1">
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
    <div className="debo:space-y-2">
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
