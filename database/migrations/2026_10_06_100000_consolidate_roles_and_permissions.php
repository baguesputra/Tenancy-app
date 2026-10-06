<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    private const RENAMES = [
        'marketing_staff' => 'marketing',
        'legal_staff' => 'legal',
        'tenant_mgmt_staff' => 'tenant_mgmt',
        'accounting_staff' => 'accounting',
    ];

    private const MERGES = [
        'marketing_loo_input' => 'marketing',
        'legal_manager' => 'legal',
        'tenant_mgmt_manager' => 'tenant_mgmt',
        'accounting_manager' => 'accounting',
    ];

    private const DEAD_PERMISSIONS = ['tenants.create', 'tenancies.create'];

    public function up(): void
    {
        foreach (self::RENAMES as $from => $to) {
            $fromId = DB::table('roles')->where('name', $from)->value('id');
            if (! $fromId) {
                continue;
            }
            if (! DB::table('roles')->where('name', $to)->exists()) {
                DB::table('roles')->where('id', $fromId)->update(['name' => $to]);
            } else {
                $this->moveAssignments($fromId, DB::table('roles')->where('name', $to)->value('id'));
                $this->deleteRole($fromId);
            }
        }

        foreach (self::MERGES as $from => $to) {
            $fromId = DB::table('roles')->where('name', $from)->value('id');
            if (! $fromId) {
                continue;
            }
            $toId = DB::table('roles')->where('name', $to)->value('id');
            if (! $toId) {
                $toId = DB::table('roles')->insertGetId([
                    'name' => $to,
                    'guard_name' => 'web',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->moveAssignments($fromId, $toId);
            $this->deleteRole($fromId);
        }

        DB::table('permissions')->whereIn('name', self::DEAD_PERMISSIONS)->delete();

        // Jalankan PermissionSeeder setelah migrate untuk sinkron set permission baru.
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        foreach (self::RENAMES as $from => $to) {
            $toId = DB::table('roles')->where('name', $to)->value('id');
            if ($toId && ! DB::table('roles')->where('name', $from)->exists()) {
                DB::table('roles')->where('id', $toId)->update(['name' => $from]);
            }
        }

        foreach (self::MERGES as $from => $to) {
            if (! DB::table('roles')->where('name', $from)->exists()) {
                DB::table('roles')->insert([
                    'name' => $from,
                    'guard_name' => 'web',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        foreach (self::DEAD_PERMISSIONS as $name) {
            if (! DB::table('permissions')->where('name', $name)->exists()) {
                DB::table('permissions')->insert([
                    'name' => $name,
                    'guard_name' => 'web',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function moveAssignments(int $fromId, int $toId): void
    {
        $existing = DB::table('model_has_roles')
            ->where('role_id', $toId)
            ->get(['model_type', 'model_id'])
            ->map(fn ($r) => $r->model_type.'|'.$r->model_id)
            ->all();

        foreach (DB::table('model_has_roles')->where('role_id', $fromId)->get() as $row) {
            if (in_array($row->model_type.'|'.$row->model_id, $existing, true)) {
                DB::table('model_has_roles')
                    ->where('role_id', $fromId)
                    ->where('model_type', $row->model_type)
                    ->where('model_id', $row->model_id)
                    ->delete();
            } else {
                DB::table('model_has_roles')
                    ->where('role_id', $fromId)
                    ->where('model_type', $row->model_type)
                    ->where('model_id', $row->model_id)
                    ->update(['role_id' => $toId]);
            }
        }

        $targetScopes = DB::table('master_scopes')
            ->where('role_id', $toId)
            ->get(['tenant_category_id'])
            ->map(fn ($r) => $r->tenant_category_id ?? 'null')
            ->all();

        foreach (DB::table('master_scopes')->where('role_id', $fromId)->get() as $row) {
            $key = $row->tenant_category_id ?? 'null';
            if (in_array($key, $targetScopes, true)) {
                DB::table('master_scopes')->where('id', $row->id)->delete();
            } else {
                DB::table('master_scopes')->where('id', $row->id)->update(['role_id' => $toId]);
            }
        }
    }

    private function deleteRole(int $id): void
    {
        DB::table('roles')->where('id', $id)->delete();
    }
};
