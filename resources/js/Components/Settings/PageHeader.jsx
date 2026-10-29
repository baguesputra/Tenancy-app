/**
 * Header seragam untuk halaman Pengaturan: judul + deskripsi + slot aksi.
 * Garis bawah tipis memisahkan header dari isi agar ritme antar-tab sama.
 */
export default function PageHeader({ title, description, meta = null, actions = null }) {
    return (
        <div className="mb-5 flex flex-col gap-3 border-b border-[#E2E5EA] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
                    {meta}
                </div>
                {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
    );
}
