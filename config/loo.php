<?php

return [
    'transitions' => [
        'draft' => ['legal_review', 'cancelled'],
        'legal_review' => ['accounting_review', 'cancelled'],
        'accounting_review' => ['tenant_mgmt_review', 'cancelled'],
        'tenant_mgmt_review' => ['measurement', 'cancelled'],
        'measurement' => ['ba_handover', 'cancelled'],
        'ba_handover' => ['fitout', 'cancelled'],
        'fitout' => ['pre_handover', 'cancelled'],
        'pre_handover' => ['completed', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ],

    // Otoritas transisi: hanya divisi pemegang status saat ini yang boleh
    // maju dari status itu (tanpa alur mundur). Forward juga wajib section sudah disubmit.
    'transition_permission' => [
        'draft' => 'loos.create',
        'legal_review' => 'loos.legal_submit',
        'accounting_review' => 'loos.accounting_submit',
        'tenant_mgmt_review' => 'loos.tenant_mgmt_submit',
        'measurement' => 'loos.measurement_edit',
        'ba_handover' => 'loos.tenant_mgmt_edit',
        'fitout' => 'loos.fitout_approve',
        'pre_handover' => 'loos.fitout_approve',
    ],
];
