import { Fragment } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Breadcrumbs({ items, className = '' }) {
    const { breadcrumbs: shared } = usePage().props;
    const crumbs = items ?? shared ?? [];

    if (crumbs.length === 0) return null;

    return (
        <nav className={`flex items-center gap-1.5 text-sm min-w-0 ${className}`} aria-label="Breadcrumb">
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
    );
}
