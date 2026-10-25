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
];