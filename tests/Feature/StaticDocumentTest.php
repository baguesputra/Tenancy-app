<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Department;
use App\Models\PermitRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StaticDocumentTest extends TestCase
{
    use RefreshDatabase;

    private function makeUser(array $permissions = ['permits.view']): User
    {
        foreach (array_unique([...$permissions, 'permits.view']) as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        $branch = Branch::firstOrCreate(['code' => 'TST'], ['name' => 'Cabang Test']);
        $dept = Department::firstOrCreate(['name' => 'Tenancy']);
        $user = User::create([
            'name' => 'Test User',
            'email' => 'test'.uniqid().'@t.id',
            'employee_number' => 'TST-'.uniqid(),
            'branch_id' => $branch->id,
            'department_id' => $dept->id,
            'password' => bcrypt('password'),
        ]);
        $role = Role::firstOrCreate(['name' => 'test_role_'.uniqid(), 'guard_name' => 'web']);
        $role->syncPermissions(array_unique([...$permissions, 'permits.view']));
        $user->assignRole($role);

        return $user;
    }

    private function makePermit(User $user, array $activityTypes): PermitRequest
    {
        return PermitRequest::create([
            'permit_number' => 'TC/TST/'.uniqid(),
            'activity_types' => $activityTypes,
            'request_date' => now()->toDateString(),
            'branch_id' => $user->branch_id,
            'store_name_snapshot' => 'Test Tenant',
            'pic_name' => 'Risa',
            'pic_phone' => '0812',
            'worker_count' => 10,
            'requested_by_type' => User::class,
            'requested_by_id' => $user->id,
            'status' => 'pending',
            'barcode_token' => (string) Str::uuid(),
        ]);
    }

    public function test_peraturan_fallback_ke_pdf_bawaan_bila_belum_ada_upload(): void
    {
        $user = $this->makeUser();
        $permit = $this->makePermit($user, ['fit_out']);

        $this->actingAs($user)
            ->get("/permit-requests/{$permit->id}/peraturan-fitout")
            ->assertOk()
            ->assertHeader('content-type', 'application/pdf');
    }

    public function test_peraturan_ditolak_bila_bukan_fitout(): void
    {
        $user = $this->makeUser();
        $permit = $this->makePermit($user, ['lembur']);

        $this->actingAs($user)->get("/permit-requests/{$permit->id}/peraturan-fitout")->assertForbidden();
        $this->actingAs($user)->get("/permit-requests/{$permit->id}/tata-tertib-lembur")->assertOk();
    }

    public function test_file_branch_diprioritaskan_dari_file_semua_branch(): void
    {
        Storage::fake('local');
        $user = $this->makeUser();
        $permit = $this->makePermit($user, ['fit_out']);

        Storage::disk('local')->put('static-documents/all.docx', 'isi-all');
        Storage::disk('local')->put('static-documents/cabang.docx', 'isi-cabang');
        \App\Models\StaticDocument::create([
            'key' => 'peraturan-fitout', 'branch_id' => null,
            'file_path' => 'static-documents/all.docx', 'original_name' => 'all.docx', 'size' => 7,
            'uploaded_by' => $user->id,
        ]);
        \App\Models\StaticDocument::create([
            'key' => 'peraturan-fitout', 'branch_id' => $user->branch_id,
            'file_path' => 'static-documents/cabang.docx', 'original_name' => 'cabang.docx', 'size' => 10,
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)
            ->get("/permit-requests/{$permit->id}/peraturan-fitout")
            ->assertOk()
            ->assertDownload('cabang.docx');
    }

    public function test_halaman_show_menyertakan_format_file_upload(): void
    {
        Storage::fake('local');
        $user = $this->makeUser();
        $permit = $this->makePermit($user, ['fit_out', 'lembur']);

        $this->actingAs($user)->get("/permit-requests/{$permit->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('doc_files.peraturan-fitout', null)
                ->where('doc_files.tata-tertib-lembur', null));

        Storage::disk('local')->put('static-documents/aturan.docx', 'isi');
        \App\Models\StaticDocument::create([
            'key' => 'peraturan-fitout', 'branch_id' => null,
            'file_path' => 'static-documents/aturan.docx', 'original_name' => 'aturan.docx', 'size' => 3,
            'uploaded_by' => $user->id,
        ]);

        $this->actingAs($user)->get("/permit-requests/{$permit->id}")
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('doc_files.peraturan-fitout', 'DOCX')
                ->where('doc_files.tata-tertib-lembur', null));
    }

    public function test_kode_fitout_dan_penitipan_dijaga_jenis_kegiatan(): void
    {
        $user = $this->makeUser();
        $fitout = $this->makePermit($user, ['fit_out']);
        $barang = $this->makePermit($user, ['masuk_barang']);
        $lembur = $this->makePermit($user, ['lembur']);

        $this->actingAs($user)->get("/permit-requests/{$fitout->id}/kode-fitout")->assertOk();
        $this->actingAs($user)->get("/permit-requests/{$barang->id}/kode-fitout")->assertForbidden();

        $this->actingAs($user)->get("/permit-requests/{$fitout->id}/penitipan-barang")->assertOk();
        $this->actingAs($user)->get("/permit-requests/{$barang->id}/penitipan-barang")->assertOk();
        $this->actingAs($user)->get("/permit-requests/{$lembur->id}/penitipan-barang")->assertForbidden();
    }

    public function test_upload_butuh_izin_documents_manage_dan_menimpa_file_lama(): void
    {
        Storage::fake('local');
        $user = $this->makeUser(['documents.manage']);
        $tanpaIzin = $this->makeUser();

        $this->actingAs($tanpaIzin)->post('/settings/documents', [])->assertForbidden();

        $this->actingAs($user)->post('/settings/documents', [
            'key' => 'peraturan-fitout',
            'branch_id' => '',
            'file' => UploadedFile::fake()->create('aturan.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseCount('static_documents', 1);
        $first = \App\Models\StaticDocument::first()->file_path;
        $this->assertTrue(Storage::disk('local')->exists($first));

        $this->actingAs($user)->post('/settings/documents', [
            'key' => 'peraturan-fitout',
            'branch_id' => '',
            'file' => UploadedFile::fake()->create('aturan-baru.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseCount('static_documents', 1);
        $this->assertFalse(Storage::disk('local')->exists($first));

        $this->actingAs($user)->post('/settings/documents', [
            'key' => 'peraturan-fitout',
            'file' => UploadedFile::fake()->create('jahat.exe', 100, 'application/x-msdownload'),
        ])->assertSessionHasErrors('file');
    }
}
