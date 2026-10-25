import { Link } from '@inertiajs/react';

/**
 * Satu baris navigasi sidebar.
 *
 * Saat sidebar diciutkan label disembunyikan dan diganti tooltip visual yang
 * muncul pada hover maupun fokus keyboard (bukan `title` native yang lambat).
 * Nama aksesibel tetap dibawa `aria-label`, jadi tooltip cukup `aria-hidden`.
 * `tone="light"` dipakai untuk flyout berlatar putih.
 */
export default function NavItem({
    href,
    currentUrl,
    children,
    icon,
    small = false,
    collapsed = false,
    tone = 'dark',
    className = '',
}) {
    const isActive = currentUrl === href || currentUrl.startsWith(href + '/') || (href !== '/dashboard' && currentUrl.startsWith(href));
    const label = typeof children === 'string' ? children : undefined;

    const toneClass = tone === 'light'
        ? isActive
            ? 'text-[#0F1E36] bg-[#0F1E36]/5 font-medium'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        : isActive
            ? 'text-white bg-white/10 font-medium'
            : 'text-white/60 hover:text-white hover:bg-white/5';

    return (
        <Link
            href={href}
            aria-label={collapsed && label ? label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex items-center gap-3 px-3 rounded-lg text-sm transition-colors focus-visible:outline-2 min-h-[44px]
                ${small ? 'py-2 text-[13px]' : 'py-2.5'}
                ${collapsed ? 'justify-center' : ''}
                ${tone === 'dark' ? 'focus-visible:outline-white' : 'focus-visible:outline-[#0F1E36]'}
                ${toneClass} ${className}`}
        >
            {isActive && tone === 'dark' && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#FF6B6B] rounded-r-full" aria-hidden="true" />
            )}
            {icon && <span className="shrink-0" aria-hidden="true">{icon}</span>}
            {!collapsed && <span className="truncate">{children}</span>}
            {collapsed && label && (
                <span
                    aria-hidden="true"
                    className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                >
                    {label}
                </span>
            )}
        </Link>
    );
}