/**
 * Sumber tunggal daftar modul Pengaturan: dipakai rail `SettingsLayout`
 * dan halaman hub `Settings/Home` agar label, urutan, dan izin tidak beda.
 */
export const SETTINGS_ITEMS = [
    {
        group: 'Pengguna & Akses',
        label: 'Manajemen User',
        href: '/settings/users',
        permission: 'users.manage',
        icon: 'users',
        description: 'Akun, role, dan penempatan pegawai',
    },
    {
        group: 'Pengguna & Akses',
        label: 'Hak Akses',
        href: '/settings/access-control',
        permission: 'settings.access',
        icon: 'key',
        description: 'Permission tiap role per modul',
    },
    {
        group: 'Operasional & Dokumen',
        label: 'Sinkronisasi Gate',
        href: '/settings/gate',
        permission: 'settings.access',
        icon: 'refresh',
        description: 'Tarik master & karyawan Gate jadi user',
    },
    {
        group: 'Operasional & Dokumen',
        label: 'Jam Akses QR',
        href: '/settings/permit-scan',
        permission: 'settings.access',
        icon: 'qr',
        description: 'Jendela waktu scan QR per hari',
    },
    {
        group: 'Operasional & Dokumen',
        label: 'Template Inspeksi',
        href: '/settings/inspection-templates',
        permission: 'settings.access',
        icon: 'clipboard',
        description: 'Section dan item form sidak',
    },
    {
        group: 'Operasional & Dokumen',
        label: 'Dokumen Statis',
        href: '/settings/documents',
        permission: 'documents.manage',
        icon: 'document',
        description: 'PDF/DOCX yang dipakai tombol unduh',
    },
];