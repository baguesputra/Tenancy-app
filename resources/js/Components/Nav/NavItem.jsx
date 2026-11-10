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
 *
 * Item aktif berwarna sama dengan kanvas halaman (`slate-50`) dan menempel
 * rata di tepi kanan rail, jadi terbaca sebagai bagian halaman yang terbuka,
 * bukan baris yang disorot. Sisi kiri saja yang beradius. Saat rail ciut
 * tidak ada label yang bisa menyambung ke kanvas, jadi penandanya kotak putih
 * di belakang ikon, dengan ikon navy.
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
            className={`group relative flex items-center gap-3 py-2.5 min-h-10 text-sm transition-colors duration-150 motion-reduce:transition-none
                ${collapsed
                    ? `justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isActive ? '' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'}`
                    : `pl-3 pr-4 focus-visible:outline-2 focus-visible:-outline-offset-2 ${isActive ? 'rounded-l-md bg-slate-50 text-[#0F1E36] focus-visible:outline-[#0F1E36]' : 'rounded-md mr-2.5 text-white/65 hover:bg-white/[0.06] hover:text-white focus-visible:outline-white'}`}`}
        >
            {icon && (
                <span
                    className={`shrink-0 ${collapsed
                        ? `[&>svg]:h-5 [&>svg]:w-5 ${isActive ? 'flex h-9 w-9 items-center justify-center rounded-lg bg-white text-[#0F1E36]' : 'text-white/70 group-hover:text-white'}`
                        : `[&>svg]:h-4 [&>svg]:w-4 ${isActive ? '' : 'text-white/70 group-hover:text-white'}`}`}
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
