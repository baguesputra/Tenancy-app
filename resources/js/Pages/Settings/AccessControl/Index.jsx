import AppLayout from '@/Layouts/AppLayout';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import Button from '@/Components/Form/Button';

export default function Index({ roles: initialRoles, permissions }) {
    const [roles, setRoles] = useState(initialRoles);
    const [savingRole, setSavingRole] = useState(null);

    const togglePermission = (roleId, permission) => {
        setRoles((prev) => prev.map((r) => {
            if (r.id !== roleId) return r;
            const has = r.permissions.includes(permission);
            return { ...r, permissions: has ? r.permissions.filter((p) => p !== permission) : [...r.permissions, permission] };
        }));
    };

    const saveRole = (role) => {
        setSavingRole(role.id);
        router.put(`/settings/access-control/${role.id}`, { permissions: role.permissions }, {
            preserveScroll: true,
            onFinish: () => setSavingRole(null),
        });
    };

    return (
        <AppLayout>
            <div className="px-6 sm:px-8 py-6 flex-1">
                <h1 className="text-xl font-semibold text-gray-900 mb-1">Hak Akses</h1>
                <p className="text-sm text-gray-500 mb-6">Atur permission untuk setiap role. Super Admin selalu memiliki akses penuh.</p>

                <div className="bg-white rounded-xl border border-[#E2E5EA] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-[#E2E5EA] bg-gray-50/60">
                                    <th className="text-left font-medium text-gray-500 text-xs uppercase tracking-wide px-5 py-3 sticky left-0 bg-gray-50/60">
                                        Permission
                                    </th>
                                    {roles.map((role) => (
                                        <th key={role.id} className="text-center font-medium text-gray-700 text-xs px-4 py-3 whitespace-nowrap">
                                            {role.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E2E5EA]">
                                {permissions.map((permission) => (
                                    <tr key={permission}>
                                        <td className="px-5 py-2.5 text-gray-700 sticky left-0 bg-white">{permission}</td>
                                        {roles.map((role) => (
                                            <td key={role.id} className="text-center px-4 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={role.permissions.includes(permission)}
                                                    onChange={() => togglePermission(role.id, permission)}
                                                    className="w-4 h-4 rounded border-gray-300 text-[#0F1E36] focus:ring-[#0F1E36]"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#E2E5EA] bg-gray-50/40">
                        {roles.map((role) => (
                            <Button
                                key={role.id}
                                onClick={() => saveRole(role)}
                                disabled={savingRole === role.id}
                                variant="secondary"
                                className="text-xs"
                            >
                                Simpan {role.name}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}