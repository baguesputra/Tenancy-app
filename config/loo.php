<?php

return [
    /*
     * Pipeline fase LOO. Urutan array ini = urutan gating: fase hanya bisa
     * diisi kalau seluruh fase sebelumnya sudah selesai. Status LOO
     * (`loos.status`) dihitung dari posisi di pipeline ini, bukan dari
     * klik tombol.
     *
     * `requires_approval` menandakan fase baru dianggap selesai setelah
     * di-approve Deputy GM (dipakai fase terakhir).
     */
    'pipeline' => [
        'pengisian_divisi' => [
            'label' => 'Pengisian Divisi',
            'sections' => ['legalitas', 'biaya_termin', 'manajemen_tenant'],
        ],
        'pengukuran_ulang' => [
            'label' => 'Pengukuran Ulang',
            'sections' => ['pre_handover'],
        ],
        'sebelum_fitout' => [
            'label' => 'Sebelum Fitout',
            'sections' => ['fitout_checklist_pre'],
        ],
        'setelah_fitout' => [
            'label' => 'Setelah Fitout',
            'sections' => ['fitout_checklist_post'],
            'requires_approval' => true,
        ],
    ],

    /*
     * Kebijakan tampilan untuk role divisi tenant (Tenancy & Tenant Mgmt):
     * mereka mengisi Manajemen Tenant, tidak mengisi Legal/Accounting.
     * Section `hidden_sections` disembunyikan dari mereka, sedangkan sebagian
     * field `readonly_sections` tetap boleh DILIHAT (read-only) tanpa bisa
     * diubah — mis. data badan hukum untuk keperluan kelengkapan tenant.
     */
    'tenant_view' => [
        'roles' => ['tenancy_staff', 'tenant_mgmt'],
        'hidden_sections' => ['biaya_termin'],
        'readonly_sections' => [
            'legalitas' => ['entity_name', 'entity_type', 'npwp', 'nib'],
        ],
    ],
];