export default function SelectInput({ error, className = '', children, ...props }) {
    return (
        <select
            className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-900 bg-white
                transition-colors focus:outline-none focus:ring-2 appearance-none
                bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3e%3cpolyline points=%276 9 12 15 18 9%27/%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem]
                ${error
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                    : 'border-gray-300 focus:border-[#0F1E36] focus:ring-gray-100'
                } ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}