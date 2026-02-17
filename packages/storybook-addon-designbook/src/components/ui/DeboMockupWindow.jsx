import React from 'react';

/**
 * A wrapper component that displays content inside a mockup window frame.
 * Uses DaisyUI mockup-window class.
 */
export function DeboMockupWindow({ children, className = '', contentClassName = '' }) {
    return (
        <div className={`debo:mockup-window debo:border debo:border-base-300 debo:bg-base-300 ${className}`}>
            <div className={`debo:flex debo:justify-start debo:px-4 debo:py-8 debo:bg-base-100 ${contentClassName}`}>
                {children}
            </div>
        </div>
    );
}
