export default function EmptyState({
    variant = 'empty',
    image,
    title = 'Belum Ada Data',
    description,
    action,
    size = 'md',
    className = '',
}) {
    const variantImages = {
        notification: '/images/errors/no-notifications.png',
        search: '/images/errors/no-search-result.png',
        data: '/images/errors/no-data-available.png',
        construction: '/images/errors/under-construction.png',
        empty: '/images/errors/empty-state.png',
    };

    const imgSrc = image || variantImages[variant] || variantImages.empty;

    const sizeClasses = {
        sm: {
            img: 'h-28 w-28',
            title: 'text-xs font-semibold',
            desc: 'text-2xs text-gray-400',
            wrap: 'py-4 px-3',
        },
        md: {
            img: 'h-40 w-40',
            title: 'text-sm font-semibold',
            desc: 'text-xs text-gray-500',
            wrap: 'py-8 px-4',
        },
        lg: {
            img: 'h-56 w-56',
            title: 'text-base font-bold',
            desc: 'text-xs text-gray-500',
            wrap: 'py-12 px-6',
        },
    };

    const s = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={`flex flex-col items-center justify-center text-center ${s.wrap} ${className}`}>
            <div className={`relative mb-3 flex items-center justify-center select-none ${s.img}`}>
                <img
                    src={imgSrc}
                    alt={title}
                    className="max-h-full max-w-full object-contain pointer-events-none mix-blend-multiply"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            </div>
            {title && <p className={`text-slate-800 ${s.title}`}>{title}</p>}
            {description && (
                <p className={`mt-1 max-w-sm leading-relaxed ${s.desc}`}>
                    {description}
                </p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

