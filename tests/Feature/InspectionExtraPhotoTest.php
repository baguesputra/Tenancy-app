<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\ChecklistTemplate;
use App\Models\InspectionExtraPhoto;
use App\Models\InspectionSession;
use App\Models\ProductCategory;
use App\Models\Tenancy;
use App\Models\Tenant;
use App\Models\TenantCategory;
use App\Models\Unit;
use App\Models\User;
use App\Services\InspectionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class InspectionExtraPhotoTest extends TestCase
{
    use RefreshDatabase;

    private function makeStaff(Branch $branch): User
    {
        foreach (['sidak.view', 'sidak.create'] as $p) {
            Permission::firstOrCreate(['name' => $p]);
        }
        $role = Role::firstOrCreate(['name' => 'inspector']);
        $role->syncPermissions(['sidak.view', 'sidak.create']);

        return tap(User::create([
            'name' => 'Inspector',
            'email' => 'insp@t.id',
            'employee_number' => 'INSP-1',
            'branch_id' => $branch->id,
            'password' => bcrypt('x'),
        ]), fn ($u) => $u->assignRole('inspector'));
    }

    private function makeInspection(Branch $branch, User $staff): \App\Models\Inspection
    {
        $tc = TenantCategory::create(['name' => 'Ritel']);
        $pc = ProductCategory::create(['name' => 'F&B']);
        $unit = Unit::create([
            'branch_id' => $branch->id, 'floor' => 'GF',
            'unit_number' => '01', 'unit_code' => 'GF-01', 'is_active' => true,
        ]);
        $tenant = Tenant::create([
            'name' => 'Toko Foto', 'branch_id' => $branch->id,
            'tenant_category_id' => $tc->id, 'product_category_id' => $pc->id,
            'is_active' => true,
        ]);
        Tenancy::create([
            'unit_id' => $unit->id, 'tenant_id' => $tenant->id,
            'status' => 'active', 'start_date' => now()->toDateString(),
        ]);
        $template = ChecklistTemplate::create(['name' => 'F&B Std', 'is_active' => true]);
        $template->productCategories()->attach($pc->id);

        $session = InspectionSession::create([
            'branch_id' => $branch->id, 'user_id' => $staff->id,
            'started_at' => now(), 'status' => 'in_progress',
        ]);

        return app(InspectionService::class)->addInspection($session, $tenant);
    }

    public function test_store_extra_photo_with_description(): void
    {
        Storage::fake('public');
        $branch = Branch::create(['name' => 'Cabang Foto', 'code' => 'FTO']);
        $staff = $this->makeStaff($branch);
        $inspection = $this->makeInspection($branch, $staff);

        $res = $this->actingAs($staff)->postJson("/inspections/{$inspection->id}/extra-photos", [
            'photo' => UploadedFile::fake()->image('temuan.jpg'),
            'description' => 'Keramik pecah dekat pintu',
        ]);

        $res->assertOk()->assertJsonPath('photo.description', 'Keramik pecah dekat pintu');
        $this->assertDatabaseHas('inspection_extra_photos', [
            'inspection_id' => $inspection->id,
            'description' => 'Keramik pecah dekat pintu',
        ]);
    }

    public function test_store_extra_photo_rejects_non_image(): void
    {
        $branch = Branch::create(['name' => 'Cabang Foto', 'code' => 'FTO']);
        $staff = $this->makeStaff($branch);
        $inspection = $this->makeInspection($branch, $staff);

        $this->actingAs($staff)->postJson("/inspections/{$inspection->id}/extra-photos", [
            'photo' => UploadedFile::fake()->create('dokumen.pdf', 100, 'application/pdf'),
        ])->assertStatus(422);

        $this->assertSame(0, InspectionExtraPhoto::count());
    }

    public function test_destroy_extra_photo_while_in_progress(): void
    {
        Storage::fake('public');
        $branch = Branch::create(['name' => 'Cabang Foto', 'code' => 'FTO']);
        $staff = $this->makeStaff($branch);
        $inspection = $this->makeInspection($branch, $staff);

        $res = $this->actingAs($staff)->postJson("/inspections/{$inspection->id}/extra-photos", [
            'photo' => UploadedFile::fake()->image('temuan.jpg'),
        ]);
        $photo = InspectionExtraPhoto::first();

        $this->actingAs($staff)->deleteJson("/inspection-extra-photos/{$photo->id}")
            ->assertOk()->assertJson(['deleted' => true]);
        $this->assertSame(0, InspectionExtraPhoto::count());
        Storage::disk('public')->assertMissing($photo->path);
    }

    public function test_destroy_extra_photo_rejected_when_completed(): void
    {
        Storage::fake('public');
        $branch = Branch::create(['name' => 'Cabang Foto', 'code' => 'FTO']);
        $staff = $this->makeStaff($branch);
        $inspection = $this->makeInspection($branch, $staff);

        $this->actingAs($staff)->postJson("/inspections/{$inspection->id}/extra-photos", [
            'photo' => UploadedFile::fake()->image('temuan.jpg'),
        ]);
        $photo = InspectionExtraPhoto::first();

        app(InspectionService::class)->markCompleted($inspection);

        // Sesi ikut selesai → hapus ditolak
        $inspection->session->update(['status' => 'completed']);
        $this->actingAs($staff)->deleteJson("/inspection-extra-photos/{$photo->id}")
            ->assertStatus(422);
        $this->assertSame(1, InspectionExtraPhoto::count());
    }

    public function test_show_includes_extra_photos(): void
    {
        $branch = Branch::create(['name' => 'Cabang Foto', 'code' => 'FTO']);
        $staff = $this->makeStaff($branch);
        $inspection = $this->makeInspection($branch, $staff);
        $inspection->extraPhotos()->create([
            'path' => 'inspection-photos/x.jpg',
            'description' => 'Catatan foto',
        ]);

        $res = $this->actingAs($staff)->get("/inspections/{$inspection->id}");
        $res->assertOk();
        $photos = $res->viewData('page')['props']['extraPhotos'];
        $this->assertCount(1, $photos);
        $this->assertSame('Catatan foto', $photos[0]['description']);
    }
}
