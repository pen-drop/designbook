import { DeboBadge } from './DeboBadge.jsx';

/**
 * DeboCard — Entity bundle card with title, type badge, description, and metadata.
 *
 * @param {Object} props
 * @param {string} props.title - Bundle display name
 * @param {string} [props.badge] - Entity type label (e.g., "node")
 * @param {'green'|'red'|'purple'} [props.badgeColor='red'] - Badge color variant
 * @param {string} [props.description] - Short description
 * @param {string} [props.entityPath] - Dot-notation path (e.g., "node.projects")
 * @param {number} [props.fieldCount] - Number of fields
 * @param {string} [props.className] - Additional classes
 * @param {React.ReactNode} [props.children] - Extra content below metadata
 */
export function DeboCard({ title, badge, badgeColor = 'red', description, entityPath, fieldCount, className = '', children }) {
    const hasFooter = entityPath || fieldCount != null;
    return (
        <div className={`debo:bg-white debo:border debo:border-slate-200/80 debo:rounded-[14px] debo:shadow-[0px_2px_8px_-4px_rgba(0,0,0,0.05)] debo:p-5 ${className}`.trim()}>
            <div className="debo:flex debo:items-start debo:justify-between debo:gap-3">
                <h3 className="debo:!font-sans debo:text-[18px] debo:font-semibold debo:leading-7 debo:tracking-[-0.44px] debo:text-[#1D293D]">{title}</h3>
                {badge && <DeboBadge color={badgeColor}>{badge}</DeboBadge>}
            </div>
            {description && (
                <p className="debo:mt-3 debo:!font-sans debo:text-[15px] debo:font-normal debo:leading-[1.625] debo:text-[#62748E]">{description}</p>
            )}
            {hasFooter && (
                <>
                    <div className="debo:border-t debo:border-slate-100/80 debo:mt-5 debo:mb-3" />
                    <div className="debo:flex debo:items-center debo:gap-2 debo:flex-wrap">
                        {entityPath && (
                            <span className="debo:bg-[#F8FAFC] debo:border debo:border-slate-200/80 debo:text-[#62748E] debo:!font-mono debo:text-[11px] debo:leading-[16.5px] debo:px-2 debo:py-0.5 debo:rounded-lg">{entityPath}</span>
                        )}
                        {fieldCount != null && (
                            <span className="debo:bg-[#F8FAFC] debo:border debo:border-slate-200/60 debo:text-[#62748E] debo:!font-sans debo:font-medium debo:text-[12px] debo:leading-[18px] debo:px-2 debo:py-1 debo:rounded-lg">{fieldCount} Fields</span>
                        )}
                    </div>
                </>
            )}
            {children}
        </div>
    );
}
