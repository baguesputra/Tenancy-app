const variants = {
    primary: 'bg-[#0F1E36] text-white hover:bg-[#1a2f52] disabled:bg-gray-300',
    success: 'bg-[#1FA24C] text-white hover:bg-[#178a3f] disabled:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
    warning: 'bg-[#F59E0B] text-white hover:bg-[#D49708] disabled:bg-gray-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
    ghost: 'text-[#0F1E36] hover:bg-[#0F1E36]/10 disabled:text-gray-400',
};

export default function Button({ 
    variant = 'primary', 
    className = '', 
    children, 
    loading = false,
    iconLeft = null,
    iconRight = null,
    ...props 
}) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium
                transition-all duration-200 ease-out
                shadow-sm hover:shadow-md
                disabled:cursor-not-allowed
                ${variants[variant]} ${className}`}
            {...props}
            disabled={loading}
        >
            {iconLeft && (
                <span className="h-4 w-4">{iconLeft}</span>
            )}
            {loading ? (
                <span className="flex h-4 w-4 items-center justify-center">
                    <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                </span>
            ) : (
                <>
                    {children}
                    {iconRight && (
                        <span className="h-4 w-4">{iconRight}</span>
                    )}
                </>
            )}
        </button>
    );
}