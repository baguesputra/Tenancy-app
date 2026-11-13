const MINI_METHOD_TONE = {
    GET: 'text-sky-700',
    POST: 'text-emerald-700',
    PATCH: 'text-amber-700',
    DELETE: 'text-rose-700',
};

const SHORT_METHOD = {
    GET: 'GET',
    POST: 'POST',
    PATCH: 'PTCH',
    DELETE: 'DEL',
};

const GUIDE_ITEMS = [
    { id: 'mulai', label: 'Mulai & Konvensi' },
    { id: 'alur', label: 'Alur Integrasi' },
    { id: 'kesalahan', label: 'Kode Kesalahan' },
];

/**
 * Navigasi daftar isi sticky di desktop untuk lompat antar bagian dan endpoint.
 */
export default function ApiSidebar({ groups, activeSection, onSelectGroup, onSelectEndpoint }) {
    return (
        <aside aria-label="Daftar isi dokumentasi" className="hidden lg:block">
            <nav className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-6 overflow-y-auto pr-2">
                <div>
                    <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Panduan
                    </p>
                    <ul className="mt-2 space-y-0.5">
                        {GUIDE_ITEMS.map((item) => {
                            const isActive = activeSection === item.id;
                            return (
                                <li key={item.id}>
                                    <a
                                        href={`#${item.id}`}
                                        aria-current={isActive ? 'location' : undefined}
                                        className={`block rounded-lg px-2.5 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                            isActive
                                                ? 'bg-white font-semibold text-[#0F1E36] shadow-2xs ring-1 ring-[#E2E5EA]'
                                                : 'font-medium text-slate-600 hover:bg-white/70 hover:text-[#0F1E36]'
                                        }`}
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            );
                        })}
                    </ul>
                </div>

                <div>
                    <p className="px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Referensi Endpoint
                    </p>
                    <div className="mt-2 space-y-4">
                        {groups.map((group) => {
                            const isActive = activeSection === group.id;
                            return (
                                <div key={group.id}>
                                    <a
                                        href={`#${group.id}`}
                                        onClick={(event) => {
                                            if (onSelectGroup) {
                                                event.preventDefault();
                                                onSelectGroup(group.id);
                                            }
                                        }}
                                        aria-current={isActive ? 'location' : undefined}
                                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-[#0F1E36] ${
                                            isActive
                                                ? 'bg-white font-semibold text-[#0F1E36] shadow-2xs ring-1 ring-[#E2E5EA]'
                                                : 'font-semibold text-slate-700 hover:bg-white/70 hover:text-[#0F1E36]'
                                        }`}
                                    >
                                        <span className="truncate">{group.title}</span>
                                        <span className="ml-2 rounded-full bg-slate-200/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-slate-600">
                                            {group.endpoints.length}
                                        </span>
                                    </a>

                                    <ul className="mt-1 space-y-0.5 border-l border-[#E2E5EA] pl-2.5 ml-2.5">
                                        {group.endpoints.map((ep) => (
                                            <li key={ep.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelectEndpoint(ep.id)}
                                                    className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs text-slate-600 transition-colors hover:bg-white hover:text-[#0F1E36] focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                                >
                                                    <span className={`w-8 shrink-0 font-mono text-[10px] font-bold ${MINI_METHOD_TONE[ep.method]}`}>
                                                        {SHORT_METHOD[ep.method] || ep.method}
                                                    </span>
                                                    <span className="truncate">{ep.summary}</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </aside>
    );
}
