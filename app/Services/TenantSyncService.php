<?php

namespace App\Services;

use App\Models\Loo;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use Illuminate\Support\Facades\DB;

/**
 * Saat LOO masuk status `completed`, semua section sudah terisi dan disubmit.
 * Service ini materialize hasil itu jadi Tenant + Tenancy di master data.
 *
 * Idempoten: dipanggil ulang tidak menggandakan baris (cek `loo_id` dulu).
 */
class TenantSyncService
{
    public function sync(Loo $loo): array
    {
        return DB::transaction(function () use ($loo) {
            $tenant = $this->syncTenant($loo);
            $tenancy = $this->syncTenancy($loo, $tenant);

            return [$tenant, $tenancy];
        });
    }

    private function syncTenant(Loo $loo): Tenant
    {
        $sections = $this->sections($loo);
        $legal = $sections['legalitas'] ?? [];
        $mgmt = $sections['manajemen_tenant'] ?? [];
        $fitout = $sections['pre_fitout'] ?? [];

        $attributes = [
            'loo_id' => $loo->id,
            'branch_id' => $loo->branch_id,
            'name' => $mgmt['brand_name'] ?? $loo->prospective_tenant_name ?? 'Tenant LOO-'.$loo->loo_number,
            'legal_entity_name' => $legal['entity_name'] ?? null,
            'entity_type' => $legal['entity_type'] ?? null,
            'npwp_number' => $legal['npwp'] ?? null,
            'siup_number' => $legal['siup'] ?? null,
            'nib' => $legal['nib'] ?? null,
            'tdp_number' => $legal['tdp'] ?? null,
            'akta_number' => $legal['sk_pendirian'] ?? null,
            'akta_date' => $legal['tgl_sk_pendirian'] ?? null,
            'notaris_name' => $legal['notaris_pendirian'] ?? null,
            'ktp_number' => $legal['authorized_signatory_ktp'] ?? null,
            'legal_pic_name' => $legal['pic_legal_name'] ?? null,
            'legal_pic_phone' => $legal['pic_legal_phone'] ?? null,
            'legal_pic_email' => $legal['pic_legal_email'] ?? null,
            'fitout_pic_name' => $fitout['contractor_pic_name'] ?? null,
            'fitout_pic_phone' => $fitout['contractor_pic_phone'] ?? null,
            'description' => $mgmt['tenant_mgmt_notes'] ?? null,
            'floor_map' => $mgmt['floor_preference'] ?? null,
            'location_map' => $mgmt['zone_preference'] ?? null,
            'fitout_drawing_file_path' => $fitout['design_drawing_path'] ?? null,
            'tenant_category_id' => $loo->tenant_category_id,
            'product_category_id' => $this->firstProductCategory($mgmt) ?? $this->fallbackProductCategory($loo->branch_id),
            'is_active' => true,
            'created_by' => $loo->marketing_id,
        ];

        $tenant = Tenant::where('loo_id', $loo->id)->first();

        if ($tenant) {
            $tenant->fill($attributes)->save();
        } else {
            $tenant = Tenant::create($attributes);
            $this->syncContacts($tenant, $mgmt);
        }

        return $tenant->fresh();
    }

    private function syncTenancy(Loo $loo, Tenant $tenant): ?Tenancy
    {
        if (! $loo->unit_id) {
            return null;
        }

        $sections = $this->sections($loo);
        $acct = $sections['biaya_termin'] ?? [];
        $ba = $sections['ba_handover'] ?? [];

        $existing = Tenancy::where('tenant_id', $tenant->id)
            ->where('unit_id', $loo->unit_id)
            ->whereNull('end_date')
            ->first();

        $attributes = [
            'unit_id' => $loo->unit_id,
            'tenant_id' => $tenant->id,
            'contract_number' => $loo->loo_number,
            'start_date' => $acct['contract_start_date'] ?? now()->toDateString(),
            'end_date' => $acct['contract_end_date'] ?? null,
            'signed_date' => $ba['handover_date'] ?? null,
            'status' => 'active',
            'rent_value' => $acct['monthly_rent'] ?? null,
            'service_charge' => $acct['service_charge'] ?? null,
            'total_area_sqm' => $acct['area_sqm_loo'] ?? null,
            'rent_per_sqm_indoor' => $acct['rent_per_sqm'] ?? null,
            'down_payment_percent' => $acct['fitout_dp_pct'] ?? null,
            'deposit_value' => $this->depositValue($acct),
            'sp_date' => $ba['handover_date'] ?? null,
            'sp_number' => $loo->loo_number,
        ];

        if ($existing) {
            $existing->fill($attributes)->save();
        } else {
            $existing = Tenancy::create($attributes);
        }

        // Aturan bisnis inti: 1 unit hanya boleh punya 1 tenancy aktif.
        Tenancy::where('unit_id', $loo->unit_id)
            ->where('id', '!=', $existing->id)
            ->where('status', 'active')
            ->update(['status' => 'ended', 'end_date' => now()]);

        return $existing->fresh();
    }

    private function sections(Loo $loo): array
    {
        return $loo->sections()
            ->where('is_submitted', true)
            ->get()
            ->mapWithKeys(fn ($s) => [$s->section_key => $s->data ?? []])
            ->all();
    }

    private function firstProductCategory(array $mgmt): ?int
    {
        $ids = collect($mgmt['product_categories'] ?? [])
            ->filter(fn ($v) => is_numeric($v))
            ->map(fn ($v) => (int) $v)
            ->values();

        return $ids->first();
    }

    private function fallbackProductCategory(int $branchId): ?int
    {
        return ProductCategory::query()->orderBy('id')->value('id');
    }

    private function depositValue(array $acct): ?float
    {
        $rent = (float) ($acct['monthly_rent'] ?? 0);
        $months = (float) ($acct['security_deposit'] ?? 0);

        return $rent > 0 && $months > 0 ? round($rent * $months, 2) : null;
    }

    private function syncContacts(Tenant $tenant, array $mgmt): void
    {
        $contact = trim(($mgmt['contact_person_name'] ?? '').' '.($mgmt['contact_person_phone'] ?? ''));

        if ($contact !== '' && $mgmt['contact_person_name']) {
            $tenant->contacts()->updateOrCreate(
                ['type' => 'operasional'],
                [
                    'name' => $mgmt['contact_person_name'],
                    'phone' => $mgmt['contact_person_phone'] ?? null,
                    'email' => $mgmt['contact_person_email'] ?? null,
                    'position' => 'Contact Person',
                ]
            );
        }

        $emergency = $mgmt['emergency_contact_name'] ?? null;
        if ($emergency) {
            $tenant->contacts()->updateOrCreate(
                ['type' => 'darurat'],
                [
                    'name' => $emergency,
                    'phone' => $mgmt['emergency_contact_phone'] ?? null,
                ]
            );
        }
    }
}
