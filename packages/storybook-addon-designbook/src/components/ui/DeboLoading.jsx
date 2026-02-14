/**
 * DeboLoading — Centered loading spinner.
 */
export function DeboLoading() {
    return (
        <div data-theme="light" className="debo:font-sans debo:flex debo:justify-center debo:py-12">
            <span className="debo:loading debo:loading-spinner debo:loading-md" />
        </div>
    );
}
