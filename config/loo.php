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
];
