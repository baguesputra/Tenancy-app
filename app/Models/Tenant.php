<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tenant extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'legal_entity_name',
        'npwp_number',
        'siup_number',
        'company_phone',
        'company_email',
        'company_address',
        'tenant_category_id',
        'product_category_id',
        'is_active',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function tenantCategory()
    {
        return $this->belongsTo(TenantCategory::class);
    }

    public function productCategory()
    {
        return $this->belongsTo(ProductCategory::class);
    }

    public function contacts()
    {
        return $this->hasMany(TenantContact::class);
    }

    public function tenancies()
    {
        return $this->hasMany(Tenancy::class);
    }

    public function activeTenancy()
    {
        return $this->hasOne(Tenancy::class)->where('status', 'active');
    }

    public function inspections()
    {
        return $this->hasMany(Inspection::class);
    }

    /**
     * Template checklist yang relevan, sekarang dicocokkan lewat product_category_id
     * (menggantikan business_type string yang lama).
     */
    public function checklistTemplates()
    {
        return ChecklistTemplate::whereHas('productCategories', function ($query) {
            $query->where('product_categories.id', $this->product_category_id);
        })->where('is_active', true)->get();
    }

    public function tenantUser()
    {
        return $this->hasOne(TenantUser::class);
    }

    public function permitRequests()
    {
        return $this->hasMany(PermitRequest::class);
    }
}