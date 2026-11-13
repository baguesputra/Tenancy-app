export const API_BASE_PATH = '/api/v1';

/**
 * Mengembalikan path relatif lengkap untuk sebuah endpoint (mendukung route di luar /api/v1).
 */
export function resolveEndpointPath(endpoint) {
    if (endpoint.fullPath) {
        return endpoint.fullPath;
    }
    return `${API_BASE_PATH}${endpoint.path}`;
}

export const INTEGRATION_FLOWS = [
    {
        id: 'sidak',
        title: 'Alur Sidak Lapangan',
        subtitle: 'Dari autentikasi mobile hingga penutupan sesi inspeksi',
        accent: 'sky',
        steps: [
            { label: 'Login token atau SSO PKCE', endpointId: 'auth-login' },
            { label: 'Cek sesi berjalan / buka sesi baru', endpointId: 'sessions-current' },
            { label: 'Pindai QR unit atau pilih tenant', endpointId: 'sessions-scan' },
            { label: 'Isi checklist, foto bukti & catatan', endpointId: 'inspections-answers' },
            { label: 'Tutup inspeksi tenant lalu tutup sesi', endpointId: 'sessions-complete' },
        ],
    },
    {
        id: 'security',
        title: 'Alur Cek Fisik Security',
        subtitle: 'Verifikasi pekerja, barang bawaan, dan KTP di pos pengamanan',
        accent: 'emerald',
        steps: [
            { label: 'Ambil antrean izin pending cabang', endpointId: 'security-permits-index' },
            { label: 'Buka detail pekerja, barang & KTP', endpointId: 'security-permits-show' },
            { label: 'Tandai pekerja, foto barang & unggah KTP', endpointId: 'security-goods-verify' },
            { label: 'Selesaikan tahap pemeriksaan fisik', endpointId: 'security-permits-complete' },
        ],
    },
];

export const ENDPOINT_GROUPS = [
    {
        id: 'autentikasi',
        title: 'Autentikasi & SSO',
        permissionSummary: 'Publik (login/SSO) · Bearer Sanctum (profil/logout)',
        note: 'Mendukung penerbitan token Sanctum via kredensial karyawan (email atau nomor karyawan) maupun SSO PKCE perusahaan.',
        endpoints: [
            {
                id: 'auth-login',
                method: 'POST',
                path: '/auth/login',
                summary: 'Masuk dengan kredensial & terbitkan token',
                auth: 'Publik',
                statusCode: 200,
                contentType: 'application/json',
                note: 'Mengirimkan salah satu identitas (no_karyawan, employee_number, atau email) beserta password dan nama perangkat. Hanya pengguna berstatus aktif yang diizinkan masuk.',
                params: [
                    { name: 'email / no_karyawan', in: 'body', type: 'string', required: true, desc: 'Salah satu wajib diisi (email, no_karyawan, atau employee_number).' },
                    { name: 'password', in: 'body', type: 'string', required: true, desc: 'Kata sandi akun pengguna.' },
                    { name: 'device_name', in: 'body', type: 'string', required: true, desc: 'Label perangkat untuk identifikasi token (maks. 100 karakter).' },
                ],
                body: {
                    no_karyawan: 'TOP-123456',
                    password: '••••••••',
                    device_name: 'hp-sidak-01',
                },
                returns: {
                    token: '1|aBcDeFgHiJkLmNoPqRsTuVwXyZ',
                    user: {
                        id: 12,
                        name: 'Budi Santoso',
                        email: 'budi@dutamall.com',
                        employee_number: 'TOP-123456',
                        branch_id: 1,
                    },
                },
            },
            {
                id: 'sso-mobile-redirect',
                method: 'GET',
                path: '/auth/sso/mobile',
                fullPath: '/auth/sso/mobile',
                summary: 'Inisiasi alur SSO PKCE dari aplikasi mobile',
                auth: 'Publik',
                statusCode: 302,
                note: 'Dibuka melalui sistem browser / Custom Tabs pada perangkat mobile (route web di luar /api/v1). Setelah autentikasi SAML Gate berhasil, pengguna diarahkan ke deep link tenancy://auth/sso/callback?code=...&state=...',
                params: [
                    { name: 'state', in: 'query', type: 'string', required: true, desc: 'String acak 43–128 karakter [A-Za-z0-9_-] untuk validasi CSRF.' },
                    { name: 'code_challenge', in: 'query', type: 'string', required: true, desc: 'SHA-256 base64url dari code_verifier (tepat 43 karakter).' },
                ],
            },
            {
                id: 'sso-mobile-exchange',
                method: 'POST',
                path: '/sso/mobile/exchange',
                summary: 'Tukar kode otorisasi PKCE menjadi token Sanctum',
                auth: 'Publik',
                statusCode: 200,
                contentType: 'application/json',
                note: 'Menukar code sekali pakai dari callback deep link bersama code_verifier PKCE asli untuk mendapatkan token Bearer dan profil izin lengkap pengguna.',
                warning: 'Kode otorisasi hanya berlaku selama 2 menit dan otomatis hangus setelah satu kali penukaran.',
                params: [
                    { name: 'code', in: 'body', type: 'string', required: true, desc: 'Kode otorisasi 64 karakter dari deep link callback.' },
                    { name: 'state', in: 'body', type: 'string', required: true, desc: 'Harus identik dengan state saat inisiasi.' },
                    { name: 'code_verifier', in: 'body', type: 'string', required: true, desc: 'Verifier PKCE asli (43–128 karakter).' },
                    { name: 'device_name', in: 'body', type: 'string', required: false, desc: 'Nama perangkat (default: "Tenancy Mobile", maks. 100 karakter).' },
                ],
                body: {
                    code: 'a1b2c3d4...',
                    state: 'state_pkce_acak_min_43_karakter',
                    code_verifier: 'verifier_pkce_acak_min_43_karakter',
                    device_name: 'Tenancy Mobile',
                },
                returns: {
                    user: {
                        id: 12,
                        name: 'Budi Santoso',
                        email: 'budi@dutamall.com',
                        employee_number: 'TOP-123456',
                        photo_url: null,
                        branch_id: 1,
                        branch_name: 'Duta Mall Banjarmasin',
                        department: 'Engineering',
                        permissions: ['sidak.view', 'sidak.manage', 'sidak.answer'],
                    },
                    token: '2|xYzAbCdEfGhIjKlMnOpQrStUvW',
                },
            },
            {
                id: 'auth-user',
                method: 'GET',
                path: '/api/user',
                fullPath: '/api/user',
                summary: 'Ambil profil pengguna & daftar izin aktif',
                auth: 'Bearer',
                statusCode: 200,
                note: 'Mengembalikan profil pengguna yang sedang terautentikasi beserta nama cabang, departemen, dan array permission (berada di prefix /api, bukan /api/v1).',
                returns: {
                    id: 12,
                    name: 'Budi Santoso',
                    email: 'budi@dutamall.com',
                    employee_number: 'TOP-123456',
                    photo_url: 'https://.../storage/photos/budi.jpg',
                    branch_id: 1,
                    branch_name: 'Duta Mall Banjarmasin',
                    department: 'Engineering',
                    permissions: ['sidak.view', 'sidak.manage', 'sidak.answer'],
                },
            },
            {
                id: 'auth-logout',
                method: 'POST',
                path: '/auth/logout',
                summary: 'Cabut token akses yang sedang dipakai',
                auth: 'Bearer',
                statusCode: 200,
                note: 'Menghapus Personal Access Token yang sedang dikirim pada header Authorization.',
                returns: {
                    message: 'Token dicabut.',
                },
            },
        ],
    },
    {
        id: 'sidak-sesi',
        title: 'Sidak: Sesi & Referensi',
        permissionSummary: 'Bearer · sidak.manage (kelola sesi) · sidak.view (baca)',
        note: 'Mengelola sesi sidak lapangan, anggota tim peserta, data opsi staf/tenant cabang, dan penambahan tenant via QR atau daftar manual. Akses sesi dibatasi untuk pemilik sesi atau pengguna lintas cabang.',
        endpoints: [
            {
                id: 'sidak-staff-options',
                method: 'GET',
                path: '/staff-options',
                summary: 'Daftar kandidat staf peserta tim sidak',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 200,
                note: 'Mengembalikan daftar staf aktif di cabang pengguna (selain pengguna sendiri) yang dikelompokkan berdasarkan departemen peserta sidak (Building Service, Engineering, Security).',
                returns: {
                    staffByDepartment: {
                        'Building Service': [{ id: 8, name: 'Ani Wijaya' }],
                        Engineering: [{ id: 14, name: 'Doni Pratama' }],
                        Security: [{ id: 21, name: 'Rudi Hartono' }],
                    },
                },
            },
            {
                id: 'sidak-tenants',
                method: 'GET',
                path: '/tenants',
                summary: 'Daftar tenant aktif di cabang untuk tambah manual',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 200,
                note: 'Mengembalikan maksimal 200 tenant aktif pada cabang pengguna beserta kode unit, lantai, dan kategori produknya.',
                returns: {
                    tenants: [
                        {
                            id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                            name: 'Kopi Kenangan',
                            logo_url: 'https://.../storage/logos/kopi.png',
                            tenant_category: 'Retail',
                            product_category: 'F&B',
                            unit_code: 'GF-01',
                            floor: 'GF',
                        },
                    ],
                },
            },
            {
                id: 'sessions-index',
                method: 'GET',
                path: '/inspection-sessions',
                summary: 'Daftar riwayat sesi sidak terpaginasi',
                auth: 'Bearer',
                permission: 'sidak.view',
                statusCode: 200,
                params: [
                    { name: 'page', in: 'query', type: 'integer', required: false, desc: 'Nomor halaman paginasi.' },
                ],
                returns: {
                    sessions: [
                        {
                            id: '019a7c20-...',
                            status: 'in_progress',
                            started_at: '2026-11-13T09:00:00Z',
                            ended_at: null,
                            notes: 'Sidak rutin pagi',
                            creator_name: 'Budi Santoso',
                            pic_name: 'Budi Santoso',
                            branch_name: 'Duta Mall Banjarmasin',
                            participants: [],
                            inspections: [],
                        },
                    ],
                    meta: {
                        current_page: 1,
                        last_page: 3,
                        total: 42,
                    },
                },
            },
            {
                id: 'sessions-current',
                method: 'GET',
                path: '/inspection-sessions/current',
                summary: 'Ambil sesi sidak yang sedang berjalan milik user',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 200,
                note: 'Mengembalikan objek session berstatus in_progress terbaru milik pengguna, atau null bila belum ada sesi aktif.',
                returns: {
                    session: {
                        id: '019a7c20-...',
                        status: 'in_progress',
                        started_at: '2026-11-13T09:00:00Z',
                        ended_at: null,
                        notes: 'Sidak rutin pagi',
                        creator_name: 'Budi Santoso',
                        pic_name: 'Budi Santoso',
                        branch_name: 'Duta Mall Banjarmasin',
                        participants: [
                            { id: 1, user_id: 21, name: 'Rudi Hartono', department: 'Security', photo_url: null },
                        ],
                        inspections: [],
                    },
                },
            },
            {
                id: 'sessions-store',
                method: 'POST',
                path: '/inspection-sessions',
                summary: 'Buat sesi sidak lapangan baru',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 201,
                contentType: 'application/json',
                params: [
                    { name: 'participant_ids', in: 'body', type: 'integer[]', required: true, desc: 'Daftar ID user peserta tim sidak (minimal 1 peserta).' },
                    { name: 'notes', in: 'body', type: 'string', required: false, desc: 'Catatan pembuka sesi (maks. 1000 karakter).' },
                ],
                body: {
                    participant_ids: [21, 14],
                    notes: 'Sidak area lantai dasar',
                },
                returns: {
                    session: {
                        id: '019a7c20-...',
                        status: 'in_progress',
                        started_at: '2026-11-13T09:05:00Z',
                        participants: [{ id: 1, user_id: 21, name: 'Rudi Hartono', department: 'Security', photo_url: null }],
                        inspections: [],
                    },
                },
            },
            {
                id: 'sessions-show',
                method: 'GET',
                path: '/inspection-sessions/{session}',
                summary: 'Detail sesi beserta daftar inspeksi tenant',
                auth: 'Bearer',
                permission: 'sidak.view',
                statusCode: 200,
                params: [
                    { name: 'session', in: 'path', type: 'string', required: true, desc: 'ID sesi sidak.' },
                ],
                returns: {
                    session: {
                        id: '019a7c20-...',
                        status: 'in_progress',
                        participants: [],
                        inspections: [
                            {
                                id: '019a7c31-...',
                                status: 'draft',
                                is_flagged: false,
                                completed_at: null,
                                tenant: {
                                    id: '9b1deb4d-...',
                                    name: 'Kopi Kenangan',
                                    logo_url: null,
                                    product_category: 'F&B',
                                    unit_code: 'GF-01',
                                    floor: 'GF',
                                },
                            },
                        ],
                    },
                },
            },
            {
                id: 'sessions-participants',
                method: 'PATCH',
                path: '/inspection-sessions/{session}/participants',
                summary: 'Perbarui susunan peserta tim sidak',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 200,
                contentType: 'application/json',
                params: [
                    { name: 'session', in: 'path', type: 'string', required: true, desc: 'ID sesi sidak.' },
                    { name: 'participant_ids', in: 'body', type: 'integer[]', required: true, desc: 'Daftar lengkap ID user peserta terbaru (min. 1).' },
                ],
                body: {
                    participant_ids: [21, 8],
                },
                returns: {
                    session: {
                        id: '019a7c20-...',
                        participants: [
                            { id: 1, user_id: 21, name: 'Rudi Hartono', department: 'Security', photo_url: null },
                            { id: 2, user_id: 8, name: 'Ani Wijaya', department: 'Building Service', photo_url: null },
                        ],
                    },
                },
            },
            {
                id: 'sessions-scan',
                method: 'POST',
                path: '/inspection-sessions/{session}/scan',
                summary: 'Tambah inspeksi tenant dengan memindai QR unit',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 201,
                contentType: 'application/json',
                note: 'Mengirim bagian token setelah segmen /scan/ pada kode QR unit. Menolak unit kosong atau tenant yang sedang disidak oleh inspector lain.',
                params: [
                    { name: 'session', in: 'path', type: 'string', required: true, desc: 'ID sesi sidak aktif.' },
                    { name: 'token', in: 'body', type: 'string', required: true, desc: 'Token kode QR unit (maks. 100 karakter).' },
                ],
                body: {
                    token: 'qr-unit-gf01',
                },
                returns: {
                    inspection: {
                        id: '019a7c31-...',
                        status: 'draft',
                        is_flagged: false,
                        completed_at: null,
                        session_id: '019a7c20-...',
                        tenant: {
                            id: '9b1deb4d-...',
                            name: 'Kopi Kenangan',
                            logo_url: null,
                            product_category: 'F&B',
                            unit_code: 'GF-01',
                            floor: 'GF',
                        },
                    },
                },
            },
            {
                id: 'sessions-add-tenant',
                method: 'POST',
                path: '/inspection-sessions/{session}/tenants',
                summary: 'Tambah inspeksi tenant secara manual tanpa QR',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 201,
                contentType: 'application/json',
                note: 'Alternatif ketika stiker QR unit rusak atau tidak dapat dipindai.',
                params: [
                    { name: 'session', in: 'path', type: 'string', required: true, desc: 'ID sesi sidak aktif.' },
                    { name: 'tenant_id', in: 'body', type: 'string', required: true, desc: 'ID tenant dari daftar GET /tenants.' },
                ],
                body: {
                    tenant_id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                },
                returns: {
                    inspection: {
                        id: '019a7c31-...',
                        status: 'draft',
                        is_flagged: false,
                        session_id: '019a7c20-...',
                        tenant: { id: '9b1deb4d-...', name: 'Kopi Kenangan', unit_code: 'GF-01', floor: 'GF' },
                    },
                },
            },
            {
                id: 'sessions-complete',
                method: 'POST',
                path: '/inspection-sessions/{session}/complete',
                summary: 'Tutup & selesaikan seluruh sesi sidak',
                auth: 'Bearer',
                permission: 'sidak.manage',
                statusCode: 200,
                warning: 'Setelah sesi berstatus completed, jawaban, foto, dan catatan di dalamnya terkunci dan tidak bisa diubah lagi.',
                params: [
                    { name: 'session', in: 'path', type: 'string', required: true, desc: 'ID sesi sidak yang akan ditutup.' },
                ],
                returns: {
                    session: {
                        id: '019a7c20-...',
                        status: 'completed',
                        ended_at: '2026-11-13T10:15:00Z',
                    },
                },
            },
        ],
    },
    {
        id: 'sidak-checklist',
        title: 'Sidak: Checklist & Foto',
        permissionSummary: 'Bearer · sidak.view (baca) · sidak.answer (isi & unggah)',
        note: 'Mengambil template checklist inspeksi tenant, menyimpan jawaban per item, mengunggah atau menghapus foto bukti, serta menutup inspeksi tenant.',
        endpoints: [
            {
                id: 'inspections-show',
                method: 'GET',
                path: '/inspections/{inspection}',
                summary: 'Ambil header formulir, checklist & foto ekstra',
                auth: 'Bearer',
                permission: 'sidak.view',
                statusCode: 200,
                note: 'Mengembalikan snapshot checklist terstruktur per section beserta objek answer pada masing-masing item jika sudah pernah diisi.',
                params: [
                    { name: 'inspection', in: 'path', type: 'string', required: true, desc: 'ID inspeksi tenant.' },
                ],
                returns: {
                    inspection: {
                        id: '019a7c31-...',
                        status: 'draft',
                        is_flagged: false,
                        session_status: 'in_progress',
                        notes: null,
                        other_notes: null,
                        tenant: { id: '9b1deb4d-...', name: 'Kopi Kenangan', unit_code: 'GF-01', product_category: { id: 2, name: 'F&B' } },
                    },
                    checklist: {
                        template_name: 'Checklist F&B',
                        sections: [
                            {
                                name: 'Kebersihan',
                                title: 'Kebersihan',
                                items: [
                                    { id: 101, label: 'Area kasir bersih', type: 'binary_choice', answer: null },
                                ],
                            },
                        ],
                    },
                    formHeader: {
                        inspected_at: '2026-11-13T09:00:00Z',
                        location: 'Lantai GF · Blok A · No. 01',
                        tenant_pic: { name: 'Sari', position: 'Manager', phone: '0812345' },
                        officers: [{ name: 'Rudi Hartono', department: 'Security', photo_url: null }],
                        pic: 'Budi Santoso',
                    },
                    extra_photos: [],
                },
            },
            {
                id: 'inspections-answers',
                method: 'POST',
                path: '/inspections/{inspection}/answers',
                summary: 'Simpan jawaban item checklist & foto bukti',
                auth: 'Bearer',
                permission: 'sidak.answer',
                statusCode: 200,
                contentType: 'multipart/form-data',
                note: 'Menyimpan atau memperbarui jawaban satu item checklist dalam snapshot inspeksi. Foto bersifat opsional (maksimal 5 MB per unggahan, batas total 3 foto per item).',
                params: [
                    { name: 'inspection', in: 'path', type: 'string', required: true, desc: 'ID inspeksi tenant.' },
                    { name: 'checklist_item_id', in: 'form', type: 'integer', required: true, desc: 'ID item yang tercantum dalam snapshot checklist inspeksi.' },
                    { name: 'value', in: 'form', type: 'string', required: false, desc: 'Nilai pilihan/jawaban (maks. 255 karakter).' },
                    { name: 'note', in: 'form', type: 'string', required: false, desc: 'Catatan temuan pada item ini (maks. 1000 karakter).' },
                    { name: 'photo', in: 'form', type: 'image', required: false, desc: 'Berkas gambar bukti (maks. 5 MB, maks. 3 foto/item).' },
                ],
                body: {
                    checklist_item_id: 101,
                    value: 'Tidak Sesuai',
                    note: 'Area bawah meja kasir berdebu',
                    photo: '(file gambar opsional, maks 5 MB)',
                },
                returns: {
                    answer: {
                        id: 504,
                        checklist_item_id: 101,
                        value: 'Tidak Sesuai',
                        note: 'Area bawah meja kasir berdebu',
                        photos: [
                            { id: 88, url: 'https://.../storage/inspection-photos/abc.jpg' },
                        ],
                    },
                },
            },
            {
                id: 'inspection-photos-delete',
                method: 'DELETE',
                path: '/inspection-photos/{photo}',
                summary: 'Hapus foto bukti jawaban item checklist',
                auth: 'Bearer',
                permission: 'sidak.answer',
                statusCode: 200,
                note: 'Hanya diizinkan saat sesi induk masih berstatus in_progress.',
                params: [
                    { name: 'photo', in: 'path', type: 'integer', required: true, desc: 'ID foto jawaban checklist.' },
                ],
                returns: { deleted: true },
            },
            {
                id: 'inspections-extra-photos',
                method: 'POST',
                path: '/inspections/{inspection}/extra-photos',
                summary: 'Unggah foto dokumentasi tambahan inspeksi',
                auth: 'Bearer',
                permission: 'sidak.answer',
                statusCode: 201,
                contentType: 'multipart/form-data',
                note: 'Digunakan untuk dokumentasi kondisi umum di luar item checklist tertentu. Hanya diizinkan selama sesi in_progress.',
                params: [
                    { name: 'inspection', in: 'path', type: 'string', required: true, desc: 'ID inspeksi tenant.' },
                    { name: 'photo', in: 'form', type: 'image', required: true, desc: 'Berkas foto wajib (maks. 5 MB).' },
                    { name: 'description', in: 'form', type: 'string', required: false, desc: 'Keterangan foto (maks. 255 karakter).' },
                ],
                body: {
                    photo: '(file gambar wajib, maks 5 MB)',
                    description: 'Tampak depan etalase toko',
                },
                returns: {
                    photo: {
                        id: 19,
                        url: 'https://.../storage/inspection-photos/extra.jpg',
                        description: 'Tampak depan etalase toko',
                    },
                },
            },
            {
                id: 'inspection-extra-photos-delete',
                method: 'DELETE',
                path: '/inspection-extra-photos/{photo}',
                summary: 'Hapus foto dokumentasi tambahan',
                auth: 'Bearer',
                permission: 'sidak.answer',
                statusCode: 200,
                note: 'Hanya diizinkan selama sesi masih berstatus in_progress.',
                params: [
                    { name: 'photo', in: 'path', type: 'integer', required: true, desc: 'ID foto dokumentasi tambahan.' },
                ],
                returns: { deleted: true },
            },
            {
                id: 'inspections-notes',
                method: 'PATCH',
                path: '/inspections/{inspection}/notes',
                summary: 'Simpan catatan umum & catatan tambahan inspeksi',
                auth: 'Bearer',
                permission: 'sidak.answer',
                statusCode: 200,
                contentType: 'application/json',
                note: 'Hanya diizinkan selama sesi masih berstatus in_progress.',
                params: [
                    { name: 'inspection', in: 'path', type: 'string', required: true, desc: 'ID inspeksi tenant.' },
                    { name: 'notes', in: 'body', type: 'string', required: false, desc: 'Catatan utama inspeksi (maks. 5000 karakter).' },
                    { name: 'other_notes', in: 'body', type: 'string', required: false, desc: 'Catatan tambahan lainnya (maks. 5000 karakter).' },
                ],
                body: {
                    notes: 'Tenant kooperatif selama pemeriksaan.',
                    other_notes: 'Perlu tindak lanjut pengecekan exhaust minggu depan.',
                },
                returns: {
                    notes: 'Tenant kooperatif selama pemeriksaan.',
                    other_notes: 'Perlu tindak lanjut pengecekan exhaust minggu depan.',
                },
            },
            {
                id: 'inspections-complete',
                method: 'POST',
                path: '/inspections/{inspection}/complete',
                summary: 'Tutup checklist inspeksi tenant',
                auth: 'Bearer',
                permission: 'sidak.answer',
                statusCode: 200,
                note: 'Menandai inspeksi tenant selesai. Jika terdapat jawaban negatif yang mewajibkan foto tetapi belum memiliki foto, sistem menandai is_flagged = true.',
                params: [
                    { name: 'inspection', in: 'path', type: 'string', required: true, desc: 'ID inspeksi tenant.' },
                ],
                returns: {
                    inspection: {
                        id: '019a7c31-...',
                        status: 'completed',
                        is_flagged: false,
                        completed_at: '2026-11-13T09:45:00Z',
                    },
                },
            },
        ],
    },
    {
        id: 'security',
        title: 'Cek Fisik Security',
        permissionSummary: 'Bearer · permits.inspect · Departemen Security',
        note: 'Khusus staf dari departemen Security dengan izin permits.inspect. Hanya berlaku untuk surat izin pada cabang user yang tahap security-nya berstatus pending.',
        endpoints: [
            {
                id: 'security-permits-index',
                method: 'GET',
                path: '/security/permits',
                summary: 'Daftar antrean surat izin menunggu cek fisik',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                note: 'Menampilkan izin kerja/kegiatan pada cabang user dengan status approval tahap security masih pending.',
                returns: {
                    permits: [
                        {
                            id: 45,
                            permit_number: 'SIK/BJM/2026/11/0045',
                            store_name: 'Kopi Kenangan',
                            location: 'GF · 01',
                            work_start_date: '2026-11-14',
                            work_end_date: '2026-11-15',
                            worker_count: 3,
                            activity_types: ['fitout'],
                        },
                    ],
                },
            },
            {
                id: 'security-permits-show',
                method: 'GET',
                path: '/security/permits/{permit}',
                summary: 'Detail surat izin: pekerja, barang & foto KTP',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                note: 'Bila array workers kosong, jumlah worker_count digunakan sebagai batas minimum foto KTP yang harus diunggah sebelum selesai.',
                params: [
                    { name: 'permit', in: 'path', type: 'integer', required: true, desc: 'ID surat izin.' },
                ],
                returns: {
                    permit: {
                        id: 45,
                        permit_number: 'SIK/BJM/2026/11/0045',
                        store_name: 'Kopi Kenangan',
                        location: 'GF · 01',
                        worker_count: 2,
                        workers: [
                            { id: 10, name: 'Agus Salim', is_present: false, mismatch_note: null, checked_at: null },
                        ],
                        goods: [
                            { id: 7, description: 'Tangga aluminium', quantity_note: '2 unit', is_verified: false, photo_url: null, mismatch_note: null, checked_at: null },
                        ],
                        ktp_photos: [],
                    },
                },
            },
            {
                id: 'security-workers-toggle',
                method: 'POST',
                path: '/security/workers/{worker}/toggle',
                summary: 'Balik status kehadiran pekerja',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                note: 'Mengubah nilai is_present (true/false) dan mencatat waktu pemeriksaan checked_at.',
                params: [
                    { name: 'worker', in: 'path', type: 'integer', required: true, desc: 'ID pekerja pada surat izin.' },
                ],
                returns: {
                    worker: {
                        id: 10,
                        name: 'Agus Salim',
                        is_present: true,
                        mismatch_note: null,
                        checked_at: '2026-11-13T10:02:00Z',
                    },
                },
            },
            {
                id: 'security-workers-note',
                method: 'POST',
                path: '/security/workers/{worker}/note',
                summary: 'Simpan catatan ketidaksesuaian pekerja',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                contentType: 'application/json',
                params: [
                    { name: 'worker', in: 'path', type: 'integer', required: true, desc: 'ID pekerja.' },
                    { name: 'mismatch_note', in: 'body', type: 'string', required: false, desc: 'Catatan ketidaksesuaian (kirim null untuk menghapus catatan).' },
                ],
                body: {
                    mismatch_note: 'Nama pada KTP berbeda dengan daftar',
                },
                returns: {
                    worker: {
                        id: 10,
                        name: 'Agus Salim',
                        is_present: true,
                        mismatch_note: 'Nama pada KTP berbeda dengan daftar',
                        checked_at: '2026-11-13T10:02:00Z',
                    },
                },
            },
            {
                id: 'security-goods-verify',
                method: 'POST',
                path: '/security/goods/{good}/verify',
                summary: 'Verifikasi barang bawaan & unggah foto bukti',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                contentType: 'multipart/form-data',
                warning: 'Foto pertama wajib dikirim saat verifikasi awal dan langsung terkunci. Pemanggilan ulang hanya boleh mengubah mismatch_note (mengirim photo lagi akan ditolak 422).',
                params: [
                    { name: 'good', in: 'path', type: 'integer', required: true, desc: 'ID item barang bawaan.' },
                    { name: 'photo', in: 'form', type: 'image', required: true, desc: 'Wajib saat pertama kali verifikasi (maks. 5 MB).' },
                    { name: 'mismatch_note', in: 'form', type: 'string', required: false, desc: 'Catatan jika jumlah/jenis barang tidak sesuai.' },
                ],
                body: {
                    photo: '(file gambar wajib saat verifikasi pertama)',
                    mismatch_note: 'Jumlah aktual 1 unit, tertulis 2 unit',
                },
                returns: {
                    good: {
                        id: 7,
                        description: 'Tangga aluminium',
                        quantity_note: '2 unit',
                        is_verified: true,
                        photo_url: 'https://.../storage/permit-goods/item7.jpg',
                        mismatch_note: 'Jumlah aktual 1 unit, tertulis 2 unit',
                        checked_at: '2026-11-13T10:05:00Z',
                    },
                },
            },
            {
                id: 'security-ktp-upload',
                method: 'POST',
                path: '/security/permits/{permit}/ktp',
                summary: 'Unggah foto KTP pekerja',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 201,
                contentType: 'multipart/form-data',
                params: [
                    { name: 'permit', in: 'path', type: 'integer', required: true, desc: 'ID surat izin.' },
                    { name: 'photo', in: 'form', type: 'image', required: true, desc: 'Foto KTP pekerja (wajib, maks. 5 MB).' },
                    { name: 'mismatch_note', in: 'form', type: 'string', required: false, desc: 'Catatan ketidaksesuaian identitas.' },
                ],
                body: {
                    photo: '(file gambar KTP wajib, maks 5 MB)',
                    mismatch_note: null,
                },
                returns: {
                    ktp_photo: {
                        id: 31,
                        photo_url: 'https://.../storage/permit-ktp/ktp31.jpg',
                        mismatch_note: null,
                        checked_at: '2026-11-13T10:07:00Z',
                    },
                },
            },
            {
                id: 'security-ktp-delete',
                method: 'DELETE',
                path: '/security/ktp-photos/{photo}',
                summary: 'Hapus foto KTP yang sudah diunggah',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                params: [
                    { name: 'photo', in: 'path', type: 'integer', required: true, desc: 'ID foto KTP.' },
                ],
                returns: { deleted: true },
            },
            {
                id: 'security-permits-complete',
                method: 'POST',
                path: '/security/permits/{permit}/complete',
                summary: 'Selesaikan pemeriksaan fisik surat izin',
                auth: 'Bearer',
                permission: 'permits.inspect',
                statusCode: 200,
                warning: 'Ditolak (422) bila daftar pekerja belum hadir semua, foto KTP kurang dari worker_count (saat daftar nama kosong), atau masih ada barang yang belum diverifikasi. Catatan ketidaksesuaian menandai is_flagged = true tetapi tetap menyelesaikan tahap.',
                params: [
                    { name: 'permit', in: 'path', type: 'integer', required: true, desc: 'ID surat izin.' },
                ],
                returns: {
                    permit: {
                        id: 45,
                        status: 'approved',
                        is_flagged: true,
                    },
                    message: 'Pemeriksaan fisik selesai. Ada catatan ketidaksesuaian yang ditandai.',
                },
            },
        ],
    },
    {
        id: 'webhook-hcis',
        title: 'Webhook HCIS',
        permissionSummary: 'HMAC-SHA256 · Header X-HCIS-Signature',
        note: 'Endpoint inbound untuk sinkronisasi otomatis data karyawan dari sistem HCIS ke tenant-app. Tidak menggunakan token Sanctum.',
        endpoints: [
            {
                id: 'hcis-employee-sync',
                method: 'POST',
                path: '/ingest/employee-sync',
                summary: 'Terima push event karyawan dari HCIS',
                auth: 'HMAC',
                permission: 'X-HCIS-Signature',
                statusCode: 200,
                contentType: 'application/json',
                note: 'Header X-HCIS-Signature berisi HMAC-SHA256 dari raw body permintaan menggunakan HCIS_WEBHOOK_SECRET. Mengembalikan 503 bila secret belum dikonfigurasi.',
                params: [
                    { name: 'event', in: 'body', type: 'enum', required: true, desc: 'Salah satu dari: employee.created, employee.updated, employee.deactivated.' },
                    { name: 'timestamp', in: 'body', type: 'string', required: false, desc: 'Timestamp kejadian format ISO 8601.' },
                    { name: 'data.id', in: 'body', type: 'uuid', required: true, desc: 'UUID karyawan pada HCIS (disimpan ke users.gate_id).' },
                    { name: 'data.name', in: 'body', type: 'string', required: true, desc: 'Nama lengkap karyawan (maks. 255).' },
                    { name: 'data.email', in: 'body', type: 'email', required: true, desc: 'Alamat email karyawan (maks. 255).' },
                    { name: 'data.nik', in: 'body', type: 'string', required: false, desc: 'Nomor induk karyawan (maks. 50).' },
                    { name: 'data.is_active', in: 'body', type: 'boolean', required: false, desc: 'Status aktif karyawan.' },
                ],
                body: {
                    event: 'employee.updated',
                    timestamp: '2026-11-13T08:30:00Z',
                    data: {
                        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                        name: 'Budi Santoso',
                        email: 'budi@dutamall.com',
                        nik: 'TOP-123456',
                        is_active: true,
                    },
                },
                returns: {
                    status: 'success',
                    message: 'User updated successfully via HCIS sync.',
                    data: {
                        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d',
                        nik: 'TOP-123456',
                        email: 'budi@dutamall.com',
                        is_active: true,
                        action: 'updated',
                    },
                },
            },
        ],
    },
];

export const ERROR_CODES = [
    {
        code: '401',
        label: 'Unauthorized',
        tone: 'amber',
        desc: 'Token Bearer tidak disertakan, sudah kedaluwarsa/dicabut, atau signature X-HCIS-Signature tidak cocok pada webhook HCIS.',
    },
    {
        code: '403',
        label: 'Forbidden',
        tone: 'rose',
        desc: 'Pengguna tidak memiliki izin (sidak.manage / sidak.view / sidak.answer / permits.inspect), bukan pemilik sesi, bukan dari departemen Security, atau izin belum sampai pada tahap security.',
    },
    {
        code: '404',
        label: 'Not Found',
        tone: 'slate',
        desc: 'ID sesi, inspeksi, foto, surat izin, pekerja, atau barang tidak ditemukan di database.',
    },
    {
        code: '422',
        label: 'Unprocessable Entity',
        tone: 'amber',
        desc: 'Validasi masukan gagal atau aturan bisnis tidak terpenuhi (mis. foto KTP kurang, barang belum diverifikasi, sesi sudah selesai, atau kode SSO kedaluwarsa/sudah dipakai).',
    },
    {
        code: '503',
        label: 'Service Unavailable',
        tone: 'slate',
        desc: 'Khusus endpoint webhook HCIS ketika environment HCIS_WEBHOOK_SECRET belum dikonfigurasi pada server.',
    },
];

export const SAMPLE_VALIDATION_ERROR = {
    message: 'Foto KTP kurang — jumlah foto minimal sama dengan jumlah pekerja.',
    errors: {
        security: ['Foto KTP kurang — jumlah foto minimal sama dengan jumlah pekerja.'],
    },
};

export const SAMPLE_AUTH_ERROR = {
    message: 'Hanya staff Security yang bisa melakukan aksi ini.',
};
