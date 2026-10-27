import { Link } from '@inertiajs/react';
import { useRef, useState } from 'react';

/**
 * Satu baris navigasi sidebar (rail navy).
 *
 * Saat rail diciutkan label disembunyikan dan diganti tooltip visual yang
 * muncul pada hover maupun fokus keyboard (bukan `title` native yang lambat).
 * Nama aksesibel tetap dibawa `aria-label`, jadi tooltip cukup `aria-hidden`.
 *
 * Tooltip diposisikan `fixed` dan koordinatnya dihitung saat muncul, bukan
 * `absolute left-full`: rail ciut punya scroll container (`overflow-y-auto`),
 * dan sumbu overflow yang non-`visible` akan memotong tooltip. `aside` memakai
 * `translate` sehingga menjadi containing block untuk elemen `fixed`, jadi
 * koordinat dihitung relatif ke `aside`.
 *
 * Ikon diskalakan lewat pembungkus (`[&>svg]`): 16px saat rail terbuka agar
 * sejajar teks, 20px saat ciut karena rail ikon murni butuh presence lebih.
 */
export default function NavItem({ href, currentUrl, children, icon, collapsed = false }) {
    const isActive = currentUrl === href || currentUrl.startsWith(href + '/') || (href !== '/dashboard' && currentUrl.startsWith(href));
    const label = typeof children === 'string' ? children : undefined;

    const linkRef = useRef(null);
    const [tipTop, setTipTop] = useState(null);

    // Hitung posisi vertikal tooltip relatif terhadap containing block `aside`
    // (tercipta karena `aside` memakai `translate`). Hanya dipakai saat ciut.
    const showTip = () => {
        const el = linkRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const aside = el.closest('aside');
        const base = aside ? aside.getBoundingClientRect().top : 0;
        setTipTop(rect.top + rect.height / 2 - base);
    };
    const hideTip = () => setTipTop(null);

    return (
        <Link
            ref={linkRef}
            href={href}
            aria-label={collapsed && label ? label : undefined}
            aria-current={isActive ? 'page' : undefined}
            onMouseEnter={collapsed ? showTip : undefined}
            onMouseLeave={collapsed ? hideTip : undefined}
            onFocus={collapsed ? showTip : undefined}
            onBlur={collapsed ? hideTip : undefined}
            className={`group relative flex items-center gap-3 py-2.5 pl-3 pr-2.5 min-h-10 rounded-md text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white
                ${collapsed ? 'justify-center pl-0 pr-0' : ''}
                ${isActive ? 'text-white bg-white/15 font-semibold shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]' : 'text-white/75 hover:text-white hover:bg-white/[0.08]'}`}
        >
            {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-sm bg-white" aria-hidden="true" />
            )}
            {icon && (
                <span
                    className={`shrink-0 ${collapsed ? '[&>svg]:h-5 [&>svg]:w-5' : '[&>svg]:h-4 [&>svg]:w-4'}`}
                    aria-hidden="true"
                >
                    {icon}
                </span>
            )}
            {!collapsed && <span className="truncate">{children}</span>}
            {collapsed && label && tipTop !== null && (
                <span
                    aria-hidden="true"
                    style={{ top: tipTop }}
                    className="pointer-events-none fixed left-full z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md border border-[#E2E5EA] bg-white px-2.5 py-1.5 text-xs font-medium text-[#0F1E36]"
                >
                    {label}
                </span>
            )}
        </Link>
    );
}
