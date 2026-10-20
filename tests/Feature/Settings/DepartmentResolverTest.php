<?php

namespace Tests\Feature\Settings;

use App\Models\Branch;
use App\Models\Department;
use App\Services\DepartmentResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartmentResolverTest extends TestCase
{
    use RefreshDatabase;

    public function test_resolve_per_cabang_dan_fallback_lokal(): void
    {
        $bjm = Branch::create(['code' => 'BJM', 'name' => 'Banjarmasin', 'gate_id' => 'comp-1']);
        $smd = Branch::create(['code' => 'SMD', 'name' => 'Samarinda', 'gate_id' => 'comp-2']);
        $gateBjm = Department::create(['name' => 'Tenancy', 'gate_id' => 'g-bjm', 'company_gate_id' => 'comp-1']);
        $gateSmd = Department::create(['name' => 'Tenancy', 'gate_id' => 'g-smd', 'company_gate_id' => 'comp-2']);
        $security = Department::create(['name' => 'Security']);

        $resolver = app(DepartmentResolver::class);

        $this->assertSame($gateBjm->id, $resolver->id('tenancy', $bjm->id));
        $this->assertSame($gateSmd->id, $resolver->id('tenancy', $smd->id));
        $this->assertSame($security->id, $resolver->id('security', $bjm->id));
        $this->assertNull($resolver->id('marketing', $bjm->id));
    }

    public function test_kandidat_global_hanya_dipakai_bila_tunggal(): void
    {
        $gate = Department::create(['name' => 'Marketing', 'gate_id' => 'g-1', 'company_gate_id' => 'comp-1']);

        $this->assertSame($gate->id, app(DepartmentResolver::class)->id('marketing'));

        Department::create(['name' => 'Marketing', 'gate_id' => 'g-2', 'company_gate_id' => 'comp-2']);

        $this->assertNull(app(DepartmentResolver::class)->id('marketing'));
    }
}
