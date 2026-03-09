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
        <div className={`debo:bg-white debo:border debo:border-gray-200 debo:rounded-[14px] debo:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] debo:p-5 ${className}`.trim()}>
            <div className="debo:flex debo:items-start debo:justify-between debo:gap-3">
                <h3 className="debo:!font-sans debo:text-lg debo:font-semibold debo:leading-7 debo:tracking-normal debo:text-slate-800">{title}</h3>
                {badge && <DeboBadge color={badgeColor}>{badge}</DeboBadge>}
            </div>
            {description && (
                <p className="debo:mt-3 debo:!font-sans debo:text-sm debo:font-normal debo:leading-5 debo:tracking-normal debo:text-gray-600">{description}</p>
            )}
            {hasFooter && (
                <>
                    <div className="debo:border-t debo:border-gray-100 debo:mt-5 debo:mb-3" />
                    <div className="debo:flex debo:items-center debo:gap-2 debo:flex-wrap">
                        {entityPath && (
                            <span className="debo:bg-gray-50 debo:border debo:border-gray-200 debo:text-gray-600 debo:!font-mono debo:text-[11px] debo:leading-[16.5px] debo:px-2 debo:py-0.5 debo:rounded-lg">{entityPath}</span>
                        )}
                        {fieldCount != null && (
                            <span className="debo:bg-gray-50 debo:text-gray-600 debo:!font-sans debo:font-medium debo:text-xs debo:leading-[18px] debo:px-2 debo:py-1 debo:rounded-lg">{fieldCount} Fields</span>
                        )}
                    </div>
                </>
            )}
            {children}
        </div>
    );
}
