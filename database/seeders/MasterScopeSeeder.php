<?php

namespace Database\Seeders;

use App\Models\MasterScope;
use App\Models\TenantCategory;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class MasterScopeSeeder extends Seeder
{
    public function run(): void
    {
        $marketing = Role::firstOrCreate(['name' => 'marketing_staff']);
        $tenancy = Role::firstOrCreate(['name' => 'tenancy_staff']);
        $oc = TenantCategory::where('name', 'Open Counter')->first();
        if (! $oc) {
            return;
        }

        MasterScope::updateOrCreate(
            ['role_id' => $marketing->id, 'tenant_category_id' => $oc->id],
            ['mode' => 'include', 'can_view' => true, 'view_own_only' => false, 'can_create' => true, 'can_edit' => true, 'edit_own_only' => true]
        );

        MasterScope::updateOrCreate(
            ['role_id' => $tenancy->id, 'tenant_category_id' => $oc->id],
            ['mode' => 'exclude', 'can_view' => true, 'view_own_only' => false, 'can_create' => true, 'can_edit' => true, 'edit_own_only' => false]
        );
    }
}
