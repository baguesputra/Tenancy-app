import PortalLayout from '@/Layouts/PortalLayout';
import FormSection from '@/Components/Form/FormSection';
import Badge from '@/Components/Badge';

const approvalColor = { pending: 'yellow', approved: 'green', rejected: 'red' };

export default function Show({ permit }) {
    return (
        <PortalLayout>
            <div className="p-6 max-w-2xl">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">{permit.permit_number}</h1>
                <p className="text-sm text-gray-500 mb-6">{permit.job_type} — {permit.request_date}</p>

                <FormSection title="Progress Approval">
                    <ul className="space-y-2.5">
                        {permit.approvals.map((a) => (
                            <li key={a.id} className="flex justify-between items-center">
                                <span className="text-sm text-gray-700">{a.label}</span>
                                <Badge color={approvalColor[a.status]}>{a.status}</Badge>
                            </li>
                        ))}
                    </ul>
                </FormSection>

                <FormSection title="Daftar Pekerja">
                    <div className="space-y-1.5">
                        {permit.workers.map((w) => (
                            <p key={w.id} className="text-sm text-gray-700 flex justify-between">
                                <span>{w.name}</span>
                                <span className={w.is_present ? 'text-emerald-600' : 'text-gray-400'}>
                                    {w.is_present ? '✓ Hadir' : 'Belum dicek'}
                                </span>
                            </p>
                        ))}
                    </div>
                </FormSection>

                <FormSection title="Daftar Barang">
                    <div className="space-y-1.5">
                        {permit.goods.map((g) => (
                            <p key={g.id} className="text-sm text-gray-700 flex justify-between">
                                <span>{g.description} ({g.quantity_note})</span>
                                <span className={g.is_verified ? 'text-emerald-600' : 'text-gray-400'}>
                                    {g.is_verified ? '✓ Terverifikasi' : 'Belum dicek'}
                                </span>
                            </p>
                        ))}
                    </div>
                </FormSection>
            </div>
        </PortalLayout>
    );
}