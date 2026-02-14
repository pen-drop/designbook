/**
 * Designbook Component Library
 *
 * React components for interactive workflow UIs in Storybook MDX files.
 * All components use `debo:` prefixed Tailwind classes for CSS isolation.
 */
import '../index.css';

// UI — Visual primitives
export {
    DeboAlert,
    DeboBulletList,
    DeboCollapsible,
    DeboEmptyState,
    DeboLoading,
    DeboMockupWindow,
    DeboNumberedList,
    DeboPageLayout,
    DeboSourceFooter,
    DeboStepIndicator,
    DeboStepIndicatorGroup,
} from './ui/index.js';

// Display — Domain data renderers
export {
    DeboDataModel,
    DeboDesignTokens,
    DeboProductOverview,
    DeboSampleData,

} from './display/index.js';

// Pages — Full page compositions
export {
    DeboExportPage,
    DeboSectionDetailPage,
    DeboSectionsOverview,
} from './pages/index.js';

// Data — Loading containers
export { DeboSection } from './DeboSection.jsx';

// Hook
export { useDesignbookData } from '../hooks/useDesignbookData.js';
