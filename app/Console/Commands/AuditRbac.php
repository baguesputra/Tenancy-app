<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AuditRbac extends Command
{
    protected $signature = 'app:audit-rbac';
    protected $description = 'Cek integritas role, permission, dan user';

    public function handle()
    {
        $this->info('=== Audit RBAC ===');

        // 1. Role tanpa permission sama sekali (kecuali staff & super_admin yang memang sengaja kosong/bypass)
        $this->line('');
        $this->info('1. Role dengan 0 permission:');
        Role::whereDoesntHave('permissions')->get()->each(function ($role) {
            $flag = in_array($role->name, ['staff', 'super_admin']) ? '(expected)' : '⚠ CEK INI';
            $this->line("  - {$role->name} {$flag}");
        });

        // 2. User tanpa role sama sekali
        $this->line('');
        $this->info('2. User tanpa role:');
        $noRole = User::doesntHave('roles')->get();
        if ($noRole->isEmpty()) {
            $this->line('  Semua user punya role ✓');
        } else {
            $noRole->each(fn ($u) => $this->line("  ⚠ {$u->employee_number} — {$u->name}"));
        }

        // 3. User department-role mismatch (misal role tenancy_staff tapi department bukan Tenancy)
        $this->line('');
        $this->info('3. Kemungkinan mismatch role vs department:');
        $expectedDept = [
            'tenancy_staff' => 'Tenancy',
            'bs_staff' => 'Building Service',
            'security_staff' => 'Security',
            'engineering_staff' => 'Engineering',
        ];
        User::with(['roles', 'department'])->get()->each(function ($user) use ($expectedDept) {
            $role = $user->roles->first()?->name;
            if (isset($expectedDept[$role]) && $user->department?->name !== $expectedDept[$role]) {
                $this->line("  ⚠ {$user->employee_number} — role '{$role}' tapi department: " . ($user->department?->name ?? 'kosong'));
            }
        });

        // 4. Permission yang tidak dipakai role manapun
        $this->line('');
        $this->info('4. Permission yang tidak di-assign ke role manapun:');
        $unused = Permission::whereDoesntHave('roles')->get();
        if ($unused->isEmpty()) {
            $this->line('  Semua permission terpakai ✓');
        } else {
            $unused->each(fn ($p) => $this->line("  ⚠ {$p->name}"));
        }

        // 5. Route `can:` tanpa permission terdaftar di DB (typo/gagal seed)
        $this->line('');
        $this->info('5. Route can: tanpa permission terdaftar:');
        $routeFile = file_get_contents(base_path('routes/web.php'));
        preg_match_all("/can:([a-z_0-9.]+)/", $routeFile, $m);
        $routePerms = array_unique($m[1] ?? []);
        $registered = Permission::pluck('name')->all();
        // super_admin bypass total via Gate::before — bukan permission.
        $missing = array_diff($routePerms, $registered, ['super_admin']);
        if ($missing === []) {
            $this->line('  Semua can: route terdaftar ✓');
        } else {
            foreach ($missing as $name) {
                $this->line("  ⚠ {$name}");
            }
        }

        // 6. Frontend can('...') tanpa permission terdaftar (tombol tak pernah tampil)
        $this->line('');
        $this->info('6. Frontend can() tanpa permission terdaftar:');
        $jsPerms = [];
        foreach (glob(resource_path('js/**/*.jsx')) ?: [] as $file) {
            $src = file_get_contents($file);
            if (preg_match_all("/can\(['\"]([a-z_0-9.]+)['\"]\)/", $src, $mm)) {
                $jsPerms = array_merge($jsPerms, $mm[1]);
            }
        }
        $jsPerms = array_unique($jsPerms);
        $missingJs = array_diff($jsPerms, $registered);
        if ($missingJs === []) {
            $this->line('  Semua can() frontend terdaftar ✓');
        } else {
            foreach ($missingJs as $name) {
                $this->line("  ⚠ {$name}");
            }
        }

        $this->line('');
        $this->info('Audit selesai.');
    }
}