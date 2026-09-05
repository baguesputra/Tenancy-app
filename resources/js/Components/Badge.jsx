const colorMap = {
    gray: 'bg-gray-100 text-gray-600',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
};

export default function Badge({ color = 'gray', children }) {
    return (
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${colorMap[color]}`}>
            {children}
        </span>
    );
}