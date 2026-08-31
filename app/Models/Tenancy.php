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