import { useFloorMapStore } from '@/Stores/useFloorMapStore';

export default function ElevatorNav({ floorPlans = [], units = [] }) {
    const { activeFloor, setActiveFloor } = useFloorMapStore();

    // Sort floors from top floor down to Ground Floor (like an elevator panel)
    const sortedPlans = [...floorPlans].sort((a, b) => b.floor_order - a.floor_order);

    return (
        <aside
            aria-label="Elevator floor selector"
            className="flex flex-col bg-white/95 backdrop-blur border border-slate-200/80 rounded-2xl shadow-lg p-2 gap-1.5 z-20"
        >
            <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase text-center px-1 pb-1 border-b border-slate-100">
                Lantai
            </div>

            {sortedPlans.map((fp) => {
                const isActive = activeFloor === fp.floor;
                const floorUnits = units.filter((u) => u.floor === fp.floor);
                const occupiedCount = floorUnits.filter((u) => u.status === 'Aktif').length;

                return (
                    <button
                        key={fp.id}
                        type="button"
                        onClick={() => setActiveFloor(fp.floor)}
                        title={`${fp.name} (${floorUnits.length} Unit)`}
                        className={`group relative flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                            isActive
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-600/30'
                                : 'bg-slate-50/70 hover:bg-slate-100 text-slate-700 border border-slate-200/50'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <span
                                className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs ${
                                    isActive
                                        ? 'bg-white/20 text-white'
                                        : 'bg-white text-slate-800 shadow-xs border border-slate-200'
                                }`}
                            >
                                {fp.floor}
                            </span>
                            <div className="hidden sm:block leading-tight">
                                <div className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-slate-800'}`}>
                                    {fp.name}
                                </div>
                                <div className={`text-[10px] ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                                    {occupiedCount}/{floorUnits.length} terisi
                                </div>
                            </div>
                        </div>

                        {/* Indikator mini */}
                        <div
                            className={`w-2 h-2 rounded-full transition-transform ${
                                isActive ? 'bg-emerald-300 scale-125' : 'bg-slate-300 group-hover:bg-slate-400'
                            }`}
                        />
                    </button>
                );
            })}
        </aside>
    );
}

