export default function FormSection({ title, description, children, collapsible = false, expanded = true, onToggle, variant }) {
    const drawer = variant === 'drawer';
    return (
        <div className={drawer ? 'bg-white rounded-xl border border-[#E2E5EA] p-4 mb-3 shadow-sm' : 'bg-white rounded-2xl border border-[#E2E5EA] p-6 sm:p-8 mb-6 shadow-sm hover:shadow-md transition-shadow duration-200'}>
            {title || description || collapsible ? (
                <div className={drawer ? 'flex items-center justify-between gap-2 mb-3' : 'flex items-center justify-between mb-5 pb-3 border-b border-[#E2E5EA]'}>
                    <div className="min-w-0">
                        {title && (
                            <h2 className={drawer ? 'text-sm font-semibold text-gray-900' : 'text-lg font-semibold text-[#0F1E36] flex items-center gap-2'}>
                                {title}
                            </h2>
                        )}
                        {description && <p className={drawer ? 'text-xs text-gray-500 mt-0.5' : 'text-sm text-gray-500 mt-0.5'}>{description}</p>}
                    </div>
                    {collapsible && (
                        <button
                            onClick={onToggle}
                            aria-expanded={expanded}
                            className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-[#0F1E36]/5 transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36]
                                     ${expanded ? 'text-[#0F1E36]' : 'text-gray-400'}`}
                            aria-label={expanded ? 'Ciutkan bagian' : 'Bentangkan bagian'}
                        >
                            <svg className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                </div>
            ) : null}
            
            {!collapsible || expanded ? (
                <div className="mt-2">
                    {children}
                </div>
            ) : null}
        </div>
    );
}