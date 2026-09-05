export default function Checkbox({ label, className = '', ...props }) {
    return (
        <label className={`flex items-center gap-2 text-sm text-gray-700 cursor-pointer ${className}`}>
            <input
                type="checkbox"
                className="w-4 h-4 rounded border-gray-300 text-[#0F1E36] focus:ring-[#0F1E36] focus:ring-offset-0"
                {...props}
            />
            {label}
        </label>
    );
}