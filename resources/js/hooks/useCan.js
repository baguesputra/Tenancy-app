import { usePage } from '@inertiajs/react';

/**
 * Cek permission user yang sedang login. super_admin selalu lolos
 * (backend juga bypass total via Gate::before).
 *
 * Dipakai untuk menyembunyikan tombol/aksi yang tidak berhak — BUKAN
 * pengaman. Pengaman tetap middleware `can:` di route + `can()` di controller.
 */
export default function useCan() {
    const { auth } = usePage().props;
    const permissions = auth.user?.permissions ?? [];
    const isSuperAdmin = auth.user?.roles?.includes('super_admin');
    const can = (permission) => isSuperAdmin || permissions.includes(permission);
    return { can, isSuperAdmin, permissions };
}
