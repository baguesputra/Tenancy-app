const colorMap = {
    gray: { solid: 'bg-gray-100 text-gray-700', outline: 'border-gray-300 text-gray-700', soft: 'bg-gray-50 text-gray-700' },
    green: { solid: 'bg-emerald-100 text-emerald-700', outline: 'border-emerald-300 text-emerald-700', soft: 'bg-emerald-50 text-emerald-700' },
    yellow: { solid: 'bg-amber-100 text-amber-700', outline: 'border-amber-300 text-amber-700', soft: 'bg-amber-50 text-amber-700' },
    red: { solid: 'bg-red-100 text-red-700', outline: 'border-red-300 text-red-700', soft: 'bg-red-50 text-red-700' },
    blue: { solid: 'bg-blue-100 text-blue-700', outline: 'border-blue-300 text-blue-700', soft: 'bg-blue-50 text-blue-700' },
    amber: { solid: 'bg-amber-100 text-amber-700', outline: 'border-amber-300 text-amber-700', soft: 'bg-amber-50 text-amber-700' },
    coral: { solid: 'bg-[#FF6B6B]/10 text-[#FF6B6B]', outline: 'border-[#FF6B6B] text-[#FF6B6B]', soft: 'bg-[#FF6B6B]/10 text-[#FF6B6B]' },
};

const sizeMap = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
};

export default function Badge({ color = 'gray', variant = 'solid', size = 'md', children, className = '' }) {
    const baseStyles = 'inline-flex items-center font-medium rounded-full whitespace-nowrap';
    const colorStyles = colorMap[color]?.[variant] || colorMap.gray[variant];
    const sizeStyles = sizeMap[size];

    return (
        <span className={`${baseStyles} ${colorStyles} ${sizeStyles} ${className}`}>
            {children}
        </span>
    );
}