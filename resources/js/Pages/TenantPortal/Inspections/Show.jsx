import PortalLayout from '@/Layouts/PortalLayout';
import { Link } from '@inertiajs/react';
import Badge from '@/Components/Badge';
import FormSection from '@/Components/Form/FormSection';
import { formatDateID } from '@/utils/format';

export default function Show({ inspection, checklistSnapshot, progress }) {
    const pct = progress.total === 0 ? 0 : Math.round((progress.answered / progress.total) * 100);
    const inProgress = inspection.session_status === 'in_progress';

    return (
        <PortalLayout>
            <Link
                href="/portal/inspections"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors w-fit rounded focus-visible:outline-2 focus-visible:outline-[#0F1E36] animate-stagger-in"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Kembali ke hasil sidak
            </Link>

            <div className="mt-3 bg-white rounded-2xl border border-[#E2E5EA] p-5 sm:p-6 animate-stagger-in" style={{ animationDelay: '60ms' }}>
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold text-gray-900">{checklistSnapshot.template_name}</h1>
                        <p className="text-xs text-gray-500 mt-1">
                            {inspection.session_started_at ? formatDateID(inspection.session_started_at) : '—'} · Terjawab {progress.answered}/{progress.total} ({pct}%)
                        </p>
                    </div>
                    <Badge color={inProgress ? 'yellow' : 'green'} variant="soft" size="md">
                        {inProgress ? 'Penyidakan' : 'Selesai'}
                    </Badge>
                </div>
                <div className="mt-4 h-2.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress sidak">
                    <div className="h-full bg-[#1FA24C] rounded-full" style={{ width: `${pct}%` }} />
                </div>
                {inspection.is_flagged && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm p-4 rounded-xl mt-4" role="alert">
                        <p className="font-semibold mb-1">Ada catatan perhatian</p>
                        <p>Beberapa item butuh tindak lanjut. Lihat detail di bawah.</p>
                    </div>
                )}
            </div>

            <div className="mt-4 space-y-4">
                {(checklistSnapshot.sections ?? []).map((section) => (
                    <FormSection key={section.id} title={section.name}>
                        <div className="space-y-4">
                            {(section.items ?? []).map((item) => (
                                <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-gray-700">{item.label}</p>
                                        {item.answer?.value && (
                                            <Badge color={item.answer.value === item.option_negative ? 'red' : 'green'} variant="soft" size="sm">
                                                {item.answer.value}
                                            </Badge>
                                        )}
                                    </div>
                                    {item.answer?.note && (
                                        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mt-2">{item.answer.note}</p>
                                    )}
                                    {(item.answer?.photos ?? []).length > 0 && (
                                        <div className="flex gap-2 flex-wrap mt-2">
                                            {item.answer.photos.map((photo) => (
                                                <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer" className="rounded-lg focus-visible:outline-2 focus-visible:outline-[#0F1E36]">
                                                    <img src={photo.url} alt="Foto bukti sidak" loading="lazy" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                    {!item.answer?.value && (
                                        <p className="text-xs text-gray-300 italic mt-1">Belum dijawab</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </FormSection>
                ))}
            </div>

            {(inspection.other_notes || inspection.notes) && (
                <FormSection title="Catatan Petugas">
                    {inspection.other_notes && (
                        <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Lain-lain</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{inspection.other_notes}</p>
                        </div>
                    )}
                    {inspection.notes && (
                        <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Keluhan / Saran</p>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{inspection.notes}</p>
                        </div>
                    )}
                </FormSection>
            )}
        </PortalLayout>
    );
}
