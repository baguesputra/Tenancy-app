export default function TextInput({ error, className = '', ...props }) {
    return (
        <input
            type="text"
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400
                transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0
                ${error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                } ${className}`}
            {...props}
        />
    );
}