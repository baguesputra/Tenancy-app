<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PermitRequest extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id', 'permit_number', 'activity_types', 'request_date',
        'tenant_id', 'branch_id', 'store_name_snapshot', 'floor_snapshot', 'block_snapshot', 'unit_number_snapshot',
        'pic_name', 'pic_phone',
        'is_external', 'contractor_company', 'contractor_pic', 'contractor_address', 'contractor_phone',
        'job_type', 'work_start_date', 'work_end_date', 'work_start_time', 'work_end_time',
        'access_route', 'notes',
        'requested_by_type', 'requested_by_id',
        'status',
        'barcode_token',
        'is_flagged',
    ];

    protected function casts(): array
    {
        return [
            'activity_types' => 'array',
            'request_date' => 'date',
            'is_external' => 'boolean',
            'is_flagged' => 'boolean',
            'work_start_date' => 'date',
            'work_end_date' => 'date',
            'work_start_time' => 'datetime:H:i',
            'work_end_time' => 'datetime:H:i',
            'tenancy_approved_at' => 'datetime',
            'bs_approved_at' => 'datetime',
            'security_checked_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function requestedBy()
    {
        return $this->morphTo(__FUNCTION__, 'requested_by_type', 'requested_by_id');
    }

    public function workers()
    {
        return $this->hasMany(PermitWorker::class)->orderBy('order');
    }

    public function goods()
    {
        return $this->hasMany(PermitGood::class);
    }

    public function accompanyingDepartments()
    {
        return $this->belongsToMany(Department::class, 'permit_request_departments');
    }

    public function tenancyApprovedBy()
    {
        return $this->belongsTo(User::class, 'tenancy_approved_by');
    }

    public function bsApprovedBy()
    {
        return $this->belongsTo(User::class, 'bs_approved_by');
    }

    public function securityCheckedBy()
    {
        return $this->belongsTo(User::class, 'security_checked_by');
    }

    public function approvals()
    {
        return $this->morphMany(Approval::class, 'approvable')->orderBy('order');
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}