import AppLayout from '@/Layouts/AppLayout';
import { Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import TextInput from '@/Components/Form/TextInput';
import MultiSelect from '@/Components/Form/MultiSelect';
import Button from '@/Components/Form/Button';
import Badge from '@/Components/Badge';
import ConfirmModal, { ConfirmRow } from '@/Components/ConfirmModal';
import QrScanModal from '@/Components/Scan/QrScanModal';
import useCan from '@/hooks/useCan';
import initials from '@/utils/initials';

const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'draft', label: 'Belum selesai' },
    { key: 'completed', label: 'Selesai' },
    { key: 'flagged', label: 'Perlu perhatian' },
];

export default function Show({ session, availableTenants, staffByDepartment = {} }) {
    const { can } = useCan();
    const [search, setSearch] = useState('');
    const [adding, setAdding] = useState(false);
    const [filter, setFilter] = useState('all');
    const [scanOpen, setScanOpen] = useState(false);
    const [editingTeam, setEditingTeam] = useState(false);
    const [teamIds, setTeamIds] = useState((session.participants ?? []).map((p) => p.user_id));
    const [savingTeam, setSavingTeam] = useState(false);
    const [confirmComplete, setConfirmComplete] = useState(false);
    const [completing, setCompleting] = useState(false);
    const isLocked = session.status !== 'in_progress';
    const canManage = !isLocked && can('sidak.manage');
    const participants = session.participants ?? [];
    const inspections = session.inspections ?? [];
    const done = inspections.filter((i) => i.status === 'completed').length;
    const flagged = inspections.filter((i) => i.is_flagged).length;
    const progress = inspections.length === 0 ? 0 : Math.round((done / inspections.length) * 100);
    const deptKeys = Object.keys(staffByDepartment);

    const teamByDept = useMemo(() => {
        const groups = {};
        participants.forEach((p) => {
            const key = p.department_name_snapshot || 'Lainnya';
            (groups[key] = groups[key] || []).push(p);
        });
        return groups;
    }, [participants]);

    const visibleInspections = useMemo(() => {
        if (filter === 'draft') return inspections.filter((i) => i.status !== 'completed');
        if (filter === 'completed') return inspections.filter((i) => i.status === 'completed');
        if (filter === 'flagged') return inspections.filter((i) => i.is_flagged);
        return inspections;
    }, [inspections, filter]);

    const filteredTenants = availableTenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase())
        || (t.unit_code ?? '').toLowerCase().includes(search.toLowerCase())
    );

    const setDeptSelection = (dept, ids) => {
        const deptIds = new Set((staffByDepartment[dept] ?? []).map((u) => u.id));
        setTeamIds((prev) => [...prev.filter((id) => !deptIds.has(id)), ...ids]);
    };

    const saveTeam = () => {
        setSavingTeam(true);
        router.patch(`/inspection-sessions/${session.id}/participants`, { participant_ids: teamIds }, {
            preserveScroll: true,
            onFinish: () => { setSavingTeam(false); setEditingTeam(false); },
        });
    };

    const submitAddTenant = (tenantId) => {
        setAdding(true);
        router.post(`/inspection-sessions/${session.id}/tenants`, { tenant_id: tenantId }, { onFinish: () => setAdding(false) });
    };

    const completeSession = () => {
        setCompleting(true);
        router.post(`/inspection-sessions/${session.id}/complete`, {}, {
            preserveScroll: true,
            onFinish: () => { setCompleting(false); setConfirmComplete(false); },
        });
    };

    return (
        <AppLayout>
            <main className="min-h-full bg-gray-50 text-[#0F1E36]">
                <div className="mx-auto w-full max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-7 lg:px-8 lg:pb-10">
                    <section className="overflow-hidden rounded-2xl border border-[#1E2D4A] bg-[#0F1E36] text-white shadow-sm">
                        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)] lg:items-center">
                            <div className="min-w-0">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <Badge color={session.status === 'completed' ? 'gray' : 'green'} size="md" className="!border-white/20 !bg-white/10 !text-white">
                                        {session.status === 'completed' ? 'Selesai' : 'Berlangsung'}
                                    </Badge>
                                    <span className="text-sm text-white/70">{new Date(session.started_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                </div>
                                <h1 className="max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">Sesi sidak tenant</h1>
                                <p className="mt-2 text-sm leading-6 text-white/80">
                                    PIC <strong className="font-semibold text-white">{session.pic_name ?? '—'}</strong>
                                    {participants.length > 0 && <> · {participants.length} anggota tim</>}
                                </p>
                                {session.notes && <p className="mt-3 max-w-xl border-l-2 border-white/30 pl-3 text-sm italic leading-6 text-white/75">“{session.notes}”</p>}
                            </div>

                            <div className="rounded-xl border border-white/15 bg-white/10 p-4 sm:p-5">
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-white/75">Progres pemeriksaan</p>
                                        <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{progress}%</p>
                                    </div>
                                    <p className="text-right text-sm text-white/75">{done} dari {inspections.length}<br />tenant selesai</p>
                                </div>
                                <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-label="Progres pemeriksaan" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                                    <div className="h-full rounded-full bg-white transition-[width] duration-300" style={{ width: `${progress}%` }} />
                                </div>
                                <div className="mt-3 flex gap-4 text-xs text-white/70">
                                    <span>{inspections.length - done} belum selesai</span>
                                    {flagged > 0 && <span className="text-white">{flagged} perlu perhatian</span>}
                                </div>
                            </div>
                        </div>
                        {canManage && (
                            <div className="flex flex-col gap-2 border-t border-white/15 bg-[#0B1729] p-4 sm:flex-row sm:justify-end sm:p-5">
                                <Button variant="success" onClick={() => setScanOpen(true)} className="min-h-[52px] w-full justify-center !bg-white !text-[#0F1E36] shadow-sm hover:!bg-gray-100 sm:w-auto sm:min-w-52">
                                    <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18" /></svg>
                                    Scan QR tenant
                                </Button>
                                <Button variant="secondary" onClick={() => setConfirmComplete(true)} className="min-h-[52px] w-full justify-center !border-white/30 !bg-white/10 !text-white hover:!bg-white/20 sm:w-auto sm:min-w-44">
                                    Selesaikan sesi
                                </Button>
                            </div>
                        )}
                    </section>

                    <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(220px,.72fr)_minmax(0,1.45fr)_minmax(260px,.83fr)]">
                        <section className="rounded-xl border border-[#E2E5EA] bg-white shadow-sm lg:sticky lg:top-4">
                            <div className="border-b border-[#ECE8E1] px-4 py-4 sm:px-5">
                                <div className="flex items-center justify-between gap-2">
                                    <h2 className="text-sm font-semibold text-[#182334]">Tim sidak</h2>
                                    <span className="rounded-full bg-[#0F1E36]/5 px-2 py-1 text-xs font-medium text-[#0F1E36]">{participants.length}</span>
                                </div>
                            </div>
                            <div className="px-4 py-4 sm:px-5">
                                {!editingTeam ? (
                                    Object.keys(teamByDept).length > 0 ? (
                                        <dl className="space-y-4">
                                            {Object.entries(teamByDept).map(([dept, members]) => (
                                                <div key={dept}>
                                                    <dt className="text-xs font-medium text-[#8A7C6E]">{dept}</dt>
                                                    <dd className="mt-2 space-y-1.5">
                                                        {members.map((m) => <div key={m.id} className="flex items-center gap-2 text-sm text-[#394556]"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F1E36] text-[10px] font-semibold text-white">{initials(m.name_snapshot)}</span>{m.name_snapshot}</div>)}
                                                    </dd>
                                                </div>
                                            ))}
                                        </dl>
                                    ) : <p className="text-sm text-[#8A7C6E]">Belum ada peserta tercatat.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {deptKeys.map((dept) => {
                                            const options = (staffByDepartment[dept] ?? []).map((u) => ({ value: u.id, label: u.name }));
                                            const deptIds = new Set(options.map((o) => o.value));
                                            return <div key={dept}><p className="mb-1.5 text-xs font-medium text-[#8A7C6E]">{dept}</p>{options.length > 0 ? <MultiSelect value={teamIds.filter((id) => deptIds.has(id))} onChange={(ids) => setDeptSelection(dept, ids)} options={options} placeholder={`Pilih dari ${dept}...`} /> : <p className="text-xs text-[#8A7C6E]">Tidak ada staff aktif.</p>}</div>;
                                        })}
                                        <div className="flex gap-2 pt-1"><Button type="button" variant="secondary" onClick={() => setEditingTeam(false)} className="flex-1 justify-center">Batal</Button><Button type="button" variant="success" disabled={savingTeam} onClick={saveTeam} className="flex-1 justify-center">{savingTeam ? 'Menyimpan...' : 'Simpan'}</Button></div>
                                    </div>
                                )}
                                {!isLocked && !editingTeam && can('sidak.manage') && <button type="button" onClick={() => { setTeamIds(participants.map((p) => p.user_id)); setEditingTeam(true); }} className="mt-5 min-h-10 w-full rounded-lg border border-[#DED4C4] px-3 text-sm font-medium text-[#6D6258] hover:bg-[#0F1E36]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F1E36]">Ubah tim</button>}
                            </div>
                        </section>

                        <section className="min-w-0 overflow-hidden rounded-xl border border-[#E2E5EA] bg-white shadow-sm">
                            <div className="border-b border-[#ECE8E1] px-4 py-4 sm:px-5">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div><h2 className="text-base font-semibold text-[#182334]">Tenant dalam sesi</h2><p className="mt-1 text-sm text-[#8A7C6E]">Pilih tenant untuk membuka checklist.</p></div>
                                    <span className="text-sm text-[#8A7C6E]">{visibleInspections.length} ditampilkan</span>
                                </div>
                                <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Filter tenant">
                                    {filters.map((f) => <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} onClick={() => setFilter(f.key)} className={`min-h-10 shrink-0 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#287A52] ${filter === f.key ? 'bg-[#0F1E36] text-white' : 'bg-gray-100 text-[#0F1E36] hover:bg-gray-200'}`}>{f.label}</button>)}
                                </div>
                            </div>
                            {visibleInspections.length === 0 ? <div className="px-5 py-12 text-center"><p className="text-sm font-medium text-[#394556]">{inspections.length === 0 ? 'Belum ada tenant ditambahkan.' : 'Tidak ada tenant pada filter ini.'}</p><p className="mt-1 text-sm text-[#8A7C6E]">{isLocked ? 'Sesi ini sudah selesai dan tidak bisa ditambah lagi.' : 'Scan QR atau pilih tenant manual di samping.'}</p></div> : <div className="divide-y divide-[#ECE8E1]">{visibleInspections.map((inspection) => <Link key={inspection.id} href={`/inspections/${inspection.id}`} className="flex min-h-[76px] items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#0F1E36]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F1E36] sm:px-5">{inspection.tenant?.logo_url ? <img src={inspection.tenant.logo_url} alt={`Logo ${inspection.tenant?.name}`} className="h-11 w-11 shrink-0 rounded-lg border border-[#E2E5EA] bg-[#F5F1E9] object-contain p-0.5" loading="lazy" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#182334] text-xs font-semibold text-white" aria-hidden="true">{initials(inspection.tenant?.name)}</span>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#182334]">{inspection.tenant?.name}</span><span className="mt-1 block truncate text-sm text-[#8A7C6E]">{inspection.tenant?.active_tenancy?.unit?.unit_code ?? inspection.tenant?.product_category?.name ?? 'Unit belum tersedia'}</span></span><span className="flex shrink-0 items-center gap-2">{inspection.is_flagged && <span className="text-[#D64545]" title="Ada catatan perhatian" aria-label="Ada catatan perhatian">!</span>}<Badge color={inspection.status === 'completed' ? 'gray' : 'blue'} size="sm" className="!bg-[#0F1E36]/5 !text-[#0F1E36]">{inspection.status === 'completed' ? 'Selesai' : 'Draft'}</Badge><span className="text-lg text-[#B6AA9B]" aria-hidden="true">›</span></span></Link>)}</div>}
                        </section>

                        {canManage && <section className="overflow-hidden rounded-xl border border-[#E2E5EA] bg-white shadow-sm lg:sticky lg:top-4">
                            <div className="border-b border-[#ECE8E1] px-4 py-4 sm:px-5"><h2 className="text-base font-semibold text-[#0F1E36]">Tambah manual</h2><p className="mt-1 text-sm leading-5 text-gray-500">Gunakan jika QR unit tidak tersedia.</p></div>
                            <div className="px-4 pt-4 sm:px-5"><TextInput placeholder="Cari nama tenant atau kode unit…" value={search} onChange={(e) => setSearch(e.target.value)} clearable /></div>
                            <div className="mt-4 max-h-80 overflow-y-auto border-t border-[#ECE8E1] divide-y divide-[#ECE8E1]">
                                {filteredTenants.map((tenant) => <button key={tenant.id} type="button" disabled={adding} onClick={() => submitAddTenant(tenant.id)} className="flex min-h-[64px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0F1E36] disabled:opacity-50 sm:px-5">{tenant.logo_url ? <img src={tenant.logo_url} alt={`Logo ${tenant.name}`} className="h-10 w-10 shrink-0 rounded-lg border border-[#E2E5EA] bg-white object-contain p-0.5" loading="lazy" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#182334] text-xs font-semibold text-white" aria-hidden="true">{initials(tenant.name)}</span>}<span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-[#182334]">{tenant.name}</span><span className="mt-0.5 block truncate text-xs text-[#8A7C6E]">{tenant.unit_code ?? 'Unit belum tersedia'}{tenant.tenant_category === 'Anchor' ? ' · Anchor' : ''}</span></span><span className="shrink-0 rounded-lg bg-[#0F1E36]/5 px-2.5 py-1.5 text-sm font-semibold text-[#0F1E36]">Tambah</span></button>)}
                                {filteredTenants.length === 0 && <p className="px-5 py-8 text-center text-sm text-[#8A7C6E]">Tidak ada tenant ditemukan.</p>}
                            </div>
                        </section>}
                    </div>
                </div>
            </main>
            <QrScanModal open={scanOpen} onClose={() => setScanOpen(false)} sessionId={session.id} title="Scan QR tenant" description="Arahkan kamera ke QR unit — otomatis lompat ke sidak" />
            <ConfirmModal open={confirmComplete} onClose={() => setConfirmComplete(false)} onConfirm={completeSession} loading={completing} title="Selesaikan sesi?" confirmLabel="Ya, selesaikan" note="Setelah selesai, sesi dan semua checklist di dalamnya tidak bisa diubah lagi.">
                <ConfirmRow label="PIC" value={session.pic_name} />
                <ConfirmRow label="Tim" value={participants.length > 0 ? `${participants.length} orang` : null} />
                <ConfirmRow label="Tenant disidak" value={`${inspections.length} tenant`} />
                <ConfirmRow label="Selesai checklist" value={`${done} dari ${inspections.length}`} />
            </ConfirmModal>
        </AppLayout>
    );
}
