export default function FormSection({ title, description, children, collapsible = false, expanded = true, onToggle }) {
    return (
        <div className="bg-white rounded-2xl border border-[#E2E5EA] p-6 sm:p-8 mb-6 shadow-sm hover:shadow-md transition-shadow duration-200">
            {title || description || collapsible ? (
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-[#E2E5EA]">
                    <div>
                        {title && (
                            <h2 className="text-lg font-semibold text-[#0F1E36] flex items-center gap-2">
                                {title}
                            </h2>
                        )}
                        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                    </div>
                    {collapsible && (
                        <button
                            onClick={onToggle}
                            className={`p-2 rounded-lg hover:bg-[#0F1E36]/5 transition-colors
                                     ${expanded ? 'text-[#0F1E36]' : 'text-gray-400'}`}
                            aria-label={expanded ? 'Collapse section' : 'Expand section'}
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