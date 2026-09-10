export default function Checkbox({ label, className = '', loading = false, ...props }) {
    return (
        <label className={`flex items-center gap-3 cursor-pointer ${className}`}>
            <div className="relative">
                <input
                    type="checkbox"
                    className={`w-4 h-4 rounded border-gray-300 text-[#0F1E36] focus:ring-2 focus:ring-offset-0
                              ${props.checked ? 'bg-[#0F1E36] border-[#0F1E36]' : 'border-gray-300'}
                              focus:border-[#0F1E36] transition-all duration-200
                              ${loading ? 'opacity-70' : ''}`}
                    {...props}
                />
                {/* Custom checkmark */}
                {props.checked && (
                    <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <svg className="h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </span>
                )}
            </div>
            <span className={`text-sm 
                       ${props.checked ? 'text-gray-900 font-medium' : 'text-gray-600'}
                       transition-colors duration-200`}>
                {label}
            </span>
            
            {/* Loading indicator */}
            {loading && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center">
                    <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                </div>
            )}
        </label>
    );
}