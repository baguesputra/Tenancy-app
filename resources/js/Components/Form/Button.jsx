const variants = {
    primary: 'bg-[#0F1E36] text-white hover:bg-[#1a2f52] disabled:bg-gray-300',
    success: 'bg-[#1FA24C] text-white hover:bg-[#178a3f] disabled:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-300',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
    return (
        <button
            className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium
                transition-colors disabled:cursor-not-allowed
                ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}