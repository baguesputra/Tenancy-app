import { useFloorMapStore } from '@/Stores/useFloorMapStore';

export default function ElevatorNav({ floorPlans = [], units = [] }) {
    const { activeFloor, setActiveFloor } = useFloorMapStore();

    // Urutkan dari lantai teratas ke Ground Floor, seperti panel lift
    const sortedPlans = [...floorPlans].sort((a, b) => b.floor_order - a.floor_order);

    return (
        <aside
            aria-label="Pilih lantai"
            className="w-14 sm:w-44 flex flex-col bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg p-1.5 gap-1"
        >
            <div className="px-1.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Lantai
            </div>

            {sortedPlans.map((fp) => {
                const isActive = activeFloor === fp.floor;
                const floorUnits = units.filter((u) => u.floor === fp.floor);
                const occupied = floorUnits.filter((u) => u.status === 'Aktif').length;
                const pct = floorUnits.length ? Math.round((occupied / floorUnits.length) * 100) : 0;

                return (
                    <button
                        key={fp.id}
                        type="button"
                        onClick={() => setActiveFloor(fp.floor)}
                        aria-current={isActive ? 'true' : undefined}
                        aria-label={`Lantai ${fp.floor} — ${fp.name}, ${occupied} dari ${floorUnits.length} unit terisi`}
                        className={`group w-full px-1.5 sm:px-2 py-2 rounded-lg text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F1E36] ${
                            isActive
                                ? 'bg-[#0F1E36] text-white'
                                : 'text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                        <span className="flex items-center gap-2 sm:gap-2.5">
                            <span
                                className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-md text-xs font-bold ${
                                    isActive
                                        ? 'bg-white/15 text-white'
                                        : 'bg-slate-100 text-slate-700 group-hover:bg-white'
                                }`}
                            >
                                {fp.floor}
                            </span>
                            <span className="hidden sm:block min-w-0 flex-1">
                                <span className={`block text-xs font-semibold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                    {fp.name}
                                </span>
                                <span className={`block text-[10px] tabular-nums ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                                    {occupied}/{floorUnits.length} terisi
                                </span>
                            </span>
                        </span>

                        {/* Bar okupansi mini per lantai */}
                        <span
                            className={`mt-1.5 block h-1 w-full rounded-full ${isActive ? 'bg-white/15' : 'bg-slate-100'}`}
                            aria-hidden="true"
                        >
                            <span
                                className={`block h-full rounded-full ${isActive ? 'bg-emerald-300' : 'bg-emerald-500'}`}
                                style={{ width: `${pct}%` }}
                            />
                        </span>
                    </button>
                );
            })}
        </aside>
    );
}