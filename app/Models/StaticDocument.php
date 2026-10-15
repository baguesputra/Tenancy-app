<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class StaticDocument extends Model
{
    public const KEYS = ['peraturan-fitout', 'tata-tertib-lembur'];

    protected $fillable = [
        'key', 'branch_id', 'file_path', 'original_name', 'mime', 'size', 'uploaded_by',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Prioritas: file branch permit → file semua branch → null (pakai Blade bawaan).
     */
    public static function forPermit(string $key, mixed $branchId): ?self
    {
        return static::where('key', $key)->where('branch_id', $branchId)->first()
            ?? static::where('key', $key)->whereNull('branch_id')->first();
    }

    public function downloadResponse()
    {
        abort_unless(Storage::disk('local')->exists($this->file_path), 404, 'File dokumen tidak ditemukan.');

        return Storage::disk('local')->download($this->file_path, $this->original_name);
    }
}
