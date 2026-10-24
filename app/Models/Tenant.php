<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Tenant extends Model
{
    protected $fillable = [
        'branch_id',
        'name',
        'legal_entity_name',
        'npwp_number',
        'siup_number',
        'pic_name',
        'pic_position',
        'pic_phone',
        'company_phone',
        'company_email',
        'company_address',
        'logo_path',
        'tenant_category_id',
        'product_category_id',
        'is_active',
        'created_by',

        // Sumber LOO — null = tenant legacy, bukan dibuat dari LOO
        'loo_id',
        'trade_name',
        'entity_type',
        'nib',

        // Deskripsi & Lokasi Fisik
        'description',
        'floor_map',
        'location_map',
        'ownership_status',
        'owner_name',
        'owner_address',
        'owner_phone',
        'owner_fax',
        'owner_email',

        // PIC FitOut
        'fitout_pic_name',
        'fitout_pic_phone',
        'fitout_pic_email',

        // PIC Legal
        'legal_pic_name',
        'legal_pic_phone',
        'legal_pic_email',

        // PIC Accounting
        'accounting_pic_name',
        'accounting_pic_phone',
        'accounting_pic_email',

        // SIUP (lanjutan)
        'siup_expired_date',
        'siup_file_path',

        // TDP
        'tdp_number',
        'tdp_expired_date',
        'tdp_file_path',

        // NPWP & KTP
        'npwp_file_path',
        'ktp_number',
        'ktp_file_path',
        'ktp_badan_hukum_file_path',

        // NIB
        'nib_file_path',

        // Akte Pendirian
        'akta_number',
        'akta_date',
        'akta_kemenkeh_number',
        'notaris_name',
        'akta_file_path',
        'akta_perubahan_file_path',
        'power_of_attorney_file_path',

        // Domisili
        'domisili_number',
        'domisili_expired_date',
        'domisili_file_path',

        // Dokumen Tambahan
        'fitout_drawing_file_path',
        'bapur_file_path',
    ];

    protected $appends = ['logo_url'];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'siup_expired_date' => 'date',
            'tdp_expired_date' => 'date',
            'akta_date' => 'date',
            'domisili_expired_date' => 'date',
        ];
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function getLogoUrlAttribute(): ?string
    {
        return $this->logo_path ? Storage::url($this->logo_path) : null;
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
     * Template checklist relevan via product_category_id.
     * ponytail: query helper, bukan Relation — jangan pakai with().
     */
    public function checklistTemplates()
    {
        return ChecklistTemplate::whereHas('productCategories', function ($query) {
            $query->where('product_categories.id', $this->product_category_id);
        })->where('is_active', true)->get();
    }

    public function permitRequests()
    {
        return $this->hasMany(PermitRequest::class);
    }

    public function loo()
    {
        return $this->belongsTo(Loo::class);
    }

    /**
     * Tenant yang dibuat dari LOO punya data master terkunci — hanya PIC/contact
     * yang boleh diedit. Tenant legacy (loo_id null) tetap full CRUD.
     */
    public function isLooBacked(): bool
    {
        return $this->loo_id !== null;
    }

    /**
     * Field yang boleh diedit manual untuk tenant LOO-backed. Semua field lain
     * diisi dari LOO section saat LOO `completed` dan jadi read-only di master.
     */
    public function editableFields(): array
    {
        return [
            'pic_name',
            'pic_position',
            'pic_phone',
            'company_phone',
            'company_email',
            'company_address',
            'is_active',
            'logo',
        ];
    }
}
