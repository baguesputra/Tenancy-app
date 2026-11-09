/**
 * Header seragam: judul halaman + deskripsi, status di bawahnya, aksi di kanan.
 * Judul adalah satu-satunya h1 di layar, jadi rail dan hub tidak mengulangnya.
 */
export default function PageHeader({ title, description, meta = null, actions = null }) {
    return (
        <div className="mb-5 flex flex-col gap-3 border-b border-[#E2E5EA] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <h1 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h1>
                {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
                {meta && <div className="mt-2">{meta}</div>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}
