<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenancy extends Model
{
    protected $table = 'tenancies';

    protected $fillable = [
        'unit_id', 'tenant_id', 'contract_number', 'contract_document_path',
        'start_date', 'end_date', 'signed_date', 'status',
        'rent_value', 'rent_period', 'service_charge', 'deposit_value', 'payment_term',
        'percentage_rent_rate', 'percentage_rent_breakpoint', 'notes',

        // Luas & Harga
        'total_area_sqm',
        'rent_per_sqm_indoor',
        'area_sqm_indoor',
        'rent_per_sqm_outdoor',
        'area_sqm_outdoor',

        // Revenue Sharing
        'revenue_sharing',
        'non_revenue_sharing',

        // Down Payment & Cicilan
        'down_payment_percent',
        'down_payment_installment_count',
        'installment_count',
        'remaining_payment',

        // Arsip
        'archive_location',

        // Surat Peringatan (SP)
        'sp_date',
        'sp_number',
        'sp_count',
        'sp_department',
        'sp_action',
        'sp_file_path',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'signed_date' => 'date',
            'rent_value' => 'decimal:2',
            'service_charge' => 'decimal:2',
            'deposit_value' => 'decimal:2',
            'percentage_rent_rate' => 'decimal:2',
            'percentage_rent_breakpoint' => 'decimal:2',
            'total_area_sqm' => 'decimal:2',
            'rent_per_sqm_indoor' => 'decimal:2',
            'area_sqm_indoor' => 'decimal:2',
            'rent_per_sqm_outdoor' => 'decimal:2',
            'area_sqm_outdoor' => 'decimal:2',
            'down_payment_percent' => 'decimal:2',
            'remaining_payment' => 'decimal:2',
            'sp_date' => 'date',
            'revenue_sharing' => 'boolean',
            'non_revenue_sharing' => 'boolean',
        ];
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}