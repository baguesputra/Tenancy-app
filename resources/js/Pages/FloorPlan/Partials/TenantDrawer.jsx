import SlideOver from '@/Components/SlideOver';
import Badge from '@/Components/Badge';
import { useFloorMapStore } from '@/Stores/useFloorMapStore';
import { STATUS_COLORS } from '../utils/geometry';
import { Link } from '@inertiajs/react';

export default function TenantDrawer({ units = [] }) {
    const { selectedUnitId, setSelectedUnitId } = useFloorMapStore();

    const unit = units.find((u) => u.id === selectedUnitId);
    if (!unit) return null;

    const tenant = unit.tenant;
    const statusCfg = STATUS_COLORS[unit.status] || STATUS_COLORS.Kosong;

    return (
        <SlideOver
            open={!!unit}
            onClose={() => setSelectedUnitId(null)}
            title={`Unit ${unit.unit_code}`}
            subtitle={`Lantai ${unit.floor} • Blok ${unit.block || '-'} • No. ${unit.unit_number || '-'}`}
            size="md"
        >
            <div className="space-y-6 text-sm">
                {/* Status & Size Card */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-medium">Status Hunian</div>
                        <div className="mt-1">
                            <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusCfg.badge}`}
                            >
                                {unit.status}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-slate-500 font-medium">Luas Area</div>
                        <div className="mt-1 text-base font-bold text-slate-800">
                            {unit.size ? `${unit.size} m²` : '-'}
                        </div>
                    </div>
                </div>

                {/* Tenant Detail */}
                {tenant ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            {tenant.logo_url ? (
                                <img
                                    src={tenant.logo_url}
                                    alt={tenant.name}
                                    className="w-14 h-14 object-contain rounded-xl border border-slate-200 bg-white p-1"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-lg">
                                    {tenant.name.slice(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h3 className="font-bold text-base text-slate-900 leading-snug">
                                    {tenant.name}
                                </h3>
                                {tenant.trade_name && tenant.trade_name !== tenant.name && (
                                    <div className="text-xs text-slate-500">
                                        Merk Dagang: {tenant.trade_name}
                                    </div>
                                )}
                                <div className="mt-1">
                                    <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                        {tenant.category}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Kontak & PIC */}
                        <div className="grid grid-cols-1 gap-3 bg-white border border-slate-200/70 rounded-xl p-3.5">
                            <div>
                                <div className="text-xs text-slate-400">Penanggung Jawab (PIC)</div>
                                <div className="text-sm font-semibold text-slate-800">
                                    {tenant.pic_name || '-'}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-xs text-slate-400">Telepon PIC</div>
                                    <div className="text-sm text-slate-700">
                                        {tenant.pic_phone || '-'}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-400">Email Perusahaan</div>
                                    <div className="text-sm text-slate-700 truncate">
                                        {tenant.company_email || '-'}
                                    </div>
                                </div>
                            </div>
                            {tenant.contract_number && (
                                <div className="pt-2 border-t border-slate-100">
                                    <div className="text-xs text-slate-400">No. Kontrak Sewa</div>
                                    <div className="text-xs font-mono font-semibold text-indigo-600">
                                        {tenant.contract_number}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                            <Link
                                href={`/tenant-profiles/${tenant.id}`}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                            >
                                Buka Profil Tenant
                            </Link>
                            <Link
                                href={`/units?search=${unit.unit_code}`}
                                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                            >
                                Kelola Unit
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
                        <div className="w-10 h-10 mx-auto rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400 mb-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <h4 className="font-semibold text-slate-700 text-sm">Unit Kosong / Siap Sewa</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                            Unit ini belum memiliki tenancy aktif. Anda dapat mengaitkannya melalui modul Letter of Offer (LOO).
                        </p>
                        <div className="mt-4">
                            <Link
                                href={`/units?search=${unit.unit_code}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                            >
                                Buka Detail Master Unit &rarr;
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </SlideOver>
    );
}

