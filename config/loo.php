<?php

return [
    'transitions' => [
        'draft' => ['legal_review', 'cancelled'],
        'legal_review' => ['accounting_review', 'draft', 'cancelled'],
        'accounting_review' => ['tenant_mgmt_review', 'legal_review', 'cancelled'],
        'tenant_mgmt_review' => ['measurement', 'accounting_review', 'cancelled'],
        'measurement' => ['ba_handover', 'tenant_mgmt_review', 'cancelled'],
        'ba_handover' => ['fitout', 'measurement', 'cancelled'],
        'fitout' => ['pre_handover', 'ba_handover', 'cancelled'],
        'pre_handover' => ['completed', 'fitout', 'cancelled'],
        'completed' => [],
        'cancelled' => [],
    ],

    // Otoritas transisi: hanya divisi pemegang status saat ini yang boleh
    // maju/mundur dari status itu. Forward juga wajib section sudah disubmit.
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
