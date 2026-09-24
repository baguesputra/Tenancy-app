import { Fragment } from 'react';
import { Link, router, usePage } from '@inertiajs/react';

export default function Breadcrumbs({ items, className = '' }) {
    const { breadcrumbs: shared } = usePage().props;
    const crumbs = items ?? shared ?? [];

    if (crumbs.length === 0) return null;

    const last = crumbs[crumbs.length - 1];
    const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
    const backHref = parent?.href ?? crumbs[0]?.href ?? '/dashboard';

    const goBack = () => {
        if (window.history.length > 1) window.history.back();
        else router.visit(backHref);
    };

    return (
        <>
            <nav className={`flex sm:hidden items-center gap-1.5 text-sm min-w-0 ${className}`} aria-label="Breadcrumb">
                <button
                    type="button"
                    onClick={goBack}
                    aria-label="Kembali"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                </button>
                {parent?.href && (
                    <>
                        <Link href={parent.href} className="shrink-0 max-w-[30vw] truncate text-gray-500 hover:text-gray-800 rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                            {parent.label}
                        </Link>
                        <span className="shrink-0 text-gray-400" aria-hidden="true">/</span>
                    </>
                )}
                <span className="min-w-0 flex-1 truncate max-w-[40vw] font-medium text-gray-900" aria-current="page">{last.label}</span>
            </nav>
            <nav className={`hidden sm:flex items-center gap-1.5 text-sm min-w-0 ${className}`} aria-label="Breadcrumb">
                {crumbs.map((crumb, idx) => (
                    <Fragment key={`${crumb.label}-${idx}`}>
                        {idx > 0 && <span className="text-gray-400" aria-hidden="true">/</span>}
                        {idx === crumbs.length - 1 || !crumb.href ? (
                            <span className="font-medium text-gray-900 truncate max-w-[180px]">{crumb.label}</span>
                        ) : (
                            <Link href={crumb.href} className="text-gray-500 hover:text-gray-800 transition-colors rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                {crumb.label}
                            </Link>
                        )}
                    </Fragment>
                ))}
            </nav>
        </>
    );
}
