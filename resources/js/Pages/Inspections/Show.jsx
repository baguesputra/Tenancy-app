import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';

const csrfToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
const initials = (name = '') => name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

export default function Show({ inspection, checklistSnapshot }) {
    const [snapshot, setSnapshot] = useState(checklistSnapshot);
    const [savingItemId, setSavingItemId] = useState(null);
    const [itemError, setItemError] = useState({});
    const [otherNotes, setOtherNotes] = useState(inspection.other_notes ?? '');
    const [feedbackNotes, setFeedbackNotes] = useState(inspection.notes ?? '');
    const [savingNotes, setSavingNotes] = useState(null);
    const [notesSaved, setNotesSaved] = useState(false);
    const notesTimer = useRef({});
    const versionRef = useRef({});
    const isLocked = inspection.session_status !== 'in_progress';

    const saveNotes = async (field, value) => {
        setSavingNotes(field);
        setNotesSaved(false);
        try {
            const res = await fetch(`/inspections/${inspection.id}/notes`, {
                method: 'PATCH',
                body: JSON.stringify({ [field]: value }),
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken(),
                },
            });
            if (res.ok) setNotesSaved(true);
        } finally {
            setSavingNotes(null);
        }
    };

    const handleNotesBlur = (field, value, initial) => {
        if (value === initial) return;
        saveNotes(field, value);
    };

    const handleNotesChange = (field, value, setter) => {
        setter(value);
        setNotesSaved(false);
        clearTimeout(notesTimer.current[field]);
        notesTimer.current[field] = setTimeout(() => saveNotes(field, value), 1500);
    };

    const stats = useMemo(() => {
        let total = 0;
        let answered = 0;
        const perSection = {};
        snapshot.sections.forEach((s) => {
            let sAnswered = 0;
            s.items.forEach((item) => {
                total += 1;
                if (item.answer?.value) {
                    answered += 1;
                    sAnswered += 1;
                }
            });
            perSection[s.id] = { answered: sAnswered, total: s.items.length };
        });
        return { total, answered, pct: total === 0 ? 0 : Math.round((answered / total) * 100), perSection };
    }, [snapshot]);

    const updateLocalAnswer = (sectionIdx, itemIdx, patch) => {
        setSnapshot((prev) => {
            const next = structuredClone(prev);
            next.sections[sectionIdx].items[itemIdx].answer = {
                ...next.sections[sectionIdx].items[itemIdx].answer,
                ...patch,
            };
            return next;
        });
    };

    const saveAnswer = async (sectionIdx, itemIdx, item, { value, note, photo }) => {
        const version = (versionRef.current[item.id] ?? 0) + 1;
        versionRef.current[item.id] = version;
        setSavingItemId(item.id);
        setItemError((prev) => ({ ...prev, [item.id]: '' }));
        const formData = new FormData();
        formData.append('checklist_item_id', item.id);
        if (value !== undefined) formData.append('value', value);
        if (note !== undefined) formData.append('note', note);
        if (photo) formData.append('photo', photo);

        try {
            const res = await fetch(`/inspections/${inspection.id}/answers`, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken(),
                },
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data?.message ?? 'Gagal menyimpan. Coba lagi.';
                if (versionRef.current[item.id] === version) {
                    setItemError((prev) => ({ ...prev, [item.id]: msg }));
                }
                return;
            }
            if (versionRef.current[item.id] === version && data?.answer) {
                updateLocalAnswer(sectionIdx, itemIdx, data.answer);
            }
        } catch {
            if (versionRef.current[item.id] === version) {
                setItemError((prev) => ({ ...prev, [item.id]: 'Jaringan bermasalah. Jawaban lokal aman, coba lagi.' }));
            }
        } finally {
            if (versionRef.current[item.id] === version) {
                setSavingItemId(null);
            }
        }
    };

    const handleChoice = (sectionIdx, itemIdx, item, choice) => {
        updateLocalAnswer(sectionIdx, itemIdx, { value: choice });
        saveAnswer(sectionIdx, itemIdx, item, { value: choice });
    };

    const handlePhotoUpload = (sectionIdx, itemIdx, item, file) => {
        saveAnswer(sectionIdx, itemIdx, item, { photo: file });
    };

    const handleNoteBlur = (sectionIdx, itemIdx, item, note) => {
        if ((note ?? '') === (item.answer?.note ?? '')) return;
        saveAnswer(sectionIdx, itemIdx, item, { note });
    };

    const completeInspection = () => {
        if (confirm('Selesaikan checklist untuk tenant ini?')) {
            router.post(`/inspections/${inspection.id}/complete`);
        }
    };

    const needsPhotoButMissing = (item) => {
        return item.type === 'binary_choice'
            && item.photo_required_on_negative
            && item.answer?.value === item.option_negative
            && (!item.answer?.photos || item.answer.photos.length === 0);
    };

    return (
        <AppLayout>
            <div className="px-4 sm:px-8 py-4 sm:py-6 flex-1 w-full max-w-6xl mx-auto pb-32 lg:pb-10">
                <div className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-4 sm:p-5 mb-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/inspection-sessions/${inspection.session_id}`}
                            aria-label="Kembali ke sesi"
                            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 min-h-[44px] min-w-[44px]"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        {inspection.tenant?.logo_url ? (
                            <img src={inspection.tenant.logo_url} alt={`Logo ${inspection.tenant?.name}`} className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-contain bg-gray-50 border border-[#E2E5EA] p-0.5 shrink-0" loading="lazy" />
                        ) : (
                            <span className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#0F1E36] text-white text-xs font-semibold flex items-center justify-center shrink-0" aria-hidden="true">
                                {initials(inspection.tenant?.name)}
                            </span>
                        )}
                        <div className="flex-1 min-w-0">
                            <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">{inspection.tenant?.name}</h1>
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                                {inspection.tenant?.product_category?.name} — {snapshot.template_name}
                            </p>
                        </div>
                        <Badge color={inspection.status === 'completed' ? 'green' : 'yellow'} size="md">
                            {inspection.status === 'completed' ? 'Selesai' : 'Draft'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2.5 mt-4">
                        <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={stats.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress checklist">
                            <div className="h-full bg-[#1FA24C] rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 shrink-0 tabular-nums">{stats.answered}/{stats.total} · {stats.pct}%</span>
                    </div>
                </div>

                {isLocked && (
                    <div className="bg-gray-100 text-gray-600 text-sm p-3.5 rounded-xl mb-4">
                        Sesi ini sudah selesai, checklist tidak bisa diubah lagi.
                    </div>
                )}

                <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-5 lg:items-start">
                    <div className="min-w-0">
                        {snapshot.sections.map((section, sectionIdx) => (
                            <section key={section.id} id={`section-${section.id}`} className="bg-white rounded-2xl border border-[#E2E5EA] p-4 sm:p-6 mb-3.5 shadow-sm scroll-mt-24">
                                <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-gray-100">
                                    <h2 className="text-sm sm:text-[15px] font-semibold text-[#0F1E36]">{section.name}</h2>
                                    <span className="text-[11px] font-medium text-gray-400 shrink-0 tabular-nums">
                                        {stats.perSection[section.id]?.answered ?? 0}/{stats.perSection[section.id]?.total ?? 0}
                                    </span>
                                </div>
                                <div className="space-y-5">
                                    {section.items.map((item, itemIdx) => (
                                        <div key={item.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                            <div className="flex justify-between items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-gray-700">{item.label}</span>
                                                {savingItemId === item.id ? (
                                                    <span className="text-xs text-gray-400 shrink-0">Menyimpan…</span>
                                                ) : item.answer?.value ? (
                                                    <span className="text-xs text-emerald-600 shrink-0">Tersimpan ✓</span>
                                                ) : null}
                                            </div>
                                            {itemError[item.id] && (
                                                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">{itemError[item.id]}</p>
                                            )}

                                            {item.type === 'binary_choice' ? (
                                                <div className="flex gap-2 mb-2 sm:max-w-xl">
                                                    <button
                                                        type="button"
                                                        disabled={isLocked}
                                                        onClick={() => handleChoice(sectionIdx, itemIdx, item, item.option_positive)}
                                                        aria-pressed={item.answer?.value === item.option_positive}
                                                        className={`flex-1 py-3 sm:py-2.5 min-h-[52px] sm:min-h-[46px] rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                                                            item.answer?.value === item.option_positive
                                                                ? 'bg-[#1FA24C] text-white shadow-sm'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-200'
                                                        }`}
                                                    >
                                                        {item.option_positive}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={isLocked}
                                                        onClick={() => handleChoice(sectionIdx, itemIdx, item, item.option_negative)}
                                                        aria-pressed={item.answer?.value === item.option_negative}
                                                        className={`flex-1 py-3 sm:py-2.5 min-h-[52px] sm:min-h-[46px] rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 ${
                                                            item.answer?.value === item.option_negative
                                                                ? 'bg-red-600 text-white shadow-sm'
                                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-200'
                                                        }`}
                                                    >
                                                        {item.option_negative}
                                                    </button>
                                                </div>
                                            ) : (
                                                <textarea
                                                    disabled={isLocked}
                                                    defaultValue={item.answer?.value ?? ''}
                                                    onBlur={(e) => {
                                                        const nextValue = e.target.value;
                                                        if (nextValue === (item.answer?.value ?? '')) return;
                                                        updateLocalAnswer(sectionIdx, itemIdx, { value: nextValue });
                                                        saveAnswer(sectionIdx, itemIdx, item, { value: nextValue });
                                                    }}
                                                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-gray-100 min-h-[48px]"
                                                    placeholder="Catatan bebas…"
                                                    rows={2}
                                                />
                                            )}

                                            {needsPhotoButMissing(item) && (
                                                <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-2">
                                                    Foto wajib dilampirkan untuk jawaban ini
                                                </p>
                                            )}

                                            {item.type === 'binary_choice' && (
                                                <div className="sm:flex sm:items-start sm:gap-3">
                                                    <label className={`flex items-center justify-center gap-2 w-full sm:w-auto sm:px-4 py-3 sm:py-2.5 min-h-[48px] sm:min-h-[44px] rounded-xl border-2 border-dashed text-xs font-medium transition-colors cursor-pointer ${
                                                        isLocked ? 'opacity-50 border-gray-200 text-gray-400' : 'border-gray-300 text-gray-600 hover:border-gray-400 hover:bg-gray-50 active:bg-gray-50'
                                                    }`}>
                                                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {item.answer?.photos?.length > 0 ? `Tambah Foto (${item.answer.photos.length})` : 'Ambil / Unggah Foto'}
                                                        <input
                                                            disabled={isLocked}
                                                            type="file"
                                                            accept="image/*"
                                                            capture="environment"
                                                            onChange={(e) => e.target.files[0] && handlePhotoUpload(sectionIdx, itemIdx, item, e.target.files[0])}
                                                            className="hidden"
                                                        />
                                                    </label>

                                                    {item.answer?.photos?.length > 0 && (
                                                        <div className="flex gap-2 flex-wrap mt-2 sm:mt-0">
                                                            {item.answer.photos.map((photo) => (
                                                                <img key={photo.id} src={photo.url} alt="Bukti sidak" loading="lazy" className="w-16 h-16 sm:w-14 sm:h-14 object-cover rounded-lg border border-gray-200" />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <textarea
                                                disabled={isLocked}
                                                defaultValue={item.answer?.note ?? ''}
                                                onBlur={(e) => handleNoteBlur(sectionIdx, itemIdx, item, e.target.value)}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-100 min-h-[40px] mt-2"
                                                placeholder="Keterangan tambahan (opsional)…"
                                                rows={1}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                        <section className="bg-white rounded-2xl border border-[#E2E5EA] p-4 sm:p-6 mb-3.5 shadow-sm">
                            <div className="flex items-center justify-between gap-2 mb-4 pb-2.5 border-b border-gray-100">
                                <h2 className="text-sm sm:text-[15px] font-semibold text-[#0F1E36]">Lain-lain & Keluhan / Saran</h2>
                                {savingNotes ? (
                                    <span className="text-xs text-gray-400 shrink-0">Menyimpan…</span>
                                ) : notesSaved ? (
                                    <span className="text-xs text-emerald-600 shrink-0">Tersimpan ✓</span>
                                ) : null}
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="other-notes" className="block text-sm font-medium text-gray-700 mb-2">Lain-lain</label>
                                    <textarea
                                        id="other-notes"
                                        disabled={isLocked}
                                        value={otherNotes}
                                        onChange={(e) => handleNotesChange('other_notes', e.target.value, setOtherNotes)}
                                        onBlur={(e) => handleNotesBlur('other_notes', e.target.value, inspection.other_notes ?? '')}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 min-h-[88px] disabled:opacity-60"
                                        placeholder="Catatan lain di luar checklist…"
                                        rows={3}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="feedback-notes" className="block text-sm font-medium text-gray-700 mb-2">Keluhan / Saran</label>
                                    <textarea
                                        id="feedback-notes"
                                        disabled={isLocked}
                                        value={feedbackNotes}
                                        onChange={(e) => handleNotesChange('notes', e.target.value, setFeedbackNotes)}
                                        onBlur={(e) => handleNotesBlur('notes', e.target.value, inspection.notes ?? '')}
                                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-100 min-h-[88px] disabled:opacity-60"
                                        placeholder="Keluhan atau saran dari tenant…"
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    <aside className="hidden lg:block sticky top-24 space-y-4">
                        <div className="bg-[#0F1E36] text-white rounded-2xl p-5 shadow-sm">
                            <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold mb-1">Progress Sidak</p>
                            <p className="text-2xl font-bold tabular-nums">{stats.pct}%</p>
                            <p className="text-xs text-white/60 mt-0.5 mb-3">{stats.answered} dari {stats.total} item terjawab</p>
                            <div className="h-2 rounded-full bg-white/15 overflow-hidden">
                                <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
                            </div>
                            {!isLocked && (
                                <Button variant="success" onClick={completeInspection} className="w-full justify-center mt-4 !py-2.5 !bg-emerald-400 !text-[#0F1E36] hover:!bg-emerald-300 font-semibold">
                                    Selesai — Simpan
                                </Button>
                            )}
                        </div>
                        <nav className="bg-white rounded-2xl border border-[#E2E5EA] shadow-sm p-3" aria-label="Navigasi bagian">
                            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold px-2 pt-1 pb-2">Bagian ({snapshot.sections.length})</p>
                            <div className="space-y-0.5">
                                {snapshot.sections.map((section) => {
                                    const s = stats.perSection[section.id] ?? { answered: 0, total: 0 };
                                    const done = s.total > 0 && s.answered === s.total;
                                    return (
                                        <a
                                            key={section.id}
                                            href={`#section-${section.id}`}
                                            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`} aria-hidden="true">
                                                {done ? '✓' : s.answered}
                                            </span>
                                            <span className="flex-1 truncate">{section.name}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </nav>
                    </aside>
                </div>

                {!isLocked && (
                    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E5EA] p-4 z-10" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
                        <Button variant="primary" onClick={completeInspection} className="w-full max-w-3xl mx-auto justify-center block !py-3.5 min-h-[52px] text-[15px]">
                            Selesai — Simpan Checklist Ini
                        </Button>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
