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
    ];

    protected $casts = [
        'loo_received_date' => 'date',
        'submitted_at' => 'timestamp',
        'completed_at' => 'timestamp',
        'cancelled_at' => 'timestamp',
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

    public function history()
    {
        return $this->hasMany(LooHistory::class);
    }

    public function updateStatus(string $status): bool
    {
        $oldStatus = $this->status;
        $this->status = $status;
        $this->current_stage = $this->getStageFromStatus($status);

        if ($status === 'completed') {
            $this->completed_at = now();
        } elseif ($status === 'cancelled') {
            $this->cancelled_at = now();
        } elseif ($status === 'draft') {
            if (! $this->submitted_at) {
                $this->submitted_at = now();
            }
        }

        return $this->save();
    }

    public static function getStageFromStatus(string $status): string
    {
        return match ($status) {
            'draft' => 'marketing',
            'legal_review' => 'legal',
            'accounting_review' => 'accounting',
            'tenant_mgmt_review' => 'tenant_mgmt',
            'measurement' => 'measurement',
            'ba_handover' => 'ba_handover',
            'fitout' => 'fitout',
            'pre_handover' => 'pre_handover',
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
