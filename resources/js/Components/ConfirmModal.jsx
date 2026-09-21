import Modal from '@/Components/Modal';
import Button from '@/Components/Form/Button';

export default function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title = 'Ajukan Surat Izin?',
    loading = false,
    confirmLabel = 'Ya, Ajukan',
    confirmVariant = 'success',
    children,
    note = 'Pastikan data di review sudah benar. Setelah diajukan, surat izin masuk tahap persetujuan dan tidak bisa diubah.',
}) {
    return (
        <Modal
            open={open}
            onClose={onClose}
            title={title}
            maxWidth="max-w-md"
            icon={
                <svg className="w-4 h-4 text-[#1FA24C]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
            }
        >
            {children && (
                <dl className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 space-y-2 text-sm mb-4">
                    {children}
                </dl>
            )}
            <p className="text-xs text-gray-500 leading-relaxed mb-5">{note}</p>
            <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1 justify-center">
                    Kembali Cek
                </Button>
                <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={loading} className="flex-1 justify-center">
                    {loading ? 'Mengirim...' : confirmLabel}
                </Button>
            </div>
        </Modal>
    );
}

export function ConfirmRow({ label, value }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-gray-500 shrink-0">{label}</dt>
            <dd className="text-gray-900 font-medium text-right min-w-0 truncate">{value || '—'}</dd>
        </div>
    );
}
