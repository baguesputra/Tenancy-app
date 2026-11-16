import { useState } from 'react';
import { router, Link } from '@inertiajs/react';
import Badge from '@/Components/Badge';
import Button from '@/Components/Form/Button';
import Modal from '@/Components/Modal';
import EmptyState from '@/Components/EmptyState';
import { formatDateID, formatDateTimeShortID } from '@/utils/format';

export const CAPA_SEVERITY = {
    minor: { label: 'Ringan', color: 'gray' },
    major: { label: 'Sedang', color: 'yellow' },
    critical: { label: 'Kritis', color: 'red' },
};

export const CAPA_STATUS = {
    open: { label: 'Perlu Perbaikan', color: 'yellow' },
    submitted: { label: 'Menunggu Verifikasi', color: 'blue' },
    verified: { label: 'Terverifikasi', color: 'green' },
    rejected: { label: 'Ditolak', color: 'red' },
};

/**
 * Panel dan modal tindak lanjut temuan sidak (CAPA) yang dipakai ulang di
 * detail sidak, hub temuan CAPA, dan profil tenant.
 */
export default function CapaFindingsPanel({
    findings = [],
    canManage = false,
    canAnswer = false,
    showTenant = false,
    emptyTitle = 'Tidak Ada Temuan CAPA',
    emptyDescription = 'Belum ada temuan negatif yang perlu ditindaklanjuti.',
}) {
    const [editing, setEditing] = useState(null);
    const [resolving, setResolving] = useState(null);
    const [reviewing, setReviewing] = useState(null); // { finding, mode: 'verify' | 'reject' }
    const [photoPreview, setPhotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const [editForm, setEditForm] = useState({ severity: 'minor', due_date: '', action_required: '' });
    const [resolveForm, setResolveForm] = useState({ resolved_by_name: '', resolution_note: '', photo: null });
    const [reviewNote, setReviewNote] = useState('');
    const [error, setError] = useState('');

    const openEdit = (f) => {
        setError('');
        setEditForm({
            severity: f.severity ?? 'minor',
            due_date: f.due_date ?? '',
            action_required: f.action_required ?? '',
        });
        setEditing(f);
    };

    const openResolve = (f) => {
        setError('');
        setResolveForm({
            resolved_by_name: f.resolved_by_name ?? '',
            resolution_note: f.resolution_note ?? '',
            photo: null,
        });
        setResolving(f);
    };

    const openReview = (f, mode) => {
        setError('');
        setReviewNote('');
        setReviewing({ finding: f, mode });
    };

    const submitEdit = (e) => {
        e.preventDefault();
        if (!editing) return;
        setSubmitting(true);
        setError('');
        router.patch(`/inspection-findings/${editing.id}`, editForm, {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
            onError: (errs) => setError(Object.values(errs)[0] ?? 'Gagal menyimpan perubahan.'),
            onFinish: () => setSubmitting(false),
        });
    };

    const submitResolve = (e) => {
        e.preventDefault();
        if (!resolving) return;
        if (!resolveForm.photo) {
            setError('Foto bukti perbaikan wajib dipilih.');
            return;
        }
        setSubmitting(true);
        setError('');
        router.post(`/inspection-findings/${resolving.id}/resolve`, resolveForm, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => setResolving(null),
            onError: (errs) => setError(Object.values(errs)[0] ?? 'Gagal mengirim bukti perbaikan.'),
            onFinish: () => setSubmitting(false),
        });
    };

    const submitReview = (e) => {
        e.preventDefault();
        if (!reviewing) return;
        if (reviewing.mode === 'reject' && !reviewNote.trim()) {
            setError('Alasan penolakan wajib diisi.');
            return;
        }
        setSubmitting(true);
        setError('');
        router.post(
            `/inspection-findings/${reviewing.finding.id}/${reviewing.mode}`,
            { verification_note: reviewNote },
            {
                preserveScroll: true,
                onSuccess: () => setReviewing(null),
                onError: (errs) => setError(Object.values(errs)[0] ?? 'Gagal memproses verifikasi.'),
                onFinish: () => setSubmitting(false),
            }
        );
    };

    if (findings.length === 0) {
        return <EmptyState variant="empty" size="sm" title={emptyTitle} description={emptyDescription} />;
    }

    return (
        <>
            <div className="divide-y divide-slate-100">
                {findings.map((f) => {
                    const sev = CAPA_SEVERITY[f.severity] ?? CAPA_SEVERITY.minor;
                    const st = CAPA_STATUS[f.status] ?? CAPA_STATUS.open;
                    const canResolveNow = canAnswer && f.status !== 'verified';

                    return (
                        <div key={f.id} className="p-4 sm:p-5 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="min-w-0">
                                    {showTenant && f.tenant_name && (
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                            {f.tenant_id ? (
                                                <Link href={`/tenant-profiles/${f.tenant_id}/detail?tab=capa`} className="font-semibold text-[#0F1E36] hover:underline">
                                                    {f.tenant_name}
                                                </Link>
                                            ) : (
                                                <span className="font-semibold text-slate-700">{f.tenant_name}</span>
                                            )}
                                            {f.unit_code && <span className="font-mono text-slate-400">· {f.unit_code}</span>}
                                            {f.branch_name && <span>· {f.branch_name}</span>}
                                        </div>
                                    )}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {f.section_name && (
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                                {f.section_name} ·
                                            </span>
                                        )}
                                        <p className="text-sm font-semibold text-slate-900">{f.item_label}</p>
                                    </div>
                                    {f.finding_note && (
                                        <p className="text-xs text-slate-600 mt-1">Catatan sidak: {f.finding_note}</p>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                                    <Badge color={sev.color} size="sm">{sev.label}</Badge>
                                    <Badge color={st.color} size="sm">{st.label}</Badge>
                                    {f.is_overdue && <Badge color="red" size="sm">Terlambat</Badge>}
                                    {f.repeat_count > 1 && (
                                        <Badge color="red" size="sm">Berulang ×{f.repeat_count}</Badge>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/80 border border-slate-100 rounded-xl p-3">
                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 block">
                                        Tenggat &amp; Instruksi Perbaikan
                                    </span>
                                    <p className={`mt-0.5 font-medium ${f.is_overdue ? 'text-rose-700' : 'text-slate-800'}`}>
                                        Tenggat: {f.due_date ? formatDateID(f.due_date) : 'Belum ditentukan'}
                                    </p>
                                    {f.action_required ? (
                                        <p className="mt-1 text-slate-600 whitespace-pre-line">{f.action_required}</p>
                                    ) : (
                                        <p className="mt-1 text-slate-400 italic">Belum ada instruksi spesifik.</p>
                                    )}
                                </div>

                                <div>
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 block">
                                        Bukti &amp; Status Perbaikan
                                    </span>
                                    {f.resolved_at ? (
                                        <div className="mt-0.5 flex items-start gap-2.5">
                                            {f.resolution_photo_url && (
                                                <button
                                                    type="button"
                                                    onClick={() => setPhotoPreview(f.resolution_photo_url)}
                                                    className="shrink-0 rounded-lg overflow-hidden border border-slate-200 focus-visible:outline-2 focus-visible:outline-[#0F1E36]"
                                                >
                                                    <img
                                                        src={f.resolution_photo_url}
                                                        alt="Bukti perbaikan"
                                                        loading="lazy"
                                                        className="w-14 h-14 object-cover"
                                                    />
                                                </button>
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-slate-800 font-medium">{f.resolution_note}</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Oleh {f.resolved_by_name ?? '—'} · {formatDateTimeShortID(f.resolved_at)}
                                                </p>
                                                {f.verification_note && (
                                                    <p className={`mt-1 text-[11px] ${f.status === 'rejected' ? 'text-rose-700' : 'text-emerald-700'}`}>
                                                        Verifikasi{f.verified_by_name ? ` (${f.verified_by_name})` : ''}: {f.verification_note}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mt-0.5 text-slate-400 italic">Belum ada bukti perbaikan dikirim.</p>
                                    )}
                                </div>
                            </div>

                            {(canManage || canResolveNow || f.inspection_url) && (
                                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                    {f.inspection_url && (
                                        <Link
                                            href={f.inspection_url}
                                            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                                        >
                                            Lihat Sidak
                                        </Link>
                                    )}
                                    {canManage && f.status !== 'verified' && (
                                        <button
                                            type="button"
                                            onClick={() => openEdit(f)}
                                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition"
                                        >
                                            Atur Tenggat / Instruksi
                                        </button>
                                    )}
                                    {canResolveNow && (
                                        <button
                                            type="button"
                                            onClick={() => openResolve(f)}
                                            className="px-3 py-1.5 text-xs font-semibold text-[#0F1E36] bg-[#0F1E36]/5 hover:bg-[#0F1E36]/10 border border-[#0F1E36]/15 rounded-lg transition"
                                        >
                                            {f.resolved_at ? 'Perbarui Bukti Perbaikan' : 'Catat Bukti Perbaikan'}
                                        </button>
                                    )}
                                    {canManage && f.status !== 'verified' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => openReview(f, 'verify')}
                                                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
                                            >
                                                Verifikasi Selesai
                                            </button>
                                            {f.status === 'submitted' && (
                                                <button
                                                    type="button"
                                                    onClick={() => openReview(f, 'reject')}
                                                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition"
                                                >
                                                    Tolak Perbaikan
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Atur Tindak Lanjut Temuan" maxWidth="max-w-md">
                <form onSubmit={submitEdit} className="space-y-4">
                    <p className="text-xs text-slate-500">{editing?.item_label}</p>
                    {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tingkat Keparahan</label>
                        <select
                            value={editForm.severity}
                            onChange={(e) => setEditForm((p) => ({ ...p, severity: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 text-sm"
                        >
                            <option value="minor">Ringan (Minor)</option>
                            <option value="major">Sedang (Major)</option>
                            <option value="critical">Kritis (Critical)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Tenggat Perbaikan</label>
                        <input
                            type="date"
                            value={editForm.due_date}
                            onChange={(e) => setEditForm((p) => ({ ...p, due_date: e.target.value }))}
                            className="w-full rounded-lg border-slate-300 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Instruksi Perbaikan</label>
                        <textarea
                            rows={3}
                            value={editForm.action_required}
                            onChange={(e) => setEditForm((p) => ({ ...p, action_required: e.target.value }))}
                            placeholder="Tuliskan tindakan korektif yang diminta dari tenant..."
                            className="w-full rounded-lg border-slate-300 text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Batal</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? 'Menyimpan...' : 'Simpan'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal open={Boolean(resolving)} onClose={() => setResolving(null)} title="Catat Bukti Perbaikan" maxWidth="max-w-md">
                <form onSubmit={submitResolve} className="space-y-4">
                    <p className="text-xs text-slate-500">{resolving?.item_label}</p>
                    {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pelapor / PIC</label>
                        <input
                            type="text"
                            value={resolveForm.resolved_by_name}
                            onChange={(e) => setResolveForm((p) => ({ ...p, resolved_by_name: e.target.value }))}
                            placeholder="Kosongkan untuk memakai nama Anda"
                            className="w-full rounded-lg border-slate-300 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Perbaikan</label>
                        <textarea
                            rows={3}
                            required
                            value={resolveForm.resolution_note}
                            onChange={(e) => setResolveForm((p) => ({ ...p, resolution_note: e.target.value }))}
                            placeholder="Jelaskan perbaikan yang sudah dilakukan..."
                            className="w-full rounded-lg border-slate-300 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Foto Bukti Sesudah Perbaikan</label>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            required
                            onChange={(e) => setResolveForm((p) => ({ ...p, photo: e.target.files?.[0] ?? null }))}
                            className="w-full text-xs text-slate-600"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setResolving(null)}>Batal</Button>
                        <Button type="submit" disabled={submitting}>{submitting ? 'Mengirim...' : 'Simpan Bukti'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal
                open={Boolean(reviewing)}
                onClose={() => setReviewing(null)}
                title={reviewing?.mode === 'verify' ? 'Verifikasi Penyelesaian CAPA' : 'Tolak Bukti Perbaikan'}
                maxWidth="max-w-md"
            >
                <form onSubmit={submitReview} className="space-y-4">
                    <p className="text-xs text-slate-500">{reviewing?.finding?.item_label}</p>
                    {error && <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            {reviewing?.mode === 'verify' ? 'Catatan Verifikasi (opsional)' : 'Alasan Penolakan'}
                        </label>
                        <textarea
                            rows={3}
                            required={reviewing?.mode === 'reject'}
                            value={reviewNote}
                            onChange={(e) => setReviewNote(e.target.value)}
                            placeholder={reviewing?.mode === 'verify' ? 'Opsional...' : 'Jelaskan apa yang masih perlu diperbaiki...'}
                            className="w-full rounded-lg border-slate-300 text-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="secondary" onClick={() => setReviewing(null)}>Batal</Button>
                        <Button
                            type="submit"
                            variant={reviewing?.mode === 'verify' ? 'success' : 'danger'}
                            disabled={submitting}
                        >
                            {submitting ? 'Memproses...' : reviewing?.mode === 'verify' ? 'Verifikasi Selesai' : 'Tolak Perbaikan'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <Modal open={Boolean(photoPreview)} onClose={() => setPhotoPreview(null)} title="Bukti Perbaikan" maxWidth="max-w-lg">
                {photoPreview && (
                    <img src={photoPreview} alt="Bukti perbaikan CAPA" className="w-full rounded-xl border border-slate-200" />
                )}
            </Modal>
        </>
    );
}
