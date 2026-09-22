const colorMap = {
    gray: { solid: 'bg-gray-100 text-gray-800', outline: 'border-gray-300 text-gray-800', soft: 'bg-gray-50 text-gray-800' },
    green: { solid: 'bg-emerald-100 text-emerald-800', outline: 'border-emerald-400 text-emerald-800', soft: 'bg-emerald-50 text-emerald-800' },
    yellow: { solid: 'bg-amber-100 text-amber-900', outline: 'border-amber-400 text-amber-900', soft: 'bg-amber-50 text-amber-900' },
    red: { solid: 'bg-red-100 text-red-800', outline: 'border-red-400 text-red-800', soft: 'bg-red-50 text-red-800' },
    blue: { solid: 'bg-blue-100 text-blue-800', outline: 'border-blue-400 text-blue-800', soft: 'bg-blue-50 text-blue-800' },
    amber: { solid: 'bg-amber-100 text-amber-900', outline: 'border-amber-400 text-amber-900', soft: 'bg-amber-50 text-amber-900' },
    coral: { solid: 'bg-[#FF6B6B]/15 text-[#D64545]', outline: 'border-[#FF6B6B] text-[#D64545]', soft: 'bg-[#FF6B6B]/10 text-[#D64545]' },
};

const sizeMap = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
};

export default function Badge({ color = 'gray', variant = 'solid', size = 'md', children, className = '' }) {
    const baseStyles = 'inline-flex items-center font-medium rounded-full whitespace-nowrap ring-1 ring-inset ring-black/5';
    const colorStyles = colorMap[color]?.[variant] || colorMap.gray[variant];
    const sizeStyles = sizeMap[size];

    return (
        <span className={`${baseStyles} ${colorStyles} ${sizeStyles} ${className}`}>
            {children}
        </span>
    );
}