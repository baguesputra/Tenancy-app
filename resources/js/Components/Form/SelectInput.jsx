export default function SelectInput({ error, className = '', loading = false, searchable = false, ...props }) {
    return (
        <div className="relative">
            <select
                className={`w-full pl-3.5 pr-${searchable ? '10' : '3.5'} py-2.5 text-sm text-gray-900 bg-white
                    border border-gray-300 rounded-lg focus:ring-2 focus:ring-offset-0
                    transition-all duration-200 ease-out
                    appearance-none
                    bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3e%3cpolyline points=%276 9 12 15 18 9%27/%3e%3c/svg%3e')] 
                    bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem]
                    ${error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                    }
                    ${loading ? 'opacity-70' : ''}
                    ${className}`}
                {...props}
            />
            
            {/* Search indicator */}
            {searchable && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center pointer-events-none">
                    <svg className="h-3 w-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                </div>
            )}
            
            {/* Loading indicator */}
            {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center pointer-events-none">
                    <svg className="animate-spin h-3 w-3 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                </div>
            )}
        </div>
    );
}