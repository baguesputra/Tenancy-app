<?php

// Item dikunci dari form resmi "Ceklist Toko Setelah Selesai Fit Out".
$fitoutChecklistDepartments = [
    ['key' => 'legal', 'label' => 'Legal', 'items' => [
        'psm' => 'PSM',
    ]],
    ['key' => 'finance', 'label' => 'Finance & Accounting', 'items' => [
        'dp_1' => 'DP 1',
        'dp_2' => 'DP 2',
        'dp_3' => 'DP 3',
        'deposit_sewa' => 'Deposit Sewa',
        'deposit_service_charge' => 'Deposit Service Charge',
        'promotion_levy' => 'Promotion Levy / Opening Promo',
        'deposit_fitout' => 'Deposit Fit Out',
        'penambahan_daya' => 'Penambahan Daya',
        'relokasi_sprinkler' => 'Relokasi/Instalasi Sprinkler',
        'biaya_hoarding' => 'Biaya Hoarding, Listrik, Air, Megger',
        'lainnya' => 'Lainnya',
    ]],
    ['key' => 'tenancy', 'label' => 'Tenancy', 'items' => [
        'lantai' => 'Pengerjaan Lantai',
        'plafond' => 'Pengerjaan Plafond',
        'dinding' => 'Pengerjaan Dinding',
        'furniture_display' => 'Pengerjaan Furniture & Display',
        'interior' => 'Pengerjaan Interior',
        'shopfront' => 'Pengerjaan Shopfront',
    ]],
    ['key' => 'engineering', 'label' => 'Engineering', 'items' => [
        'megger' => 'Test Megger',
        'diffuser' => 'Pengecekkan Diffuser',
        'sprinkler' => 'Pengecekkan Sprinkler',
        'listrik' => 'Pengecekkan Listrik',
        'telepon' => 'Pengecekkan Telepon & Internet',
        'lampu_standby' => 'Pengadaan Lampu Stand By',
        'lampu_emergency' => 'Pengadaan Lampu Emergency',
        'apar' => 'Pengadaan Apar',
    ]],
    ['key' => 'kontraktor', 'label' => 'Kontraktor/Penanggung Jawab', 'items' => [
        'checklist_pekerjaan' => 'Checklist Pekerjaan',
        'serah_terima' => 'Serah Terima Penyelesaian Fit Out',
    ]],
];

// Checklist sebelum fitout hanya 3 departemen, tanpa TTD penyewa/Deputy GM
// dan tanpa blok "Mengetahui". Legal cukup cek LOO; Tenancy mengecek
// kelengkapan dokumen & gambar kerja — berbeda dari checklist setelah fitout,
// jadi item di-override di sini (array bersama di atas tidak diubah).
$preTenancyItems = [
    'base_drawing' => 'Mengirimkan Base Drawing',
    'fitout_guide' => 'Menyerahkan Fit Out Guide',
    'gambar_kerja' => 'Menerima Gambar Kerja',
    'layout_plan' => 'Layout Plan',
    'layout_floor' => 'Layout Floor',
    'ceiling_plan' => 'Ceiling Plan',
    'lighting_plan' => 'Lighting Plan',
    'gambar_potongan' => 'Gambar Potongan',
    'gambar_tampak_shopfront' => 'Gambaran Tampak/Shopfront',
    'gambar_diffuser_sprinkler' => 'Gambar Diffuser & Sprinkler',
    'gambar_3d' => 'Gambar 3D',
    'wiring_diagram' => 'Wiring Diagram',
];

$fitoutChecklistPreDepartments = array_map(
    fn (array $d) => match ($d['key']) {
        'legal' => [...$d, 'items' => ['loo' => 'LOO']],
        'tenancy' => [...$d, 'items' => $preTenancyItems],
        default => $d,
    },
    array_values(array_filter(
        $fitoutChecklistDepartments,
        fn (array $d) => in_array($d['key'], ['legal', 'finance', 'tenancy'], true)
    ))
);

$fitoutChecklistSignatureFields = fn (array $departments) => array_map(
    fn (array $d) => ['name' => 'signature_'.$d['key'], 'type' => 'file', 'label' => 'TTD '.$d['label'], 'accept' => '.png,.jpg,.jpeg'],
    $departments
);

$fitoutChecklistFields = array_merge(
    [
        ['name' => 'checklist', 'type' => 'checklist_table', 'label' => 'Checklist Toko', 'departments' => $fitoutChecklistDepartments],
    ],
    $fitoutChecklistSignatureFields($fitoutChecklistDepartments),
    [
        ['name' => 'signature_tenant', 'type' => 'file', 'label' => 'TTD Pihak Penyewa', 'accept' => '.png,.jpg,.jpeg'],
        ['name' => 'signature_gm', 'type' => 'file', 'label' => 'TTD Deputy General Manager', 'accept' => '.png,.jpg,.jpeg'],
        ['name' => 'notes', 'type' => 'textarea', 'label' => 'Catatan'],
    ]
);

$fitoutChecklistPreFields = array_merge(
    [
        ['name' => 'checklist', 'type' => 'checklist_table', 'label' => 'Checklist Toko', 'departments' => $fitoutChecklistPreDepartments, 'show_footer' => false],
    ],
    $fitoutChecklistSignatureFields($fitoutChecklistPreDepartments),
    [
        ['name' => 'notes', 'type' => 'textarea', 'label' => 'Catatan'],
    ]
);

return [
    'legalitas' => [
        'label' => 'Legalitas',
        'stage' => 'legal',
        'permission' => 'loos.legal_edit',
        'fields' => [
            ['name' => 'entity_name', 'type' => 'text', 'label' => 'Nama Badan Hukum', 'required' => true],
            ['name' => 'entity_type', 'type' => 'select', 'label' => 'Jenis Badan Hukum', 'options' => ['PT', 'CV', 'Perorangan']],
            ['name' => 'npwp', 'type' => 'file', 'label' => 'NPWP', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'nib', 'type' => 'file', 'label' => 'NIB', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'sk_pendirian', 'type' => 'file', 'label' => 'SK Pendirian', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'tgl_sk_pendirian', 'type' => 'date', 'label' => 'Tgl SK Pendirian'],
            ['name' => 'akta_perubahan_terakhir', 'type' => 'file', 'label' => 'Akta Perubahan Terakhir', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'tgl_akta_terakhir', 'type' => 'date', 'label' => 'Tgl Akta Terakhir'],
            ['name' => 'surat_kuasa', 'type' => 'file', 'label' => 'Surat Kuasa', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'ktp', 'type' => 'file', 'label' => 'KTP Penandatangan', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'ktp_badan_hukum', 'type' => 'file', 'label' => 'KTP Badan Hukum', 'accept' => '.pdf,.jpg,.jpeg,.png', 'max_kb' => 5120],
            ['name' => 'pic_legal_name', 'type' => 'text', 'label' => 'PIC Legal Nama'],
            ['name' => 'pic_legal_phone', 'type' => 'text', 'label' => 'PIC Legal Telp'],
            ['name' => 'pic_legal_email', 'type' => 'email', 'label' => 'PIC Legal Email'],
            ['name' => 'legal_notes', 'type' => 'textarea', 'label' => 'Catatan Legal'],
        ],
    ],
    'biaya_termin' => [
        'label' => 'Biaya & Termin',
        'stage' => 'accounting',
        'permission' => 'loos.accounting_edit',
        'fields' => [
            ['name' => 'monthly_rent', 'type' => 'number', 'label' => 'Sewa Bulanan (Rp)', 'step' => 1],
            ['name' => 'service_charge', 'type' => 'number', 'label' => 'Service Charge (Rp)', 'step' => 1],
            ['name' => 'promotion_fund', 'type' => 'number', 'label' => 'Dana Promosi (Rp)', 'step' => 1],
            ['name' => 'security_deposit', 'type' => 'number', 'label' => 'Deposit Jaminan (bulan)', 'step' => 0.01],
            ['name' => 'fitout_dp_pct', 'type' => 'number', 'label' => 'DP Fitout (%)', 'step' => 0.01],
            ['name' => 'fitout_dp_amount', 'type' => 'number', 'label' => 'Nominal DP Fitout (Rp)', 'step' => 1],
            ['name' => 'area_sqm_loo', 'type' => 'number', 'label' => 'Luas per LOO (m²)', 'step' => 0.01],
            ['name' => 'rent_per_sqm', 'type' => 'number', 'label' => 'Harga per m² (Rp)', 'step' => 1],
            ['name' => 'contract_start_date', 'type' => 'date', 'label' => 'Tgl Mulai Kontrak'],
            ['name' => 'contract_end_date', 'type' => 'date', 'label' => 'Tgl Akhir Kontrak'],
            ['name' => 'accounting_notes', 'type' => 'textarea', 'label' => 'Catatan Accounting'],
            // termin auto-generated
        ],
    ],
    'manajemen_tenant' => [
        'label' => 'Manajemen Tenant',
        'stage' => 'tenant_mgmt',
        'permission' => 'loos.tenant_mgmt_edit',
        'fields' => [
            ['name' => 'brand_name', 'type' => 'text', 'label' => 'Nama Brand'],
            ['name' => 'trade_name', 'type' => 'text', 'label' => 'Nama Perusahaan'],
            ['name' => 'tenant_category_id', 'type' => 'select', 'label' => 'Kategori Tenant', 'source' => 'tenantCategories'],
            ['name' => 'business_category', 'type' => 'text', 'label' => 'Kategori Bisnis'],
            ['name' => 'product_categories', 'type' => 'multiselect', 'label' => 'Kategori Produk', 'source' => 'productCategories'],
            ['name' => 'unit_id', 'type' => 'searchable_select', 'label' => 'Unit', 'source' => 'units'],
            ['name' => 'opening_target_date', 'type' => 'date', 'label' => 'Target Opening'],
            ['name' => 'contact_person_name', 'type' => 'text', 'label' => 'Contact Person Nama'],
            ['name' => 'contact_person_phone', 'type' => 'text', 'label' => 'Contact Person Telp'],
            ['name' => 'contact_person_email', 'type' => 'email', 'label' => 'Contact Person Email'],
            ['name' => 'emergency_contact_name', 'type' => 'text', 'label' => 'Emergency Contact Nama'],
            ['name' => 'emergency_contact_phone', 'type' => 'text', 'label' => 'Emergency Contact Telp'],
            ['name' => 'operating_hours_start', 'type' => 'time', 'label' => 'Jam Operasional Mulai'],
            ['name' => 'operating_hours_end', 'type' => 'time', 'label' => 'Jam Operasional Selesai'],
            ['name' => 'tenant_mgmt_notes', 'type' => 'textarea', 'label' => 'Catatan Tenant Mgmt'],
        ],
    ],
    'fitout_checklist_pre' => [
        'label' => 'Checklist Sebelum Fitout',
        'stage' => 'ba_handover',
        'permission' => 'loos.tenant_mgmt_edit',
        'fields' => $fitoutChecklistPreFields,
    ],
    'fitout_checklist_post' => [
        'label' => 'Checklist Setelah Fitout',
        'stage' => 'fitout',
        'permission' => 'loos.tenant_mgmt_edit',
        'fields' => $fitoutChecklistFields,
    ],
    'pre_handover' => [
        'label' => 'Pengukuran Ulang',
        'stage' => 'pre_handover',
        'permission' => 'loos.tenant_mgmt_edit',
        'fields' => [
            ['name' => 'ba_pengukuran_ulang_path', 'type' => 'file', 'label' => 'Berita Acara Pengukuran Ulang', 'accept' => '.pdf', 'max_kb' => 10240, 'required' => true],
            ['name' => 'ba_serah_terima_ruangan_path', 'type' => 'file', 'label' => 'Berita Acara Serah Terima Ruangan', 'accept' => '.pdf', 'max_kb' => 10240, 'required' => true, 'depends_on' => 'ba_pengukuran_ulang_path'],
        ],
    ],
];

// Section deprecated (tidak tampil di form LOO, digantikan hub checklist):
// pre_fitout, measurement, ba_handover.
