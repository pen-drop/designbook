/**
 * DeboSourceFooter — Footer showing source path, AI command hint, and an optional reload button.
 *
 * @param {Object} props
 * @param {string} props.path - Source path to display
 * @param {string} [props.command] - AI command name (e.g. "/debo-data-model")
 * @param {Function} [props.onReload] - Callback for reload button (hidden if omitted)
 */
export function DeboSourceFooter({ path, command, onReload }) {
    return (
        <div className="debo:flex debo:items-start debo:justify-between debo:gap-4 debo:border-t debo:border-slate-200/80 debo:pt-3 debo:mt-2">
            <div className="debo:flex debo:flex-col debo:gap-2">
                {command && (
                    <div className="debo:flex debo:items-center debo:gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 11 11"
                            fill="none"
                            className="debo:w-[11px] debo:h-[11px] debo:shrink-0"
                        >
                            <circle cx="5.5" cy="5.5" r="4.9" stroke="#90A1B9" strokeWidth="1.08" />
                            <line x1="5.5" y1="4.9" x2="5.5" y2="7.5" stroke="#90A1B9" strokeWidth="1.08" strokeLinecap="round" />
                            <circle cx="5.5" cy="3.6" r="0.55" fill="#90A1B9" />
                        </svg>
                        <span className="debo:text-slate-500 debo:text-[13px] debo:leading-[1.5]">
                            Run{' '}
                            <code className="debo:bg-slate-50/80 debo:border debo:border-slate-200/50 debo:rounded debo:px-1.5 debo:py-0.5 debo:font-mono debo:text-[12px] debo:text-slate-600">
                                {command}
                            </code>
                            {' '}to update
                        </span>
                    </div>
                )}
                <p className="debo:text-slate-500 debo:text-[14px] debo:leading-[1.5]">
                    Source:{' '}
                    <code className="debo:bg-slate-50/80 debo:border debo:border-slate-200/50 debo:rounded debo:px-1.5 debo:py-0.5 debo:font-mono debo:text-[13px] debo:text-slate-500">
                        {path}
                    </code>
                </p>
            </div>
            {onReload && (
                <button
                    onClick={onReload}
                    className="debo:flex debo:items-center debo:gap-2 debo:bg-white debo:border debo:border-slate-200 debo:shadow-sm debo:rounded-[10px] debo:px-3 debo:py-1.5 debo:text-[#45556C] debo:text-[16px] debo:font-medium debo:leading-[1.5] debo:shrink-0 debo:cursor-pointer debo:hover:bg-slate-50 debo:transition-colors"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 14 14"
                        fill="none"
                        className="debo:w-3.5 debo:h-3.5"
                    >
                        <path
                            d="M1.75 7A5.25 5.25 0 0 1 10.5 2.625L12.25 1.75v3.5H8.75"
                            stroke="#90A1B9"
                            strokeWidth="1.17"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M12.25 7A5.25 5.25 0 0 1 3.5 11.375L1.75 12.25v-3.5H5.25"
                            stroke="#90A1B9"
                            strokeWidth="1.17"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    Refresh
                </button>
            )}
        </div>
    );
}
