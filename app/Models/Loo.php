<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Loo extends Model
{
    protected $fillable = [
        'loo_number',
        'branch_id',
        'marketing_id',
        'tenant_id',
        'tenant_category_id',
        'unit_id',
        'prospective_tenant_name',
        'status',
        'current_stage',
        'cover_file_path',
        'cover_hash',
        'isi_file_path',
        'isi_hash',
        'loo_received_date',
        'loo_distributor',
        'loo_letter_file_path',
        'loo_proposal_file_path',
        'submitted_at',
        'completed_at',
        'cancelled_at',
        'cancel_reason',
        'track_token',
        'track_expires_at',
    ];

    protected $casts = [
        'loo_received_date' => 'date',
        'submitted_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'track_expires_at' => 'datetime',
    ];

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }

    public function marketing()
    {
        return $this->belongsTo(User::class, 'marketing_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function tenantCategory()
    {
        return $this->belongsTo(TenantCategory::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function history()
    {
        return $this->hasMany(LooHistory::class);
    }

    public function sections()
    {
        return $this->hasMany(LooSection::class);
    }

    public function updateStatus(string $status): bool
    {
        $oldStatus = $this->status;
        $this->status = $status;

        // Status terminal tidak mengubah stage — LOO berhenti di stage saat dibatalkan/selesai.
        $terminal = in_array($status, ['completed', 'cancelled'], true);
        if (! $terminal) {
            $this->current_stage = self::getStageFromStatus($status);
        }

        if ($status === 'completed') {
            $this->completed_at = now();
        } elseif ($status === 'cancelled') {
            $this->cancelled_at = now();
        } elseif ($oldStatus === 'draft' && $status !== 'draft' && ! $this->submitted_at) {
            // LOO keluar dari draft untuk pertama kali = benar-benar disubmit.
            $this->submitted_at = now();
        }

        return $this->save();
    }

    public static function getStageFromStatus(string $status): string
    {
        return match ($status) {
            'draft', 'pengisian_divisi' => 'marketing',
            'pengukuran_ulang' => 'pre_handover',
            'sebelum_fitout' => 'ba_handover',
            'setelah_fitout' => 'fitout',
            // Status terminal tidak punya stage sendiri.
            'completed', 'cancelled' => 'completed',
            default => 'marketing',
        };
    }

    public static function generateLooNumber(string $branchCode, int $year): string
    {
        $prefix = "LOO/{$year}/{$branchCode}/";
        $last = self::where('loo_number', 'like', $prefix.'%')
            ->orderBy('loo_number', 'desc')
            ->value('loo_number');

        $sequence = $last ? (int) Str::after($last, $prefix) + 1 : 1;

        return $prefix.str_pad($sequence, 4, '0', STR_PAD_LEFT);
    }
}
