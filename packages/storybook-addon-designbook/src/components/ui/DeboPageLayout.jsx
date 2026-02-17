/**
 * DeboPageLayout — Standard page wrapper with font, max-width, and centering.
 *
 * @param {Object} props
 * @param {'4'|'6'|'8'} [props.gap='4'] - Vertical spacing between children
 * @param {React.ReactNode} props.children
 */
export function DeboPageLayout({ gap = '4', children }) {
    return (
        <div data-theme="light" className={`debo:font-sans debo:mx-auto debo:py-6 debo:space-y-${gap}`}>
            {children}
        </div>
    );
}
