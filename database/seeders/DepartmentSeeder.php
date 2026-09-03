<?php

namespace Database\Seeders;

use App\Models\Department;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    public function run(): void
    {
        $departments = [
            ['name' => 'Tenancy', 'description' => 'Divisi yang menangani administrasi tenant, approval kontrak, dan surat izin.'],
            ['name' => 'Building Service', 'description' => 'Divisi yang bertanggung jawab atas fasilitas dan operasional gedung.'],
            ['name' => 'Security', 'description' => 'Divisi keamanan, termasuk pengecekan fisik keluar-masuk barang.'],
            ['name' => 'Engineering', 'description' => 'Divisi teknik, menangani listrik, AC, dan sarana bangunan.'],
            ['name' => 'IT', 'description' => 'Divisi teknologi informasi.'],
        ];

        foreach ($departments as $dept) {
            Department::firstOrCreate(['name' => $dept['name']], $dept);
        }
    }
}